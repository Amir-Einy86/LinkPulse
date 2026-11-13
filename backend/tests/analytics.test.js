const { api, startDb, stopDb, clearDb, registerUser, createLink } = require('./helpers');
const Link = require('../src/models/Link');
const Click = require('../src/models/Click');
const T = require('../src/utils/timeBuckets');

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const H = 3600e3, D = 864e5;
async function addClicks(link, user, specs) {
  const docs = specs.flatMap(([ageMs, n, extra = {}]) =>
    Array.from({ length: n }, (_, i) => ({ link: link.id, owner: user.user.id, at: new Date(Date.now() - ageMs), visitor: `v${i}`, ...extra })));
  await Click.insertMany(docs);
  await Link.updateOne({ _id: link.id }, { $inc: { clicks: docs.length } });
}

describe('آمار یک لینک', () => {
  test('سری ۷ روزه: ۷ نقطه، صفر برای روزهای خالی و مجموع درست', async () => {
    const u = await registerUser();
    const link = await createLink(u.auth);
    await addClicks(link, u, [[1 * H, 4], [2 * D + H, 3], [5 * D, 2]]);
    const res = await api().get(`/api/links/${link.id}/analytics`).query({ range: '7d' }).set(u.auth);
    expect(res.status).toBe(200);
    const { series } = res.body.data;
    expect(series.points).toHaveLength(7);
    expect(series.unit).toBe('day');
    expect(series.total).toBe(9);
    expect(series.points.filter((p) => p.value === 0).length).toBeGreaterThanOrEqual(3);
    const keys = series.points.map((p) => p.from);
    expect([...keys].sort()).toEqual(keys);
  });

  test('بازه‌ی ۲۴ ساعت: ساعتی؛ ۳۰ روز: ۳۰ نقطه', async () => {
    const u = await registerUser();
    const link = await createLink(u.auth);
    await addClicks(link, u, [[30 * 60e3, 5], [10 * D, 2]]);
    const h = (await api().get(`/api/links/${link.id}/analytics`).query({ range: '24h' }).set(u.auth)).body.data;
    expect(h.series.unit).toBe('hour');
    expect(h.series.points.length).toBeGreaterThanOrEqual(24);
    expect(h.series.total).toBe(5);
    const m = (await api().get(`/api/links/${link.id}/analytics`).query({ range: '30d' }).set(u.auth)).body.data;
    expect(m.series.points).toHaveLength(30);
    expect(m.series.total).toBe(7);
  });

  test('بازه‌ی «همه»: برای لینک تازه روزانه، برای لینک قدیمی هفتگی', async () => {
    const u = await registerUser();
    const fresh = await createLink(u.auth);
    const old = await createLink(u.auth);
    await Link.collection.updateOne({ _id: new (require('mongoose').Types.ObjectId)(old.id) }, { $set: { createdAt: new Date(Date.now() - 60 * D) } });
    await addClicks(old, u, [[50 * D, 3], [2 * D, 4]]);
    const a = (await api().get(`/api/links/${fresh.id}/analytics`).query({ range: 'all' }).set(u.auth)).body.data;
    expect(a.series.unit).toBe('day');
    const b = (await api().get(`/api/links/${old.id}/analytics`).query({ range: 'all' }).set(u.auth)).body.data;
    expect(b.series.unit).toBe('week');
    expect(b.series.total).toBe(7);
  });

  test('تفکیک‌ها: منبع، دستگاه، مرورگر، کشور با درصد و مجموع ۱۰۰٪', async () => {
    const u = await registerUser();
    const link = await createLink(u.auth);
    await addClicks(link, u, [
      [H, 6, { source: 'direct', device: 'desktop', browser: 'chrome', country: 'IR' }],
      [H, 3, { source: 'social', device: 'mobile', browser: 'safari', country: 'US' }],
      [H, 1, { source: 'search', device: 'tablet', browser: 'firefox', country: 'IR' }],
    ]);
    const { breakdowns } = (await api().get(`/api/links/${link.id}/analytics`).query({ range: '7d' }).set(u.auth)).body.data;
    expect(breakdowns.total).toBe(10);
    expect(breakdowns.sources[0]).toMatchObject({ key: 'direct', value: 6 });
    expect(breakdowns.devices.map((d) => d.key)).toEqual(['desktop', 'mobile', 'tablet']);
    expect(breakdowns.countries[0]).toMatchObject({ key: 'IR', value: 7 });
    expect(breakdowns.browsers.reduce((s, b) => s + b.pct, 0)).toBeCloseTo(100, 5);
  });

  test('شاخص‌ها: روند هفتگی، بازدیدکننده‌ی یکتا، منبع اصلی و اوج', async () => {
    const u = await registerUser();
    const link = await createLink(u.auth);
    await addClicks(link, u, [[2 * H, 6, { source: 'social' }], [3 * D, 2, { source: 'direct' }], [10 * D, 5, { source: 'direct' }]]);
    const { kpis } = (await api().get(`/api/links/${link.id}/analytics`).query({ range: '7d' }).set(u.auth)).body.data;
    expect(kpis.totalClicks).toBe(13);
    expect(kpis.trend).toBeCloseTo(60, 5);
    expect(kpis.uniqueVisitors).toBe(6);
    expect(kpis.topSource.key).toBe('direct');
    expect(kpis.avgDaily7).toBeCloseTo(8 / 7, 5);
    expect(kpis.peak7.value).toBe(6);
  });

  test('لینک بدون کلیک: صفرهای تمیز و بدون خطا', async () => {
    const u = await registerUser();
    const link = await createLink(u.auth);
    const res = await api().get(`/api/links/${link.id}/analytics`).query({ range: '7d' }).set(u.auth);
    expect(res.status).toBe(200);
    expect(res.body.data.series.total).toBe(0);
    expect(res.body.data.kpis).toMatchObject({ trend: null, uniqueVisitors: 0, topSource: null, peak7: null });
    expect(res.body.data.recent).toEqual([]);
  });

  test('منطقه‌ی زمانی: کلیک ساعت ۰۰:۳۰ به‌وقت تهران، توی «روز تهران» حساب می‌شه نه UTC', async () => {
    const u = await registerUser();
    const link = await createLink(u.auth);
    const todayTehran = T.dayKeyOf(new Date(), 'Asia/Tehran');
    const at = new Date(`${todayTehran}T00:15:00+03:30`);
    await Click.create({ link: link.id, owner: u.user.id, at });
    await Link.updateOne({ _id: link.id }, { clicks: 1 });
    if (at.getTime() > Date.now()) return;
    const tehran = (await api().get(`/api/links/${link.id}/analytics`).query({ range: '7d', tz: 'Asia/Tehran' }).set(u.auth)).body.data;
    const last = tehran.series.points[tehran.series.points.length - 1];
    expect(last.from).toBe(todayTehran);
    expect(last.value).toBe(1);
  });

  test('ورودی نامعتبر: بازه یا منطقه‌ی زمانی غلط → ۴۰۰', async () => {
    const u = await registerUser();
    const link = await createLink(u.auth);
    expect((await api().get(`/api/links/${link.id}/analytics`).query({ range: '1y' }).set(u.auth)).status).toBe(400);
    expect((await api().get(`/api/links/${link.id}/analytics`).query({ tz: 'Mars/Base' }).set(u.auth)).status).toBe(400);
  });

  test('آخرین کلیک‌ها: حداکثر ۱۰ تا، جدیدترین اول، بدون فیلد داخلی', async () => {
    const u = await registerUser();
    const link = await createLink(u.auth);
    await addClicks(link, u, Array.from({ length: 12 }, (_, i) => [(i + 1) * H, 1, { country: 'IR' }]));
    const { recent } = (await api().get(`/api/links/${link.id}/analytics`).set(u.auth)).body.data;
    expect(recent).toHaveLength(10);
    expect(new Date(recent[0].at) > new Date(recent[9].at)).toBe(true);
    expect(JSON.stringify(recent)).not.toMatch(/visitor|owner|_id/);
  });
});

describe('نمای کلی داشبورد', () => {
  test('جمع کلیک همه‌ی لینک‌های غیرآرشیو، تغییر نسبت به بازه‌ی قبل و ۴ لینک برتر', async () => {
    const u = await registerUser();
    const l1 = await createLink(u.auth, { title: 'اول' });
    const l2 = await createLink(u.auth, { title: 'دوم' });
    const arch = await createLink(u.auth, { title: 'آرشیو' });
    await addClicks(l1, u, [[H, 6], [10 * D, 2]]);
    await addClicks(l2, u, [[2 * D, 4]]);
    await addClicks(arch, u, [[H, 50]]);
    await api().patch(`/api/links/${arch.id}`).set(u.auth).send({ archived: true });

    const res = await api().get('/api/analytics/overview').query({ days: 7 }).set(u.auth);
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.series.points).toHaveLength(7);
    expect(d.series.total).toBe(10);
    expect(d.series.prevTotal).toBe(2);
    expect(d.series.change).toBeCloseTo(400, 5);
    expect(d.summary).toMatchObject({ total: 3, archived: 1, active: 2 });
    expect(d.topLinks).toHaveLength(2);
    expect(d.topLinks[0].title).toBe('اول');
    expect(d.topLinks[0].sparkline).toHaveLength(7);
    expect(d.topLinks.map((l) => l.title)).not.toContain('آرشیو');
  });

  test('هر کاربر فقط آمار خودش رو می‌بینه', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const la = await createLink(a.auth);
    await addClicks(la, a, [[H, 5]]);
    const res = await api().get('/api/analytics/overview').query({ days: 30 }).set(b.auth);
    expect(res.body.data.series.total).toBe(0);
    expect(res.body.data.summary.total).toBe(0);
    expect(res.body.data.topLinks).toEqual([]);
  });

  test('days غیرمجاز → ۴۰۰ و بدون ورود → ۴۰۱', async () => {
    const u = await registerUser();
    expect((await api().get('/api/analytics/overview').query({ days: 5 }).set(u.auth)).status).toBe(400);
    expect((await api().get('/api/analytics/overview')).status).toBe(401);
  });
});

describe('اعلان‌ها', () => {
  test('لینک نزدیک به انقضا و عدد رُند کلیک؛ با خاموش کردن تنظیمات حذف می‌شن', async () => {
    const u = await registerUser();
    const soon = await createLink(u.auth, { title: 'کمپین', expiresAt: new Date(Date.now() + 2 * D).toISOString() });
    const big = await createLink(u.auth, { title: 'پرکلیک' });
    await Link.updateOne({ _id: big.id }, { clicks: 1200 });
    const on = (await api().get('/api/notifications').set(u.auth)).body.data.notifications;
    expect(on.map((n) => n.type).sort()).toEqual(['expiry', 'milestone']);
    expect(on.find((n) => n.type === 'milestone').milestone).toBe(1000);
    expect(on.find((n) => n.type === 'expiry')).toMatchObject({ linkId: soon.id, days: 2 });
    await api().patch('/api/users/me/settings').set(u.auth).send({ notifyExpiry: false, notifyMilestone: false });
    expect((await api().get('/api/notifications').set(u.auth)).body.data.notifications).toEqual([]);
  });
});

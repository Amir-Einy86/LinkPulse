const { api, startDb, stopDb, clearDb, registerUser, createLink, waitFor, wait } = require('./helpers');
const Link = require('../src/models/Link');
const Click = require('../src/models/Click');

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const CHROME_WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const SAFARI_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

describe('ریدایرکت', () => {
  test('به آدرس مقصد با ۳۰۲ می‌ره و کش نمی‌شه', async () => {
    const u = await registerUser();
    await createLink(u.auth, { slug: 'go-here', url: 'https://example.com/dest?a=1&b=2' });
    const res = await api().get('/go-here').redirects(0);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://example.com/dest?a=1&b=2');
    expect(res.headers['cache-control']).toMatch(/no-store/);
  });

  test('حروف بزرگ/کوچک فرقی نداره', async () => {
    const u = await registerUser();
    await createLink(u.auth, { slug: 'case-test' });
    expect((await api().get('/CASE-Test').redirects(0)).status).toBe(302);
  });

  test('slug ناموجود → ۴۰۴', async () => {
    expect((await api().get('/does-not-exist').redirects(0)).status).toBe(404);
  });

  test('لینک منقضی‌شده و آرشیوشده → ۴۱۰ و ریدایرکت نمی‌شن', async () => {
    const u = await registerUser();
    const exp = await createLink(u.auth, { slug: 'old-one' });
    const arc = await createLink(u.auth, { slug: 'archived-one' });
    await Link.updateOne({ _id: exp.id }, { expiresAt: new Date(Date.now() - 1000) });
    await api().patch(`/api/links/${arc.id}`).set(u.auth).send({ archived: true });
    for (const slug of ['old-one', 'archived-one']) {
      const res = await api().get(`/${slug}`).redirects(0);
      expect(res.status).toBe(410);
      expect(res.headers.location).toBeUndefined();
    }
    await wait(150);
    expect(await Click.countDocuments()).toBe(0);
  });

  test('لینکی که تازه از آرشیو درآوردیم یا انقضاش برداشته شد دوباره کار می‌کنه', async () => {
    const u = await registerUser();
    const link = await createLink(u.auth, { slug: 'revive-me' });
    await api().patch(`/api/links/${link.id}`).set(u.auth).send({ archived: true });
    expect((await api().get('/revive-me').redirects(0)).status).toBe(410);
    await api().patch(`/api/links/${link.id}`).set(u.auth).send({ archived: false });
    expect((await api().get('/revive-me').redirects(0)).status).toBe(302);
  });

  test('مسیرهای رزرو (api، docs) با slug اشتباه گرفته نمی‌شن', async () => {
    expect((await api().get('/api/nope')).status).toBe(404);
    expect((await api().get('/api/nope')).body.error.code).toBe('NOT_FOUND');
    expect((await api().get('/docs/')).status).toBe(200);
  });
});

describe('ثبت کلیک', () => {
  test('کلیک ثبت می‌شه و اطلاعات تحلیلی درست استخراج می‌شه', async () => {
    const u = await registerUser();
    const link = await createLink(u.auth, { slug: 'track-me' });
    await api().get('/track-me').set('User-Agent', SAFARI_IPHONE).set('Referer', 'https://t.me/somechannel').set('CF-IPCountry', 'ir').redirects(0);
    const click = await waitFor(() => Click.findOne({ link: link.id }).lean());
    expect(click).toMatchObject({ device: 'mobile', browser: 'safari', source: 'social', refHost: 't.me', country: 'IR' });
    expect(click.visitor).toMatch(/^[a-f0-9]{24}$/);
    expect(JSON.stringify(click)).not.toMatch(/iPhone|127\.0\.0\.1|::ffff/);
    const updated = await waitFor(async () => { const l = await Link.findById(link.id).lean(); return l.clicks === 1 ? l : null; });
    expect(updated.clicks).toBe(1);
    expect(updated.lastClickAt).toBeInstanceOf(Date);
  });

  test('منبع: مستقیم، جستجو، سایر', async () => {
    const u = await registerUser();
    const link = await createLink(u.auth, { slug: 'sources-x' });
    await api().get('/sources-x').set('User-Agent', CHROME_WIN).redirects(0);
    await api().get('/sources-x').set('User-Agent', CHROME_WIN).set('Referer', 'https://www.google.com/search?q=x').redirects(0);
    await api().get('/sources-x').set('User-Agent', CHROME_WIN).set('Referer', 'https://someblog.example/post').redirects(0);
    await waitFor(async () => (await Click.countDocuments({ link: link.id })) === 3);
    const by = Object.fromEntries((await Click.find({ link: link.id }).lean()).map((c) => [c.source, c]));
    expect(Object.keys(by).sort()).toEqual(['direct', 'other', 'search']);
    expect(by.search.refHost).toBe('google.com');
  });

  test('ربات‌ها، HEAD و درخواست بدون User-Agent شمرده نمی‌شن ولی ریدایرکت می‌شن', async () => {
    const u = await registerUser();
    await createLink(u.auth, { slug: 'bots-skip' });
    const bot = await api().get('/bots-skip').set('User-Agent', 'TelegramBot (like TwitterBot)').redirects(0);
    const google = await api().get('/bots-skip').set('User-Agent', 'Mozilla/5.0 (compatible; Googlebot/2.1)').redirects(0);
    const noUa = await api().get('/bots-skip').set('User-Agent', '').redirects(0);
    const head = await api().head('/bots-skip').set('User-Agent', CHROME_WIN).redirects(0);
    expect([bot.status, google.status, noUa.status, head.status]).toEqual([302, 302, 302, 302]);
    await wait(250);
    expect(await Click.countDocuments()).toBe(0);
  });

  test('بازدیدکننده‌ی یکتا: یه نفر دوبار = یه visitor؛ دو نفر = دو visitor', async () => {
    const u = await registerUser();
    const link = await createLink(u.auth, { slug: 'uniq-test' });
    await api().get('/uniq-test').set('User-Agent', CHROME_WIN).redirects(0);
    await api().get('/uniq-test').set('User-Agent', CHROME_WIN).redirects(0);
    await api().get('/uniq-test').set('User-Agent', SAFARI_IPHONE).redirects(0);
    await waitFor(async () => (await Click.countDocuments({ link: link.id })) === 3);
    expect((await Click.distinct('visitor', { link: link.id })).length).toBe(2);
  });

  test('هیچ درخواستی به آدرس مقصد زده نمی‌شه (بدون SSRF)', async () => {
    const u = await registerUser();
    await createLink(u.auth, { slug: 'no-fetch', url: 'https://unreachable.invalid/page' });
    const realFetch = global.fetch;
    const spy = jest.fn(() => { throw new Error('fetch نباید صدا زده بشه'); });
    global.fetch = spy;
    try {
      const res = await api().get('/no-fetch').redirects(0);
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('https://unreachable.invalid/page');
      expect(spy).not.toHaveBeenCalled();
    } finally { global.fetch = realFetch; }
  });

  test('حذف لینک، آمار کلیک‌هاش رو هم پاک می‌کنه', async () => {
    const u = await registerUser();
    const link = await createLink(u.auth, { slug: 'del-clicks' });
    await api().get('/del-clicks').set('User-Agent', CHROME_WIN).redirects(0);
    await waitFor(async () => (await Click.countDocuments({ link: link.id })) === 1);
    await api().delete(`/api/links/${link.id}`).set(u.auth);
    expect(await Click.countDocuments({ link: link.id })).toBe(0);
  });
});

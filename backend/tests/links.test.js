const { api, startDb, stopDb, clearDb, registerUser, createLink } = require('./helpers');
const Link = require('../src/models/Link');

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

describe('ساخت لینک', () => {
  test('با slug دلخواه می‌سازه (slug با حروف کوچک ذخیره می‌شه)', async () => {
    const u = await registerUser();
    const res = await api().post('/api/links').set(u.auth).send({ url: 'https://example.com/long/page?x=1', slug: 'My-Link', title: 'صفحه‌ی من' });
    expect(res.status).toBe(201);
    expect(res.body.data.link).toMatchObject({ slug: 'my-link', title: 'صفحه‌ی من', clicks: 0, status: 'active', shortUrl: 'https://lp.example.test/my-link' });
  });

  test('بدون slug یکی تصادفی و معتبر می‌سازه و عنوان پیش‌فرض دامنه‌ست', async () => {
    const u = await registerUser();
    const res = await api().post('/api/links').set(u.auth).send({ url: 'https://www.example.com/a' });
    expect(res.status).toBe(201);
    expect(res.body.data.link.slug).toMatch(/^[a-z0-9]{6,8}$/);
    expect(res.body.data.link.title).toBe('example.com');
  });

  test('آدرس بدون پروتکل https می‌گیره', async () => {
    const u = await registerUser();
    const res = await api().post('/api/links').set(u.auth).send({ url: 'example.com/path' });
    expect(res.status).toBe(201);
    expect(res.body.data.link.url).toBe('https://example.com/path');
  });

  test.each([
    ['javascript:alert(1)'], ['data:text/html,<script>alert(1)</script>'], ['ftp://example.com/file'],
    ['file:///etc/passwd'], ['https://user:pass@example.com/'], ['http://localhost/admin'], ['not a url'], [''],
  ])('آدرس نامعتبر/خطرناک %j رد می‌شه', async (url) => {
    const u = await registerUser();
    const res = await api().post('/api/links').set(u.auth).send({ url });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(await Link.countDocuments()).toBe(0);
  });

  test('کوتاه کردن آدرس خود سرویس رد می‌شه (حلقه‌ی ریدایرکت)', async () => {
    const u = await registerUser();
    const res = await api().post('/api/links').set(u.auth).send({ url: 'https://lp.example.test/abc' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('SELF_URL');
  });

  test.each([['ab'], ['has space'], ['bad/slash'], ['x'.repeat(33)]])('slug نامعتبر %j → ۴۰۰', async (slug) => {
    const u = await registerUser();
    const res = await api().post('/api/links').set(u.auth).send({ url: 'https://example.com', slug });
    expect(res.status).toBe(400);
    expect(res.body.error.details.slug).toEqual(expect.any(String));
  });

  test('slug رزرو (مثل login و api) رد می‌شه', async () => {
    const u = await registerUser();
    for (const slug of ['login', 'api', 'ADMIN', 'dashboard']) {
      const res = await api().post('/api/links').set(u.auth).send({ url: 'https://example.com', slug });
      expect(res.status).toBe(400);
    }
  });

  test('slug تکراری → ۴۰۹ (حتی بین دو کاربر و با حروف بزرگ/کوچک متفاوت)', async () => {
    const a = await registerUser();
    const b = await registerUser();
    await createLink(a.auth, { slug: 'taken-one' });
    const res = await api().post('/api/links').set(b.auth).send({ url: 'https://example.org', slug: 'TAKEN-one' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SLUG_TAKEN');
  });

  test('دو درخواست همزمان با یه slug: دقیقاً یکی موفق می‌شه (ایندکس یکتا)', async () => {
    const u = await registerUser();
    const results = await Promise.all(
      Array.from({ length: 8 }, () => api().post('/api/links').set(u.auth).send({ url: 'https://example.com/race', slug: 'race-slug' }))
    );
    const codes = results.map((r) => r.status).sort();
    expect(codes.filter((c) => c === 201)).toHaveLength(1);
    expect(codes.filter((c) => c === 409)).toHaveLength(7);
    expect(await Link.countDocuments({ slug: 'race-slug' })).toBe(1);
  });

  test('تاریخ انقضا: آینده قبول، گذشته رد', async () => {
    const u = await registerUser();
    const future = new Date(Date.now() + 864e5).toISOString();
    const past = new Date(Date.now() - 864e5).toISOString();
    const ok = await api().post('/api/links').set(u.auth).send({ url: 'https://example.com/a', expiresAt: future });
    expect(ok.status).toBe(201);
    expect(ok.body.data.link.expiresAt).toBe(future);
    expect((await api().post('/api/links').set(u.auth).send({ url: 'https://example.com/b', expiresAt: past })).status).toBe(400);
    expect((await api().post('/api/links').set(u.auth).send({ url: 'https://example.com/c', expiresAt: 'tomorrow' })).status).toBe(400);
  });

  test('فیلد ناشناس (مثل owner یا clicks) توی بدنه رد می‌شه', async () => {
    const u = await registerUser();
    const res = await api().post('/api/links').set(u.auth).send({ url: 'https://example.com', clicks: 99999, owner: '000000000000000000000000' });
    expect(res.status).toBe(400);
  });
});

describe('خوندن، ویرایش و حذف', () => {
  test('جدا بودن لینک‌های کاربرها: کاربر دیگه ۴۰۴ می‌گیره (نه ۴۰۳)', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const link = await createLink(a.auth, { slug: 'private-one' });

    expect((await api().get(`/api/links/${link.id}`).set(b.auth)).status).toBe(404);
    expect((await api().patch(`/api/links/${link.id}`).set(b.auth).send({ title: 'هک' })).status).toBe(404);
    expect((await api().delete(`/api/links/${link.id}`).set(b.auth)).status).toBe(404);
    expect((await api().get(`/api/links/${link.id}/analytics`).set(b.auth)).status).toBe(404);

    const list = await api().get('/api/links').set(b.auth);
    expect(list.body.data.links).toHaveLength(0);
    const still = await Link.findById(link.id);
    expect(still.title).not.toBe('هک'); // لینک دست‌نخورده موند
  });

  test('بدون ورود هیچ مسیر لینکی کار نمی‌کنه', async () => {
    expect((await api().post('/api/links').send({ url: 'https://example.com' })).status).toBe(401);
    expect((await api().get('/api/links/507f1f77bcf86cd799439011')).status).toBe(401);
  });

  test('شناسه‌ی خراب → ۴۰۰ و شناسه‌ی ناموجود → ۴۰۴', async () => {
    const u = await registerUser();
    expect((await api().get('/api/links/not-an-id').set(u.auth)).status).toBe(400);
    expect((await api().get('/api/links/507f1f77bcf86cd799439011').set(u.auth)).status).toBe(404);
  });

  test('ویرایش: عنوان، آدرس، آرشیو و برداشتن انقضا', async () => {
    const u = await registerUser();
    const link = await createLink(u.auth, { expiresAt: new Date(Date.now() + 864e5).toISOString() });
    const res = await api().patch(`/api/links/${link.id}`).set(u.auth).send({ title: 'عنوان تازه', url: 'https://example.org/new', archived: true, expiresAt: null });
    expect(res.status).toBe(200);
    expect(res.body.data.link).toMatchObject({ title: 'عنوان تازه', url: 'https://example.org/new', archived: true, status: 'archived', expiresAt: null });
  });

  test('ویرایش slug به slug لینک دیگه → ۴۰۹؛ به slug خودش مشکلی نداره', async () => {
    const u = await registerUser();
    const a = await createLink(u.auth, { slug: 'first-one' });
    await createLink(u.auth, { slug: 'second-one' });
    expect((await api().patch(`/api/links/${a.id}`).set(u.auth).send({ slug: 'second-one' })).status).toBe(409);
    expect((await api().patch(`/api/links/${a.id}`).set(u.auth).send({ slug: 'first-one' })).status).toBe(200);
  });

  test('ویرایش بدون فیلد، یا با آدرس خطرناک → ۴۰۰', async () => {
    const u = await registerUser();
    const link = await createLink(u.auth);
    expect((await api().patch(`/api/links/${link.id}`).set(u.auth).send({})).status).toBe(400);
    expect((await api().patch(`/api/links/${link.id}`).set(u.auth).send({ url: 'javascript:alert(1)' })).status).toBe(400);
  });

  test('حذف یه لینک، حذف گروهی (فقط مال خودش) و حذف همه', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const [l1, l2, l3] = [await createLink(a.auth), await createLink(a.auth), await createLink(a.auth)];
    const other = await createLink(b.auth);

    expect((await api().delete(`/api/links/${l1.id}`).set(a.auth)).status).toBe(204);
    expect((await api().get(`/api/links/${l1.id}`).set(a.auth)).status).toBe(404);

    // لینک کاربر دیگه توی لیست ids باشه، حذف نمی‌شه
    const bulk = await api().post('/api/links/bulk-delete').set(a.auth).send({ ids: [l2.id, other.id] });
    expect(bulk.status).toBe(200);
    expect(bulk.body.data.deleted).toBe(1);
    expect(await Link.findById(other.id)).not.toBeNull();

    const all = await api().delete('/api/links').set(a.auth);
    expect(all.body.data.deleted).toBe(1);
    expect(await Link.findById(l3.id)).toBeNull();
    expect(await Link.countDocuments({ owner: b.user.id })).toBe(1);

    expect((await api().post('/api/links/bulk-delete').set(a.auth).send({ ids: [] })).status).toBe(400);
  });
});

describe('لیست: جستجو، فیلتر، مرتب‌سازی، صفحه‌بندی', () => {
  async function seed(u) {
    const future = new Date(Date.now() + 5 * 864e5).toISOString();
    const a = await createLink(u.auth, { slug: 'alpha-one', title: 'آلفا', url: 'https://github.com/x/alpha' });
    const b = await createLink(u.auth, { slug: 'beta-two', title: 'بتا', url: 'https://example.com/beta' });
    const c = await createLink(u.auth, { slug: 'gamma-three', title: 'گاما', url: 'https://example.com/gamma', expiresAt: future });
    const d = await createLink(u.auth, { slug: 'delta-four', title: 'دلتا', url: 'https://example.com/delta' });
    await Link.updateOne({ _id: a.id }, { clicks: 50 });
    await Link.updateOne({ _id: b.id }, { clicks: 10, archived: true });
    await Link.updateOne({ _id: d.id }, { $set: { expiresAt: new Date(Date.now() - 1000) } }); // منقضی‌شده (مستقیم توی دیتابیس)
    return { a, b, c, d };
  }

  test('فیلتر وضعیت و شمارنده‌های خلاصه', async () => {
    const u = await registerUser();
    await seed(u);
    const get = (q) => api().get('/api/links').query(q).set(u.auth);
    expect((await get({ status: 'active' })).body.data.links.map((l) => l.slug).sort()).toEqual(['alpha-one', 'gamma-three']);
    expect((await get({ status: 'expired' })).body.data.links.map((l) => l.slug)).toEqual(['delta-four']);
    expect((await get({ status: 'archived' })).body.data.links.map((l) => l.slug)).toEqual(['beta-two']);
    const all = await get({});
    expect(all.body.data.summary).toMatchObject({ total: 4, clicks: 60, active: 2, expired: 1, archived: 1 });
    expect(all.body.data.summary.topLink.slug).toBe('alpha-one');
  });

  test('جستجو در عنوان/slug/آدرس و ایمن بودن در برابر کاراکترهای regex', async () => {
    const u = await registerUser();
    await seed(u);
    const q = (s) => api().get('/api/links').query({ q: s }).set(u.auth);
    expect((await q('github')).body.data.links).toHaveLength(1);
    expect((await q('GAMMA')).body.data.links).toHaveLength(1);
    expect((await q('بتا')).body.data.links).toHaveLength(1);
    const evil = await q('.*');
    expect(evil.status).toBe(200);
    expect(evil.body.data.links).toHaveLength(0); // «.*» به‌عنوان متن جستجو می‌شه، نه الگوی regex
    expect((await q('(')).status).toBe(200);
  });

  test('مرتب‌سازی و صفحه‌بندی', async () => {
    const u = await registerUser();
    await seed(u);
    const byClicks = await api().get('/api/links').query({ sort: 'clicks' }).set(u.auth);
    expect(byClicks.body.data.links[0].slug).toBe('alpha-one');
    const p1 = await api().get('/api/links').query({ sort: 'oldest', limit: 3, page: 1 }).set(u.auth);
    const p2 = await api().get('/api/links').query({ sort: 'oldest', limit: 3, page: 2 }).set(u.auth);
    expect(p1.body.meta).toMatchObject({ page: 1, limit: 3, total: 4, pages: 2 });
    expect(p1.body.data.links).toHaveLength(3);
    expect(p2.body.data.links).toHaveLength(1);
    expect(p1.body.data.links[0].slug).toBe('alpha-one');
    expect((await api().get('/api/links').query({ limit: 500 }).set(u.auth)).status).toBe(400);
    expect((await api().get('/api/links').query({ sort: 'DROP' }).set(u.auth)).status).toBe(400);
  });
});

describe('ابزارها', () => {
  test('بررسی آزاد بودن slug', async () => {
    const u = await registerUser();
    const link = await createLink(u.auth, { slug: 'busy-one' });
    const check = (slug, extra = {}) => api().get('/api/links/check-slug').query({ slug, ...extra }).set(u.auth);
    expect((await check('busy-one')).body.data).toMatchObject({ available: false, reason: 'taken' });
    expect((await check('busy-one', { exceptId: link.id })).body.data.available).toBe(true);
    expect((await check('free-one')).body.data.available).toBe(true);
    expect((await check('login')).body.data).toMatchObject({ available: false, reason: 'reserved' });
    expect((await check('a')).body.data).toMatchObject({ available: false, reason: 'invalid' });
  });

  test('خروجی CSV: سرستون، فقط لینک‌های خودش و جلوگیری از Formula Injection', async () => {
    const a = await registerUser();
    const b = await registerUser();
    await createLink(a.auth, { slug: 'csv-one', title: '=HYPERLINK("http://evil.test","کلیک کن")' });
    await createLink(b.auth, { slug: 'csv-other', title: 'مال دیگری' });
    const res = await api().get('/api/links/export.csv').set(a.auth);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text).toContain('عنوان');
    expect(res.text).not.toContain('csv-other');
    expect(res.text).toContain(`"'=HYPERLINK(""http://evil.test"",""کلیک کن"")"`); // با ' خنثی شده
  });
});

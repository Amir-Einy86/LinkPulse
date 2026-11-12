const express = require('express');
const request = require('supertest');
const { api, startDb, stopDb, clearDb, registerUser } = require('./helpers');
const limiters = require('../src/middleware/rateLimiters');

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

describe('هدرهای امنیتی و CORS', () => {
  test('helmet هدرها رو می‌ذاره و x-powered-by نیست', async () => {
    const res = await api().get('/api/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toMatch(/default-src 'self'/);
    expect(res.headers['content-security-policy']).toMatch(/frame-ancestors 'none'/);
  });

  test('مبدأ مجاز هدر CORS می‌گیره، مبدأ ناشناس نه', async () => {
    const ok = await api().get('/api/health').set('Origin', 'http://allowed.test');
    expect(ok.headers['access-control-allow-origin']).toBe('http://allowed.test');
    const bad = await api().get('/api/health').set('Origin', 'http://evil.test');
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('preflight (OPTIONS) برای مبدأ مجاز درست جواب می‌ده', async () => {
    const res = await api().options('/api/links').set('Origin', 'http://allowed.test').set('Access-Control-Request-Method', 'POST').set('Access-Control-Request-Headers', 'authorization,content-type');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-headers']).toMatch(/Authorization/i);
  });
});

describe('مدیریت خطا', () => {
  test('JSON خراب → ۴۰۰ با پیام فارسی، نه ۵۰۰', async () => {
    const res = await api().post('/api/auth/login').set('Content-Type', 'application/json').send('{"email": ');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_JSON');
  });

  test('بدنه‌ی خیلی بزرگ → ۴۱۳', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'a@b.co', password: 'x'.repeat(20000) });
    expect(res.status).toBe(413);
  });

  test('قالب پاسخ خطا ثابته و stack یا جزئیات داخلی نداره', async () => {
    const res = await api().get('/api/links');
    expect(res.status).toBe(401);
    expect(Object.keys(res.body)).toEqual(['error']);
    expect(res.body.error).toEqual({ code: 'UNAUTHORIZED', message: expect.any(String) });
    expect(JSON.stringify(res.body)).not.toMatch(/at .*\.js|node_modules|stack/);
  });

  test('تزریق عملگر NoSQL توی ورود (email: {"$ne": null}) رد می‌شه', async () => {
    await registerUser();
    const res = await api().post('/api/auth/login').send({ email: { $ne: null }, password: { $ne: null } });
    expect(res.status).toBe(400);
  });

  test('تزریق عملگر توی پارامترهای لیست اثری نداره (کوئری‌استرینگ ساده‌ست، نه شیء)', async () => {
    const u = await registerUser();
    await api().post('/api/links').set(u.auth).send({ url: 'https://example.com/x' });
    const res = await api().get('/api/links?q[$ne]=x&status[$gt]=&sort[$ne]=a').set(u.auth);
    expect(res.status).toBe(200);
    expect(res.body.data.links).toHaveLength(1); // فیلتری اعمال نشده
    const bad = await api().get('/api/links?status=%7B%22%24ne%22%3Anull%7D').set(u.auth);
    expect(bad.status).toBe(400); // مقدار خارج از لیست مجاز
  });

  test('مسیر ناموجود و متد اشتباه → ۴۰۴ استاندارد', async () => {
    expect((await api().get('/api/unknown')).body.error.code).toBe('NOT_FOUND');
    expect((await api().patch('/api/auth/login').send({})).status).toBe(404);
  });
});

describe('محدودیت تعداد درخواست (Rate Limiting)', () => {
  test('بعد از سقف مجاز، ۴۲۹ با پیام فارسی می‌ده', async () => {
    const app = express();
    app.use(limiters._make(60000, 3, 'زیاد شد', { forceInTest: true }));
    app.get('/x', (req, res) => res.json({ ok: true }));
    const codes = [];
    for (let i = 0; i < 5; i++) codes.push((await request(app).get('/x')).status);
    expect(codes).toEqual([200, 200, 200, 429, 429]);
    const blocked = await request(app).get('/x');
    expect(blocked.body.error).toMatchObject({ code: 'RATE_LIMITED', message: 'زیاد شد' });
    expect(blocked.headers['ratelimit']).toBeDefined();
  });
});

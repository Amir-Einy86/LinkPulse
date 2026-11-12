const { api, bearer, startDb, stopDb, clearDb, registerUser, createLink } = require('./helpers');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const Link = require('../src/models/Link');

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

describe('ثبت‌نام', () => {
  test('حساب می‌سازه، توکن می‌ده و رمز/هش رو لو نمی‌ده', async () => {
    const res = await api().post('/api/auth/register').send({ name: 'سارا', email: 'Sara@Example.com', password: 'Passw0rd!x' });
    expect(res.status).toBe(201);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user.email).toBe('sara@example.com'); // ایمیل با حروف کوچک ذخیره می‌شه
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|Passw0rd|tokenVersion/);
    const stored = await User.findOne({ email: 'sara@example.com' }).select('+passwordHash');
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/); // هش bcrypt، نه خود رمز
  });

  test('ایمیل تکراری → ۴۰۹ (حتی با حروف بزرگ)', async () => {
    await registerUser({ email: 'dup@example.com' });
    const res = await api().post('/api/auth/register').send({ name: 'کس دیگه', email: 'DUP@example.com', password: 'Passw0rd!x' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  test.each([
    [{ email: 'not-an-email' }, 'email'],
    [{ password: 'short' }, 'password'],
    [{ name: 'ا' }, 'name'],
  ])('ورودی نامعتبر %j → ۴۰۰ با پیام فیلد', async (bad, field) => {
    const res = await api().post('/api/auth/register').send({ name: 'سارا', email: 'a@example.com', password: 'Passw0rd!x', ...bad });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[field]).toEqual(expect.any(String));
  });
});

describe('ورود', () => {
  test('با رمز درست وارد می‌شه', async () => {
    const u = await registerUser();
    const res = await api().post('/api/auth/login').send({ email: u.email, password: u.password });
    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(u.user.id);
  });

  test('رمز اشتباه و ایمیل ناموجود پیام یکسان می‌گیرن (۴۰۱)', async () => {
    const u = await registerUser();
    const wrong = await api().post('/api/auth/login').send({ email: u.email, password: 'WrongPass123' });
    const missing = await api().post('/api/auth/login').send({ email: 'nobody@example.com', password: 'WrongPass123' });
    expect(wrong.status).toBe(401);
    expect(missing.status).toBe(401);
    expect(wrong.body.error.message).toBe(missing.body.error.message);
  });
});

describe('مسیرهای محافظت‌شده', () => {
  test('بدون توکن → ۴۰۱', async () => {
    expect((await api().get('/api/auth/me')).status).toBe(401);
    expect((await api().get('/api/links')).status).toBe(401);
  });

  test('توکن خراب یا امضای اشتباه → ۴۰۱', async () => {
    const u = await registerUser();
    expect((await api().get('/api/auth/me').set(bearer('garbage'))).status).toBe(401);
    const forged = jwt.sign({ sub: u.user.id, tv: 0 }, 'a-different-secret-a-different-secret-1234');
    expect((await api().get('/api/auth/me').set(bearer(forged))).status).toBe(401);
  });

  test('توکن منقضی → ۴۰۱', async () => {
    const u = await registerUser();
    const expired = jwt.sign({ sub: u.user.id, tv: 0 }, process.env.JWT_SECRET, { expiresIn: -10 });
    expect((await api().get('/api/auth/me').set(bearer(expired))).status).toBe(401);
  });

  test('توکن کاربری که حذف شده دیگه کار نمی‌کنه', async () => {
    const u = await registerUser();
    await User.deleteMany({});
    expect((await api().get('/api/auth/me').set(u.auth)).status).toBe(401);
  });

  test('me اطلاعات خود کاربر رو برمی‌گردونه', async () => {
    const u = await registerUser({ name: 'امیر' });
    const res = await api().get('/api/auth/me').set(u.auth);
    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('امیر');
  });
});

describe('رمز و حذف حساب', () => {
  test('تغییر رمز: توکن قدیمی باطل، توکن جدید و رمز جدید کار می‌کنن', async () => {
    const u = await registerUser();
    const res = await api().put('/api/users/me/password').set(u.auth).send({ currentPassword: u.password, newPassword: 'NewPassw0rd!y' });
    expect(res.status).toBe(200);
    expect((await api().get('/api/auth/me').set(u.auth)).status).toBe(401); // توکن قدیمی
    expect((await api().get('/api/auth/me').set(bearer(res.body.data.token))).status).toBe(200);
    expect((await api().post('/api/auth/login').send({ email: u.email, password: u.password })).status).toBe(401);
    expect((await api().post('/api/auth/login').send({ email: u.email, password: 'NewPassw0rd!y' })).status).toBe(200);
  });

  test('تغییر رمز با رمز فعلی اشتباه → ۴۰۰', async () => {
    const u = await registerUser();
    const res = await api().put('/api/users/me/password').set(u.auth).send({ currentPassword: 'nope-nope-1', newPassword: 'NewPassw0rd!y' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('WRONG_PASSWORD');
  });

  test('حذف حساب با رمز درست، لینک‌ها و حساب رو پاک می‌کنه؛ با رمز غلط نه', async () => {
    const u = await registerUser();
    await createLink(u.auth);
    expect((await api().delete('/api/users/me').set(u.auth).send({ password: 'wrong-pass-1' })).status).toBe(400);
    expect(await Link.countDocuments()).toBe(1);
    expect((await api().delete('/api/users/me').set(u.auth).send({ password: u.password })).status).toBe(204);
    expect(await Link.countDocuments()).toBe(0);
    expect(await User.countDocuments()).toBe(0);
  });
});

describe('پروفایل و تنظیمات', () => {
  test('ویرایش پروفایل و جلوگیری از ایمیل/نام‌کاربری تکراری', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const ok = await api().patch('/api/users/me').set(a.auth).send({ name: 'نام تازه', username: 'Amir_1', bio: 'سلام' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.user).toMatchObject({ name: 'نام تازه', username: 'amir_1', bio: 'سلام' });
    const dupUser = await api().patch('/api/users/me').set(b.auth).send({ username: 'amir_1' });
    expect(dupUser.status).toBe(409);
    const dupMail = await api().patch('/api/users/me').set(b.auth).send({ email: a.email });
    expect(dupMail.status).toBe(409);
  });

  test('فیلدهای ناشناس (مثل passwordHash) رد می‌شن', async () => {
    const u = await registerUser();
    const res = await api().patch('/api/users/me').set(u.auth).send({ passwordHash: 'x', name: 'خوب' });
    expect(res.status).toBe(400);
  });

  test('ذخیره‌ی تنظیمات و رد مقدار نامعتبر', async () => {
    const u = await registerUser();
    const ok = await api().patch('/api/users/me/settings').set(u.auth).send({ pageSize: 20, notifyNews: true });
    expect(ok.status).toBe(200);
    expect(ok.body.data.user.settings).toMatchObject({ pageSize: 20, notifyNews: true });
    expect((await api().patch('/api/users/me/settings').set(u.auth).send({ pageSize: 7 })).status).toBe(400);
  });
});

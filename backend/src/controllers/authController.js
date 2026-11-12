/* =========================================================
   authController.js — ثبت‌نام، ورود، خروج، رمز و حذف حساب
   ========================================================= */
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Link = require('../models/Link');
const Click = require('../models/Click');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../middleware/auth');

const BCRYPT_ROUNDS = 12; // هرچی بیشتر، هش کردن کندتر (و حمله‌ی حدسی سخت‌تر)

// برای ورود با ایمیل ناموجود هم یه مقایسه‌ی bcrypt انجام می‌دیم تا زمان پاسخ، وجود یا نبود ایمیل رو لو نده
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', BCRYPT_ROUNDS);

const authPayload = (user) => ({ token: signToken(user), user: user.toJSON() });

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.valid.body;
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  // اگه ایمیل تکراری باشه، ایندکس یکتا خطای 11000 می‌ده و errorHandler اون رو به ۴۰۹ تبدیل می‌کنه
  const user = await User.create({ name, email, passwordHash });
  res.status(201).json({ data: authPayload(user) });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.valid.body;
  const user = await User.findOne({ email }).select('+passwordHash +tokenVersion');
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) throw new AppError('ایمیل یا رمز عبور درست نیست.', 401, 'INVALID_CREDENTIALS');
  res.json({ data: authPayload(user) });
});

// توکن‌ها بدون وضعیت (stateless) هستن؛ پس «خروج» یعنی کلاینت توکنش رو دور می‌ریزه.
// این مسیر برای کامل بودن قرارداد API هست و درخواست ورود به همه‌ی دستگاه‌ها رو باطل نمی‌کنه.
exports.logout = (req, res) => res.status(204).end();

exports.me = (req, res) => res.json({ data: { user: req.user.toJSON() } });

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.valid.body;
  const user = await User.findById(req.user._id).select('+passwordHash +tokenVersion');
  if (!(await bcrypt.compare(currentPassword, user.passwordHash)))
    throw new AppError('رمز فعلی درست نیست.', 400, 'WRONG_PASSWORD', { currentPassword: 'رمز فعلی درست نیست.' });
  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  user.tokenVersion += 1; // همه‌ی توکن‌های قبلی باطل می‌شن
  await user.save();
  res.json({ data: authPayload(user) }); // توکن تازه برای دستگاه فعلی
});

exports.deleteAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await bcrypt.compare(req.valid.body.password, user.passwordHash)))
    throw new AppError('رمز عبور درست نیست.', 400, 'WRONG_PASSWORD', { password: 'رمز عبور درست نیست.' });
  await Promise.all([Click.deleteMany({ owner: user._id }), Link.deleteMany({ owner: user._id })]);
  await user.deleteOne();
  res.status(204).end();
});

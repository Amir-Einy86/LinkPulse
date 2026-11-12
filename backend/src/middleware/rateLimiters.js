/* =========================================================
   rateLimiters.js — محدودیت تعداد درخواست (Rate Limiting)
   جلوی حدس‌زدن رمز، ساخت انبوه لینک و فشار بیش‌ازحد رو می‌گیره.
   در حالت تست غیرفعاله تا تست‌ها گیر نکنن (خود محدودکننده جداگانه تست می‌شه).
   ========================================================= */
const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const make = (windowMs, limit, message, extra = {}) =>
  rateLimit({
    windowMs,
    limit: env.isTest && !extra.forceInTest ? 100000 : limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ error: { code: 'RATE_LIMITED', message } }),
  });

module.exports = {
  // کل API
  api: make(60 * 1000, 300, 'درخواست‌هات زیاد شد؛ یه دقیقه صبر کن.'),
  // ورود و ثبت‌نام: سخت‌گیرانه‌تر
  auth: make(15 * 60 * 1000, 20, 'تلاش‌های ورود/ثبت‌نام زیاد شد؛ ۱۵ دقیقه‌ی دیگه دوباره امتحان کن.'),
  // ساخت لینک
  createLink: make(60 * 60 * 1000, 60, 'تعداد لینک‌های ساخته‌شده در این ساعت زیاد شد؛ بعداً دوباره امتحان کن.'),
  // ریدایرکت‌ها (عمومی): سخاوتمندانه ولی نه بی‌نهایت
  redirect: make(60 * 1000, 600, 'درخواست‌ها زیاد شد؛ کمی بعد دوباره امتحان کن.'),
  // برای تست خود محدودکننده
  _make: make,
};

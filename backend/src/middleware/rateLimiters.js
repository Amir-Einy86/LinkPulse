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
  api: make(60 * 1000, 300, 'درخواست‌هات زیاد شد؛ یه دقیقه صبر کن.'),
  auth: make(15 * 60 * 1000, 20, 'تلاش‌های ورود/ثبت‌نام زیاد شد؛ ۱۵ دقیقه‌ی دیگه دوباره امتحان کن.'),
  createLink: make(60 * 60 * 1000, 60, 'تعداد لینک‌های ساخته‌شده در این ساعت زیاد شد؛ بعداً دوباره امتحان کن.'),
  redirect: make(60 * 1000, 600, 'درخواست‌ها زیاد شد؛ کمی بعد دوباره امتحان کن.'),
  _make: make,
};

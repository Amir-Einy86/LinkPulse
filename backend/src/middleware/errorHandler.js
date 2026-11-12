/* =========================================================
   errorHandler.js — مدیریت متمرکز خطاها
   همه‌ی خطاها (از هر جای برنامه) آخر سر به اینجا می‌رسن و با یه شکل ثابت جواب داده می‌شن:
   { "error": { "code": "...", "message": "...", "details": {...} } }
   جزئیات فنی (stack) هیچ‌وقت به کاربر نمی‌رسه.
   ========================================================= */
const AppError = require('../utils/AppError');
const env = require('../config/env');

const notFound = (req, res, next) =>
  next(new AppError('این آدرس توی API وجود نداره.', 404, 'NOT_FOUND'));

// تبدیل انواع خطاهای شناخته‌شده به AppError
function normalize(err) {
  if (err instanceof AppError) return err;

  // JSON خراب
  if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && 'body' in err))
    return new AppError('بدنه‌ی درخواست JSON معتبر نیست.', 400, 'BAD_JSON');
  if (err.type === 'entity.too.large') return new AppError('حجم درخواست زیاده.', 413, 'PAYLOAD_TOO_LARGE');

  // خطاهای Mongoose
  if (err.name === 'ValidationError' && err.errors) {
    const details = {};
    Object.entries(err.errors).forEach(([k, v]) => { details[k] = v.message; });
    return new AppError('اطلاعات واردشده معتبر نیست.', 400, 'VALIDATION_ERROR', details);
  }
  if (err.name === 'CastError') return new AppError('شناسه معتبر نیست.', 400, 'BAD_ID');
  // کد 11000 = تکراری بودن مقدار یه فیلد یکتا (unique index)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0];
    if (field === 'slug') return new AppError('این اسلاگ قبلاً گرفته شده؛ یکی دیگه انتخاب کن.', 409, 'SLUG_TAKEN', { slug: 'این اسلاگ قبلاً گرفته شده.' });
    if (field === 'email') return new AppError('با این ایمیل قبلاً ثبت‌نام شده.', 409, 'EMAIL_TAKEN', { email: 'با این ایمیل قبلاً ثبت‌نام شده.' });
    if (field === 'username') return new AppError('این نام کاربری قبلاً گرفته شده.', 409, 'USERNAME_TAKEN', { username: 'این نام کاربری قبلاً گرفته شده.' });
    return new AppError('این مقدار تکراریه.', 409, 'DUPLICATE');
  }
  return null;
}

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const known = normalize(err);
  if (known) {
    return res.status(known.status).json({ error: { code: known.code, message: known.message, ...(known.details ? { details: known.details } : {}) } });
  }
  // خطای پیش‌بینی‌نشده: توی لاگ سرور کامل ثبت می‌شه، ولی به کاربر فقط پیام کلی می‌رسه
  if (!env.isTest) console.error('[خطای پیش‌بینی‌نشده]', err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'یه مشکل از سمت سرور پیش اومد؛ کمی بعد دوباره امتحان کن.' } });
};

module.exports = { notFound, errorHandler };

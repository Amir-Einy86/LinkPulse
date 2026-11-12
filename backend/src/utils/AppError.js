/* AppError — خطایی که «انتظارش رو داریم» (مثلاً ۴۰۴ یا ۴۰۹) و پیامش به کاربر نشون داده می‌شه. */
class AppError extends Error {
  constructor(message, status = 500, code = 'ERROR', details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details; // مثلاً خطای هر فیلد فرم
    this.isOperational = true;
  }
}
module.exports = AppError;

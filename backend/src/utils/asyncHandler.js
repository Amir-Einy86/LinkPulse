/* asyncHandler — خطای هر تابع async رو می‌گیره و به میدلور خطا می‌فرسته، تا try/catch تکراری ننویسیم. */
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* =========================================================
   Link.js — مدل لینک کوتاه‌شده
   هر لینک به یه کاربر (owner) وصله. رابطه‌ی «یک به چند»: یه کاربر چند لینک.
   ========================================================= */
const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema(
  {
    // ارجاع (reference) به کاربر صاحب لینک؛ فقط شناسه‌ی اون رو نگه می‌داریم
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    // slug همیشه با حروف کوچکه تا «Demo» و «demo» یه لینک حساب بشن.
    // unique:true یه ایندکس یکتا می‌سازه؛ «دیتابیس» جلوی دو لینک با یه slug رو می‌گیره،
    // حتی اگه دو درخواست همزمان برسن (چک کردن توی کد به‌تنهایی کافی نیست).
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, minlength: 3, maxlength: 32 },
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    archived: { type: Boolean, default: false },
    // null = بدون انقضا
    expiresAt: { type: Date, default: null },
    // شمارنده‌ی کل کلیک‌ها. هر کلیک یه سند توی کالکشن Click هم داره،
    // ولی این عدد رو جدا نگه می‌داریم تا برای نمایش لیست، مجبور نباشیم هر بار همه‌ی کلیک‌ها رو بشماریم.
    clicks: { type: Number, default: 0, min: 0 },
    lastClickAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// برای «لینک‌های من» (فیلتر بر اساس صاحب + مرتب‌سازی جدیدترین): این ایندکس ترکیبی کوئری رو سریع می‌کنه
linkSchema.index({ owner: 1, createdAt: -1 });
linkSchema.index({ owner: 1, clicks: -1 });

// وضعیت لینک از روی فیلدها محاسبه می‌شه و جدا ذخیره نمی‌شه (تا هیچ‌وقت ناهماهنگ نشه)
linkSchema.methods.getStatus = function () {
  if (this.archived) return 'archived';
  if (this.expiresAt && this.expiresAt.getTime() <= Date.now()) return 'expired';
  return 'active';
};

linkSchema.set('toJSON', {
  virtuals: false,
  transform(doc, ret) {
    ret.id = String(ret._id);
    ret.owner = String(ret.owner);
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Link', linkSchema);

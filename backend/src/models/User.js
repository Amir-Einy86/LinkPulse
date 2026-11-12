/* =========================================================
   User.js — مدل کاربر
   «مدل» (Model) در Mongoose یعنی یه کلاس که با یه «کالکشن» (Collection)
   توی MongoDB وصله. «اسکیما» (Schema) هم شکل و قانون‌های هر سند (Document) رو
   مشخص می‌کنه: چه فیلدهایی داره، نوعشون چیه، کدوم‌ها اجباری‌ان و...
   ========================================================= */
const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    defaultExpiry: { type: String, enum: ['none', '1', '7', '30', '90'], default: 'none' },
    pageSize: { type: Number, enum: [6, 10, 20], default: 6 },
    notifyMilestone: { type: Boolean, default: true },
    notifyExpiry: { type: Boolean, default: true },
    notifyNews: { type: Boolean, default: false },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    // ایمیل همیشه با حروف کوچک ذخیره می‌شه تا «A@x.com» و «a@x.com» دو حساب جدا نشن
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    // sparse: چند کاربر می‌تونن username نداشته باشن، ولی اگه دارن یکتا باشه
    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true, match: /^[a-z0-9_]{3,24}$/ },
    bio: { type: String, trim: true, maxlength: 160, default: '' },
    // هش رمز؛ select:false یعنی تا صریحاً نخوای توی کوئری‌ها برنمی‌گرده
    passwordHash: { type: String, required: true, select: false },
    // با هر تغییر رمز یکی بیشتر می‌شه و توکن‌های قدیمی باطل می‌شن
    tokenVersion: { type: Number, default: 0, select: false },
    settings: { type: settingsSchema, default: () => ({}) },
  },
  { timestamps: true } // createdAt و updatedAt رو خودش پر می‌کنه
);

// وقتی کاربر رو به JSON تبدیل می‌کنیم، فیلدهای حساس هیچ‌وقت بیرون نمی‌رن
userSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    delete ret.tokenVersion;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);

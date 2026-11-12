/* =========================================================
   Click.js — یه سند به ازای هر کلیک
   فقط اطلاعات تحلیلی ذخیره می‌کنیم: آدرس IP و User-Agent خام ذخیره نمی‌شن.
   ========================================================= */
const mongoose = require('mongoose');
const env = require('../config/env');

const clickSchema = new mongoose.Schema(
  {
    link: { type: mongoose.Schema.Types.ObjectId, ref: 'Link', required: true },
    // owner رو اینجا هم نگه می‌داریم تا آمار کل داشبورد بدون join (پیوند بین کالکشن‌ها) درآد
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    at: { type: Date, default: Date.now },
    source: { type: String, enum: ['direct', 'search', 'social', 'other'], default: 'direct' },
    refHost: { type: String, default: '', maxlength: 100 },
    device: { type: String, enum: ['desktop', 'mobile', 'tablet'], default: 'desktop' },
    browser: { type: String, enum: ['chrome', 'safari', 'firefox', 'edge', 'other'], default: 'other' },
    country: { type: String, default: 'XX', uppercase: true, maxlength: 2 },
    // هش یک‌طرفه از (IP + مرورگر + نمک روزانه). برای شمردن «بازدیدکننده‌ی یکتا» به کار می‌ره و از روش
    // نمی‌شه IP رو برگردوند. چون نمک هر روز عوض می‌شه، آدمی که چند روز بیاد، چند بار شمرده می‌شه.
    visitor: { type: String, default: '', maxlength: 32 },
  },
  { versionKey: false }
);

clickSchema.index({ link: 1, at: -1 }); // آمار یک لینک
clickSchema.index({ owner: 1, at: -1 }); // آمار کل داشبورد
// TTL index: مونگو خودش سندهایی که از «at + مدت» گذشتن رو پاک می‌کنه
clickSchema.index({ at: 1 }, { expireAfterSeconds: env.clickRetentionDays * 86400 });

module.exports = mongoose.model('Click', clickSchema);

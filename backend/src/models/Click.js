const mongoose = require('mongoose');
const env = require('../config/env');

const clickSchema = new mongoose.Schema(
  {
    link: { type: mongoose.Schema.Types.ObjectId, ref: 'Link', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    at: { type: Date, default: Date.now },
    source: { type: String, enum: ['direct', 'search', 'social', 'other'], default: 'direct' },
    refHost: { type: String, default: '', maxlength: 100 },
    device: { type: String, enum: ['desktop', 'mobile', 'tablet'], default: 'desktop' },
    browser: { type: String, enum: ['chrome', 'safari', 'firefox', 'edge', 'other'], default: 'other' },
    country: { type: String, default: 'XX', uppercase: true, maxlength: 2 },
    visitor: { type: String, default: '', maxlength: 32 },
  },
  { versionKey: false }
);

clickSchema.index({ link: 1, at: -1 });
clickSchema.index({ owner: 1, at: -1 });
clickSchema.index({ at: 1 }, { expireAfterSeconds: env.clickRetentionDays * 86400 });

module.exports = mongoose.model('Click', clickSchema);

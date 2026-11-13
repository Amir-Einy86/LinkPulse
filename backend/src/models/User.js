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
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true, match: /^[a-z0-9_]{3,24}$/ },
    bio: { type: String, trim: true, maxlength: 160, default: '' },
    passwordHash: { type: String, required: true, select: false },
    tokenVersion: { type: Number, default: 0, select: false },
    settings: { type: settingsSchema, default: () => ({}) },
  },
  { timestamps: true }
);

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

const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, minlength: 3, maxlength: 32 },
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    archived: { type: Boolean, default: false },
    expiresAt: { type: Date, default: null },
    clicks: { type: Number, default: 0, min: 0 },
    lastClickAt: { type: Date, default: null },
  },
  { timestamps: true }
);

linkSchema.index({ owner: 1, createdAt: -1 });
linkSchema.index({ owner: 1, clicks: -1 });

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

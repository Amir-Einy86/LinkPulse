const User = require('../models/User');
const Link = require('../models/Link');
const asyncHandler = require('../utils/asyncHandler');

exports.getProfile = asyncHandler(async (req, res) => {
  const [totalLinks, agg] = await Promise.all([
    Link.countDocuments({ owner: req.user._id }),
    Link.aggregate([{ $match: { owner: req.user._id } }, { $group: { _id: null, clicks: { $sum: '$clicks' } } }]),
  ]);
  res.json({ data: { user: req.user.toJSON(), totals: { links: totalLinks, clicks: agg[0] ? agg[0].clicks : 0 } } });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const patch = req.valid.body;
  ['name', 'email', 'username', 'bio'].forEach((k) => {
    if (patch[k] === undefined) return;
    if (k === 'username' && patch[k] === null) req.user.set('username', undefined);
    else req.user.set(k, patch[k]);
  });
  await req.user.save();
  res.json({ data: { user: req.user.toJSON() } });
});

exports.updateSettings = asyncHandler(async (req, res) => {
  Object.entries(req.valid.body).forEach(([k, v]) => req.user.set(`settings.${k}`, v));
  await req.user.save();
  res.json({ data: { user: req.user.toJSON() } });
});

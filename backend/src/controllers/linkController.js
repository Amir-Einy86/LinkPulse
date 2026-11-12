/* =========================================================
   linkController.js — مدیریت لینک‌ها (فقط لینک‌های خود کاربر)
   قانون طلایی: هر کوئری روی لینک‌ها حتماً شرط «owner: req.user._id» داره.
   اگه لینکی مال کاربر دیگه‌ای باشه، جواب ۴۰۴ می‌دیم (نه ۴۰۳) تا وجودش لو نره.
   ========================================================= */
const Link = require('../models/Link');
const Click = require('../models/Click');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { serializeLink } = require('../utils/serialize');
const { randomSlug, isReserved } = require('../utils/slug');
const { isSelfUrl } = require('../utils/url');
const { toCSV } = require('../utils/csv');

const MAX_LINKS_PER_USER = 1000;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } };

function buildFilter(owner, { q, status }) {
  const filter = { owner };
  const now = new Date();
  if (status === 'active') Object.assign(filter, { archived: false, $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] });
  else if (status === 'expired') Object.assign(filter, { archived: false, expiresAt: { $lte: now, $ne: null } });
  else if (status === 'archived') filter.archived = true;
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i'); // escape: ورودی کاربر هیچ‌وقت به‌عنوان regex اجرا نمی‌شه
    const search = [{ title: rx }, { slug: rx }, { url: rx }];
    filter.$and = [...(filter.$and || []), { $or: search }];
  }
  return filter;
}

const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  clicks: { clicks: -1, _id: -1 },
  title: { title: 1, _id: 1 },
};

// خلاصه‌ی آمار لینک‌های کاربر (برای کارت‌های بالای صفحه)
async function summarize(owner) {
  const now = new Date();
  const [row] = await Link.aggregate([
    { $match: { owner } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        clicks: { $sum: '$clicks' },
        archived: { $sum: { $cond: ['$archived', 1, 0] } },
        expired: { $sum: { $cond: [{ $and: [{ $eq: ['$archived', false] }, { $ne: ['$expiresAt', null] }, { $lte: ['$expiresAt', now] }] }, 1, 0] } },
      },
    },
  ]);
  const s = row || { total: 0, clicks: 0, archived: 0, expired: 0 };
  const top = await Link.findOne({ owner }).sort({ clicks: -1, _id: 1 }).lean();
  return {
    total: s.total, clicks: s.clicks, archived: s.archived, expired: s.expired,
    active: s.total - s.archived - s.expired,
    topLink: top && top.clicks > 0 ? serializeLink(top) : null,
  };
}

exports.summarize = summarize;
exports.list = asyncHandler(async (req, res) => {
  const { q, status, sort, page, limit } = req.valid.query;
  const filter = buildFilter(req.user._id, { q, status });
  const [items, total, summary] = await Promise.all([
    Link.find(filter).sort(SORTS[sort]).skip((page - 1) * limit).limit(limit).lean(),
    Link.countDocuments(filter),
    summarize(req.user._id),
  ]);
  res.json({
    data: { links: items.map(serializeLink), summary },
    meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  });
});

exports.exportCsv = asyncHandler(async (req, res) => {
  const { q, status, sort } = req.valid.query;
  const items = await Link.find(buildFilter(req.user._id, { q, status })).sort(SORTS[sort]).limit(5000).lean();
  const STATUS = { active: 'فعال', expired: 'منقضی‌شده', archived: 'آرشیو' };
  const rows = [['عنوان', 'لینک کوتاه', 'آدرس مقصد', 'تعداد کلیک', 'وضعیت', 'تاریخ ساخت', 'تاریخ انقضا']];
  items.map(serializeLink).forEach((l) => rows.push([l.title, l.shortUrl, l.url, l.clicks, STATUS[l.status], l.createdAt, l.expiresAt || '']));
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="linkpulse-links.csv"' }).send(toCSV(rows));
});

exports.get = asyncHandler(async (req, res) => {
  const link = await Link.findOne({ _id: req.valid.params.id, owner: req.user._id });
  if (!link) throw new AppError('این لینک پیدا نشد.', 404, 'LINK_NOT_FOUND');
  res.json({ data: { link: serializeLink(link) } });
});

exports.create = asyncHandler(async (req, res) => {
  const { url, title, slug, expiresAt } = req.valid.body;
  if (isSelfUrl(url, env.baseUrl)) throw new AppError('نمی‌تونی آدرس خود لینک‌پالس رو کوتاه کنی.', 400, 'SELF_URL', { url: 'نمی‌تونی آدرس خود لینک‌پالس رو کوتاه کنی.' });
  if ((await Link.countDocuments({ owner: req.user._id })) >= MAX_LINKS_PER_USER)
    throw new AppError(`حداکثر ${MAX_LINKS_PER_USER} لینک می‌تونی داشته باشی.`, 403, 'LINK_LIMIT');

  const base = { owner: req.user._id, url, title: title || hostOf(url), expiresAt: expiresAt || null };

  let link;
  if (slug) {
    // slug دلخواه: اگه تکراری باشه، ایندکس یکتا خطای 11000 می‌ده → ۴۰۹ با پیام فارسی
    link = await Link.create({ ...base, slug });
  } else {
    // slug تصادفی: اگه تصادفاً تکراری شد، دوباره امتحان می‌کنیم
    for (let i = 0; i < 6 && !link; i++) {
      const candidate = randomSlug(6 + Math.floor(i / 2));
      if (isReserved(candidate)) continue;
      try { link = await Link.create({ ...base, slug: candidate }); } catch (e) { if (e.code !== 11000) throw e; }
    }
    if (!link) throw new AppError('ساخت slug تصادفی نشد؛ دوباره امتحان کن.', 503, 'SLUG_GENERATION_FAILED');
  }
  res.status(201).json({ data: { link: serializeLink(link) } });
});

exports.update = asyncHandler(async (req, res) => {
  const link = await Link.findOne({ _id: req.valid.params.id, owner: req.user._id });
  if (!link) throw new AppError('این لینک پیدا نشد.', 404, 'LINK_NOT_FOUND');
  const patch = req.valid.body;
  if (patch.url && isSelfUrl(patch.url, env.baseUrl)) throw new AppError('نمی‌تونی آدرس خود لینک‌پالس رو کوتاه کنی.', 400, 'SELF_URL', { url: 'نمی‌تونی آدرس خود لینک‌پالس رو کوتاه کنی.' });
  ['url', 'title', 'slug', 'expiresAt', 'archived'].forEach((k) => { if (patch[k] !== undefined) link.set(k, patch[k]); });
  await link.save();
  res.json({ data: { link: serializeLink(link) } });
});

async function deleteLinks(filter) {
  const ids = (await Link.find(filter).select('_id').lean()).map((l) => l._id);
  if (!ids.length) return 0;
  await Click.deleteMany({ link: { $in: ids } });
  await Link.deleteMany({ _id: { $in: ids } });
  return ids.length;
}

exports.remove = asyncHandler(async (req, res) => {
  const n = await deleteLinks({ _id: req.valid.params.id, owner: req.user._id });
  if (!n) throw new AppError('این لینک پیدا نشد.', 404, 'LINK_NOT_FOUND');
  res.status(204).end();
});

exports.bulkRemove = asyncHandler(async (req, res) => {
  const deleted = await deleteLinks({ _id: { $in: req.valid.body.ids }, owner: req.user._id });
  res.json({ data: { deleted } });
});

exports.removeAll = asyncHandler(async (req, res) => {
  const deleted = await deleteLinks({ owner: req.user._id });
  res.json({ data: { deleted } });
});

exports.checkSlug = asyncHandler(async (req, res) => {
  const { slug, exceptId } = req.valid.query;
  const { isValidSlug } = require('../utils/slug');
  if (!isValidSlug(slug)) return res.json({ data: { available: false, reason: 'invalid' } });
  if (isReserved(slug)) return res.json({ data: { available: false, reason: 'reserved' } });
  const found = await Link.findOne({ slug }).select('_id').lean();
  res.json({ data: { available: !found || String(found._id) === exceptId, reason: found && String(found._id) !== exceptId ? 'taken' : null } });
});

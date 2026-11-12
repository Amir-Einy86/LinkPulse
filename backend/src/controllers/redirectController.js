/* =========================================================
   redirectController.js — باز کردن لینک کوتاه: GET /:slug
   مهم‌ترین مسیر عمومی برنامه (بدون نیاز به ورود).
   - فقط به آدرس‌هایی ریدایرکت می‌کنیم که موقع ساخت لینک اعتبارسنجی شدن (http/https).
   - هیچ‌وقت خودمون به آدرس مقصد درخواست نمی‌زنیم.
   - ریدایرکت ۳۰۲ (موقت) می‌دیم نه ۳۰۱؛ وگرنه مرورگر نتیجه رو کش می‌کنه و کلیک‌های بعدی دیده نمی‌شن.
   ========================================================= */
const path = require('path');
const fs = require('fs');
const Link = require('../models/Link');
const Click = require('../models/Click');
const env = require('../config/env');
const asyncHandler = require('../utils/asyncHandler');
const { SLUG_RE } = require('../utils/slug');
const { fromRequest, isBot } = require('../utils/clickInfo');

const selfHost = (() => { try { return new URL(env.baseUrl).hostname; } catch (e) { return ''; } })();

function sendNotFoundPage(res, status, reason) {
  const file = path.join(env.frontendDir, '404.html');
  res.status(status).set('Cache-Control', 'no-store');
  if (fs.existsSync(file)) return res.sendFile(file);
  return res.type('text').send(reason);
}

// ثبت کلیک بعد از ارسال ریدایرکت (کاربر منتظر دیتابیس نمی‌مونه). خطاها فقط لاگ می‌شن.
function recordClick(link, req) {
  Promise.all([
    Click.create({ link: link._id, owner: link.owner, ...fromRequest(req, selfHost) }),
    Link.updateOne({ _id: link._id }, { $inc: { clicks: 1 }, $set: { lastClickAt: new Date() } }),
  ]).catch((e) => { if (!env.isTest) console.error('[ثبت کلیک ناموفق]', e.message); });
}

exports.redirect = asyncHandler(async (req, res, next) => {
  const slug = String(req.params.slug || '').toLowerCase();
  if (!SLUG_RE.test(slug)) return next(); // چیزی شبیه slug نیست؛ بره سراغ ۴۰۴ عادی

  const link = await Link.findOne({ slug }).select('url owner archived expiresAt').lean();
  if (!link) return sendNotFoundPage(res, 404, 'لینک پیدا نشد.');
  if (link.archived) return sendNotFoundPage(res, 410, 'این لینک غیرفعال شده.');
  if (link.expiresAt && link.expiresAt.getTime() <= Date.now()) return sendNotFoundPage(res, 410, 'این لینک منقضی شده.');

  if (req.method === 'GET' && !isBot(req.get('user-agent'))) recordClick(link, req);
  res.set('Cache-Control', 'no-store').redirect(302, link.url);
});

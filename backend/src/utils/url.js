/* =========================================================
   url.js — اعتبارسنجی امن آدرس مقصد
   فقط http و https. هیچ‌وقت خودمون به این آدرس درخواست نمی‌زنیم (جلوگیری از SSRF).
   ========================================================= */
function normalizeUrl(input) {
  let raw = String(input || '').trim();
  if (!raw || /\s/.test(raw)) return null;
  // اگه پروتکل نداشت (مثلاً example.com/x) https اضافه می‌کنیم
  if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) raw = 'https://' + raw;
  let u;
  try { u = new URL(raw); } catch (e) { return null; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null; // javascript:, data:, file: و... رد می‌شن
  if (u.username || u.password) return null; // آدرس‌های user:pass@host برای فیشینگ استفاده می‌شن
  if (!u.hostname || !u.hostname.includes('.')) return null; // localhost و نام‌های بدون نقطه رد می‌شن
  return u.href;
}

// آدرس خود سرویس رو نمی‌خوایم کوتاه بشه (جلوگیری از حلقه‌ی ریدایرکت)
function isSelfUrl(url, baseUrl) {
  try { return new URL(url).host.toLowerCase() === new URL(baseUrl).host.toLowerCase(); } catch (e) { return false; }
}

module.exports = { normalizeUrl, isSelfUrl };

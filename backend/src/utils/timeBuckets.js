/* =========================================================
   timeBuckets.js — ساخت «سطل‌های زمانی» (روز/ساعت) برای نمودارها
   روزها بر اساس منطقه‌ی زمانی کاربر حساب می‌شن (مثلاً Asia/Tehran)، نه UTC؛
   وگرنه کلیک ساعت ۲ بامداد ایران توی «دیروز» می‌افتاد.
   کلیدها رشته‌ان: «2026-10-30» برای روز و «2026-10-30T14» برای ساعت.
   ========================================================= */
const pad = (n) => String(n).padStart(2, '0');

function localParts(date, tz) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const o = {};
  parts.forEach((p) => { o[p.type] = p.value; });
  return o;
}

const dayKeyOf = (date, tz) => { const p = localParts(date, tz); return `${p.year}-${p.month}-${p.day}`; };
const hourKeyOf = (date, tz) => { const p = localParts(date, tz); return `${p.year}-${p.month}-${p.day}T${p.hour}`; };

// جمع/تفریق روز روی «رشته‌ی تاریخ» (بدون دردسر ساعت تابستانی)
function addDays(key, n) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
const diffDays = (a, b) => Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 864e5);

// لیست N کلید روز منتهی به امروز (قدیمی‌ترین اول)
function lastDayKeys(n, tz, now = new Date()) {
  const today = dayKeyOf(now, tz);
  return Array.from({ length: n }, (_, i) => addDays(today, i - (n - 1)));
}

function lastHourKeys(n, tz, now = new Date()) {
  const keys = [];
  for (let i = n - 1; i >= 0; i--) {
    const k = hourKeyOf(new Date(now.getTime() - i * 3600e3), tz);
    if (keys[keys.length - 1] !== k) keys.push(k);
  }
  return keys;
}

// عبارت Mongo برای ساخت کلید از فیلد at
const mongoKey = (unit, tz) => ({
  $dateToString: { date: '$at', timezone: tz, format: unit === 'hour' ? '%Y-%m-%dT%H' : '%Y-%m-%d' },
});

module.exports = { dayKeyOf, hourKeyOf, addDays, diffDays, lastDayKeys, lastHourKeys, mongoKey };

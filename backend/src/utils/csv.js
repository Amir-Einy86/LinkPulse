/* csv.js — ساخت CSV امن. سلول‌هایی که با = + - @ شروع می‌شن (حمله‌ی «Formula Injection» در اکسل) با ' خنثی می‌شن. */
function cell(v) {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const toCSV = (rows) => '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n'); // BOM تا اکسل فارسی رو درست نشون بده
module.exports = { toCSV, cell };

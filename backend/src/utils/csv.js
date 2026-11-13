function cell(v) {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const toCSV = (rows) => '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n');
module.exports = { toCSV, cell };

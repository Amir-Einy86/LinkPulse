function normalizeUrl(input) {
  let raw = String(input || '').trim();
  if (!raw || /\s/.test(raw)) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) raw = 'https://' + raw;
  let u;
  try { u = new URL(raw); } catch (e) { return null; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  if (u.username || u.password) return null;
  if (!u.hostname || !u.hostname.includes('.')) return null;
  return u.href;
}

function isSelfUrl(url, baseUrl) {
  try { return new URL(url).host.toLowerCase() === new URL(baseUrl).host.toLowerCase(); } catch (e) { return false; }
}

module.exports = { normalizeUrl, isSelfUrl };

/* =========================================================
   slug.js — قانون‌های slug (بخش آخر لینک کوتاه)
   همین قانون‌ها توی فرانت‌اند (utils.js) هم هست؛ ولی اعتبار نهایی با سرور.
   ========================================================= */
const crypto = require('crypto');

// اینا با مسیرهای خود برنامه تداخل دارن و نباید slug بشن
const RESERVED_SLUGS = [
  'login', 'register', 'dashboard', 'settings', 'profile', 'api', 'admin', 'my-links',
  'link-details', 'index', '404', 'assets', 'css', 'js', 'static', 'docs', 'health',
  'favicon', 'robots', 'logout', 'null', 'undefined',
];
const SLUG_RE = /^[a-z0-9][a-z0-9_-]{2,31}$/;
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'; // بدون حرف‌های گیج‌کننده مثل l و o

const isValidSlug = (s) => SLUG_RE.test(s);
const isReserved = (s) => RESERVED_SLUGS.includes(s);

function randomSlug(len = 6) {
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

module.exports = { RESERVED_SLUGS, SLUG_RE, isValidSlug, isReserved, randomSlug };

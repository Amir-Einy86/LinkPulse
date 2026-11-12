/* =========================================================
   landing.js — صفحه‌ی اصلی (لندینگ)
   فرم کوتاه‌کننده: اگه وارد شده باشی لینک واقعی می‌سازه؛ وگرنه آدرس رو نگه می‌داره و می‌ره ثبت‌نام.
   ========================================================= */
(function () {
  'use strict';
  const LP = window.LP;
  const $ = LP.$;

  /* ---------- فرم کوتاه‌کننده ---------- */
  const form = $('#shortenForm');
  const input = $('#urlInput');
  const resultBox = $('#resultBox');
  let created = null;

  const showError = (msg) => { LP.ui.setError(input, msg); input.focus(); };
  const clearError = () => LP.ui.clearError(input);
  input.addEventListener('input', clearError);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();
    resultBox.hidden = true;
    if (!input.value.trim()) return showError('اول یه لینک وارد کن.');
    const clean = LP.normalizeUrl(input.value);
    if (!clean) return showError('این آدرس معتبر نیست. فقط آدرس‌های http و https قبول می‌شن؛ مثلاً https://example.com/page');

    // مهمان: آدرس رو نگه می‌داریم تا بعد از ثبت‌نام، پنجره‌ی ساخت لینک با همین آدرس باز بشه
    if (!LP.session.isLoggedIn()) {
      LP.store.set('pending-url', clean);
      return LP.go('register.html');
    }

    const btn = $('#shortenBtn');
    LP.ui.busy(btn, true, 'صبر کن…');
    try {
      created = (await LP.api.post('/links', { url: clean })).data.link;
    } catch (err) {
      LP.ui.busy(btn, false);
      return showError(err.message);
    }
    LP.ui.busy(btn, false);

    $('#shortResult').textContent = created.shortUrl.replace(/^https?:\/\//, '');
    $('#copyLabel').textContent = 'کپی';
    $('#copyIcon').textContent = 'content_copy';
    resultBox.hidden = false;
    resultBox.classList.remove('flash');
    void resultBox.offsetWidth; // برای شروع دوباره‌ی انیمیشن
    resultBox.classList.add('flash');
  });

  $('#copyBtn').addEventListener('click', async () => {
    const ok = await LP.copy(created ? created.shortUrl : $('#shortResult').textContent);
    if (!ok) return LP.ui.toast('کپی نشد؛ خودت انتخابش کن.', 'error');
    $('#copyLabel').textContent = 'کپی شد!';
    $('#copyIcon').textContent = 'check';
    setTimeout(() => { $('#copyLabel').textContent = 'کپی'; $('#copyIcon').textContent = 'content_copy'; }, 2000);
  });

  /* ---------- نمودار نمونه ---------- */
  const demoValues = [212, 260, 241, 305, 288, 352, 330, 410, 372, 455, 421, 498, 470, 540];
  const labels = demoValues.map((_, i) => LP.fmtShort(Date.now() - (demoValues.length - 1 - i) * 864e5));
  LP.charts.line($('#demoChart'), { labels, values: demoValues, ariaLabel: 'نمودار نمونه‌ی کلیک‌ها' });

  /* ---------- منوی موبایل ---------- */
  const toggle = $('#navToggle');
  const nav = $('#siteNav');
  function setNav(open) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.icon').textContent = open ? 'close' : 'menu';
  }
  toggle.addEventListener('click', () => setNav(!nav.classList.contains('is-open')));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setNav(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setNav(false); });

  /* ---------- سایه‌ی هدر هنگام اسکرول ---------- */
  const header = $('#siteHeader');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- ظاهر شدن نرم بخش‌ها هنگام اسکرول ---------- */
  const items = LP.$$('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    items.forEach((el) => io.observe(el));
  } else {
    items.forEach((el) => el.classList.add('is-in'));
  }
})();

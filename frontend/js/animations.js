/* =========================================================
   animations.js — ظاهر شدن موقع اسکرول، شمارش عددها، کشیدن نمودارها
   و واکنش‌های کوچیک. همه‌ی کدهای حرکتی جاوااسکریپت اینجاست.
   این فایل داخل <head> لود می‌شه تا کلاس «js» قبل از نمایش صفحه
   اضافه بشه (وگرنه محتوا یه لحظه دیده می‌شه و بعد مخفی می‌شه).
   ========================================================= */
(function () {
  'use strict';

  /* ---------- ۱) علامت «جاوااسکریپت کار می‌کنه» ---------- */
  const html = document.documentElement;
  html.classList.add('js');

  const motion = (window.LPMotion = window.LPMotion || {});
  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = (motion.reduced = () => reduceQuery.matches);

  // منحنی‌ها و مدت‌ها برای Web Animations API (هم‌خوان با توکن‌های CSS)
  const EASE_OUT = 'cubic-bezier(0.2, 0.7, 0.2, 1)';
  const EASE_IN_OUT = 'cubic-bezier(0.65, 0, 0.35, 1)';

  /* =========================================================
     ۲) دستورهای صحنه (Recipes): کدوم بخش‌ها چطوری ظاهر بشن.
     group  = ظرفی که بچه‌هاش پله‌ای میان
     items  = کدوم بچه‌ها (پیش‌فرض: همه‌ی بچه‌های مستقیم)
     variant = up | fade | scale
     به این شکل لازم نیست به HTML صفحه‌ها چیزی اضافه کنیم.
     ========================================================= */
  const RECIPES = [
    // لندینگ
    { group: '.hero-copy', variant: 'up' },
    { group: '.faq', variant: 'up' },
    // ورود، ثبت‌نام، ۴۰۴
    { group: '.auth-box', variant: 'up' },
    { group: '.auth-aside', variant: 'up' },
    { group: '.auth-points', variant: 'up' },
    { group: '.nf-body', variant: 'up' },
    // پنل: بخش‌های اصلی صفحه، و فهرست‌های داخلشون
    { group: '.page', variant: 'up' },
    { group: '.top-links', variant: 'up' },
    { group: '.timeline', variant: 'up' },
    { group: '.legend', variant: 'fade' },
    { group: '#countryList', variant: 'up' },
    { group: '#deviceBars', variant: 'fade' },
    { group: '.settings-grid > .stack', variant: 'up' },
    { group: '.grid-profile', variant: 'up' },
  ];
  // تیترهایی که خط به خط از پشت لبه بالا میان
  const LINE_HEADINGS = '.hero-title, .section-head h2, .split-head h2, .cta h2, .auth-box h1, .auth-aside h2, .nf-body h1, .page-head h1';

  const SELECTOR = '.reveal, [data-reveal]';
  const MAX_INDEX = 8; // آیتم‌های بعد از هشتمی دیگه تأخیر بیشتری نمی‌گیرن

  // مثل querySelectorAll، ولی اگه خود root هم با selector جور باشه، اونم برمی‌گردونه
  function all(root, sel) {
    const list = Array.from(root.querySelectorAll(sel));
    if (root.nodeType === 1 && root.matches(sel)) list.unshift(root);
    return list;
  }

  /* ---------- ۳) سیستم ظاهر شدن ---------- */
  let observer = null;

  function reveal(el) {
    el.classList.add('is-in');
    if (observer) observer.unobserve(el);
  }

  function numberGroup(group) {
    let i = 0;
    Array.from(group.children).forEach((child) => {
      if (child.matches(SELECTOR)) child.style.setProperty('--i', Math.min(i++, MAX_INDEX));
    });
  }

  // دستورها رو روی صفحه پیاده کن: به بچه‌ها data-reveal بده (اگه از قبل نداشتن)
  function applyRecipes(root) {
    RECIPES.forEach((r) => {
      all(root, r.group).forEach((group) => {
        group.setAttribute('data-stagger', '');
        Array.from(group.children).forEach((child) => {
          if (child.matches(SELECTOR) || child.matches('script, template, .lp-bg, .seg-indicator')) return;
          child.setAttribute('data-reveal', r.variant);
        });
      });
    });

    // ردیف‌های جدول: فقط بار اول، حداکثر ۱۰ ردیف
    all(root, '.table tbody').forEach((tbody) => {
      const card = tbody.closest('.card') || tbody.parentElement;
      if (card.hasAttribute('data-rows-done')) return;
      card.setAttribute('data-rows-done', '');
      tbody.setAttribute('data-stagger', '');
      tbody.style.setProperty('--stagger', '35ms');
      Array.from(tbody.children).slice(0, 10).forEach((tr) => tr.setAttribute('data-reveal', 'fade'));
    });

    splitLines(root);
  }

  function watch(scope) {
    const root = scope || document;
    if (root !== document && root.nodeType !== 1) return;
    applyRecipes(root === document ? document : root.parentElement || root);

    const groups = new Set(root.querySelectorAll('[data-stagger]'));
    if (root !== document) {
      if (root.matches('[data-stagger]')) groups.add(root);
      const parentGroup = root.parentElement && root.parentElement.closest('[data-stagger]');
      if (parentGroup) groups.add(parentGroup);
    }
    groups.forEach(numberGroup);

    const items = Array.from(root.querySelectorAll(SELECTOR));
    if (root !== document && root.matches(SELECTOR)) items.unshift(root);
    items.forEach((el) => {
      if (el.classList.contains('is-in') || el.hasAttribute('data-reveal-bound')) return;
      el.setAttribute('data-reveal-bound', '');
      // حتی با «حرکت کمتر» هم منتظر اسکرول می‌مونیم، چون CSS اون موقع فقط محو می‌کنه
      if (!observer) reveal(el);
      else observer.observe(el);
    });

    prepareCharts(root);
    prepareCounters(root);
    prepareSegs(root);
  }
  motion.watch = watch;

  /* ---------- ۴) تیترها: هر خط داخل یه «پوشش» ---------- */
  function splitLines(root) {
    all(root, LINE_HEADINGS).forEach((h) => {
      if (h.classList.contains('line-host') || !h.textContent.trim()) return;
      const parts = h.innerHTML.split(/<br\s*\/?>/i);
      h.innerHTML = parts
        .map((p, i) => `<span class="line-mask"><span class="line-inner" style="--line:${i}">${p.trim()}</span></span>`)
        .join('');
      h.classList.add('line-host');
      // اگه هیچ والد ظاهرشونده‌ای نداره، خودش ماشه‌ی حرکت باشه
      if (!h.closest(SELECTOR)) h.setAttribute('data-reveal', 'lines');
    });
  }

  /* ---------- ۵) شمارش عددها از صفر ---------- */
  const FA = '۰۱۲۳۴۵۶۷۸۹';
  const toLatin = (s) => s.replace(/[۰-۹]/g, (d) => FA.indexOf(d));
  const NUMBER_RE = /^[\d۰-۹٬,]+([٫.][\d۰-۹]+)?(٪)?$/;
  const COUNTERS = '.kpi-value, .mock-stat b, .profile-stats b';
  let counterObserver = null;

  function parseNumber(text) {
    const t = text.trim();
    if (!NUMBER_RE.test(t)) return null;
    const pct = t.endsWith('٪');
    const core = toLatin(t.replace('٪', '')).replace(/[٬,]/g, '').replace('٫', '.');
    const decimals = (core.split('.')[1] || '').length;
    const value = parseFloat(core);
    return isNaN(value) ? null : { value, decimals, pct };
  }

  // el.__lpTarget = آخرین متنی که خود صفحه نوشته (عدد درست)
  // el.__lpShown  = عددی که الان روی صفحه دیده می‌شه (وسط شمارش)
  // el.__lpRun    = شماره‌ی اجرای فعلی؛ با شروع اجرای جدید، اجرای قبلی خودش متوقف می‌شه
  function runCounter(el) {
    const finalText = el.__lpTarget;
    const n = parseNumber(finalText || '');
    const run = (el.__lpRun = (el.__lpRun || 0) + 1);
    if (!n || reduced()) { el.__lpShown = n ? n.value : null; return; }
    const from = el.__lpShown != null ? el.__lpShown : 0;
    if (from === n.value) return;
    const fmt = new Intl.NumberFormat('fa-IR', { minimumFractionDigits: n.decimals, maximumFractionDigits: n.decimals });
    const dur = 700;
    const t0 = performance.now();
    function write(text) { el.__lpWritten = text; el.textContent = text; }
    function step(now) {
      if (run !== el.__lpRun) return; // یه اجرای جدیدتر شروع شده
      const t = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - t, 3); // آروم شدن در پایان
      if (t < 1) {
        el.__lpShown = from + (n.value - from) * e;
        write(fmt.format(el.__lpShown) + (n.pct ? '٪' : ''));
        requestAnimationFrame(step);
      } else {
        el.__lpShown = n.value;
        write(finalText); // متن دقیق اصلی، بدون هیچ تفاوتی
      }
    }
    requestAnimationFrame(step);
  }

  function prepareCounters(root) {
    all(root, COUNTERS).forEach((el) => {
      if (el.__lpCounter || el.children.length) return;
      el.__lpCounter = true;
      el.__lpTarget = el.textContent;
      if (!counterObserver) { el.__lpSeen = true; runCounter(el); }
      else counterObserver.observe(el);
    });
  }

  // وقتی خود صفحه عدد رو عوض کرد (مثلاً بازه‌ی ۷ به ۳۰ روز)، از عدد فعلی تا عدد جدید بشمار
  function onCounterText(el) {
    if (el.textContent === el.__lpWritten) return; // این تغییر کار خودمون بود
    el.__lpTarget = el.textContent;
    if (el.__lpSeen) runCounter(el); // اگه هنوز دیده نشده، IntersectionObserver شروعش می‌کنه
  }

  /* ---------- ۶) کشیدن نمودارها ---------- */
  let chartObserver = null;

  function prepareCharts(root) {
    all(root, '.chart svg, svg.spark, .donut svg, .bar-fill, .nf-line').forEach((el) => {
      if (el.__lpChart) return;
      el.__lpChart = true;
      if (reduced()) return;
      hideChart(el);
      if (chartObserver) chartObserver.observe(el); else drawChart(el);
    });
  }

  // قبل از دیده شدن، خط‌ها رو «نکشیده» نگه دار
  function hideChart(el) {
    if (el.matches('.bar-fill')) { el.style.transform = 'scaleX(0)'; return; }
    if (el.matches('.donut svg')) { el.style.opacity = '0'; return; }
    el.querySelectorAll('path').forEach((p) => {
      if (p.getAttribute('fill') && p.getAttribute('fill') !== 'none') { p.style.opacity = '0'; return; }
      if (p.getAttribute('stroke-dasharray')) { p.style.opacity = '0'; return; } // خط‌چین ۴۰۴
      const len = p.getTotalLength ? p.getTotalLength() : 0;
      if (!len) return;
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
      p.__lpLen = len;
    });
  }

  function drawChart(el) {
    if (el.matches('.bar-fill')) {
      const i = Array.from(document.querySelectorAll('.bar-fill')).indexOf(el);
      el.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 700, delay: 80 * Math.max(0, i), easing: EASE_OUT, fill: 'backwards' })
        .finished.then(() => { el.style.transform = ''; }).catch(() => {});
      el.style.transform = '';
      return;
    }
    if (el.matches('.donut svg')) {
      el.style.opacity = '';
      el.animate([{ opacity: 0, transform: 'rotate(-40deg) scale(0.92)' }, { opacity: 1, transform: 'none' }], { duration: 800, easing: EASE_OUT });
      return;
    }
    const isSpark = el.matches('svg.spark');
    el.querySelectorAll('path').forEach((p) => {
      if (p.__lpLen) {
        // خط از نقطه‌ی اولش (قدیمی‌ترین روز = سمت راست) کشیده می‌شه
        const a = p.animate([{ strokeDashoffset: p.__lpLen }, { strokeDashoffset: 0 }], { duration: isSpark ? 600 : 1100, easing: EASE_IN_OUT, delay: 100 });
        a.finished.then(() => { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; }).catch(() => {});
        p.style.strokeDashoffset = 0;
      } else if (p.style.opacity === '0') {
        p.style.opacity = '';
        p.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: isSpark ? 0 : 700, easing: EASE_OUT, fill: 'backwards' });
      }
    });
  }

  /* ---------- ۷) انتخاب بازه: نشانگر سُرخورنده ---------- */
  function prepareSegs(root) {
    all(root, '.seg').forEach((seg) => {
      if (seg.querySelector('.seg-indicator')) return;
      const ind = document.createElement('span');
      ind.className = 'seg-indicator';
      ind.setAttribute('aria-hidden', 'true');
      seg.prepend(ind);
      seg.classList.add('has-indicator');
      placeSeg(seg, true);
    });
  }
  function placeSeg(seg, instant) {
    const ind = seg.querySelector('.seg-indicator');
    const active = seg.querySelector('button.is-active');
    if (!ind) return;
    if (!active) { ind.style.opacity = '0'; return; }
    ind.style.opacity = '';
    const sr = seg.getBoundingClientRect(), br = active.getBoundingClientRect();
    if (instant) ind.style.transition = 'none';
    ind.style.width = br.width + 'px';
    ind.style.transform = `translateX(${br.right - sr.right}px)`;
    if (instant) { void ind.offsetWidth; ind.style.transition = ''; }
  }

  /* ---------- ۸) واکنش‌ها: لرزش خطا، تعویض آیکون ---------- */
  function shake(field) {
    const target = field.querySelector('.input, .select, .textarea, .slug-input') || field;
    if (reduced() || !target.animate) return;
    target.animate(
      [{ transform: 'none' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(2px)' }, { transform: 'none' }],
      { duration: 320, easing: 'ease-out' }
    );
  }
  function swapIcon(icon) {
    if (reduced()) return;
    icon.classList.remove('lp-swap');
    void icon.offsetWidth; // شروع دوباره‌ی انیمیشن
    icon.classList.add('lp-swap');
  }

  /* ---------- ۹) راه‌اندازی ---------- */
  function init() {
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => entries.forEach((en) => { if (en.isIntersecting) reveal(en.target); }),
        { threshold: 0, rootMargin: '0px 0px -8% 0px' }
      );
      // عددها و نمودارها وقتی واقعاً دیده شدن شروع می‌شن (کمی دیرتر از ظاهر شدن کارت)
      counterObserver = new IntersectionObserver((entries) => entries.forEach((en) => {
        if (!en.isIntersecting) return;
        counterObserver.unobserve(en.target);
        en.target.__lpSeen = true;
        runCounter(en.target);
      }), { rootMargin: '0px 0px -10% 0px' });
      chartObserver = new IntersectionObserver((entries) => entries.forEach((en) => {
        if (!en.isIntersecting) return;
        chartObserver.unobserve(en.target);
        drawChart(en.target);
      }), { rootMargin: '0px 0px -10% 0px' });
    }

    watch(document);

    // صفحه‌های پنل محتوا رو بعداً با جاوااسکریپت می‌سازن؛ تغییرها رو دنبال کن
    let pending = new Set();
    let scheduled = false;
    function flush() {
      scheduled = false;
      const nodes = Array.from(pending);
      pending = new Set();
      nodes.forEach((n) => { if (n.isConnected) watch(n); });
    }
    new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        if (m.type === 'attributes') {
          const el = m.target;
          // فیلد خطا گرفت → لرزش
          if (el.classList.contains('field') && el.classList.contains('has-error') && !(m.oldValue || '').includes('has-error')) shake(el);
          // گزینه‌ی فعال بازه عوض شد → سُر خوردن نشانگر
          if (el.matches('.seg button') && el.classList.contains('is-active') && !(m.oldValue || '').includes('is-active')) placeSeg(el.parentElement);
          return;
        }
        const t = m.target;
        // متن عدد عوض شد
        const counter = t.nodeType === 1 && t.matches(COUNTERS) ? t : (t.parentElement && t.parentElement.matches && t.parentElement.matches(COUNTERS) ? t.parentElement : null);
        if (counter && counter.__lpCounter) onCounterText(counter);
        // متن آیکون عوض شد (مثلاً content_copy → check)
        const icon = t.nodeType === 1 && t.classList && t.classList.contains('icon') ? t : (t.parentElement && t.parentElement.classList.contains('icon') ? t.parentElement : null);
        if (icon && m.type !== 'attributes' && icon.closest('button, a')) swapIcon(icon);
        m.addedNodes.forEach((node) => { if (node.nodeType === 1) pending.add(node); });
      });
      if (pending.size && !scheduled) { scheduled = true; requestAnimationFrame(flush); }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true });

    window.addEventListener('resize', () => document.querySelectorAll('.seg.has-indicator').forEach((s) => placeSeg(s, true)));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => document.querySelectorAll('.seg.has-indicator').forEach((s) => placeSeg(s, true)));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

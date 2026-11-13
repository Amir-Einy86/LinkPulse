/* =========================================================
   background.js — پس‌زمینه‌ی زنده: خط‌های کم‌رنگ دفتر + موج «پالس»
   روی هر بخشی که توی TARGETS اومده یه <canvas> پشت محتوا می‌سازه.
   هر چند ثانیه یه موج به شکل لوگو از راست به چپ روی یکی از خط‌ها رد می‌شه؛
   انگار یه کلیک ثبت شده.
   ========================================================= */
(function () {
  'use strict';

  // کجا پس‌زمینه داشته باشیم؟  broken = موج وسط راه قطع می‌شه (برای ۴۰۴)
  const TARGETS = [
    { selector: '.hero', broken: false },
    { selector: '.auth-aside', broken: false },
    { selector: '.nf-main', broken: true },
  ];

  // تنظیمات ظاهری (برای کم و زیاد کردن شدت، همین‌ها رو عوض کن)
  const CONFIG = {
    lineGap: 42,          // فاصله‌ی خط‌ها (پیکسل)
    lineAlpha: 0.05,      // پررنگی خط‌ها (۰ تا ۱)
    pulseAlpha: 0.55,     // پررنگی موج
    pulseWidth: 96,       // پهنای شکل موج
    pulseHeight: 15,      // ارتفاع موج
    trail: 280,           // طول دنباله‌ی پشت موج
    speed: 150,           // سرعت (پیکسل در ثانیه)
    every: 2.2,           // هر چند ثانیه یه موج جدید
    maxPulses: 3,         // حداکثر موج هم‌زمان
  };
  const MOBILE = { lineGap: 50, every: 3.4, maxPulses: 2 };

  // شکل موج = همون خط لوگو، به‌صورت نقطه‌های نرمال‌شده (x از ۰ تا ۱، y از -۱ تا ۱)
  const WAVE = [[0, 0], [0.21, 0], [0.36, -0.58], [0.6, 0.42], [0.76, -0.29], [0.83, 0], [1, 0]];

  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // رنگ‌ها از متغیرهای CSS
  function rgb(name, fallback) {
    const hex = (getComputedStyle(document.documentElement).getPropertyValue(name) || '').trim() || fallback;
    const n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function create(host, broken) {
    const canvas = document.createElement('canvas');
    canvas.className = 'lp-bg';
    canvas.setAttribute('aria-hidden', 'true');
    host.classList.add('lp-bg-host');
    host.prepend(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ink = rgb('--ink', '#1d1b18');
    const accent = rgb('--accent', '#c2512b');
    let w = 0, h = 0, dpr = 1, opts = CONFIG;
    let pulses = [], spawnIn = 0.4, last = 0, raf = 0;
    let onScreen = true;

    // اندازه‌ی واقعی کانواس با توجه به وضوح صفحه (devicePixelRatio)
    function resize() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.round(r.width));
      h = Math.max(1, Math.round(r.height));
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      opts = Object.assign({}, CONFIG, w < 640 ? MOBILE : {});
      draw();
    }

    function lineYs() {
      const ys = [];
      for (let y = opts.lineGap * 0.75; y < h; y += opts.lineGap) ys.push(Math.round(y) + 0.5);
      return ys;
    }

    function spawn(x) {
      const ys = lineYs();
      if (!ys.length) return;
      pulses.push({ x: x == null ? w + 20 : x, y: ys[Math.floor(Math.random() * ys.length)] });
    }

    // قطع شدن موج برای ۴۰۴: وقتی از وسط صفحه رد شد، کم‌کم محو و صاف می‌شه
    function fadeAt(x) {
      if (!broken) return 1;
      const t = (x - w * 0.38) / (w * 0.18);
      return Math.max(0, Math.min(1, t));
    }

    function drawPulse(p) {
      const f = fadeAt(p.x);
      if (f <= 0) return;
      const W = opts.pulseWidth, A = opts.pulseHeight * f, T = opts.trail;
      const g = ctx.createLinearGradient(p.x, 0, p.x + W + T, 0);
      const a = opts.pulseAlpha * f;
      g.addColorStop(0, `rgba(${accent},${a})`);
      g.addColorStop(W / (W + T), `rgba(${accent},${a * 0.6})`);
      g.addColorStop(1, `rgba(${accent},0)`);
      ctx.beginPath();
      WAVE.forEach(([nx, ny], i) => {
        const x = p.x + nx * W, y = p.y + ny * A;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.lineTo(p.x + W + T, p.y);
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      ctx.beginPath();
      lineYs().forEach((y) => { ctx.moveTo(0, y); ctx.lineTo(w, y); });
      ctx.strokeStyle = `rgba(${ink},${opts.lineAlpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      pulses.forEach(drawPulse);
    }

    function frame(now) {
      raf = 0;
      const dt = Math.min(0.05, (now - (last || now)) / 1000); // حداکثر ۵۰ms، تا بعد از برگشت به تب پرش نکنه
      last = now;
      spawnIn -= dt;
      if (spawnIn <= 0 && pulses.length < opts.maxPulses) {
        spawn();
        spawnIn = opts.every * (0.7 + Math.random() * 0.6);
      }
      pulses.forEach((p) => { p.x -= opts.speed * dt; });
      pulses = pulses.filter((p) => p.x + opts.pulseWidth + opts.trail > 0);
      draw();
      start();
    }

    // فقط وقتی کانواس توی صفحه‌ست و تب باز و فعاله، انیمیشن اجرا می‌شه
    function start() {
      if (!raf && onScreen && !document.hidden && !reduced()) raf = requestAnimationFrame(frame);
    }
    function stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    }

    resize();
    if (reduced()) {
      // «حرکت کمتر»: یه تصویر ثابت با یه موج وسط صفحه
      pulses = [];
      spawn(w * 0.55);
      draw();
    }

    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener('resize', resize);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        onScreen = entries[0].isIntersecting;
        if (onScreen) start(); else stop();
      }).observe(canvas);
    }
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    start();
  }

  function init() {
    TARGETS.forEach((t) => document.querySelectorAll(t.selector).forEach((el) => create(el, t.broken)));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

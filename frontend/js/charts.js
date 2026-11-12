/* =========================================================
   charts.js — نمودارهای SVG بدون هیچ کتابخونه‌ی بیرونی
   line:   نمودار خطی با tooltip
   donut:  نمودار دایره‌ای
   spark:  نمودار کوچیک داخل ردیف‌ها
   نکته: چون سایت راست‌به‌چپه، قدیمی‌ترین نقطه سمت راست و
   جدیدترین نقطه سمت چپ قرار می‌گیره.
   ========================================================= */
(function () {
  'use strict';
  const LP = window.LP;
  const esc = LP.esc;
  const charts = (LP.charts = {});
  // رنگ‌ها مستقیم از متغیرهای CSS (base.css) خونده می‌شن تا همیشه با ظاهر سایت یکی باشن
  const css = getComputedStyle(document.documentElement);
  const v = (name, fallback) => (css.getPropertyValue(name) || '').trim() || fallback;
  charts.colors = {
    primary: v('--accent', '#c2512b'),
    secondary: v('--ink', '#1d1b18'),
    tertiary: v('--ok', '#2f7550'),
    outline: v('--ink-4', '#b4ac9f'),
    warning: v('--warn', '#9a6a12'),
    muted: v('--ink-3', '#8a8378'),
    line: v('--line-strong', '#cbc3b4'),
    track: v('--paper-sunk', '#ede8de'),
    paper: v('--raised', '#fbf9f4'),
  };
  // رنگ‌های سری برای نمودار دایره‌ای: تأکید، جوهر، و دو خاکستری گرم
  charts.series = [charts.colors.primary, charts.colors.secondary, charts.colors.outline, v('--paper-deep', '#e4ddd0')];

  let uid = 0;

  // مسیر نرم (منحنی) از بین نقطه‌ها
  function smoothPath(pts, minY, maxY) {
    if (pts.length < 2) return '';
    const clamp = (y) => Math.min(maxY, Math.max(minY, y));
    let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1x = p1.x + (p2.x - p0.x) / 6, c1y = clamp(p1.y + (p2.y - p0.y) / 6);
      const c2x = p2.x - (p3.x - p1.x) / 6, c2y = clamp(p2.y - (p3.y - p1.y) / 6);
      d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
  }

  // بالاترین عدد «قشنگ» برای محور عمودی
  function niceMax(v) {
    if (v <= 4) return 4;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return step * p;
  }

  /* ---------- نمودار خطی ---------- */
  charts.line = (mount, { labels, tips, values, unit = 'کلیک', color = charts.colors.primary, ariaLabel = 'نمودار کلیک‌ها' }) => {
    const W = 700, H = 260, PX = 14, PT = 18, PB = 12;
    const id = ++uid;
    const n = values.length;
    const total = values.reduce((a, b) => a + b, 0);
    const max = niceMax(Math.max(...values, 1));
    const innerW = W - 2 * PX, innerH = H - PT - PB;
    const pts = values.map((v, i) => ({
      x: n === 1 ? W / 2 : W - PX - (i * innerW) / (n - 1), // ایندکس ۰ = قدیمی‌ترین = سمت راست
      y: PT + innerH - (v / max) * innerH,
    }));
    const line = smoothPath(pts, PT, H - PB);
    const area = n > 1 ? `${line} L${pts[n - 1].x.toFixed(1)},${H - PB} L${pts[0].x.toFixed(1)},${H - PB} Z` : '';
    const grid = [0, 1, 2, 3, 4].map((k) => {
      const y = PT + (innerH * k) / 4;
      return `<line x1="0" x2="${W}" y1="${y}" y2="${y}" stroke="${charts.colors.line}" stroke-opacity="${k === 4 ? 1 : 0.55}" ${k === 4 ? '' : 'stroke-dasharray="2 5"'}/>`;
    }).join('');

    // برچسب‌های محور افقی (حداکثر ۷ تا)
    const tickCount = Math.min(n, 7);
    const tickIdx = [];
    for (let k = 0; k < tickCount; k++) tickIdx.push(tickCount === 1 ? 0 : Math.round((k * (n - 1)) / (tickCount - 1)));

    mount.innerHTML = `
      <div class="chart">
        <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(ariaLabel)}" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="ca${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".16"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient>
          </defs>
          ${grid}
          ${area ? `<path d="${area}" fill="url(#ca${id})"/>` : ''}
          ${n > 1 ? `<path d="${line}" fill="none" stroke="${color}" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
          <line class="chart-guide" y1="${PT}" y2="${H - PB}" stroke="${charts.colors.secondary}" stroke-opacity=".35" opacity="0"/>
          <circle class="chart-dot" r="5" fill="${color}" stroke="${charts.colors.paper}" stroke-width="2.5" opacity="0"/>
        </svg>
        <div class="chart-tip" hidden></div>
        ${total === 0 ? '<div class="chart-empty">در این بازه هنوز کلیکی ثبت نشده</div>' : ''}
      </div>
      <div class="chart-axis" aria-hidden="true">${tickIdx.map((i) => `<span>${esc(labels[i])}</span>`).join('')}</div>`;

    const box = mount.querySelector('.chart');
    const svg = box.querySelector('svg');
    const guide = svg.querySelector('.chart-guide');
    const dot = svg.querySelector('.chart-dot');
    const tip = box.querySelector('.chart-tip');

    function show(i) {
      const p = pts[i];
      guide.setAttribute('x1', p.x); guide.setAttribute('x2', p.x); guide.setAttribute('opacity', 1);
      dot.setAttribute('cx', p.x); dot.setAttribute('cy', p.y); dot.setAttribute('opacity', 1);
      tip.hidden = false;
      tip.innerHTML = `<small>${esc((tips && tips[i]) || labels[i])}</small><strong>${LP.fa(values[i])} ${esc(unit)}</strong>`;
      // موقعیت tooltip بر حسب درصد، تا با تغییر اندازه‌ی نمودار هم درست بمونه
      const left = Math.min(88, Math.max(12, (p.x / W) * 100));
      tip.style.left = left + '%';
      tip.style.top = (p.y / H) * 100 + '%';
    }
    function hide() {
      guide.setAttribute('opacity', 0); dot.setAttribute('opacity', 0); tip.hidden = true;
    }
    function onMove(e) {
      const r = svg.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * W;
      let best = 0, bestD = Infinity;
      pts.forEach((p, i) => { const d = Math.abs(p.x - x); if (d < bestD) { bestD = d; best = i; } });
      show(best);
    }
    box.addEventListener('pointermove', onMove);
    box.addEventListener('pointerdown', onMove);
    box.addEventListener('pointerleave', hide);
  };

  /* ---------- نمودار دایره‌ای ---------- */
  charts.donut = (mount, { items, centerValue, centerLabel, ariaLabel = 'نمودار دایره‌ای' }) => {
    const R = 38, C = 2 * Math.PI * R;
    const total = items.reduce((a, b) => a + b.value, 0);
    let offset = 0;
    const rings = total
      ? items.map((it) => {
          const len = (it.value / total) * C;
          const seg = `<circle cx="50" cy="50" r="${R}" fill="none" stroke="${it.color}" stroke-width="12" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}"><title>${esc(it.label)}: ${LP.fa(it.value)}</title></circle>`;
          offset += len;
          return seg;
        }).join('')
      : '';
    mount.innerHTML = `
      <div class="donut">
        <svg viewBox="0 0 100 100" role="img" aria-label="${esc(ariaLabel)}">
          <circle cx="50" cy="50" r="${R}" fill="none" stroke="${charts.colors.track}" stroke-width="12"/>
          <g transform="rotate(-90 50 50)">${rings}</g>
        </svg>
        <div class="donut-center"><strong>${centerValue}</strong><span>${esc(centerLabel || '')}</span></div>
      </div>`;
  };

  /* ---------- نمودار کوچیک (Sparkline) ---------- */
  charts.spark = (values, color = charts.colors.secondary, w = 80, h = 22) => {
    const max = Math.max(...values, 1);
    const pad = 2;
    const n = values.length;
    const pts = values.map((v, i) => ({
      x: n === 1 ? w / 2 : w - pad - (i * (w - 2 * pad)) / (n - 1),
      y: h - pad - (v / max) * (h - 2 * pad),
    }));
    if (values.every((v) => v === 0)) return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><line x1="0" x2="${w}" y1="${h - 2}" y2="${h - 2}" stroke="${charts.colors.line}" stroke-width="2"/></svg>`;
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${smoothPath(pts, 1, h - 1)}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/></svg>`;
  };
})();

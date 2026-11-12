/* =========================================================
   utils.js — ابزارهای کوچک و مشترک
   همه‌چیز زیر یک «فضای نام» (namespace) به اسم LP قرار می‌گیره
   تا با بقیه‌ی کدها قاطی نشه.
   ========================================================= */
(function () {
  'use strict';
  const LP = (window.LP = window.LP || {});

  LP.config = { appName: 'لینک‌پالس' };

  /* ---------- انتخاب عنصر ---------- */
  LP.$ = (sel, root = document) => root.querySelector(sel);
  LP.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- امن‌سازی متن قبل از innerHTML (جلوگیری از XSS) ---------- */
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  LP.esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ESC[c]);

  /* ---------- ذخیره‌سازی (localStorage با پشتیبان در حافظه) ---------- */
  const memory = {};

  LP.store = {
    get(key, fallback = null) {
      try {
        const raw = localStorage.getItem('lp:' + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        return key in memory ? memory[key] : fallback;
      }
    },
    set(key, value) {
      memory[key] = value;
      try { localStorage.setItem('lp:' + key, JSON.stringify(value)); return true; } catch (e) { return false; }
    },
    remove(key) {
      delete memory[key];
      try { localStorage.removeItem('lp:' + key); } catch (e) { /* مهم نیست */ }
    },
  };

  /* ---------- عدد و تاریخ فارسی ---------- */
  const nf = new Intl.NumberFormat('fa-IR');
  const nf1 = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 });
  LP.fa = (n) => nf.format(Number(n) || 0);
  LP.fa1 = (n) => nf1.format(Number(n) || 0);
  LP.pct = (n) => nf1.format(Number(n) || 0) + '٪';
  LP.compact = (n) => {
    n = Number(n) || 0;
    if (n >= 1e6) return nf1.format(n / 1e6) + ' میلیون';
    if (n >= 1e4) return nf1.format(n / 1e3) + ' هزار';
    return nf.format(n);
  };

  const fullFmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'long', day: 'numeric' });
  const shortFmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'long', day: 'numeric' });
  const timeFmt = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit', hour12: false });
  const rtf = new Intl.RelativeTimeFormat('fa', { numeric: 'auto' });

  LP.fmtDate = (d) => fullFmt.format(new Date(d));
  LP.fmtShort = (d) => shortFmt.format(new Date(d));
  LP.fmtTime = (d) => timeFmt.format(new Date(d));
  LP.rel = (d) => {
    const diff = (new Date(d).getTime() - Date.now()) / 1000;
    const abs = Math.abs(diff);
    if (abs < 45) return 'همین الان';
    if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
    if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
    if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day');
    return LP.fmtDate(d);
  };

  /* ---------- آدرس و اسلاگ ---------- */
  // آدرس رو تمیز می‌کنه. فقط http و https قبول می‌شه. اگه معتبر نبود null برمی‌گردونه.
  LP.normalizeUrl = (raw) => {
    let s = String(raw || '').trim();
    if (!s) return null;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = 'https://' + s.replace(/^\/+/, '');
    if (s.length > 2048) return null;
    try {
      const u = new URL(s);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
      if (!u.hostname.includes('.') || u.hostname.endsWith('.')) return null;
      return u.href;
    } catch (e) {
      return null;
    }
  };
  LP.host = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return url; } };

  LP.RESERVED_SLUGS = ['login', 'register', 'dashboard', 'settings', 'profile', 'api', 'admin', 'my-links', 'link-details', 'index', '404', 'assets', 'css', 'js', 'static', 'docs', 'health', 'favicon', 'robots', 'logout', 'null', 'undefined'];
  LP.isValidSlug = (s) => /^[A-Za-z0-9][A-Za-z0-9_-]{2,31}$/.test(s);
  LP.randomSlug = (len = 6) => {
    const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
    let out = '';
    const buf = window.crypto && crypto.getRandomValues ? crypto.getRandomValues(new Uint8Array(len)) : null;
    for (let i = 0; i < len; i++) out += chars[(buf ? buf[i] : Math.floor(Math.random() * 256)) % chars.length];
    return out;
  };

  /* ---------- کلیپ‌بورد، دانلود، CSV ---------- */
  LP.copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (_) { /* مهم نیست */ }
      ta.remove();
      return ok;
    }
  };

  // اگه سلولی با = + - @ شروع بشه، اکسل ممکنه فرمولش کنه؛ جلوش یه ' می‌ذاریم.
  const csvCell = (c) => {
    let s = String(c == null ? '' : c);
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  LP.toCSV = (headers, rows) => [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
  LP.download = (filename, content, mime = 'text/csv;charset=utf-8') => {
    const blob = new Blob(['﻿' + content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  /* ---------- کمکی‌های عمومی ---------- */
  LP.debounce = (fn, ms = 200) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  };
  LP.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  LP.query = (name) => new URLSearchParams(window.location.search).get(name);

  // رفتن به یه صفحه
  LP.go = (url) => { window.location.href = url; };

  /* ---------- تبدیل رقم‌های فارسی/عربی به انگلیسی (برای خوندن ورودی کاربر) ---------- */
  LP.toEnDigits = (s) =>
    String(s || '')
      .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
      .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));

  /* ---------- حرف اول اسم برای آواتار ---------- */
  LP.initial = (name) => (String(name || '').trim()[0] || '؟');

  /* ---------- سلام بر اساس ساعت ---------- */
  LP.greeting = () => {
    const h = new Date().getHours();
    if (h < 5) return 'شب بخیر';
    if (h < 12) return 'صبح بخیر';
    if (h < 17) return 'روز بخیر';
    if (h < 20) return 'عصر بخیر';
    return 'شب بخیر';
  };
})();

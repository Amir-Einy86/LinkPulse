/* =========================================================
   api.js — ارتباط با بک‌اند (fetch) + نگه‌داری توکن ورود
   همه‌ی صفحه‌ها فقط از LP.api و LP.session استفاده می‌کنن؛ هیچ صفحه‌ای مستقیم fetch نمی‌زنه.
   ========================================================= */
(function () {
  'use strict';
  const LP = window.LP;
  const cfg = window.LP_CONFIG || {};

  // اگه فایل با دوبار کلیک (file://) باز شده، آدرس لوکال پیش‌فرض رو می‌گیریم
  const origin = cfg.apiBase || (window.location.protocol === 'file:' ? 'http://localhost:5000' : '');
  const BASE = origin.replace(/\/+$/, '') + '/api';
  // دامنه‌ای که توی پیشوند اسلاگ نشون می‌دیم (فقط ظاهریه؛ آدرس واقعی لینک رو سرور می‌ده)
  LP.shortHost = (origin ? origin.replace(/^https?:\/\//, '') : window.location.host).replace(/\/+$/, '') || 'linkpulse.app';

  /* ---------- خطای API: پیام فارسی سرور + کد + خطای هر فیلد ---------- */
  class ApiError extends Error {
    constructor(message, status, code, details) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.code = code;
      this.details = details || {};
    }
  }
  LP.ApiError = ApiError;

  /* ---------- توکن ---------- */
  const token = {
    get: () => LP.store.get('token', null),
    set: (t) => LP.store.set('token', t),
    clear: () => LP.store.remove('token'),
  };

  const LOGIN_PAGE = 'login.html';
  let redirecting = false;
  function kickToLogin(reason) {
    if (redirecting) return;
    redirecting = true;
    token.clear();
    LP.go(LOGIN_PAGE + (reason ? '?' + reason + '=1' : ''));
  }

  /* ---------- درخواست ---------- */
  async function request(method, path, { query, body, auth = true, raw = false } = {}) {
    let url = BASE + path;
    if (query) {
      const qs = new URLSearchParams();
      Object.entries(query).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') qs.set(k, v); });
      const s = qs.toString();
      if (s) url += '?' + s;
    }
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const t = token.get();
    if (auth && t) headers.Authorization = 'Bearer ' + t;

    let res;
    try {
      res = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
    } catch (e) {
      throw new ApiError('ارتباط با سرور برقرار نشد. اینترنت یا روشن بودن سرور رو چک کن.', 0, 'NETWORK');
    }

    if (res.status === 204) return { data: null };
    if (raw && res.ok) return res;

    let json = null;
    try { json = await res.json(); } catch (e) { /* بدنه‌ی خالی یا غیر JSON */ }

    if (!res.ok) {
      const err = (json && json.error) || {};
      // توکن نامعتبر یا منقضی: کاربر رو به صفحه‌ی ورود می‌بریم
      if (res.status === 401 && auth && (err.code === 'TOKEN_INVALID' || err.code === 'UNAUTHORIZED')) kickToLogin('expired');
      throw new ApiError(err.message || 'یه مشکل پیش اومد؛ دوباره امتحان کن.', res.status, err.code || 'ERROR', err.details);
    }
    return json || { data: null };
  }

  LP.api = {
    base: BASE,
    token,
    get: (path, opts) => request('GET', path, opts),
    post: (path, body, opts) => request('POST', path, Object.assign({ body: body === undefined ? {} : body }, opts)),
    patch: (path, body, opts) => request('PATCH', path, Object.assign({ body }, opts)),
    put: (path, body, opts) => request('PUT', path, Object.assign({ body }, opts)),
    delete: (path, body, opts) => request('DELETE', path, Object.assign({ body }, opts)),
  };

  /* =========================================================
     نشست (Session): کاربر فعلی
     داخل صفحه‌های پنل (data-shell="app") اگه توکن نباشه، همون اول می‌ره صفحه‌ی ورود.
     LP.ready یه Promise ـه که وقتی کاربر از سرور خونده شد حل می‌شه؛ هر صفحه کارش رو بعد از اون شروع می‌کنه.
     ========================================================= */
  const session = (LP.session = { user: null });

  session.isLoggedIn = () => !!token.get();

  session.start = ({ token: t, user }) => {
    token.set(t);
    session.user = user;
  };

  session.logout = async () => {
    try { await LP.api.post('/auth/logout', undefined, {}); } catch (e) { /* مهم نیست؛ توکن رو هر حال پاک می‌کنیم */ }
    token.clear();
    session.user = null;
    LP.go(LOGIN_PAGE + '?out=1');
  };

  session.refresh = async () => {
    const res = await LP.api.get('/auth/me');
    session.user = res.data.user;
    return session.user;
  };

  const isApp = document.body && document.body.dataset.shell === 'app';
  if (isApp) {
    if (!token.get()) {
      kickToLogin();
      LP.ready = new Promise(() => {}); // هیچ‌وقت حل نمی‌شه؛ صفحه در حال رفتنه
    } else {
      LP.ready = session.refresh().catch((e) => {
        // خطای شبکه: به‌جای صفحه‌ی سفید، یه پیام می‌ذاریم
        if (e.status !== 401) showFatal(e.message);
        return new Promise(() => {});
      });
    }
  } else {
    LP.ready = Promise.resolve();
  }

  function showFatal(msg) {
    const main = document.getElementById('main') || document.body;
    main.innerHTML = '<div style="max-width:28rem;margin:4rem auto;padding:1.5rem;text-align:center;line-height:2">' +
      '<h1 style="font-size:1.3rem">سرور در دسترس نیست</h1><p style="opacity:.8">' + LP.esc(msg) + '</p>' +
      '<a href="" style="display:inline-block;margin-top:1rem;padding:.6rem 1.4rem;border-radius:.6rem;border:1px solid currentColor;text-decoration:none;color:inherit">تلاش دوباره</a>' +
      '</div>';
  }
})();

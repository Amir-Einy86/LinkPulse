(function () {
  'use strict';
  const LP = window.LP;
  const $ = LP.$;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  LP.ui.wirePasswordToggles(document);

  function checkEmail(el) {
    if (!el.value.trim()) { LP.ui.setError(el, 'ایمیلت رو وارد کن.'); return false; }
    if (!EMAIL_RE.test(el.value.trim())) { LP.ui.setError(el, 'این ایمیل درست به نظر نمی‌رسه؛ مثلاً you@example.com'); return false; }
    return true;
  }

  function showServerError(form, err, fields) {
    const shown = Object.entries(err.details || {}).filter(([k]) => fields[k]);
    shown.forEach(([k, msg]) => LP.ui.setError(fields[k], msg));
    if (err.code === 'EMAIL_TAKEN' && fields.email) { LP.ui.setError(fields.email, err.message); LP.ui.focusFirstError(form); return; }
    if (shown.length) return LP.ui.focusFirstError(form);
    LP.ui.toast(err.message, 'error', 5000);
  }

  if (LP.session.isLoggedIn() && !LP.query('out') && !LP.query('expired')) {
    LP.session.refresh().then(() => LP.go('dashboard.html')).catch(() => {});
  }

  const loginForm = $('#loginForm');
  if (loginForm) {
    LP.ui.liveClear(loginForm);
    if (LP.query('out')) $('#outBanner').hidden = false;
    if (LP.query('expired')) $('#expiredBanner').hidden = false;

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      LP.ui.clearAll(loginForm);
      const email = $('#email'), pw = $('#password');
      let ok = checkEmail(email);
      if (!pw.value) { LP.ui.setError(pw, 'رمز عبورت رو وارد کن.'); ok = false; }
      if (!ok) return LP.ui.focusFirstError(loginForm);
      const btn = $('#loginBtn');
      LP.ui.busy(btn, true, 'در حال ورود…');
      try {
        const res = await LP.api.post('/auth/login', { email: email.value.trim(), password: pw.value }, { auth: false });
        LP.session.start(res.data);
        LP.ui.toast('خوش اومدی!');
        setTimeout(() => LP.go('dashboard.html'), 300);
      } catch (err) {
        LP.ui.busy(btn, false);
        showServerError(loginForm, err, { email, password: pw });
      }
    });
  }

  const regForm = $('#registerForm');
  if (regForm) {
    LP.ui.liveClear(regForm);
    const LEVELS = [
      { t: 'خیلی ضعیف', c: 'var(--bad)' }, { t: 'ضعیف', c: 'var(--bad)' }, { t: 'متوسط', c: 'var(--warn)' },
      { t: 'قوی', c: 'var(--ok)' }, { t: 'عالی', c: 'var(--ok)' },
    ];
    const strength = (pw) => {
      let s = 0;
      if (pw.length >= 8) s++;
      if (pw.length >= 12) s++;
      if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
      if (/\d/.test(pw)) s++;
      if (/[^A-Za-z0-9]/.test(pw)) s++;
      return Math.min(s, 4);
    };
    $('#password').addEventListener('input', (e) => {
      const v = e.target.value, fill = $('#strengthFill'), text = $('#strengthText');
      if (!v) { fill.style.width = '0'; text.textContent = 'حداقل ۸ کاراکتر'; return; }
      const sc = strength(v);
      fill.style.width = (sc + 1) * 20 + '%';
      fill.style.background = LEVELS[sc].c;
      text.textContent = 'قدرت رمز: ' + LEVELS[sc].t;
    });

    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      LP.ui.clearAll(regForm);
      const name = $('#name'), email = $('#email'), pw = $('#password'), terms = $('#terms');
      let ok = true;
      if (name.value.trim().length < 2) { LP.ui.setError(name, 'اسمت رو بنویس (حداقل ۲ حرف).'); ok = false; }
      if (!checkEmail(email)) ok = false;
      if (pw.value.length < 8) { LP.ui.setError(pw, 'رمز باید حداقل ۸ کاراکتر باشه.'); ok = false; }
      if (!terms.checked) { LP.ui.setError(terms, 'برای ادامه باید قوانین رو قبول کنی.'); ok = false; }
      if (!ok) return LP.ui.focusFirstError(regForm);
      const btn = $('#registerBtn');
      LP.ui.busy(btn, true, 'در حال ساخت حساب…');
      try {
        const res = await LP.api.post('/auth/register', { name: name.value.trim(), email: email.value.trim(), password: pw.value }, { auth: false });
        LP.session.start(res.data);
        LP.ui.toast('حسابت آماده شد! می‌ریم سراغ پنل.');
        setTimeout(() => LP.go('dashboard.html'), 400);
      } catch (err) {
        LP.ui.busy(btn, false);
        showServerError(regForm, err, { name, email, password: pw });
      }
    });
  }
})();

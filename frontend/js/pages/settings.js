(function () {
  'use strict';
  const LP = window.LP;
  const $ = LP.$;

  const FIELDS = [
    { id: 'setExpiry', key: 'defaultExpiry', get: (el) => el.value, set: (el, v) => { el.value = v; } },
    { id: 'setPage', key: 'pageSize', get: (el) => Number(el.value), set: (el, v) => { el.value = String(v); } },
    { id: 'nMilestone', key: 'notifyMilestone', get: (el) => el.checked, set: (el, v) => { el.checked = v; } },
    { id: 'nExpiry', key: 'notifyExpiry', get: (el) => el.checked, set: (el, v) => { el.checked = v; } },
    { id: 'nNews', key: 'notifyNews', get: (el) => el.checked, set: (el, v) => { el.checked = v; } },
  ];
  function fillSettings() {
    const s = LP.data.settings();
    FIELDS.forEach((f) => f.set($('#' + f.id), s[f.key]));
  }
  FIELDS.forEach((f) => {
    $('#' + f.id).addEventListener('change', async (e) => {
      try {
        await LP.data.saveSettings({ [f.key]: f.get(e.target) });
        LP.ui.toast('تنظیمات ذخیره شد.');
      } catch (err) {
        fillSettings();
        LP.ui.toast(err.message, 'error', 5000);
      }
    });
  });

  const form = $('#passForm');
  LP.ui.wirePasswordToggles(document);
  LP.ui.liveClear(form);

  function strength(pw) {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return Math.min(score, 4);
  }
  const LEVELS = [
    { t: 'خیلی ضعیف', c: 'var(--bad)' }, { t: 'ضعیف', c: 'var(--bad)' }, { t: 'متوسط', c: 'var(--warn)' },
    { t: 'قوی', c: 'var(--ok)' }, { t: 'عالی', c: 'var(--ok)' },
  ];
  $('#pNew').addEventListener('input', (e) => {
    const v = e.target.value;
    const fill = $('#strengthFill'), text = $('#strengthText');
    if (!v) { fill.style.width = '0'; text.textContent = 'حداقل ۸ کاراکتر'; return; }
    const sc = strength(v);
    fill.style.width = (sc + 1) * 20 + '%';
    fill.style.background = LEVELS[sc].c;
    text.textContent = 'قدرت رمز: ' + LEVELS[sc].t;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    LP.ui.clearAll(form);
    const cur = $('#pCurrent'), nw = $('#pNew'), rep = $('#pRepeat');
    let ok = true;
    if (!cur.value) { LP.ui.setError(cur, 'رمز فعلی رو وارد کن.'); ok = false; }
    if (nw.value.length < 8) { LP.ui.setError(nw, 'رمز جدید باید حداقل ۸ کاراکتر باشه.'); ok = false; }
    else if (nw.value === cur.value) { LP.ui.setError(nw, 'رمز جدید نباید با رمز فعلی یکی باشه.'); ok = false; }
    if (rep.value !== nw.value) { LP.ui.setError(rep, 'تکرار رمز با رمز جدید یکی نیست.'); ok = false; }
    if (!ok) return LP.ui.focusFirstError(form);

    const btn = $('#passBtn');
    LP.ui.busy(btn, true, 'در حال تغییر…');
    try {
      await LP.data.changePassword(cur.value, nw.value);
      form.reset();
      $('#strengthFill').style.width = '0';
      $('#strengthText').textContent = 'حداقل ۸ کاراکتر';
      LP.ui.toast('رمزت عوض شد.');
    } catch (err) {
      const fields = { currentPassword: cur, newPassword: nw };
      const shown = Object.entries(err.details || {}).filter(([k]) => fields[k]);
      shown.forEach(([k, msg]) => LP.ui.setError(fields[k], msg));
      if (shown.length) LP.ui.focusFirstError(form); else LP.ui.toast(err.message, 'error', 5000);
    }
    LP.ui.busy(btn, false);
  });

  $('#deleteLinks').addEventListener('click', async () => {
    let n = 0;
    try { n = (await LP.data.list({ limit: 1 })).summary.total; } catch (err) { return LP.ui.toast(err.message, 'error', 5000); }
    if (!n) return LP.ui.toast('لینکی برای حذف نداری.', 'info');
    const ok = await LP.ui.confirm({
      title: 'حذف همه‌ی لینک‌ها',
      messageHtml: `<b>${LP.fa(n)}</b> لینک و آمارشون برای همیشه پاک می‌شه. برای تأیید، کلمه‌ی زیر رو بنویس.`,
      confirmText: 'حذف همه‌ی لینک‌ها', danger: true, requireText: 'حذف',
    });
    if (!ok) return;
    try {
      await LP.data.removeAll();
      LP.ui.toast('همه‌ی لینک‌ها حذف شدن.');
    } catch (err) { LP.ui.toast(err.message, 'error', 5000); }
  });

  $('#deleteAccount').addEventListener('click', () => {
    const body = document.createElement('div');
    body.innerHTML = `
      <form id="delForm" class="stack" novalidate>
        <p class="muted">حساب، همه‌ی لینک‌ها و آمارشون برای همیشه پاک می‌شه و برگشتی نداره.</p>
        <div class="field">
          <label class="label" for="delPass">رمز عبورت</label>
          <input id="delPass" class="input ltr" type="password" autocomplete="current-password">
        </div>
        <div class="field">
          <label class="label" for="delWord">برای تأیید، کلمه‌ی «حذف» رو بنویس</label>
          <input id="delWord" class="input" autocomplete="off">
        </div>
        <div class="row gap-2"><button type="submit" class="btn btn-danger" id="delGo"><span class="icon">person_remove</span>حساب رو حذف کن</button><button type="button" class="btn btn-ghost" data-close>انصراف</button></div>
      </form>`;
    const m = LP.ui.modal({ title: 'حذف حساب', icon: 'warning', body, size: 'sm' });
    const f = body.querySelector('#delForm');
    LP.ui.liveClear(f);
    body.querySelector('[data-close]').addEventListener('click', () => m.close('cancel'));
    f.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      LP.ui.clearAll(f);
      const pass = body.querySelector('#delPass'), word = body.querySelector('#delWord');
      let ok = true;
      if (!pass.value) { LP.ui.setError(pass, 'رمز عبورت رو وارد کن.'); ok = false; }
      if (word.value.trim() !== 'حذف') { LP.ui.setError(word, 'کلمه‌ی «حذف» رو دقیق بنویس.'); ok = false; }
      if (!ok) return LP.ui.focusFirstError(f);
      const btn = body.querySelector('#delGo');
      LP.ui.busy(btn, true, 'در حال حذف…');
      try {
        await LP.data.deleteAccount(pass.value);
        m.close('ok');
        LP.ui.toast('حسابت حذف شد.');
        setTimeout(() => LP.go('index.html'), 900);
      } catch (err) {
        LP.ui.busy(btn, false);
        if (err.details && err.details.password) { LP.ui.setError(pass, err.details.password); pass.focus(); }
        else LP.ui.toast(err.message, 'error', 5000);
      }
    });
  });

  LP.ready.then(fillSettings);
})();

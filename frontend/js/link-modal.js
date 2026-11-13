(function () {
  'use strict';
  const LP = window.LP;
  const esc = LP.esc;
  const DAY = 864e5;

  function expiryOptions(link, defaultChoice) {
    const opts = [];
    if (link && link.expiresAt) opts.push({ v: 'keep', t: 'بدون تغییر (' + LP.fmtDate(link.expiresAt) + ')' });
    opts.push(
      { v: 'none', t: 'بدون تاریخ انقضا' },
      { v: '1', t: 'یک روز دیگه' },
      { v: '7', t: 'یک هفته‌ی دیگه' },
      { v: '30', t: 'یک ماه دیگه' },
      { v: '90', t: 'سه ماه دیگه' },
      { v: 'custom', t: 'تعداد روز دلخواه…' }
    );
    const selected = link ? (link.expiresAt ? 'keep' : 'none') : defaultChoice;
    return opts.map((o) => `<option value="${o.v}"${o.v === selected ? ' selected' : ''}>${esc(o.t)}</option>`).join('');
  }

  function open(opts = {}) {
    const link = opts.link || null;
    const isEdit = !!link;
    const settings = LP.data.settings();

    const body = document.createElement('div');
    body.innerHTML = `
      <form id="linkForm" class="stack" novalidate>
        <div class="field">
          <label class="label" for="lmUrl">آدرس مقصد</label>
          <div class="input-wrap">
            <span class="icon">link</span>
            <input id="lmUrl" class="input ltr" type="text" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://example.com/a-very-long-page" value="${esc(link ? link.url : opts.url || '')}">
          </div>
        </div>
        <div class="field">
          <label class="label" for="lmTitle">عنوان <span class="opt">(اختیاری)</span></label>
          <input id="lmTitle" class="input" maxlength="80" autocomplete="off" placeholder="مثلاً: کمپین پاییزه" value="${esc(link ? link.title : '')}">
        </div>
        <div class="field">
          <label class="label" for="lmSlug">اسلاگ دلخواه <span class="opt">(اختیاری)</span></label>
          <div class="slug-input ltr">
            <span class="slug-prefix">${esc(LP.shortHost)}/</span>
            <input id="lmSlug" class="slug-field" maxlength="32" autocomplete="off" spellcheck="false" placeholder="my-link" value="${esc(link ? link.slug : '')}">
            <button type="button" class="btn-icon" id="lmRandom" aria-label="ساخت اسلاگ تصادفی" title="اسلاگ تصادفی"><span class="icon">casino</span></button>
          </div>
          <p class="hint">حروف انگلیسی، عدد، خط تیره و زیرخط؛ بین ۳ تا ۳۲ کاراکتر. اگه خالی بذاری خودمون یکی می‌سازیم.</p>
        </div>
        <div class="field">
          <label class="label" for="lmExpiry">تاریخ انقضا</label>
          <select id="lmExpiry" class="select">${expiryOptions(link, settings.defaultExpiry)}</select>
        </div>
        <div class="field" id="lmDaysField" hidden>
          <label class="label" for="lmDays">چند روز دیگه منقضی بشه؟</label>
          <input id="lmDays" class="input" type="text" inputmode="numeric" maxlength="3" placeholder="مثلاً ۱۴">
        </div>
      </form>`;

    const footer = document.createElement('div');
    footer.className = 'modal-foot-inner';
    footer.innerHTML = `
      <button type="submit" form="linkForm" class="btn btn-primary" id="lmSubmit"><span class="icon">${isEdit ? 'save' : 'add_link'}</span>${isEdit ? 'ذخیره‌ی تغییرات' : 'ساخت لینک کوتاه'}</button>
      <button type="button" class="btn btn-ghost" id="lmCancel">انصراف</button>`;

    const m = LP.ui.modal({ title: isEdit ? 'ویرایش لینک' : 'ساخت لینک جدید', icon: isEdit ? 'edit' : 'add_link', body, footer });
    const $ = (s) => m.el.querySelector(s);
    const form = $('#linkForm');
    const url = $('#lmUrl'), titleEl = $('#lmTitle'), slug = $('#lmSlug'), expiry = $('#lmExpiry'), days = $('#lmDays');
    const daysField = $('#lmDaysField');
    LP.ui.liveClear(form);

    const syncDays = () => { daysField.hidden = expiry.value !== 'custom'; if (!daysField.hidden) days.focus(); };
    expiry.addEventListener('change', syncDays);
    $('#lmRandom').addEventListener('click', () => { slug.value = LP.randomSlug(); LP.ui.clearError(slug); });
    $('#lmCancel').addEventListener('click', () => m.close('cancel'));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      LP.ui.clearAll(form);
      let ok = true;

      const cleanUrl = LP.normalizeUrl(url.value);
      if (!url.value.trim()) { LP.ui.setError(url, 'آدرس مقصد رو وارد کن.'); ok = false; }
      else if (!cleanUrl) { LP.ui.setError(url, 'این آدرس معتبر نیست. فقط آدرس‌های http و https قبول می‌شن.'); ok = false; }

      const finalSlug = slug.value.trim();
      if (finalSlug) {
        if (!LP.isValidSlug(finalSlug)) { LP.ui.setError(slug, 'اسلاگ باید ۳ تا ۳۲ کاراکتر و فقط شامل حروف انگلیسی، عدد، - و _ باشه.'); ok = false; }
        else if (LP.RESERVED_SLUGS.includes(finalSlug.toLowerCase())) { LP.ui.setError(slug, 'این اسلاگ رزرو شده؛ یکی دیگه انتخاب کن.'); ok = false; }
      }

      let expiresAt = null;
      let keepExpiry = false;
      if (expiry.value === 'keep') { keepExpiry = true; }
      else if (expiry.value === 'custom') {
        const n = parseInt(LP.toEnDigits(days.value), 10);
        if (!n || n < 1 || n > 365) { LP.ui.setError(days, 'یه عدد بین ۱ تا ۳۶۵ وارد کن.'); ok = false; }
        else expiresAt = new Date(Date.now() + n * DAY).toISOString();
      } else if (expiry.value !== 'none') expiresAt = new Date(Date.now() + Number(expiry.value) * DAY).toISOString();

      if (!ok) { LP.ui.focusFirstError(form); return; }

      const submit = $('#lmSubmit');
      LP.ui.busy(submit, true, 'صبر کن…');
      try {
        if (isEdit) {
          const patch = { url: cleanUrl, title: titleEl.value.trim() || LP.host(cleanUrl) };
          if (finalSlug) patch.slug = finalSlug;
          if (!keepExpiry) patch.expiresAt = expiresAt;
          await LP.data.update(link.id, patch);
          LP.ui.toast('تغییرها ذخیره شد.');
          m.close('saved');
          return;
        }
        const payload = { url: cleanUrl };
        if (titleEl.value.trim()) payload.title = titleEl.value.trim();
        if (finalSlug) payload.slug = finalSlug;
        if (expiresAt) payload.expiresAt = expiresAt;
        showSuccess(await LP.data.create(payload));
      } catch (err) {
        LP.ui.busy(submit, false);
        const fields = { url, title: titleEl, slug, expiresAt: expiry };
        const shown = Object.entries(err.details || {}).filter(([k]) => fields[k]);
        shown.forEach(([k, msg]) => LP.ui.setError(fields[k], msg));
        if (shown.length) LP.ui.focusFirstError(form);
        else LP.ui.toast(err.message, 'error', 5000);
      }
    });

    function showSuccess(created) {
      m.el.querySelector('.modal-title').textContent = 'لینکت ساخته شد';
      m.body.innerHTML = `
        <div class="success-view">
          <div class="state-icon ok"><span class="icon">check_circle</span></div>
          <h3>آماده‌ست! 🎉</h3>
          <div class="short-result">
            <span class="ltr mono" id="lmShort">${esc(LP.data.shortText(created))}</span>
            <button type="button" class="btn btn-soft btn-sm" id="lmCopy"><span class="icon">content_copy</span>کپی</button>
          </div>
        </div>`;
      const f = m.el.querySelector('.modal-foot');
      f.innerHTML = '<div class="modal-foot-inner"><button type="button" class="btn btn-primary" id="lmAgain"><span class="icon">add</span>ساخت یکی دیگه</button><button type="button" class="btn btn-ghost" id="lmDone">بستن</button></div>';
      m.el.querySelector('#lmCopy').addEventListener('click', async (ev) => {
        const ok = await LP.copy(LP.data.shortUrl(created));
        LP.ui.toast(ok ? 'لینک کپی شد.' : 'کپی نشد؛ خودت انتخابش کن.', ok ? 'success' : 'error');
        const ic = ev.currentTarget.querySelector('.icon');
        if (ic && ok) { ic.textContent = 'check'; setTimeout(() => (ic.textContent = 'content_copy'), 1500); }
      });
      m.el.querySelector('#lmDone').addEventListener('click', () => m.close('created'));
      m.el.querySelector('#lmAgain').addEventListener('click', () => { m.close('again'); setTimeout(() => open(), 180); });
      m.el.querySelector('#lmCopy').focus();
    }
  }

  LP.linkModal = { open };
})();

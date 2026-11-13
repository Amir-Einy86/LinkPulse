(function () {
  'use strict';
  const LP = window.LP;
  const esc = LP.esc;
  const ui = (LP.ui = {});

  ui.toast = (message, type = 'success', ms = 3200) => {
    let box = document.getElementById('toasts');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toasts';
      box.className = 'toasts';
      box.setAttribute('aria-live', 'polite');
      document.body.appendChild(box);
    }
    const icons = { success: 'check_circle', error: 'error', info: 'info' };
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.innerHTML = `<span class="icon">${icons[type] || 'info'}</span><span class="toast-text"></span>`;
    el.querySelector('.toast-text').textContent = message;
    box.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 300);
    }, ms);
  };

  let modalSeq = 0;
  ui.modal = ({ title = '', icon, body, footer, size, dismissible = true, onClose } = {}) => {
    const prevFocus = document.activeElement;
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    const modal = document.createElement('div');
    modal.className = 'modal' + (size ? ' modal-' + size : '');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    const titleId = 'modal-title-' + ++modalSeq;
    modal.setAttribute('aria-labelledby', titleId);
    modal.innerHTML = `
      <div class="modal-head">
        ${icon ? `<span class="modal-icon"><span class="icon">${icon}</span></span>` : ''}
        <h2 id="${titleId}" class="modal-title"></h2>
        <button type="button" class="btn-icon modal-x" aria-label="بستن"><span class="icon">close</span></button>
      </div>
      <div class="modal-body"></div>`;
    modal.querySelector('.modal-title').textContent = title;
    const bodyEl = modal.querySelector('.modal-body');
    if (typeof body === 'string') bodyEl.innerHTML = body;
    else if (body) bodyEl.appendChild(body);
    if (footer) {
      const f = document.createElement('div');
      f.className = 'modal-foot';
      if (typeof footer === 'string') f.innerHTML = footer;
      else f.appendChild(footer);
      modal.appendChild(f);
    }
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    document.body.classList.add('no-scroll');

    let closed = false;
    const close = (result) => {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey, true);
      backdrop.classList.add('out');
      setTimeout(() => backdrop.remove(), 150);
      if (!document.querySelector('.modal-backdrop:not(.out)')) document.body.classList.remove('no-scroll');
      if (prevFocus && prevFocus.focus) { try { prevFocus.focus(); } catch (e) {  } }
      if (onClose) onClose(result);
    };
    function onKey(e) {
      const all = document.querySelectorAll('.modal-backdrop:not(.out)');
      if (all[all.length - 1] !== backdrop) return;
      if (e.key === 'Escape' && dismissible) { e.stopPropagation(); close('esc'); return; }
      if (e.key === 'Tab') {
        const f = Array.from(modal.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea')).filter((el) => el.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', onKey, true);
    backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop && dismissible) close('backdrop'); });
    modal.querySelector('.modal-x').addEventListener('click', () => close('x'));
    if (!dismissible) modal.querySelector('.modal-x').hidden = true;
    requestAnimationFrame(() => {
      const auto = modal.querySelector('[autofocus]') || modal.querySelector('input:not([type=hidden]):not([type=checkbox]),select,textarea') || modal.querySelector('.modal-foot .btn') || modal.querySelector('.modal-x');
      if (auto) auto.focus();
    });
    return { el: modal, body: bodyEl, close };
  };

  ui.confirm = ({ title, message, messageHtml, confirmText = 'باشه', cancelText = 'انصراف', danger = false, icon, requireText } = {}) =>
    new Promise((resolve) => {
      const body = document.createElement('div');
      body.innerHTML = `<p class="muted modal-text"></p>${
        requireText
          ? `<div class="field" style="margin-top:1rem"><label class="label" for="confirmWord">برای تأیید، این کلمه رو بنویس: <b class="confirm-word"></b></label><input id="confirmWord" class="input" autocomplete="off"></div>`
          : ''
      }`;
      const p = body.querySelector('.modal-text');
      if (messageHtml) p.innerHTML = messageHtml; else p.textContent = message || '';
      if (requireText) body.querySelector('.confirm-word').textContent = requireText;

      const footer = document.createElement('div');
      footer.className = 'modal-foot-inner';
      footer.innerHTML = `<button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(confirmText)}</button><button type="button" class="btn btn-ghost" data-cancel>${esc(cancelText)}</button>`;

      let answered = false;
      const m = ui.modal({
        title, icon: icon || (danger ? 'warning' : 'help'), body, footer, size: 'sm',
        onClose: () => { if (!answered) resolve(false); },
      });
      const okBtn = footer.querySelector('[data-ok]');
      if (requireText) {
        okBtn.disabled = true;
        body.querySelector('#confirmWord').addEventListener('input', (e) => { okBtn.disabled = e.target.value.trim() !== requireText; });
      }
      okBtn.addEventListener('click', () => { answered = true; resolve(true); m.close('ok'); });
      footer.querySelector('[data-cancel]').addEventListener('click', () => { answered = true; resolve(false); m.close('cancel'); });
    });

  ui.dropdown = (mount, { options, value, icon, onChange, ariaLabel } = {}) => {
    let current = value !== undefined ? value : options[0].value;
    mount.classList.add('dd');
    mount.innerHTML = `
      <button type="button" class="dd-btn" aria-haspopup="listbox" aria-expanded="false"${ariaLabel ? ` aria-label="${esc(ariaLabel)}"` : ''}>
        ${icon ? `<span class="icon dd-icon">${icon}</span>` : ''}<span class="dd-label"></span><span class="icon dd-caret">expand_more</span>
      </button>
      <div class="dd-menu" role="listbox" hidden></div>`;
    const btn = mount.querySelector('.dd-btn');
    const menu = mount.querySelector('.dd-menu');
    const label = mount.querySelector('.dd-label');

    function render() {
      const sel = options.find((o) => o.value === current) || options[0];
      label.textContent = sel.label;
      menu.innerHTML = options
        .map((o) => `<button type="button" role="option" class="dd-item" data-value="${esc(o.value)}" aria-selected="${o.value === current}"><span>${esc(o.label)}</span>${o.value === current ? '<span class="icon">check</span>' : ''}</button>`)
        .join('');
    }
    function open() {
      document.querySelectorAll('.dd-menu:not([hidden])').forEach((m) => { if (m !== menu) m.hidden = true; });
      menu.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      setTimeout(() => document.addEventListener('click', outside), 0);
      document.addEventListener('keydown', onEsc);
    }
    function close() {
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('click', outside);
      document.removeEventListener('keydown', onEsc);
    }
    const outside = (e) => { if (!mount.contains(e.target)) close(); };
    const onEsc = (e) => { if (e.key === 'Escape') { close(); btn.focus(); } };

    btn.addEventListener('click', () => (menu.hidden ? open() : close()));
    menu.addEventListener('click', (e) => {
      const item = e.target.closest('.dd-item');
      if (!item) return;
      current = item.dataset.value;
      render();
      close();
      if (onChange) onChange(current);
    });
    render();
    return { get: () => current, set: (v) => { current = v; render(); } };
  };

  ui.popover = (trigger, panel) => {
    const close = () => { panel.hidden = true; trigger.setAttribute('aria-expanded', 'false'); document.removeEventListener('click', outside); document.removeEventListener('keydown', onEsc); };
    const outside = (e) => { if (!panel.contains(e.target) && !trigger.contains(e.target)) close(); };
    const onEsc = (e) => { if (e.key === 'Escape') { close(); trigger.focus(); } };
    trigger.addEventListener('click', () => {
      if (panel.hidden) {
        panel.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
        setTimeout(() => document.addEventListener('click', outside), 0);
        document.addEventListener('keydown', onEsc);
      } else close();
    });
    return { close };
  };

  ui.busy = (btn, on, label) => {
    if (on) {
      btn.dataset.html = btn.innerHTML;
      btn.disabled = true;
      btn.classList.add('is-loading');
      btn.innerHTML = `<span class="spinner" aria-hidden="true"></span><span>${esc(label || '')}</span>`;
    } else {
      btn.disabled = false;
      btn.classList.remove('is-loading');
      if (btn.dataset.html !== undefined) { btn.innerHTML = btn.dataset.html; delete btn.dataset.html; }
    }
  };

  ui.setError = (input, msg) => {
    const field = input.closest('.field');
    if (!field) return;
    field.classList.add('has-error');
    input.setAttribute('aria-invalid', 'true');
    let el = field.querySelector('.field-error');
    if (!el) {
      el = document.createElement('p');
      el.className = 'field-error';
      el.id = (input.id || 'f' + Math.random().toString(36).slice(2, 7)) + '-err';
      field.appendChild(el);
    }
    el.innerHTML = '<span class="icon">error</span><span class="err-text"></span>';
    el.querySelector('.err-text').textContent = msg;
    input.setAttribute('aria-describedby', el.id);
  };
  ui.clearError = (input) => {
    const field = input.closest('.field');
    if (!field) return;
    field.classList.remove('has-error');
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
    const el = field.querySelector('.field-error');
    if (el) el.remove();
  };
  ui.clearAll = (form) => form.querySelectorAll('.field.has-error input,.field.has-error select,.field.has-error textarea').forEach(ui.clearError);
  ui.liveClear = (form) => {
    form.addEventListener('input', (e) => { if (e.target.closest && e.target.closest('.field')) ui.clearError(e.target); });
    form.addEventListener('change', (e) => { if (e.target.closest && e.target.closest('.field')) ui.clearError(e.target); });
  };
  ui.focusFirstError = (form) => {
    const el = form.querySelector('[aria-invalid="true"]');
    if (el) el.focus();
  };

  ui.emptyState = ({ icon = 'link_off', title, text, action = '' }) =>
    `<div class="state"><div class="state-icon"><span class="icon">${icon}</span></div><h3>${esc(title)}</h3><p class="muted">${esc(text)}</p>${action}</div>`;

  ui.errorState = ({ title = 'یه مشکلی پیش اومد', text = 'نتونستیم اطلاعات رو بخونیم. یه بار دیگه امتحان کن.', retry = true } = {}) =>
    `<div class="state is-error" role="alert"><div class="state-icon"><span class="icon">error</span></div><h3>${esc(title)}</h3><p class="muted">${esc(text)}</p>${
      retry ? '<button type="button" class="btn btn-soft" data-retry><span class="icon">refresh</span>تلاش دوباره</button>' : ''
    }</div>`;

  ui.skeletonRows = (n = 5) =>
    `<div class="skeleton-list" aria-busy="true" aria-label="در حال بارگذاری">${Array.from({ length: n }, () =>
      '<div class="skeleton-row"><div class="skeleton" style="width:2.2rem;height:2.2rem"></div><div class="grow"><div class="skeleton" style="width:40%;height:.9rem"></div><div class="skeleton" style="width:25%;height:.7rem;margin-top:.5rem"></div></div><div class="skeleton" style="width:4rem;height:1.2rem"></div></div>'
    ).join('')}</div>`;

  ui.pager = (mount, { page, pages, total, pageSize, noun = 'مورد', onChange }) => {
    const from = total ? (page - 1) * pageSize + 1 : 0;
    const to = Math.min(total, page * pageSize);
    const nums = [];
    for (let p = 1; p <= pages; p++) if (p === 1 || p === pages || Math.abs(p - page) <= 1) nums.push(p);
    const withGaps = [];
    nums.forEach((p, i) => { if (i && p - nums[i - 1] > 1) withGaps.push('…'); withGaps.push(p); });

    mount.className = 'pager';
    mount.innerHTML = `
      <span class="pager-info">نمایش <b>${LP.fa(from)}</b> تا <b>${LP.fa(to)}</b> از <b>${LP.fa(total)}</b> ${esc(noun)}</span>
      <div class="pager-btns" role="navigation" aria-label="صفحه‌بندی">
        <button type="button" class="pager-btn" data-go="${page - 1}" ${page <= 1 ? 'disabled' : ''} aria-label="صفحه‌ی قبل"><span class="icon">chevron_right</span></button>
        ${withGaps.map((p) => (p === '…' ? '<span class="pager-gap">…</span>' : `<button type="button" class="pager-btn${p === page ? ' is-active' : ''}" data-go="${p}" ${p === page ? 'aria-current="page"' : ''}>${LP.fa(p)}</button>`)).join('')}
        <button type="button" class="pager-btn" data-go="${page + 1}" ${page >= pages ? 'disabled' : ''} aria-label="صفحه‌ی بعد"><span class="icon">chevron_left</span></button>
      </div>`;
    mount.onclick = (e) => {
      const b = e.target.closest('[data-go]');
      if (b && !b.disabled) onChange(Number(b.dataset.go));
    };
  };

  ui.wirePasswordToggles = (root = document) => {
    root.querySelectorAll('[data-toggle-password]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const input = root.querySelector('#' + btn.dataset.togglePassword);
        if (!input) return;
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.setAttribute('aria-label', show ? 'مخفی کردن رمز' : 'نمایش رمز');
        btn.querySelector('.icon').textContent = show ? 'visibility_off' : 'visibility';
      });
    });
  };

  ui.statusBadge = (status) => `<span class="badge badge-${status}">${esc(LP.data.STATUS_LABEL[status])}</span>`;

  ui.delta = (v) => {
    if (v == null) return '<span class="delta delta-flat">—</span>';
    const up = v > 0.05, down = v < -0.05;
    const cls = up ? 'delta-up' : down ? 'delta-down' : 'delta-flat';
    const icon = up ? 'trending_up' : down ? 'trending_down' : 'trending_flat';
    const sign = up ? '+' : '';
    return `<span class="delta ${cls}"><span class="icon">${icon}</span><span class="ltr">${sign}${LP.fa1(v)}٪</span></span>`;
  };
})();

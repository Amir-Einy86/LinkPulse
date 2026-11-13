(function () {
  'use strict';
  const LP = window.LP;
  const $ = LP.$;
  const esc = LP.esc;

  const SORTS = [
    { value: 'newest', label: 'جدیدترین' },
    { value: 'clicks', label: 'پرکلیک‌ترین' },
    { value: 'alpha', label: 'الفبایی' },
  ];
  const SERVER_SORT = { newest: 'newest', clicks: 'clicks', alpha: 'title' };
  const STATUSES = [
    { value: 'all', label: 'همه‌ی وضعیت‌ها' },
    { value: 'active', label: 'فعال' },
    { value: 'expired', label: 'منقضی‌شده' },
    { value: 'archived', label: 'آرشیو' },
  ];

  const initialSort = LP.query('sort');
  const state = {
    q: LP.query('q') || '',
    status: 'all',
    sort: SORTS.some((s) => s.value === initialSort) ? initialSort : 'newest',
    page: 1,
    selected: new Set(),
    loading: true,
    error: null,
    links: [],
    summary: null,
    meta: { total: 0, pages: 1 },
  };
  let seq = 0;

  const query = () => ({ q: state.q.trim(), status: state.status, sort: SERVER_SORT[state.sort] });

  async function load({ keepRows = false } = {}) {
    const mine = ++seq;
    state.error = null;
    if (!keepRows) { state.loading = true; render(); }
    try {
      const res = await LP.data.list(Object.assign(query(), { page: state.page, limit: LP.data.settings().pageSize }));
      if (mine !== seq) return;
      if (state.page > res.meta.pages) { state.page = res.meta.pages; return load({ keepRows: true }); }
      Object.assign(state, { links: res.links, summary: res.summary, meta: res.meta, loading: false });
    } catch (err) {
      if (mine !== seq) return;
      Object.assign(state, { loading: false, error: err });
    }
    render();
  }

  function renderStrip() {
    const s = state.summary || { total: 0, clicks: 0, active: 0, topLink: null };
    const ratio = s.total ? (s.active / s.total) * 100 : 0;
    $('#strip').innerHTML = `
      <article class="kpi kpi-mini"><div><span class="kpi-label">کل لینک‌ها</span><div class="kpi-value">${LP.fa(s.total)}</div></div><span class="kpi-icon tone-primary"><span class="icon">link</span></span></article>
      <article class="kpi kpi-mini"><div><span class="kpi-label">کل کلیک‌ها</span><div class="kpi-value">${LP.fa(s.clicks)}</div></div><span class="kpi-icon tone-secondary"><span class="icon">ads_click</span></span></article>
      <article class="kpi kpi-mini"><div><span class="kpi-label">نسبت لینک‌های فعال</span><div class="kpi-value tone-tertiary">${LP.pct(ratio)}</div><span class="dim small">${LP.fa(s.active)} از ${LP.fa(s.total)} لینک</span></div><span class="kpi-icon tone-tertiary"><span class="icon">verified</span></span></article>
      <article class="kpi kpi-mini"><div class="grow col"><span class="kpi-label">پرکلیک‌ترین لینک</span><div class="kpi-value kpi-value-sm truncate">${s.topLink ? esc(s.topLink.title) : '—'}</div><span class="dim small">${s.topLink ? LP.fa(s.topLink.clicks) + ' کلیک' : 'هنوز کلیکی نگرفتی'}</span></div><span class="kpi-icon tone-warning"><span class="icon">emoji_events</span></span></article>`;
  }

  function rowHtml(l) {
    const ic = LP.data.iconFor(l.url);
    return `
      <tr data-id="${esc(l.id)}"${state.selected.has(l.id) ? ' class="is-selected"' : ''}>
        <td class="check-col"><input type="checkbox" class="row-check" aria-label="انتخاب ${esc(l.title)}"${state.selected.has(l.id) ? ' checked' : ''}></td>
        <td>
          <div class="row gap-3">
            <span class="link-ic tone-${ic.tone}"><span class="icon">${ic.icon}</span></span>
            <div class="col">
              <a class="cell-title truncate" href="link-details.html?id=${esc(l.id)}">${esc(l.title)}</a>
              <span class="row gap-1"><span class="ltr mono short-text">${esc(LP.data.shortText(l))}</span>
              <button type="button" class="btn-icon mini" data-action="copy" aria-label="کپی لینک کوتاه" title="کپی"><span class="icon">content_copy</span></button></span>
            </div>
          </div>
        </td>
        <td><a class="ltr dim truncate cell-dest" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer" title="${esc(l.url)}">${esc(l.url)}</a></td>
        <td class="num-col"><span class="num">${LP.fa(l.clicks)}</span></td>
        <td>${LP.ui.statusBadge(l.status)}</td>
        <td class="dim nowrap">${LP.fmtDate(l.createdAt)}</td>
        <td class="actions">
          <a class="btn-icon accent" href="link-details.html?id=${esc(l.id)}" aria-label="آمار" title="آمار"><span class="icon">query_stats</span></a>
          <button type="button" class="btn-icon secondary" data-action="edit" aria-label="ویرایش" title="ویرایش"><span class="icon">edit</span></button>
          <button type="button" class="btn-icon" data-action="archive" aria-label="${l.archived ? 'خروج از آرشیو' : 'آرشیو'}" title="${l.archived ? 'خروج از آرشیو' : 'آرشیو'}"><span class="icon">${l.archived ? 'unarchive' : 'archive'}</span></button>
          <button type="button" class="btn-icon danger" data-action="delete" aria-label="حذف" title="حذف"><span class="icon">delete</span></button>
        </td>
      </tr>`;
  }

  function render() {
    renderStrip();
    const mount = $('#tableMount');
    const pagerMount = $('#pagerMount');
    pagerMount.innerHTML = '';
    pagerMount.className = '';

    if (state.loading) { mount.innerHTML = LP.ui.skeletonRows(6); updateBulk(); return; }
    if (state.error) {
      mount.innerHTML = LP.ui.errorState({ title: 'لینک‌ها بالا نیومدن', text: state.error.message });
      return;
    }

    const filtered = state.q.trim() || state.status !== 'all';
    if (!state.summary.total) {
      mount.innerHTML = LP.ui.emptyState({
        icon: 'add_link', title: 'هنوز لینکی نساختی',
        text: 'اولین لینکت رو بساز. می‌تونی یه اسلاگ دلخواه هم براش بذاری.',
        action: '<button type="button" class="btn btn-primary" data-action="create"><span class="icon">add</span>ساخت اولین لینک</button>',
      });
      return;
    }
    if (!state.links.length && filtered) {
      mount.innerHTML = LP.ui.emptyState({
        icon: 'search_off', title: 'لینکی پیدا نشد',
        text: 'با این جستجو و فیلتر چیزی نداریم. شرط‌ها رو کم‌تر کن یا یه عبارت دیگه بنویس.',
        action: '<button type="button" class="btn btn-soft" data-action="clear"><span class="icon">filter_alt_off</span>پاک کردن فیلترها</button>',
      });
      return;
    }

    const allChecked = state.links.length > 0 && state.links.every((l) => state.selected.has(l.id));
    mount.innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead><tr>
            <th class="check-col"><input type="checkbox" id="selectAll" aria-label="انتخاب همه‌ی ردیف‌های این صفحه"${allChecked ? ' checked' : ''}></th>
            <th>عنوان و لینک کوتاه</th><th>آدرس مقصد</th><th class="num-col">کلیک‌ها</th><th>وضعیت</th><th>تاریخ ساخت</th><th class="actions">عملیات</th>
          </tr></thead>
          <tbody>${state.links.map(rowHtml).join('')}</tbody>
        </table>
      </div>`;

    LP.ui.pager(pagerMount, {
      page: state.page, pages: state.meta.pages, total: state.meta.total, pageSize: LP.data.settings().pageSize, noun: 'لینک',
      onChange: (p) => { state.page = p; load({ keepRows: true }); $('#tableMount').scrollIntoView({ behavior: 'smooth', block: 'start' }); },
    });
    updateBulk();
  }

  function updateBulk() {
    const n = state.selected.size;
    $('#bulkBar').hidden = n === 0;
    $('#selCount').textContent = LP.fa(n);
  }

  function filtersChanged() {
    state.page = 1;
    state.selected.clear();
    load();
  }

  const findLink = (id) => state.links.find((l) => l.id === id);

  async function confirmDelete(ids) {
    const one = ids.length === 1 ? findLink(ids[0]) : null;
    const ok = await LP.ui.confirm({
      title: one ? 'حذف لینک' : `حذف ${LP.fa(ids.length)} لینک`,
      messageHtml: one
        ? `مطمئنی می‌خوای «<b>${esc(one.title)}</b>» رو حذف کنی؟ بعد از حذف، هر کسی که لینک کوتاهش رو باز کنه به صفحه‌ی خطا می‌خوره و برگشتی در کار نیست.`
        : `مطمئنی می‌خوای این ${LP.fa(ids.length)} لینک رو با هم حذف کنی؟ این کار برگشت نداره.`,
      confirmText: 'آره، حذف کن', danger: true,
    });
    if (!ok) return;
    try {
      if (ids.length === 1) await LP.data.remove(ids[0]); else await LP.data.removeMany(ids);
      ids.forEach((id) => state.selected.delete(id));
      LP.ui.toast(ids.length === 1 ? 'لینک حذف شد.' : `${LP.fa(ids.length)} لینک حذف شد.`);
    } catch (err) {
      LP.ui.toast(err.message, 'error', 5000);
    }
  }

  async function exportCsv() {
    if (!state.summary || !state.summary.total) return LP.ui.toast('لینکی برای خروجی گرفتن نیست.', 'info');
    try {
      await LP.data.exportCsv(query());
      LP.ui.toast('فایل CSV ساخته شد.');
    } catch (err) {
      LP.ui.toast(err.message, 'error', 5000);
    }
  }

  const statusDd = LP.ui.dropdown($('#statusDd'), { options: STATUSES, value: 'all', icon: 'filter_alt', ariaLabel: 'فیلتر وضعیت', onChange: (v) => { state.status = v; filtersChanged(); } });
  LP.ui.dropdown($('#sortDd'), { options: SORTS, value: state.sort, icon: 'sort', ariaLabel: 'مرتب‌سازی', onChange: (v) => { state.sort = v; filtersChanged(); } });

  const search = $('#linkSearch');
  search.value = state.q;
  search.addEventListener('input', LP.debounce(() => { state.q = search.value; filtersChanged(); }, 300));

  $('#createBtn').addEventListener('click', () => LP.linkModal.open());
  $('#exportBtn').addEventListener('click', exportCsv);
  $('#bulkDelete').addEventListener('click', () => confirmDelete(Array.from(state.selected)));

  $('#tableMount').addEventListener('change', (e) => {
    if (e.target.id === 'selectAll') {
      state.links.forEach((l) => { if (e.target.checked) state.selected.add(l.id); else state.selected.delete(l.id); });
      render();
    } else if (e.target.classList.contains('row-check')) {
      const tr = e.target.closest('tr');
      if (e.target.checked) state.selected.add(tr.dataset.id); else state.selected.delete(tr.dataset.id);
      tr.classList.toggle('is-selected', e.target.checked);
      const boxes = Array.from(document.querySelectorAll('#tableMount .row-check'));
      const sa = $('#selectAll');
      if (sa) sa.checked = boxes.every((b) => b.checked);
      updateBulk();
    }
  });

  $('#tableMount').addEventListener('click', async (e) => {
    if (e.target.closest('[data-retry]')) return load();
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const act = btn.dataset.action;
    if (act === 'create') return LP.linkModal.open();
    if (act === 'clear') {
      state.q = ''; state.status = 'all'; search.value = ''; statusDd.set('all'); filtersChanged();
      return;
    }
    const tr = btn.closest('tr');
    const link = tr && findLink(tr.dataset.id);
    if (!link) return;
    if (act === 'copy') {
      const ok = await LP.copy(LP.data.shortUrl(link));
      LP.ui.toast(ok ? 'لینک کوتاه کپی شد.' : 'کپی نشد؛ خودت انتخابش کن.', ok ? 'success' : 'error');
    } else if (act === 'edit') LP.linkModal.open({ link });
    else if (act === 'archive') {
      try {
        await LP.data.update(link.id, { archived: !link.archived });
        LP.ui.toast(link.archived ? 'لینک از آرشیو بیرون اومد.' : 'لینک آرشیو شد.');
      } catch (err) { LP.ui.toast(err.message, 'error', 5000); }
    } else if (act === 'delete') confirmDelete([link.id]);
  });

  document.addEventListener('lp:links-changed', () => load({ keepRows: true }));

  render();
  LP.ready.then(() => load());
})();

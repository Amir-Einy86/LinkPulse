/* =========================================================
   dashboard.js — منطق صفحه‌ی داشبورد
   داده‌ها از سرور میان: /analytics/overview و /links
   ========================================================= */
(function () {
  'use strict';
  const LP = window.LP;
  const $ = LP.$;
  const esc = LP.esc;

  const state = { days: 7, q: '', status: 'all' };
  let overview = null;   // آخرین پاسخ نمای کلی
  let recent = [];       // لینک‌های جدول
  let loadSeq = 0;       // برای نادیده گرفتن پاسخ‌های قدیمی (وقتی کاربر سریع فیلتر عوض می‌کنه)

  /* ---------- سلام ---------- */
  function renderGreeting() {
    const p = LP.data.profile();
    const { summary, agg } = overview;
    $('#greeting').textContent = `${LP.greeting()}، ${p.name}`;
    $('#subGreeting').textContent = summary.total
      ? `توی ${LP.fa(state.days)} روز گذشته لینک‌هات ${LP.fa(agg.total)} کلیک گرفتن.`
      : 'هنوز لینکی نساختی. اولین لینکت رو بساز و آمارش رو ببین.';
  }

  /* ---------- کارت‌های آمار ---------- */
  function renderKpis() {
    const { summary: s, agg } = overview;
    $('#kpiLinks').textContent = LP.fa(s.total);
    $('#kpiLinksNote').innerHTML = `<span class="dim">${LP.fa(s.active)} فعال از ${LP.fa(s.total)} لینک</span>`;

    $('#kpiClicks').textContent = LP.fa(agg.total);
    $('#kpiClicksNote').innerHTML = `${LP.ui.delta(agg.change)}<span class="dim">نسبت به ${LP.fa(state.days)} روز قبلش</span>`;

    $('#kpiActive').textContent = LP.fa(s.active);
    $('#kpiActiveNote').innerHTML = `<span class="dim">${LP.fa(s.expired)} منقضی‌شده · ${LP.fa(s.archived)} آرشیو</span>`;
  }

  /* ---------- نمودار ---------- */
  function renderChart() {
    const { agg } = overview;
    LP.charts.line($('#clicksChart'), { labels: agg.labels, tips: agg.tips, values: agg.values, ariaLabel: `نمودار کلیک‌های ${LP.fa(state.days)} روز گذشته` });
    const max = Math.max(0, ...agg.values);
    $('#peakBadge').innerHTML = max > 0 ? `<span class="icon">trending_up</span>اوج: ${LP.fa(max)} کلیک در یک روز` : 'هنوز کلیکی ثبت نشده';
  }

  /* ---------- پرکلیک‌ترین‌ها (بر اساس کل کلیک‌ها؛ نمودار کوچک: ۷ روز اخیر) ---------- */
  function renderTop() {
    const ranked = overview.topLinks.filter((l) => l.clicks > 0);
    $('#topLinks').innerHTML = ranked.length
      ? ranked.map((l, i) => `
        <a class="top-item" href="link-details.html?id=${esc(l.id)}">
          <span class="rank${i === 0 ? ' is-first' : ''}">${LP.fa(i + 1)}</span>
          <span class="grow col">
            <span class="top-short ltr mono truncate">${esc(LP.data.shortText(l))}</span>
            <span class="dim small truncate">${esc(l.title)}</span>
          </span>
          <span class="col top-end"><b>${LP.fa(l.clicks)}</b>${LP.charts.spark(l.sparkline, i === 0 ? LP.charts.colors.primary : LP.charts.colors.muted)}</span>
        </a>`).join('')
      : '<p class="dim small top-empty">هنوز لینکی کلیک نگرفته.</p>';
  }

  /* ---------- جدول آخرین لینک‌ها ---------- */
  function recentRow(l) {
    const ic = LP.data.iconFor(l.url);
    return `
      <tr data-id="${esc(l.id)}">
        <td>
          <div class="row gap-3">
            <span class="link-ic tone-${ic.tone}"><span class="icon">${ic.icon}</span></span>
            <div class="col"><strong class="truncate cell-title">${esc(l.title)}</strong><span class="dim small">${LP.fa(l.clicks)} کلیک</span></div>
          </div>
        </td>
        <td>
          <div class="row gap-2">
            <span class="ltr mono short-text">${esc(LP.data.shortText(l))}</span>
            <button type="button" class="btn-icon" data-action="copy" aria-label="کپی لینک کوتاه" title="کپی"><span class="icon">content_copy</span></button>
          </div>
        </td>
        <td><span class="ltr dim truncate cell-dest" title="${esc(l.url)}">${esc(l.url)}</span></td>
        <td>${LP.ui.statusBadge(l.status)}</td>
        <td class="dim nowrap">${LP.fmtDate(l.createdAt)}</td>
        <td class="actions">
          <a class="btn-icon accent" href="link-details.html?id=${esc(l.id)}" aria-label="آمار این لینک" title="آمار"><span class="icon">query_stats</span></a>
          <button type="button" class="btn-icon secondary" data-action="edit" aria-label="ویرایش" title="ویرایش"><span class="icon">edit</span></button>
        </td>
      </tr>`;
  }

  function renderRecent() {
    const mount = $('#recentMount');
    const filtered = state.q.trim() || state.status !== 'all';
    if (!overview.summary.total) {
      mount.innerHTML = LP.ui.emptyState({
        icon: 'add_link', title: 'هنوز لینکی نداری',
        text: 'اولین لینک کوتاهت رو بساز. ده ثانیه بیشتر وقت نمی‌گیره.',
        action: '<button type="button" class="btn btn-primary" data-action="create"><span class="icon">add</span>ساخت اولین لینک</button>',
      });
      return;
    }
    if (!recent.length && filtered) {
      mount.innerHTML = LP.ui.emptyState({ icon: 'search_off', title: 'چیزی پیدا نشد', text: 'با این جستجو یا فیلتر، لینکی نداریم. یه عبارت دیگه امتحان کن.' });
      return;
    }
    mount.innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>عنوان</th><th>لینک کوتاه</th><th>مقصد</th><th>وضعیت</th><th>تاریخ ساخت</th><th class="actions">عملیات</th></tr></thead>
          <tbody>${recent.map(recentRow).join('')}</tbody>
        </table>
      </div>`;
  }

  /* ---------- دریافت داده‌ها ---------- */
  async function fetchRecent() {
    const res = await LP.data.list({ q: state.q.trim(), status: state.status, sort: 'newest', limit: 5 });
    recent = res.links;
  }

  function showError(err) {
    $('#recentMount').innerHTML = LP.ui.errorState({ title: 'اطلاعات بالا نیومد', text: err.message });
  }

  async function loadAll() {
    const seq = ++loadSeq;
    $('#recentMount').innerHTML = LP.ui.skeletonRows(4);
    try {
      const [ov] = await Promise.all([LP.data.overview(state.days), fetchRecent()]);
      if (seq !== loadSeq) return;
      overview = ov;
      renderGreeting(); renderKpis(); renderChart(); renderTop(); renderRecent();
    } catch (err) {
      if (seq === loadSeq) showError(err);
    }
  }

  async function loadRecentOnly() {
    const seq = ++loadSeq;
    try {
      await fetchRecent();
      if (seq !== loadSeq) return;
      renderRecent();
    } catch (err) {
      if (seq === loadSeq) showError(err);
    }
  }

  /* ---------- رویدادها ---------- */
  $('#createBtn').addEventListener('click', () => LP.linkModal.open());
  $('#rangeSelect').addEventListener('change', (e) => { state.days = Number(e.target.value); loadAll(); });
  $('#statusSelect').addEventListener('change', (e) => { state.status = e.target.value; loadRecentOnly(); });
  $('#tableSearch').addEventListener('input', LP.debounce((e) => { state.q = e.target.value; loadRecentOnly(); }, 250));

  $('#refreshBtn').addEventListener('click', async (e) => {
    const icon = e.currentTarget.querySelector('.icon');
    icon.style.transition = 'transform .6s';
    icon.style.transform = 'rotate(360deg)';
    await loadAll();
    icon.style.transition = 'none';
    icon.style.transform = '';
    LP.ui.toast('آمار به‌روز شد.');
  });

  $('#recentMount').addEventListener('click', async (e) => {
    if (e.target.closest('[data-retry]')) return loadAll();
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'create') return LP.linkModal.open();
    const id = btn.closest('tr') && btn.closest('tr').dataset.id;
    const link = recent.find((l) => l.id === id);
    if (!link) return;
    if (btn.dataset.action === 'copy') {
      const ok = await LP.copy(LP.data.shortUrl(link));
      LP.ui.toast(ok ? 'لینک کوتاه کپی شد.' : 'کپی نشد؛ خودت انتخابش کن.', ok ? 'success' : 'error');
    }
    if (btn.dataset.action === 'edit') LP.linkModal.open({ link });
  });

  // هر وقت لینکی ساخته/ویرایش/حذف شد، صفحه خودش رو دوباره می‌کشه
  document.addEventListener('lp:links-changed', loadAll);

  LP.ready.then(() => {
    // اگه کاربر از صفحه‌ی اصلی با یه آدرس اومده، پنجره‌ی ساخت لینک با همون آدرس باز می‌شه
    const pending = LP.store.get('pending-url', null);
    if (pending) { LP.store.remove('pending-url'); LP.linkModal.open({ url: pending }); }
    loadAll();
  });
})();

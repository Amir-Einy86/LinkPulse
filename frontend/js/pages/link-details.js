(function () {
  'use strict';
  const LP = window.LP;
  const $ = LP.$;
  const esc = LP.esc;
  const root = $('#main');

  const RANGES = [
    { key: '24h', label: '۲۴ ساعت', title: 'ساعت‌به‌ساعت، ۲۴ ساعت گذشته' },
    { key: '7d', label: '۷ روز', title: 'روزانه، ۷ روز گذشته' },
    { key: '30d', label: '۳۰ روز', title: 'روزانه، ۳۰ روز گذشته' },
    { key: 'all', label: 'از ابتدا', title: 'از زمان ساخته شدن لینک' },
  ];
  const SOURCE_COLORS = LP.charts.series;
  const DEVICE_STYLE = {
    'دسکتاپ': { icon: 'desktop_windows', cls: 'bar-primary' },
    'موبایل': { icon: 'smartphone', cls: 'bar-secondary' },
    'تبلت': { icon: 'tablet_mac', cls: 'bar-tertiary' },
  };

  let link = null;
  let range = '7d';
  let all = [];
  let stats = null;
  let seq = 0;

  function renderLoading() {
    root.innerHTML = '<div class="card">' + LP.ui.skeletonRows(6) + '</div>';
  }

  function renderNotFound(hasAny, err) {
    LP.layout.setCrumb(err ? 'خطا' : 'لینک پیدا نشد');
    const isErr = !!err;
    const title = isErr ? 'آمار بالا نیومد' : hasAny ? 'این لینک پیدا نشد' : 'هنوز لینکی نداری';
    const text = isErr ? err.message : hasAny ? 'ممکنه حذف شده باشه یا آدرس رو اشتباه وارد کرده باشی.' : 'اول یه لینک بساز تا بتونی آمارش رو ببینی.';
    root.innerHTML = `
      <div class="card"><div class="state ${hasAny || isErr ? 'is-error' : ''}" role="alert">
        <div class="state-icon"><span class="icon">${isErr ? 'cloud_off' : hasAny ? 'link_off' : 'add_link'}</span></div>
        <h3>${title}</h3><p class="muted">${esc(text)}</p>
        <div class="row gap-2 wrap center-x">
          ${isErr ? '<button type="button" class="btn btn-soft" id="nfRetry"><span class="icon">refresh</span>تلاش دوباره</button>' : ''}
          <a class="btn btn-primary" href="my-links.html"><span class="icon">link</span>لینک‌های من</a>
          ${hasAny || isErr ? '' : '<button type="button" class="btn btn-soft" id="nfCreate"><span class="icon">add</span>ساخت لینک</button>'}
        </div>
      </div></div>`;
    const c = $('#nfCreate');
    if (c) c.addEventListener('click', () => LP.linkModal.open());
    const r = $('#nfRetry');
    if (r) r.addEventListener('click', () => renderPage());
  }

  async function renderPage() {
    const mine = ++seq;
    renderLoading();
    let res;
    try {
      const listRes = await LP.data.list({ sort: 'clicks', limit: 50 });
      all = listRes.links;
      const id = LP.query('id');
      link = id ? await LP.data.get(id) : listRes.summary.topLink || all[0] || null;
      if (mine !== seq) return;
      if (!link) return renderNotFound(false);
      if (!all.some((l) => l.id === link.id)) all = [link].concat(all);
      res = await LP.data.linkAnalytics(link.id, range);
    } catch (err) {
      if (mine !== seq) return;
      if (err.status === 404 || err.status === 400) return renderNotFound(true);
      return renderNotFound(true, err);
    }
    if (mine !== seq) return;
    stats = res;
    link = res.link;
    const st = link.status;
    LP.layout.setCrumb(link.title);
    document.title = `${link.title} | آمار لینک‌پالس`;

    root.innerHTML = `
      <div class="details-top">
        <a class="back-link" href="my-links.html"><span class="icon">arrow_forward</span>همه‌ی لینک‌ها</a>
        <div class="row gap-2 wrap">
          <label class="sr-only" for="linkPicker">انتخاب لینک</label>
          <select id="linkPicker" class="select select-sm picker">
            ${all.map((l) => `<option value="${esc(l.id)}"${l.id === link.id ? ' selected' : ''}>${esc(l.title)}</option>`).join('')}
          </select>
          <button type="button" class="btn btn-soft" id="exportBtn"><span class="icon tone-secondary">file_download</span>خروجی CSV</button>
        </div>
      </div>

      <section class="card link-head">
        <div class="link-head-top">
          <div class="col gap-2">
            <div class="row gap-3 wrap">
              <h1>${esc(link.title)}</h1>
              ${LP.ui.statusBadge(st)}
            </div>
            <div class="meta-row">
              <span><span class="icon">calendar_today</span>ساخته‌شده در ${LP.fmtDate(link.createdAt)}</span>
              <span><span class="icon">${link.expiresAt ? 'schedule' : 'all_inclusive'}</span>${link.expiresAt ? (st === 'expired' ? 'منقضی شده در ' : 'انقضا: ') + LP.fmtDate(link.expiresAt) : 'بدون تاریخ انقضا'}</span>
              <span class="chip ltr mono small">${esc(link.id)}</span>
            </div>
          </div>
          <div class="row gap-2 wrap">
            <button type="button" class="btn btn-primary" id="copyBtn"><span class="icon">content_copy</span>کپی لینک</button>
            <button type="button" class="btn btn-soft" id="editBtn"><span class="icon">edit</span>ویرایش</button>
            <button type="button" class="btn-icon btn-soft" id="archiveBtn" aria-label="${link.archived ? 'خروج از آرشیو' : 'آرشیو'}" title="${link.archived ? 'خروج از آرشیو' : 'آرشیو'}"><span class="icon">${link.archived ? 'unarchive' : 'archive'}</span></button>
            <button type="button" class="btn-icon btn-soft danger" id="deleteBtn" aria-label="حذف" title="حذف"><span class="icon">delete</span></button>
          </div>
        </div>
        <div class="url-boxes">
          <div class="url-box">
            <span class="url-ic tone-primary"><span class="icon">link</span></span>
            <div class="col grow"><span class="dim small">لینک کوتاه</span><span class="ltr mono tone-secondary bold truncate">${esc(LP.data.shortText(link))}</span></div>
          </div>
          <div class="url-box">
            <span class="url-ic tone-secondary"><span class="icon">call_made</span></span>
            <div class="col grow"><span class="dim small">آدرس مقصد</span><a class="ltr mono truncate dest-link" href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">${esc(link.url)}</a></div>
          </div>
        </div>
      </section>

      <section class="kpis kpis-4" id="detailKpis"></section>

      <section class="grid-main">
        <article class="card">
          <div class="card-head">
            <div><h2 class="card-title"><span class="icon tone-primary">show_chart</span>کلیک‌ها در گذر زمان</h2><p class="card-sub" id="rangeSub"></p></div>
            <div class="seg" role="tablist" aria-label="بازه‌ی زمانی نمودار">
              ${RANGES.map((r) => `<button type="button" role="tab" data-range="${r.key}" class="${r.key === range ? 'is-active' : ''}" aria-selected="${r.key === range}">${r.label}</button>`).join('')}
            </div>
          </div>
          <div id="lineChart"></div>
        </article>
        <article class="card">
          <div class="card-head"><div><h2 class="card-title"><span class="icon tone-secondary">pie_chart</span>منبع بازدید</h2><p class="card-sub">کاربرها از کجا اومدن</p></div></div>
          <div id="sourceDonut"></div>
          <div id="sourceLegend" class="legend"></div>
        </article>
      </section>

      <section class="grid-split">
        <article class="card">
          <div class="card-head"><div><h2 class="card-title"><span class="icon tone-tertiary">devices</span>نوع دستگاه</h2><p class="card-sub" id="browserNote"></p></div></div>
          <div id="deviceBars" class="stack"></div>
        </article>
        <article class="card">
          <div class="card-head"><div><h2 class="card-title"><span class="icon tone-primary">public</span>کشورها</h2><p class="card-sub">بیشترین کلیک‌ها از کجا بوده</p></div></div>
          <div id="countryList" class="stack gap-3"></div>
        </article>
      </section>

      <section class="card">
        <div class="card-head"><div><h2 class="card-title"><span class="icon tone-secondary">history</span>آخرین کلیک‌ها</h2><p class="card-sub">آخرین کلیک‌های ثبت‌شده</p></div></div>
        <div id="eventsMount"></div>
      </section>`;

    renderKpis();
    renderRange();
    renderBreakdowns();
    renderEvents();
    wire();
  }

  async function changeRange(next) {
    range = next;
    root.querySelectorAll('[data-range]').forEach((x) => { const on = x.dataset.range === range; x.classList.toggle('is-active', on); x.setAttribute('aria-selected', String(on)); });
    const mine = ++seq;
    $('#lineChart').style.opacity = '.4';
    try {
      const res = await LP.data.linkAnalytics(link.id, range);
      if (mine !== seq) return;
      stats = res;
      renderRange();
      renderBreakdowns();
    } catch (err) {
      LP.ui.toast(err.message, 'error', 5000);
    }
    $('#lineChart').style.opacity = '';
  }

  function renderKpis() {
    const k = stats.kpis;
    const uniquePct = link.clicks ? Math.min(100, (k.uniqueVisitors / link.clicks) * 100) : 0;
    $('#detailKpis').innerHTML = `
      <article class="kpi"><div class="kpi-head"><span class="kpi-label">کل کلیک‌ها</span><span class="kpi-icon tone-primary"><span class="icon">ads_click</span></span></div>
        <div class="kpi-value">${LP.fa(link.clicks)}</div><div class="kpi-foot">${LP.ui.delta(k.trend)}<span class="dim">نسبت به هفته‌ی قبل</span></div></article>
      <article class="kpi"><div class="kpi-head"><span class="kpi-label">بازدیدکننده‌ی یکتا</span><span class="kpi-icon tone-secondary"><span class="icon">person_pin_circle</span></span></div>
        <div class="kpi-value">${LP.fa(k.uniqueVisitors)}</div><div class="kpi-foot"><span class="dim">حدود ${LP.pct(uniquePct)} کل کلیک‌ها</span></div></article>
      <article class="kpi"><div class="kpi-head"><span class="kpi-label">منبع اصلی</span><span class="kpi-icon tone-tertiary"><span class="icon">near_me</span></span></div>
        <div class="kpi-value kpi-value-sm">${k.topSource ? esc(k.topSourceLabel) : '—'}</div><div class="kpi-foot"><span class="dim">${k.topSource ? LP.pct(k.topSource.pct) + ' از کل کلیک‌ها' : 'هنوز کلیکی نداره'}</span></div></article>
      <article class="kpi"><div class="kpi-head"><span class="kpi-label">میانگین روزانه</span><span class="kpi-icon tone-warning"><span class="icon">speed</span></span></div>
        <div class="kpi-value">${LP.fa(Math.round(k.avgDaily7))}</div><div class="kpi-foot"><span class="dim">${k.peak7 ? 'اوج: ' + LP.fa(k.peak7.value) + ' کلیک، ' + esc(k.peakLabel) : 'در هفته‌ی گذشته'}</span></div></article>`;
  }

  function renderRange() {
    const s = stats.series;
    const meta = RANGES.find((r) => r.key === range);
    $('#rangeSub').textContent = `${meta.title} · مجموع ${LP.fa(s.total)} کلیک`;
    LP.charts.line($('#lineChart'), { labels: s.labels, tips: s.tips, values: s.values, ariaLabel: 'نمودار کلیک‌های ' + meta.label });
  }

  function renderBreakdowns() {
    const b = stats.breakdowns;
    const total = b.total;

    const items = b.sources.map((s, i) => Object.assign({}, s, { color: SOURCE_COLORS[i % 4] }));
    LP.charts.donut($('#sourceDonut'), { items, centerValue: LP.fa(total), centerLabel: 'کل کلیک', ariaLabel: 'نمودار منبع بازدید' });
    $('#sourceLegend').innerHTML = items.map((s) => `
      <div class="legend-row"><span class="row gap-2"><i class="swatch" style="background:${s.color}"></i>${esc(s.label)}</span>
      <span class="row gap-3 small"><span class="dim">${LP.fa(s.value)}</span><b>${LP.pct(s.pct)}</b></span></div>`).join('');

    $('#deviceBars').innerHTML = b.devices.map((d) => {
      const st = DEVICE_STYLE[d.label] || DEVICE_STYLE['دسکتاپ'];
      return `<div class="bar-item"><div class="row between"><span class="row gap-2"><span class="icon dim">${st.icon}</span>${esc(d.label)}</span><span class="row gap-2 small"><span class="dim">${LP.fa(d.value)}</span><b>${LP.pct(d.pct)}</b></span></div><div class="bar"><div class="bar-fill ${st.cls}" style="width:${d.pct.toFixed(1)}%"></div></div></div>`;
    }).join('');
    const bt = b.browsers;
    $('#browserNote').textContent = total && bt.length ? `پرکاربردترین مرورگر: ${bt[0].label} (${LP.pct(bt[0].pct)})` : 'توی این بازه داده‌ای نیست';

    $('#countryList').innerHTML = b.countries.map((c) => `
      <div class="country">
        <span class="code ltr mono">${esc(c.code)}</span>
        <div class="grow col"><span class="bold">${esc(c.label)}</span><span class="dim small">${LP.fa(c.value)} کلیک</span></div>
        <div class="bar country-bar"><div class="bar-fill bar-primary" style="width:${c.pct.toFixed(1)}%"></div></div>
        <b class="country-pct">${LP.pct(c.pct)}</b>
      </div>`).join('');
  }

  function renderEvents() {
    const ev = stats.recent;
    $('#eventsMount').innerHTML = ev.length
      ? `<div class="table-wrap"><table class="table" style="min-width:560px"><thead><tr><th>زمان</th><th>کشور</th><th>منبع</th><th>دستگاه</th></tr></thead><tbody>${ev
          .map((e) => `<tr><td class="dim nowrap">${esc(LP.rel(e.time))}</td><td><span class="row gap-2"><span class="code ltr mono sm">${esc(e.code)}</span>${esc(e.country)}</span></td><td class="ltr mono small">${esc(e.ref)}</td><td>${esc(e.device)}</td></tr>`)
          .join('')}</tbody></table></div>`
      : LP.ui.emptyState({ icon: 'ads_click', title: 'هنوز کلیکی ثبت نشده', text: 'لینکت رو جایی منتشر کن؛ به‌محض اولین کلیک، اینجا نشون داده می‌شه.' });
  }

  function wire() {
    $('#linkPicker').addEventListener('change', (e) => LP.go('link-details.html?id=' + encodeURIComponent(e.target.value)));

    root.querySelectorAll('[data-range]').forEach((b) => b.addEventListener('click', () => { if (b.dataset.range !== range) changeRange(b.dataset.range); }));

    $('#copyBtn').addEventListener('click', async () => {
      const ok = await LP.copy(LP.data.shortUrl(link));
      LP.ui.toast(ok ? 'لینک کوتاه کپی شد.' : 'کپی نشد؛ خودت انتخابش کن.', ok ? 'success' : 'error');
    });
    $('#editBtn').addEventListener('click', () => LP.linkModal.open({ link }));
    $('#archiveBtn').addEventListener('click', async () => {
      try {
        await LP.data.update(link.id, { archived: !link.archived });
        LP.ui.toast(link.archived ? 'لینک از آرشیو بیرون اومد.' : 'لینک آرشیو شد.');
      } catch (err) { LP.ui.toast(err.message, 'error', 5000); }
    });
    $('#deleteBtn').addEventListener('click', async () => {
      const ok = await LP.ui.confirm({
        title: 'حذف لینک',
        messageHtml: `مطمئنی می‌خوای «<b>${esc(link.title)}</b>» رو حذف کنی؟ آمارش هم با لینک پاک می‌شه و برگشتی نداره.`,
        confirmText: 'آره، حذف کن', danger: true,
      });
      if (!ok) return;
      try {
        await LP.data.remove(link.id);
        link = null;
        LP.ui.toast('لینک حذف شد.');
        setTimeout(() => LP.go('my-links.html'), 500);
      } catch (err) { LP.ui.toast(err.message, 'error', 5000); }
    });
    $('#exportBtn').addEventListener('click', () => {
      const s = stats.series;
      const csv = LP.toCSV(['بازه', 'تعداد کلیک'], s.tips.map((t, i) => [t, s.values[i]]));
      LP.download(`linkpulse-${link.slug}-${range}.csv`, csv);
      LP.ui.toast('فایل CSV ساخته شد.');
    });
  }

  document.addEventListener('lp:links-changed', () => { if (link) renderPage(); });

  LP.ready.then(renderPage);
})();

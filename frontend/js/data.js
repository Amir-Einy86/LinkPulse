/* =========================================================
   data.js — «مخزن داده»: تنها جایی که با API حرف می‌زنه
   صفحه‌ها هیچ‌وقت آدرس API یا ساختار پاسخ سرور رو نمی‌دونن؛ فقط LP.data رو صدا می‌زنن.
   اینجا پاسخ‌های سرور به چیزی تبدیل می‌شن که صفحه‌ها راحت نمایش بدن
   (برچسب فارسی، تاریخ شمسی و ...).
   ========================================================= */
(function () {
  'use strict';
  const LP = window.LP;
  const api = LP.api;
  const data = (LP.data = {});

  const TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } })();
  const changed = () => document.dispatchEvent(new CustomEvent('lp:links-changed'));

  /* ---------- برچسب‌های فارسی ---------- */
  data.STATUS_LABEL = { active: 'فعال', expired: 'منقضی‌شده', archived: 'آرشیو' };
  const SOURCE_LABEL = { direct: 'مستقیم', search: 'موتور جستجو', social: 'شبکه‌های اجتماعی', other: 'سایر سایت‌ها' };
  const DEVICE_LABEL = { desktop: 'دسکتاپ', mobile: 'موبایل', tablet: 'تبلت' };
  const BROWSER_LABEL = { chrome: 'کروم', safari: 'سافاری', firefox: 'فایرفاکس', edge: 'اج', other: 'سایر' };
  let regionNames = null;
  try { regionNames = new Intl.DisplayNames(['fa'], { type: 'region' }); } catch (e) { /* مرورگر قدیمی */ }
  const countryName = (code) => {
    if (!code || code === 'XX') return 'نامشخص';
    try { return (regionNames && regionNames.of(code)) || code; } catch (e) { return code; }
  };

  /* ---------- کاربر، پروفایل و تنظیمات ---------- */
  const DEFAULT_SETTINGS = { defaultExpiry: 'none', pageSize: 6, notifyMilestone: true, notifyExpiry: true, notifyNews: false };
  data.profile = () => LP.session.user || { name: '', email: '', username: '', bio: '', createdAt: new Date().toISOString() };
  data.settings = () => Object.assign({}, DEFAULT_SETTINGS, (LP.session.user && LP.session.user.settings) || {});

  data.profileTotals = async () => (await api.get('/users/me')).data.totals;

  data.saveProfile = async (patch) => {
    const res = await api.patch('/users/me', patch);
    LP.session.user = res.data.user;
    document.dispatchEvent(new CustomEvent('lp:profile-changed'));
    return LP.session.user;
  };
  data.saveSettings = async (patch) => {
    const res = await api.patch('/users/me/settings', patch);
    LP.session.user = res.data.user;
    return data.settings();
  };
  data.changePassword = async (currentPassword, newPassword) => {
    const res = await api.put('/users/me/password', { currentPassword, newPassword });
    LP.session.start(res.data); // توکن تازه (توکن قبلی باطل شده)
  };
  data.deleteAccount = async (password) => {
    await api.delete('/users/me', { password });
    LP.api.token.clear();
    LP.session.user = null;
  };

  /* ---------- کمک‌های نمایشی لینک ---------- */
  data.status = (l) => l.status;
  data.shortUrl = (l) => l.shortUrl;
  data.shortText = (l) => String(l.shortUrl || '').replace(/^https?:\/\//, '');
  data.iconFor = (url) => {
    const h = LP.host(url);
    if (/github/.test(h)) return { icon: 'code', tone: 'primary' };
    if (/youtube|youtu\.be/.test(h)) return { icon: 'smart_display', tone: 'error' };
    if (/medium|blog/.test(h)) return { icon: 'article', tone: 'primary' };
    if (/figma/.test(h)) return { icon: 'palette', tone: 'secondary' };
    if (/drive\.google|docs\.google/.test(h)) return { icon: 'folder_open', tone: 'warning' };
    if (/vercel|netlify|herokuapp/.test(h)) return { icon: 'rocket_launch', tone: 'tertiary' };
    if (/t\.me|telegram/.test(h)) return { icon: 'send', tone: 'secondary' };
    if (/castbox|podcast|spotify/.test(h)) return { icon: 'podcasts', tone: 'tertiary' };
    return { icon: 'link', tone: 'primary' };
  };

  /* ---------- لینک‌ها ---------- */
  // query: { q, status, sort, page, limit }  →  { links, summary, meta }
  data.list = async (query) => {
    const res = await api.get('/links', { query });
    return { links: res.data.links, summary: res.data.summary, meta: res.meta };
  };
  data.get = async (id) => (await api.get('/links/' + encodeURIComponent(id))).data.link;
  data.create = async (payload) => {
    const res = await api.post('/links', payload);
    changed();
    return res.data.link;
  };
  data.update = async (id, patch) => {
    const res = await api.patch('/links/' + encodeURIComponent(id), patch);
    changed();
    return res.data.link;
  };
  data.remove = async (id) => { await api.delete('/links/' + encodeURIComponent(id)); changed(); };
  data.removeMany = async (ids) => { const r = await api.post('/links/bulk-delete', { ids }); changed(); return r.data.deleted; };
  data.removeAll = async () => { const r = await api.delete('/links'); changed(); return r.data.deleted; };
  data.slugStatus = async (slug, exceptId) => (await api.get('/links/check-slug', { query: { slug, exceptId } })).data;

  // دانلود CSV ساخته‌شده توسط سرور (با همون فیلترهای لیست)
  data.exportCsv = async (query) => {
    const res = await api.get('/links/export.csv', { query, raw: true });
    const text = await res.text();
    LP.download('linkpulse-links.csv', text.replace(/^﻿/, ''));
  };

  /* ---------- آمار ---------- */
  const dayDate = (key) => new Date(key + 'T12:00:00'); // ظهر؛ تا اختلاف ساعت، روز رو عوض نکنه
  const pad2 = (n) => String(n).padStart(2, '0');

  // نقطه‌های سری زمانی سرور → برچسب فارسی برای نمودار
  function formatSeries(series) {
    const labels = [], tips = [], values = [];
    series.points.forEach((p) => {
      if (series.unit === 'hour') {
        const hour = LP.fa(Number(p.from.slice(11, 13))) + ':۰۰';
        labels.push(hour); tips.push('ساعت ' + hour);
      } else if (series.unit === 'week') {
        labels.push(LP.fmtShort(dayDate(p.from)));
        tips.push(LP.fmtShort(dayDate(p.from)) + ' تا ' + LP.fmtShort(dayDate(p.to)));
      } else {
        labels.push(LP.fmtShort(dayDate(p.from)));
        tips.push(LP.fmtDate(dayDate(p.from)));
      }
      values.push(p.value);
    });
    return { labels, tips, values, total: series.total };
  }

  const labelled = (rows, map) => rows.map((r) => ({ key: r.key, label: map[r.key] || r.key, value: r.value, pct: r.pct }));
  function topCountries(rows) {
    let list = rows.map((r) => ({ key: r.key, label: countryName(r.key), code: r.key === 'XX' ? '··' : r.key, value: r.value, pct: r.pct }));
    if (list.length > 5) {
      const rest = list.slice(4);
      const value = rest.reduce((s, c) => s + c.value, 0);
      const pct = rest.reduce((s, c) => s + c.pct, 0);
      list = list.slice(0, 4).concat([{ key: 'rest', label: 'سایر کشورها', code: '··', value, pct }]);
    }
    return list;
  }

  data.linkAnalytics = async (id, range) => {
    const res = (await api.get(`/links/${encodeURIComponent(id)}/analytics`, { query: { range, tz: TZ } })).data;
    const b = res.breakdowns;
    return {
      link: res.link,
      series: formatSeries(res.series),
      breakdowns: {
        total: b.total,
        sources: labelled(b.sources, SOURCE_LABEL),
        devices: labelled(b.devices, DEVICE_LABEL),
        browsers: labelled(b.browsers, BROWSER_LABEL),
        countries: topCountries(b.countries),
      },
      kpis: Object.assign({}, res.kpis, {
        topSourceLabel: res.kpis.topSource ? SOURCE_LABEL[res.kpis.topSource.key] || res.kpis.topSource.key : null,
        peakLabel: res.kpis.peak7 ? LP.fmtShort(dayDate(res.kpis.peak7.day)) : null,
      }),
      recent: res.recent.map((c) => ({
        time: c.at,
        country: countryName(c.country),
        code: c.country === 'XX' ? '··' : c.country,
        ref: c.refHost || SOURCE_LABEL[c.source] || SOURCE_LABEL.direct,
        device: DEVICE_LABEL[c.device] || c.device,
      })),
    };
  };

  data.overview = async (days) => {
    const res = (await api.get('/analytics/overview', { query: { days, tz: TZ } })).data;
    const s = formatSeries(res.series);
    return {
      agg: Object.assign(s, { prevTotal: res.series.prevTotal, change: res.series.change }),
      summary: res.summary,
      topLinks: res.topLinks,
    };
  };

  /* ---------- اعلان‌ها ---------- */
  // سرور اعلان‌ها رو از روی لینک‌ها می‌سازه؛ «خونده‌شده» بودن فقط توی همین مرورگر نگه‌داری می‌شه
  const notifText = (n) => {
    if (n.type === 'expiry') return `لینک «${n.title}» ${LP.fa(n.days)} روز دیگه منقضی می‌شه.`;
    return `لینک «${n.title}» از ${LP.fa(n.milestone)} کلیک گذشت.`;
  };
  data.notifications = async () => {
    const res = await api.get('/notifications');
    const read = LP.store.get('notif-read', []);
    return res.data.notifications.map((n) => Object.assign({}, n, { text: notifText(n), read: read.includes(n.id) }));
  };
  data.markNotificationsRead = (items) => {
    const read = new Set(LP.store.get('notif-read', []));
    items.forEach((n) => read.add(n.id));
    LP.store.set('notif-read', Array.from(read).slice(-200));
  };
})();

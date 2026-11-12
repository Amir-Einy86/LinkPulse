/* =========================================================
   layout.js — ساخت «قاب» صفحه‌های داخل پنل (منوی کناری + نوار بالا)
   به‌جای اینکه توی ۵ فایل HTML یه منو رو کپی کنیم، یک‌بار اینجا
   ساخته می‌شه. هر صفحه فقط باید این‌ها رو داشته باشه:
     <body data-shell="app" data-page="dashboard" data-title="داشبورد">
     <main id="main" class="page"> ... </main>
   ========================================================= */
(function () {
  'use strict';
  const LP = window.LP;
  if (document.body.dataset.shell !== 'app') return;
  const esc = LP.esc;

  const NAV = [
    { page: 'dashboard', href: 'dashboard.html', icon: 'grid_view', label: 'داشبورد' },
    { page: 'my-links', href: 'my-links.html', icon: 'link', label: 'لینک‌های من' },
    { page: 'link-details', href: 'link-details.html', icon: 'monitoring', label: 'آمار و تحلیل' },
    { page: 'profile', href: 'profile.html', icon: 'account_circle', label: 'پروفایل' },
    { page: 'settings', href: 'settings.html', icon: 'tune', label: 'تنظیمات' },
  ];
  const page = document.body.dataset.page;
  const title = document.body.dataset.title || '';
  const main = document.getElementById('main');

  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.id = 'sidebar';
  sidebar.setAttribute('aria-label', 'منوی کناری');

  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  scrim.hidden = true;

  const wrapper = document.createElement('div');
  wrapper.className = 'app-main';

  const topbar = document.createElement('header');
  topbar.className = 'topbar';

  let notifItems = [];

  function renderSidebar() {
    const p = LP.data.profile();
    sidebar.innerHTML = `
      <div>
        <a class="brand side-brand" href="index.html" aria-label="لینک‌پالس، صفحه‌ی اصلی">
          <img src="assets/logo.svg" alt="" width="32" height="32"><span>لینک‌پالس</span>
        </a>
        <nav class="side-nav" aria-label="صفحه‌های پنل">
          ${NAV.map((n) => `<a class="side-link" href="${n.href}"${n.page === page ? ' aria-current="page"' : ''}><span class="icon">${n.icon}</span>${n.label}</a>`).join('')}
        </nav>
      </div>
      <div>
        <div class="side-user">
          <div class="row gap-3">
            <span class="avatar" aria-hidden="true">${esc(LP.initial(p.name))}</span>
            <div class="grow col">
              <strong class="truncate">${esc(p.name)}</strong>
              <span class="dim truncate ltr small">${esc(p.email)}</span>
            </div>
          </div>
          <button type="button" class="side-signout" id="signOutBtn"><span class="icon">logout</span>خروج از حساب</button>
        </div>
      </div>`;
    sidebar.querySelector('#signOutBtn').addEventListener('click', async () => {
      const ok = await LP.ui.confirm({ title: 'خروج از حساب', message: 'مطمئنی می‌خوای خارج بشی؟', confirmText: 'آره، خارج شم', icon: 'logout' });
      if (ok) LP.session.logout();
    });
  }

  function notifPanel() {
    const items = notifItems;
    const unread = items.filter((n) => !n.read).length;
    if (!items.length) return '<div class="notif-head"><strong>اعلان‌ها</strong></div><p class="dim small" style="padding:1rem">اعلان تازه‌ای نداری.</p>';
    return `
      <div class="notif-head"><strong>اعلان‌ها</strong>${unread ? '<button type="button" class="link-btn" id="markRead">همه رو خونده‌شده کن</button>' : ''}</div>
      <ul class="notif-list">
        ${items.map((n) => `<li class="notif-item${n.read ? '' : ' is-unread'}"><a href="link-details.html?id=${esc(n.linkId)}" style="display:contents"><span class="notif-ic"><span class="icon">${n.icon}</span></span><div><p>${esc(n.text)}</p><small class="dim">${esc(LP.rel(n.at))}</small></div></a></li>`).join('')}
      </ul>`;
  }

  function renderTopbar() {
    const p = LP.data.profile();
    const hasUnread = notifItems.some((n) => !n.read);
    topbar.innerHTML = `
      <button type="button" class="btn-icon menu-btn" id="menuBtn" aria-label="باز کردن منو" aria-controls="sidebar" aria-expanded="false"><span class="icon">menu</span></button>
      <nav class="crumbs" aria-label="مسیر صفحه">
        <a href="dashboard.html">لینک‌پالس</a><span class="icon">chevron_left</span><span class="crumb-now" id="crumbNow">${esc(title)}</span>
      </nav>
      <div class="grow"></div>
      <form class="top-search" id="topSearch" role="search">
        <span class="icon">search</span>
        <input type="search" id="topSearchInput" placeholder="جستجوی لینک‌ها…" aria-label="جستجوی لینک‌ها" autocomplete="off">
      </form>
      <button type="button" class="btn btn-primary" id="topCreate"><span class="icon">add</span><span class="hide-sm">ساخت لینک</span></button>
      <div class="notif-wrap">
        <button type="button" class="btn-icon" id="notifBtn" aria-label="اعلان‌ها" aria-expanded="false" aria-haspopup="true"><span class="icon">notifications</span>${hasUnread ? '<i class="notif-dot" aria-hidden="true"></i>' : ''}</button>
        <div class="popover notif-menu" id="notifMenu" hidden>${notifPanel()}</div>
      </div>
      <a href="profile.html" class="avatar avatar-link" aria-label="پروفایل من">${esc(LP.initial(p.name))}</a>`;

    topbar.querySelector('#topSearch').addEventListener('submit', (e) => {
      e.preventDefault();
      const v = topbar.querySelector('#topSearchInput').value.trim();
      LP.go('my-links.html' + (v ? '?q=' + encodeURIComponent(v) : ''));
    });
    topbar.querySelector('#topCreate').addEventListener('click', () => LP.linkModal.open());

    const menu = topbar.querySelector('#notifMenu');
    LP.ui.popover(topbar.querySelector('#notifBtn'), menu);
    menu.addEventListener('click', (e) => {
      if (e.target.id === 'markRead') {
        LP.data.markNotificationsRead(notifItems);
        notifItems.forEach((n) => { n.read = true; });
        menu.innerHTML = notifPanel();
        const dot = topbar.querySelector('.notif-dot');
        if (dot) dot.remove();
      }
    });

    topbar.querySelector('#menuBtn').addEventListener('click', () => toggleMenu());
  }

  /* ---------- باز و بسته شدن منو در موبایل ---------- */
  function toggleMenu(force) {
    const open = force !== undefined ? force : !sidebar.classList.contains('is-open');
    sidebar.classList.toggle('is-open', open);
    scrim.hidden = !open;
    const btn = topbar.querySelector('#menuBtn');
    if (btn) btn.setAttribute('aria-expanded', String(open));
  }
  scrim.addEventListener('click', () => toggleMenu(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggleMenu(false); });
  window.addEventListener('resize', () => { if (window.innerWidth > 1023) toggleMenu(false); });

  /* ---------- سوار کردن همه‌چیز روی صفحه (بعد از آماده شدن کاربر) ---------- */
  function mount() {
    renderSidebar();
    renderTopbar();
    document.body.classList.add('app');
    document.body.prepend(scrim);
    document.body.prepend(sidebar);
    main.parentNode.insertBefore(wrapper, main);
    wrapper.appendChild(topbar);
    wrapper.appendChild(main);
  }

  async function loadNotifications() {
    try { notifItems = await LP.data.notifications(); } catch (e) { return; }
    const menu = topbar.querySelector('#notifMenu');
    if (menu) menu.innerHTML = notifPanel();
    const btn = topbar.querySelector('#notifBtn');
    if (btn && notifItems.some((n) => !n.read) && !btn.querySelector('.notif-dot')) btn.insertAdjacentHTML('beforeend', '<i class="notif-dot" aria-hidden="true"></i>');
  }

  LP.ready.then(() => {
    mount();
    loadNotifications();
    document.addEventListener('lp:links-changed', loadNotifications);
    document.addEventListener('lp:profile-changed', () => { renderSidebar(); renderTopbar(); });
  });

  LP.layout = {
    setCrumb(text) {
      const el = document.getElementById('crumbNow');
      if (el) el.textContent = text;
    },
  };
})();

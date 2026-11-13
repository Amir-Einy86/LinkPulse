(function () {
  'use strict';
  const LP = window.LP;
  const $ = LP.$;
  const esc = LP.esc;
  const form = $('#profileForm');
  let overview = { summary: { total: 0, clicks: 0, active: 0 }, links: [] };

  function renderCard() {
    const p = LP.data.profile();
    const s = overview.summary;
    $('#pAvatar').textContent = LP.initial(p.name);
    $('#pName').textContent = p.name;
    $('#pUsername').textContent = p.username ? '@' + p.username : '';
    $('#pBio').textContent = p.bio || 'هنوز چیزی درباره‌ی خودت ننوشتی.';
    $('#pEmail').textContent = p.email;
    $('#pJoined').textContent = 'عضو از ' + LP.fmtDate(p.createdAt);
    $('#sLinks').textContent = LP.fa(s.total);
    $('#sClicks').textContent = LP.fa(s.clicks);
    $('#sActive').textContent = LP.fa(s.active);
  }

  function renderActivity() {
    const p = LP.data.profile();
    const items = overview.links.map((l) => ({
      icon: 'add_link', tone: 'primary', html: `لینک «<b>${esc(l.title)}</b>» رو ساختی`, at: l.createdAt,
    }));
    items.push({ icon: 'waving_hand', tone: 'tertiary', html: 'به لینک‌پالس پیوستی', at: p.createdAt });
    $('#activity').innerHTML = items.map((i) => `
      <li><span class="tl-ic tone-${i.tone}"><span class="icon">${i.icon}</span></span>
      <div class="col"><span>${i.html}</span><small class="dim">${esc(LP.rel(i.at))}</small></div></li>`).join('');
  }

  async function loadOverview() {
    try {
      const res = await LP.data.list({ sort: 'newest', limit: 5 });
      overview = { summary: res.summary, links: res.links };
    } catch (err) {  }
    renderCard();
    renderActivity();
  }

  function fillForm() {
    const p = LP.data.profile();
    $('#fName').value = p.name || '';
    $('#fUser').value = p.username || '';
    $('#fEmail').value = p.email || '';
    $('#fBio').value = p.bio || '';
    updateCount();
    LP.ui.clearAll(form);
  }
  function updateCount() { $('#bioCount').textContent = LP.fa($('#fBio').value.length); }

  LP.ui.liveClear(form);
  $('#fBio').addEventListener('input', updateCount);
  $('#resetForm').addEventListener('click', fillForm);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    LP.ui.clearAll(form);
    const name = $('#fName'), user = $('#fUser'), email = $('#fEmail'), bio = $('#fBio');
    let ok = true;
    if (name.value.trim().length < 2) { LP.ui.setError(name, 'نام باید حداقل ۲ حرف باشه.'); ok = false; }
    if (user.value.trim() && !/^[a-z0-9_]{3,24}$/i.test(user.value.trim())) { LP.ui.setError(user, 'نام کاربری ۳ تا ۲۴ کاراکتر و فقط شامل حروف انگلیسی، عدد و _ باشه.'); ok = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) { LP.ui.setError(email, 'ایمیل معتبر نیست؛ مثلاً name@example.com'); ok = false; }
    if (!ok) return LP.ui.focusFirstError(form);

    const btn = $('#saveBtn');
    LP.ui.busy(btn, true, 'در حال ذخیره…');
    try {
      await LP.data.saveProfile({ name: name.value.trim(), username: user.value.trim().toLowerCase(), email: email.value.trim(), bio: bio.value.trim() });
      LP.ui.toast('پروفایلت به‌روز شد.');
      renderCard();
      renderActivity();
    } catch (err) {
      const fields = { name, username: user, email, bio };
      const shown = Object.entries(err.details || {}).filter(([k]) => fields[k]);
      shown.forEach(([k, msg]) => LP.ui.setError(fields[k], msg));
      if (shown.length) LP.ui.focusFirstError(form); else LP.ui.toast(err.message, 'error', 5000);
    }
    LP.ui.busy(btn, false);
  });

  document.addEventListener('lp:links-changed', loadOverview);

  LP.ready.then(() => {
    renderCard();
    renderActivity();
    fillForm();
    loadOverview();
  });
})();

/*!
 * Frosty CMS — in-page dashboard for the Frosty Foods site.
 * Two storage modes:
 *   WordPress : window.FROSTY_WP = {rest, content}  → saved in the WP database through the theme's REST API.
 *   Static    : content.json next to index.html (published) + a draft in this browser's localStorage.
 * Everything on the page carries a stable key (data-k text, data-ik media, data-lk link, data-nk number).
 */
(function () {
  'use strict';

  /* ================================================================ setup */
  const BASE = window.FROSTY_BASE || '';
  const URLX = u => (typeof u === 'string' && /^assets\//.test(u)) ? BASE + u : u;
  window.FROSTY_URL = URLX;
  const WP = window.FROSTY_WP || null;
  const LS_KEY = 'frosty-cms-draft', SS_KEY = 'frosty-cms-session';
  const DEFAULT_HASH = '158a323a7ba44870f23d96f1516dd70aa48e9a72db4ebb026b0a89e212a208ab'; // "2026"
  const SECTION_IDS = ['top', 'trust', 'company', 'production', 'products', 'seasonality', 'capabilities', 'logistics', 'markets', 'quality', 'rfq', 'faq', 'contact'];
  const NAMES = {
    top: ['Hero (video)', 'الهيرو (الفيديو)'], trust: ['Certifications strip', 'شريط الشهادات'], company: ['Company', 'الشركة'],
    production: ['Production', 'الإنتاج'], products: ['Products', 'المنتجات'], seasonality: ['Seasonality', 'المواسم'],
    capabilities: ['Solutions', 'الحلول'], logistics: ['Packing & shipping', 'التعبئة والشحن'], markets: ['Markets', 'الأسواق'],
    quality: ['Quality', 'الجودة'], rfq: ['Quotation form', 'نموذج طلب السعر'], faq: ['FAQ', 'الأسئلة الشائعة'], contact: ['Contact', 'التواصل'],
    nav: ['Top bar & menu', 'الشريط العلوي والقائمة'], footer: ['Footer', 'الفوتر'], modal: ['Product popup', 'نافذة المنتج'], other: ['Other', 'أخرى']
  };
  const TOKENS = [
    ['--navy-950', 'Darkest navy', 'كحلي داكن جدًا'], ['--navy-900', 'Dark navy (sections)', 'كحلي داكن (الأقسام)'], ['--navy-850', 'Navy 850', 'كحلي 850'],
    ['--navy-800', 'Navy 800', 'كحلي 800'], ['--navy', 'Brand navy', 'الكحلي الأساسي'], ['--navy-600', 'Navy 600', 'كحلي 600'], ['--navy-500', 'Navy 500', 'كحلي 500'],
    ['--ice', 'Ice blue (accent)', 'الأزرق الثلجي (تمييز)'], ['--ice-300', 'Ice 300', 'ثلجي 300'], ['--ice-100', 'Ice 100', 'ثلجي 100'], ['--ice-50', 'Ice 50', 'ثلجي 50'],
    ['--green', 'Fresh green', 'الأخضر'], ['--green-600', 'Green 600', 'أخضر 600'], ['--paper', 'Light background', 'الخلفية الفاتحة'], ['--white', 'White', 'الأبيض'],
    ['--ink', 'Text', 'النص'], ['--ink-70', 'Text 70%', 'نص 70%'], ['--ink-50', 'Muted text', 'نص خافت'], ['--line', 'Lines & borders', 'الخطوط والحدود']
  ];
  const FONTS = {
    display: ['Manrope', 'Inter', 'Plus Jakarta Sans', 'Sora', 'Outfit', 'Urbanist', 'Poppins', 'Montserrat', 'DM Sans', 'Space Grotesk', 'Work Sans', 'Playfair Display', 'Fraunces'],
    body: ['Inter', 'Manrope', 'DM Sans', 'Work Sans', 'Roboto', 'Lato', 'Open Sans', 'Source Sans 3', 'Nunito Sans', 'Poppins'],
    mono: ['IBM Plex Mono', 'JetBrains Mono', 'DM Mono', 'Space Mono', 'Roboto Mono'],
    ar: ['IBM Plex Sans Arabic', 'Cairo', 'Tajawal', 'Almarai', 'Noto Kufi Arabic', 'Readex Pro', 'Alexandria', 'Rubik', 'Noto Sans Arabic', 'Changa']
  };
  const FONT_VARS = { display: '--f-display', body: '--f-body', mono: '--f-mono', ar: '--f-ar' };
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><rect width="400" height="500" fill="#DCE6EE"/><g fill="none" stroke="#8FA6B8" stroke-width="10"><rect x="120" y="170" width="160" height="130" rx="10"/><circle cx="165" cy="215" r="16"/><path d="m130 290 50-45 35 30 25-20 40 35"/></g><text x="200" y="360" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#6B7C8E">Upload image</text></svg>');

  const EMPTY = () => ({ v: 1, texts: {}, ui: {}, attrs: {}, nums: {}, theme: { vars: {}, fonts: {} }, sections: { hidden: {}, order: null }, data: {}, seo: {}, settings: {} });
  const clone = o => JSON.parse(JSON.stringify(o));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const lang = () => (typeof LANG !== 'undefined' ? LANG : 'en');
  const L = (en, ar) => lang() === 'ar' ? ar : en;
  function merge(base, o) {
    if (!o || typeof o !== 'object') return base;
    for (const k in o) {
      const v = o[k];
      // PHP encodes empty objects as [] — never let that replace an object slot
      if (Array.isArray(v) && !v.length && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) continue;
      if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) merge(base[k], v);
      else base[k] = v;
    }
    return base;
  }
  function readLS() { try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (e) { return null; } }

  let C = EMPTY(), DEF = null, published = null, hasDraft = false, dirty = false, session = null, editing = false, inline = true, active = null;
  window.CMS_UIREG = {};

  /* ================================================================ boot */
  if (WP) {
    C = merge(EMPTY(), WP.content || {});
    applyTheme();
    window.CMS_BOOT = Promise.resolve();
  } else {
    const local = readLS();
    if (local) { C = merge(EMPTY(), local); hasDraft = true; applyTheme(); }
    window.CMS_BOOT = fetch(BASE + 'content.json', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null).catch(() => null)
      .then(pub => { published = pub; if (!local && pub) { C = merge(EMPTY(), pub); applyTheme(); } });
  }

  /* ================================================================ sha-256 (sync, no secure context needed) */
  function sha256(str) {
    const ascii = unescape(encodeURIComponent(str));
    const rot = (n, x) => (n >>> x) | (n << (32 - x)); const mp = Math.pow, maxWord = mp(2, 32);
    let result = '', words = [], hash = [], k = [], primeCounter = 0; const isComposite = {}; const bitLen = ascii.length * 8; let s = ascii;
    for (let c = 2; primeCounter < 64; c++) { if (!isComposite[c]) { for (let i = 0; i < 313; i += c) isComposite[i] = c; hash[primeCounter] = (mp(c, .5) * maxWord) | 0; k[primeCounter++] = (mp(c, 1 / 3) * maxWord) | 0; } }
    hash = hash.slice(0, 8); s += '\x80'; while (s.length % 64 - 56) s += '\x00';
    for (let i = 0; i < s.length; i++) { const j = s.charCodeAt(i); words[i >> 2] |= j << ((3 - i) % 4) * 8; }
    words[words.length] = ((bitLen / maxWord) | 0); words[words.length] = bitLen;
    for (let j = 0; j < words.length;) {
      const w = words.slice(j, j += 16), old = hash; hash = hash.slice(0, 8);
      for (let i = 0; i < 64; i++) {
        const w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
        const t1 = hash[7] + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & hash[5]) ^ ((~e) & hash[6])) + k[i] + (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rot(w15, 7) ^ rot(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rot(w2, 17) ^ rot(w2, 19) ^ (w2 >>> 10))) | 0);
        const t2 = (rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(t1 + t2) | 0].concat(hash); hash[4] = (hash[4] + t1) | 0;
      }
      for (let i = 0; i < 8; i++) hash[i] = (hash[i] + old[i]) | 0;
    }
    for (let i = 0; i < 8; i++) for (let j = 3; j + 1; j--) { const b = (hash[i] >> (j * 8)) & 255; result += (b < 16 ? '0' : '') + b.toString(16); }
    return result;
  }

  /* ================================================================ theme */
  function applyTheme() {
    const t = C.theme || {}, st = document.documentElement.style;
    (applyTheme.prev || []).forEach(v => st.removeProperty(v));
    const set = [];
    for (const k in (t.vars || {})) { st.setProperty(k, t.vars[k]); set.push(k); }
    const fams = [];
    for (const k in FONT_VARS) {
      const f = (t.fonts || {})[k];
      if (f) { st.setProperty(FONT_VARS[k], `"${f}",${k === 'mono' ? 'ui-monospace,monospace' : 'system-ui,sans-serif'}`); set.push(FONT_VARS[k]); fams.push(f); }
    }
    if (t.wrap) { st.setProperty('--wrap', t.wrap + 'px'); set.push('--wrap'); }
    if (t.r != null && t.r !== '') { st.setProperty('--r', t.r + 'px'); st.setProperty('--r-lg', Math.round(t.r * 1.66) + 'px'); set.push('--r', '--r-lg'); }
    st.fontSize = t.scale ? t.scale + '%' : '';
    if (document.body) document.body.style.fontSize = t.scale ? (16 * t.scale / 100) + 'px' : '';
    applyTheme.prev = set;
    $$('link[data-cms-font]').forEach(l => { if (!fams.includes(l.dataset.cmsFont)) l.remove(); });
    fams.forEach(f => {
      if ($(`link[data-cms-font="${f}"]`)) return;
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.dataset.cmsFont = f;
      l.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(f).replace(/%20/g, '+') + ':wght@400;500;600;700&display=swap';
      l.onerror = () => { l.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(f).replace(/%20/g, '+') + '&display=swap'; };
      document.head.appendChild(l);
    });
  }

  /* ================================================================ defaults snapshot */
  function readFaqDom() {
    return $$('#fqList .fq').map(f => {
      const q = $('.fq-q span[data-ar]', f), a = $('.fq-a', f);
      return { qEn: q.dataset.en !== undefined ? q.dataset.en : q.innerHTML, qAr: q.getAttribute('data-ar'), aEn: a.dataset.en !== undefined ? a.dataset.en : a.innerHTML, aAr: a.getAttribute('data-ar') };
    });
  }
  function snapshotDefaults() {
    DEF = { texts: {}, attrs: {}, nums: {}, vars: {}, data: {}, seo: {}, order: SECTION_IDS.filter(id => document.getElementById(id)) };
    $$('[data-k]').forEach(el => {
      const k = el.dataset.k;
      DEF.texts[k] = el.dataset.kt === 'ph' ? { en: el.getAttribute('placeholder') || '', ar: el.dataset.phAr || '' } : { en: el.innerHTML, ar: el.getAttribute('data-ar') || '' };
    });
    $$('[data-ik]').forEach(el => {
      DEF.attrs[el.dataset.ik] = el.tagName === 'VIDEO'
        ? { src: ($('source', el) || {}).getAttribute ? $('source', el).getAttribute('src') : '', poster: el.getAttribute('poster') || '' }
        : { src: el.getAttribute('src'), alt: el.getAttribute('alt') || '' };
    });
    $$('[data-lk]').forEach(el => { DEF.attrs[el.dataset.lk] = { href: el.getAttribute('href') }; });
    $$('[data-nk]').forEach(el => { DEF.nums[el.dataset.nk] = el.dataset.to; });
    DEF.attrs['bg:prod'] = { src: 'assets/img/factory/production-line.webp' };
    DEF.attrs['bg:rfq'] = { src: 'assets/img/factory/facility-aerial.webp' };
    DEF.attrs.favicon = { src: ($('#favicon') || {}).getAttribute ? $('#favicon').getAttribute('href') : '' };
    const rs = document.documentElement.style, cs = getComputedStyle(document.documentElement);
    TOKENS.forEach(([v]) => { const inl = rs.getPropertyValue(v); if (inl) rs.removeProperty(v); DEF.vars[v] = cs.getPropertyValue(v).trim(); if (inl) rs.setProperty(v, inl); });
    DEF.data = {
      products: clone(P), expos: clone(EXPOS), countries: clone(COUNTRIES), regions: clone(REGIONS),
      extra: clone(EXTRA_SEASON), faq: readFaqDom()
    };
    DEF.seo = {
      titleEn: 'Frosty Foods — IQF Fruits & Vegetables from Egypt to the World', titleAr: 'فروستي فودز — خضروات وفواكه مجمدة IQF من مصر إلى العالم',
      descEn: ($('#metaDesc') || {}).content || '', descAr: ''
    };
  }

  /* ================================================================ apply content to page */
  const replaceArr = (arr, src) => { arr.splice(0, arr.length, ...clone(src)); };
  function textFor(k) { const d = DEF.texts[k] || { en: '', ar: '' }, v = C.texts[k] || {}; return { en: v.en != null ? v.en : d.en, ar: v.ar != null ? v.ar : d.ar }; }
  function applyTexts() {
    $$('[data-k]').forEach(el => {
      const t = textFor(el.dataset.k);
      if (el.dataset.kt === 'ph') { el.dataset.phEn = t.en; el.dataset.phAr = t.ar; }
      else { el.dataset.en = t.en; el.setAttribute('data-ar', t.ar); }
    });
  }
  function attrFor(k) { return Object.assign({}, DEF.attrs[k] || {}, C.attrs[k] || {}); }
  function applyAttrs() {
    $$('[data-ik]').forEach(el => {
      const a = attrFor(el.dataset.ik);
      if (el.tagName === 'VIDEO') {
        const s = $('source', el), want = URLX(a.src);
        if (s && s.getAttribute('src') !== want) { s.setAttribute('src', want); el.load(); }
        if (a.poster) el.setAttribute('poster', URLX(a.poster));
      } else {
        if (a.src && el.getAttribute('src') !== URLX(a.src)) el.setAttribute('src', URLX(a.src));
        if (a.alt != null) el.setAttribute('alt', a.alt);
      }
    });
    $$('[data-lk]').forEach(el => { const a = attrFor(el.dataset.lk); if (a.href) el.setAttribute('href', a.href); });
    const st = document.documentElement.style;
    ['prod', 'rfq'].forEach(n => { const a = C.attrs['bg:' + n]; if (a && a.src) st.setProperty('--img-' + n, `url("${URLX(a.src)}")`); else st.removeProperty('--img-' + n); });
    const fav = $('#favicon'), fa = attrFor('favicon'); if (fav && fa.src) fav.setAttribute('href', URLX(fa.src));
  }
  function applyNums() { $$('[data-nk]').forEach(el => { const v = C.nums[el.dataset.nk]; const to = v != null && v !== '' ? v : DEF.nums[el.dataset.nk]; el.dataset.to = to; el.textContent = to; }); }
  function applySections() {
    const hid = C.sections.hidden || {};
    SECTION_IDS.forEach(id => {
      const el = document.getElementById(id); if (!el) return;
      el.classList.toggle('cms-hidden', !!hid[id]);
      $$(`a[href="#${id}"]`).forEach(a => { if (a.closest('.nav-links,.mmenu,.footer')) a.classList.toggle('cms-hidden', !!hid[id]); });
    });
    const order = (C.sections.order && C.sections.order.length) ? C.sections.order : DEF.order;
    const foot = $('footer.footer');
    order.forEach(id => { const el = document.getElementById(id); if (el && foot) foot.parentNode.insertBefore(el, foot); });
  }
  const FAQ_ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  function buildFaq(list) {
    const box = $('#fqList'); if (!box) return;
    box.innerHTML = list.map((f, i) => `<div class="fq${i === 0 ? ' on' : ''}" data-i="${i}"><button class="fq-q" aria-expanded="${i === 0}"><span class="n">${String(i + 1).padStart(2, '0')}</span><span data-ar="${esc(f.qAr)}">${f.qEn}</span>${FAQ_ARROW}</button><div class="fq-a" data-ar="${esc(f.aAr)}">${f.aEn}</div></div>`).join('');
    try { faqI = 0; } catch (e) { }
  }
  function applyData() {
    const d = C.data || {};
    replaceArr(P, d.products || DEF.data.products);
    replaceArr(EXPOS, d.expos || DEF.data.expos);
    replaceArr(COUNTRIES, d.countries || DEF.data.countries);
    replaceArr(REGIONS, d.regions || DEF.data.regions);
    replaceArr(EXTRA_SEASON, d.extra || DEF.data.extra);
    buildFaq(d.faq || DEF.data.faq);
    if (typeof basket !== 'undefined') [...basket].forEach(id => { if (!P.find(p => p.id === id)) basket.delete(id); });
  }
  function applySeo() { window.CMS_SEO = Object.assign({}, DEF.seo, C.seo || {}); }

  function apply() {
    if (!DEF) snapshotDefaults();
    applyTheme(); applyTexts(); applyAttrs(); applyNums(); applySections(); applyData(); applySeo();
    window.CMS_SETTINGS = Object.assign({}, C.settings || {});
    window.CMS_UI = C.ui || {};
    let stored = null; try { stored = localStorage.getItem('frosty-lang'); } catch (e) { }
    window.CMS_LANG = stored || (C.settings && C.settings.defaultLang) || null;
  }
  function rerender() { apply(); window.CMS_LANG = null; applyLang(lang()); if (editing) markInline(); }

  /* ================================================================ after init */
  function afterInit() {
    document.addEventListener('click', e => { const a = e.target.closest('.cms-open'); if (a) { e.preventDefault(); openLogin(); } });
    let s = null; try { s = JSON.parse(sessionStorage.getItem(SS_KEY) || 'null'); } catch (e) { }
    if (s && Date.now() - s.t < 12 * 3600e3) { session = s; enterEdit(); }
    else if (/dashboard/i.test(location.hash)) openLogin();
    addEventListener('hashchange', () => { if (/dashboard/i.test(location.hash) && !editing) openLogin(); });
  }

  window.CMS = { apply, afterInit, open: () => openLogin(), get content() { return clone(C); } };

  /* ================================================================ small UI helpers */
  function toast(msg, type) {
    let t = $('#cmsToast'); if (!t) { t = document.createElement('div'); t.id = 'cmsToast'; document.body.appendChild(t); }
    t.className = 'cms-toast show ' + (type || ''); t.textContent = msg;
    clearTimeout(toast.t); toast.t = setTimeout(() => t.className = 'cms-toast', 3200);
  }
  function modal(html, cls) {
    const m = document.createElement('div'); m.className = 'cms-modal ' + (cls || '');
    m.innerHTML = `<div class="cms-mcard" role="dialog" aria-modal="true">${html}</div>`;
    m.addEventListener('mousedown', e => { if (e.target === m) m.remove(); });
    document.body.appendChild(m); return m;
  }
  function download(name, text) {
    const b = new Blob([text], { type: 'application/json' }), a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function markDirty() { dirty = true; const b = $('#cmsStatus'); if (b) { b.textContent = L('Unsaved changes', 'تغييرات غير محفوظة'); b.className = 'cms-status dirty'; } }
  function markClean(msg) { dirty = false; const b = $('#cmsStatus'); if (b) { b.textContent = msg || L('All changes saved', 'تم حفظ كل التغييرات'); b.className = 'cms-status ok'; } }
  addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  const plain = h => { const d = document.createElement('div'); d.innerHTML = h; return (d.textContent || '').replace(/\s+/g, ' ').trim(); };

  /* ================================================================ login */
  function openLogin() {
    if (editing) { openPanel(); return; }
    const m = modal(`
      <img class="cms-login-logo" src="${esc(URLX('assets/img/logo.png'))}" alt="">
      <h3>${L('Dashboard', 'لوحة التحكم')}</h3>
      <p>${L('Enter the access code to edit the website.', 'أدخل كود الدخول لتعديل الموقع.')}</p>
      <form class="cms-login">
        <input type="password" inputmode="numeric" autocomplete="off" maxlength="40" placeholder="••••" aria-label="Access code" required>
        <button class="cms-btn cms-primary" type="submit">${L('Enter', 'دخول')}</button>
        <span class="cms-err"></span>
      </form>`, 'cms-login-m');
    const f = $('form', m), inp = $('input', m), err = $('.cms-err', m);
    setTimeout(() => inp.focus(), 50);
    f.addEventListener('submit', async e => {
      e.preventDefault(); err.textContent = '';
      try { await login(inp.value.trim()); m.remove(); if (/dashboard/i.test(location.hash)) history.replaceState(null, '', location.pathname + location.search); enterEdit(); toast(L('Welcome — dashboard unlocked', 'أهلًا — تم فتح لوحة التحكم'), 'ok'); }
      catch (x) { err.textContent = x.message || L('Wrong code', 'الكود غير صحيح'); inp.select(); m.querySelector('.cms-mcard').classList.add('shake'); setTimeout(() => m.querySelector('.cms-mcard').classList.remove('shake'), 500); }
    });
  }
  async function login(code) {
    if (!code) throw new Error(L('Enter the code', 'أدخل الكود'));
    if (WP) {
      const r = await fetch(WP.rest + 'login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(r.status === 429 ? L('Too many attempts — try again in 15 minutes', 'محاولات كثيرة — حاول بعد 15 دقيقة') : r.status === 403 ? L('Wrong code', 'الكود غير صحيح') : (j.message || 'Error ' + r.status));
      session = { token: j.token, t: Date.now() };
    } else {
      if (sha256(code) !== ((C.settings && C.settings.codeHash) || DEFAULT_HASH)) throw new Error(L('Wrong code', 'الكود غير صحيح'));
      session = { token: null, t: Date.now() };
    }
    sessionStorage.setItem(SS_KEY, JSON.stringify(session));
  }
  function logout() {
    if (WP && session && session.token) fetch(WP.rest + 'logout', { method: 'POST', headers: { 'X-Frosty-Token': session.token } }).catch(() => { });
    session = null; sessionStorage.removeItem(SS_KEY); exitEdit();
  }
  const authHeaders = () => (session && session.token ? { 'X-Frosty-Token': session.token } : {});

  /* ================================================================ save / storage */
  async function save() {
    finishEdit();
    C.meta = { updated: new Date().toISOString() };
    const json = JSON.stringify(C);
    if (WP) {
      const r = await fetch(WP.rest + 'content', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()), body: json }).catch(() => null);
      if (!r) { toast(L('Network error — not saved', 'خطأ في الاتصال — لم يتم الحفظ'), 'bad'); return; }
      if (r.status === 401 || r.status === 403) { toast(L('Session expired — please sign in again', 'انتهت الجلسة — ادخل مرة أخرى'), 'bad'); logout(); openLogin(); return; }
      if (!r.ok) { const j = await r.json().catch(() => ({})); toast((j.message || 'Error ' + r.status), 'bad'); return; }
      markClean(L('Published — live for all visitors', 'تم النشر — ظاهر لكل الزوار')); toast(L('Saved & published', 'تم الحفظ والنشر'), 'ok');
    } else {
      try { localStorage.setItem(LS_KEY, json); hasDraft = true; }
      catch (e) { toast(L('Browser storage is full — use Backup › Download content.json', 'مساحة المتصفح ممتلئة — استخدم النسخ الاحتياطي › تنزيل content.json'), 'bad'); return; }
      markClean(L('Saved in this browser', 'تم الحفظ في هذا المتصفح')); toast(L('Saved. To publish for everyone: Backup › Download content.json', 'تم الحفظ. للنشر للجميع: النسخ الاحتياطي › تنزيل content.json'), 'ok');
    }
  }
  async function upload(file) {
    if (WP) {
      const fd = new FormData(); fd.append('file', file);
      const r = await fetch(WP.rest + 'upload', { method: 'POST', headers: authHeaders(), body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.message || 'Upload failed');
      return j.url;
    }
    if (/^video\//.test(file.type)) throw new Error(L('In the static version, paste a video URL instead.', 'في النسخة الثابتة ضع رابط الفيديو بدل الرفع.'));
    if (/svg|gif|icon/.test(file.type)) return await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(file); });
    const bmp = await createImageBitmap(file); const max = 1800, s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL('image/webp', .85);
  }

  /* ================================================================ media picker */
  function pickMedia(o) {
    return new Promise(resolve => {
      const isVideo = o.kind === 'video';
      const m = modal(`
        <h3>${esc(o.title || L('Replace media', 'استبدال الوسائط'))}</h3>
        <div class="cms-media-prev">${isVideo ? `<video src="${esc(URLX(o.src))}" muted autoplay loop playsinline></video>` : `<img src="${esc(URLX(o.src) || PLACEHOLDER)}" alt="">`}</div>
        <label class="cms-drop"><input type="file" accept="${isVideo ? 'video/*' : 'image/*'}"><span>${L('Click to upload a file', 'اضغط لرفع ملف')}${!WP && !isVideo ? ` <small>(${L('auto-compressed', 'يتم ضغطه تلقائيًا')})</small>` : ''}</span></label>
        <div class="cms-f"><label>${L('…or paste a URL', '…أو ضع رابطًا')}</label><input class="cms-url" value="${esc(/^data:/.test(o.src || '') ? '' : (o.src || ''))}" placeholder="https://…"></div>
        ${o.alt !== undefined ? `<div class="cms-f"><label>${L('Alt text (accessibility & SEO)', 'النص البديل (للوصول والـ SEO)')}</label><input class="cms-alt" value="${esc(o.alt)}"></div>` : ''}
        <div class="cms-row-btns"><button class="cms-btn" data-a="reset">${L('Restore original', 'استرجاع الأصلي')}</button><span></span><button class="cms-btn" data-a="cancel">${L('Cancel', 'إلغاء')}</button><button class="cms-btn cms-primary" data-a="ok">${L('Apply', 'تطبيق')}</button></div>`);
      let src = o.src;
      const prev = $('.cms-media-prev', m), url = $('.cms-url', m);
      const show = s => { prev.innerHTML = isVideo ? `<video src="${esc(URLX(s))}" muted autoplay loop playsinline></video>` : `<img src="${esc(URLX(s) || PLACEHOLDER)}" alt="">`; };
      $('input[type=file]', m).addEventListener('change', async e => {
        const f = e.target.files[0]; if (!f) return;
        prev.classList.add('busy');
        try { src = await upload(f); show(src); if (!/^data:/.test(src)) url.value = src; } catch (x) { toast(x.message, 'bad'); }
        prev.classList.remove('busy');
      });
      url.addEventListener('change', () => { if (url.value.trim()) { src = url.value.trim(); show(src); } });
      m.addEventListener('click', e => {
        const a = e.target.closest('[data-a]'); if (!a) return;
        if (a.dataset.a === 'cancel') { m.remove(); resolve(null); }
        if (a.dataset.a === 'reset') { m.remove(); resolve({ reset: true }); }
        if (a.dataset.a === 'ok') { m.remove(); resolve({ src: url.value.trim() && !/^data:/.test(src) ? url.value.trim() : src, alt: $('.cms-alt', m) ? $('.cms-alt', m).value : undefined }); }
      });
    });
  }

  /* ================================================================ inline editing */
  function markInline() { document.documentElement.classList.toggle('cms-inline', editing && inline); }
  function onPageClick(e) {
    if (!editing) return;
    if (e.target.closest('#cmsPanel,.cms-modal,#cmsBar,.cms-toast')) return;
    const t = e.target;
    if (inline) {
      const img = t.closest('img[data-ik]');
      if (img && !t.closest('[contenteditable=true]')) { e.preventDefault(); e.stopPropagation(); editImage(img.dataset.ik); return; }
      const el = t.closest('[data-k]');
      if (el && el.dataset.kt !== 'ph' && !el.closest('select')) {
        if (el === active) return;
        e.preventDefault(); e.stopPropagation(); startEdit(el); return;
      }
    }
    const a = t.closest('a[href]');
    if (a && !(a.getAttribute('href') || '').startsWith('#')) { e.preventDefault(); if (a.dataset.lk) editLink(a); }
    if (t.closest('form') && t.closest('[type=submit]')) { e.preventDefault(); toast(L('Form sending is disabled while editing', 'الإرسال متوقف أثناء التعديل')); }
  }
  function startEdit(el) {
    finishEdit();
    active = el; el.dataset.cmsOrig = el.innerHTML;
    el.setAttribute('contenteditable', 'true'); el.classList.add('cms-editing'); el.focus();
    const sel = getSelection(), rg = document.createRange(); rg.selectNodeContents(el); rg.collapse(false); sel.removeAllRanges(); sel.addRange(rg);
    showBar(el);
  }
  function cleanHTML(html) {
    const d = document.createElement('div'); d.innerHTML = html;
    const ok = { SPAN: 1, EM: 1, BR: 1, B: 1, STRONG: 1, SMALL: 1, I: 1 };
    (function walk(n) {
      [...n.childNodes].forEach(c => {
        if (c.nodeType === 1) {
          walk(c);
          if (!ok[c.tagName]) { while (c.firstChild) c.parentNode.insertBefore(c.firstChild, c); c.remove(); }
          else [...c.attributes].forEach(a => { if (!(c.tagName === 'SPAN' && a.name === 'class')) c.removeAttribute(a.name); });
        } else if (c.nodeType === 8) c.remove();
      });
    })(d);
    return d.innerHTML.replace(/&nbsp;/g, ' ').trim();
  }
  function setText(k, lg, html) {
    const cur = textFor(k); cur[lg] = html;
    const d = DEF.texts[k];
    if (d && cur.en === d.en && cur.ar === d.ar) delete C.texts[k]; else C.texts[k] = cur;
    $$(`[data-k="${k}"]`).forEach(el => {
      if (el.dataset.kt === 'ph') { el.dataset.phEn = cur.en; el.dataset.phAr = cur.ar; el.placeholder = lang() === 'ar' ? cur.ar : cur.en; return; }
      el.dataset.en = cur.en; el.setAttribute('data-ar', cur.ar);
      if (el !== active) el.innerHTML = lang() === 'ar' ? cur.ar : cur.en;
    });
    markDirty();
  }
  function finishEdit(cancel) {
    const el = active; if (!el) return; active = null;
    if (cancel) el.innerHTML = el.dataset.cmsOrig;
    el.removeAttribute('contenteditable'); el.classList.remove('cms-editing');
    const html = cleanHTML(el.innerHTML);
    if (!cancel && html !== el.dataset.cmsOrig) { el.innerHTML = html; setText(el.dataset.k, lang(), html); }
    delete el.dataset.cmsOrig; hideBar();
  }
  document.addEventListener('keydown', e => {
    if (active && e.target === active) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); finishEdit(); }
      else if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); document.execCommand('insertLineBreak'); }
      else if (e.key === 'Escape') { e.preventDefault(); finishEdit(true); }
    }
    if (editing && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
  });
  document.addEventListener('paste', e => { if (active && active.contains(e.target)) { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain')); } });
  document.addEventListener('focusout', e => { if (active && e.target === active) setTimeout(() => { if (active && !active.contains(document.activeElement) && !($('#cmsBar') || {}).contains?.(document.activeElement)) finishEdit(); }, 120); });

  function showBar(el) {
    let bar = $('#cmsBar');
    if (!bar) { bar = document.createElement('div'); bar.id = 'cmsBar'; document.body.appendChild(bar); }
    const a = el.closest('a[data-lk]');
    const k = el.dataset.k, other = lang() === 'ar' ? 'EN' : 'AR', t = textFor(k);
    bar.innerHTML = `<span class="cms-bar-k">${lang().toUpperCase()} · ${k}</span>
      <span class="cms-bar-o" title="${esc(plain(lang() === 'ar' ? t.en : t.ar))}">${other}: ${esc(plain(lang() === 'ar' ? t.en : t.ar).slice(0, 40)) || '—'}</span>
      ${a ? `<button class="cms-bar-b" data-b="link">🔗 ${L('Link', 'الرابط')}</button>` : ''}
      <button class="cms-bar-b" data-b="both">${L('Both languages', 'اللغتين')}</button>
      <button class="cms-bar-b" data-b="reset">${L('Reset', 'الأصل')}</button>
      <button class="cms-bar-b ok" data-b="done">✓ ${L('Done', 'تم')}</button>`;
    bar.onmousedown = e => e.preventDefault();
    bar.onclick = e => {
      const b = e.target.closest('[data-b]'); if (!b) return;
      const cur = active;
      if (b.dataset.b === 'done') finishEdit();
      if (b.dataset.b === 'reset') { finishEdit(true); delete C.texts[k]; const d = DEF.texts[k]; $$(`[data-k="${k}"]`).forEach(x => { x.dataset.en = d.en; x.setAttribute('data-ar', d.ar); x.innerHTML = lang() === 'ar' ? d.ar : d.en; }); markDirty(); }
      if (b.dataset.b === 'link' && a) { finishEdit(); editLink(a); }
      if (b.dataset.b === 'both') { finishEdit(); editBoth(k); }
      if (cur && b.dataset.b !== 'done' && b.dataset.b !== 'reset') { }
    };
    place();
    function place() { if (!active) return; const r = el.getBoundingClientRect(); bar.style.top = Math.max(8, r.top - 46) + 'px'; bar.style.left = Math.max(8, Math.min(innerWidth - bar.offsetWidth - 8, r.left)) + 'px'; }
    addEventListener('scroll', place, { passive: true }); bar._place = place;
    bar.classList.add('show');
  }
  function hideBar() { const b = $('#cmsBar'); if (b) { b.classList.remove('show'); if (b._place) removeEventListener('scroll', b._place); } }
  function editBoth(k) {
    const t = textFor(k);
    const m = modal(`<h3>${L('Edit text', 'تعديل النص')} <small>${k}</small></h3>
      <div class="cms-f"><label>English</label><textarea class="en" rows="3">${esc(t.en)}</textarea></div>
      <div class="cms-f"><label>العربية</label><textarea class="ar" rows="3" dir="rtl">${esc(t.ar)}</textarea></div>
      <p class="cms-hint">${L('Basic tags allowed: <br>, <em>, <b>, <span class="accent">', 'مسموح بوسوم بسيطة: <br> و<em> و<b> و<span class="accent">')}</p>
      <div class="cms-row-btns"><span></span><button class="cms-btn" data-a="x">${L('Cancel', 'إلغاء')}</button><button class="cms-btn cms-primary" data-a="ok">${L('Apply', 'تطبيق')}</button></div>`);
    m.addEventListener('click', e => { const a = e.target.closest('[data-a]'); if (!a) return; if (a.dataset.a === 'ok') { setText(k, 'en', cleanHTML($('.en', m).value)); setText(k, 'ar', cleanHTML($('.ar', m).value)); } m.remove(); });
  }
  function editLink(a) {
    const k = a.dataset.lk, cur = attrFor(k).href;
    const m = modal(`<h3>${L('Edit link', 'تعديل الرابط')}</h3>
      <div class="cms-f"><label>${L('Link (URL, mailto:, tel:)', 'الرابط (URL أو mailto: أو tel:)')}</label><input class="h" value="${esc(cur)}"></div>
      <div class="cms-row-btns"><button class="cms-btn" data-a="reset">${L('Restore original', 'استرجاع الأصلي')}</button><span></span><button class="cms-btn" data-a="x">${L('Cancel', 'إلغاء')}</button><button class="cms-btn cms-primary" data-a="ok">${L('Apply', 'تطبيق')}</button></div>`);
    setTimeout(() => $('.h', m).focus(), 30);
    m.addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'ok') { C.attrs[k] = { href: $('.h', m).value.trim() }; applyAttrs(); markDirty(); }
      if (b.dataset.a === 'reset') { delete C.attrs[k]; a.setAttribute('href', DEF.attrs[k].href); markDirty(); }
      m.remove();
    });
  }
  async function editImage(k) {
    const el = $(`[data-ik="${k}"]`), a = attrFor(k), isVideo = el && el.tagName === 'VIDEO';
    const r = await pickMedia({ title: isVideo ? L('Hero video', 'فيديو الهيرو') : L('Replace image', 'استبدال الصورة'), src: a.src, alt: isVideo ? undefined : (a.alt || ''), kind: isVideo ? 'video' : 'image' });
    if (!r) return;
    if (r.reset) delete C.attrs[k]; else C.attrs[k] = Object.assign({}, C.attrs[k] || {}, { src: r.src }, r.alt !== undefined ? { alt: r.alt } : {});
    if (r.reset) $$(`[data-ik="${k}"]`).forEach(x => { if (x.tagName === 'IMG') x.setAttribute('src', URLX(DEF.attrs[k].src)); });
    applyAttrs(); markDirty(); if ($('#cmsPanel')) renderTab();
  }

  /* ================================================================ edit mode + panel */
  let tab = 'home';
  function enterEdit() {
    editing = true; document.documentElement.classList.add('cms-on'); markInline();
    document.addEventListener('click', onPageClick, true);
    buildPanel();
  }
  function exitEdit() {
    finishEdit(); editing = false;
    document.documentElement.classList.remove('cms-on', 'cms-inline', 'cms-collapsed');
    document.removeEventListener('click', onPageClick, true);
    const p = $('#cmsPanel'); if (p) p.remove(); const f = $('#cmsFab'); if (f) f.remove();
  }
  function openPanel() { document.documentElement.classList.remove('cms-collapsed'); }
  const TABS = [
    ['home', '◎', 'Overview', 'نظرة عامة'], ['texts', 'T', 'Texts', 'النصوص'], ['products', '▦', 'Products', 'المنتجات'], ['lists', '≡', 'Lists', 'القوائم'],
    ['design', '◐', 'Colors & fonts', 'الألوان والخطوط'], ['media', '▣', 'Images & video', 'الصور والفيديو'], ['sections', '☰', 'Sections', 'الأقسام'],
    ['settings', '⚙', 'SEO & settings', 'SEO والإعدادات'], ['backup', '⇅', 'Backup', 'النسخ الاحتياطي']
  ];
  function buildPanel() {
    let p = $('#cmsPanel'); if (p) p.remove();
    p = document.createElement('aside'); p.id = 'cmsPanel'; p.dir = lang() === 'ar' ? 'rtl' : 'ltr'; p.lang = lang();
    p.innerHTML = `
      <header class="cms-head">
        <div class="cms-brand"><img src="${esc(URLX('assets/img/favicon.png'))}" alt=""><div><b>${L('Dashboard', 'لوحة التحكم')}</b><span id="cmsStatus" class="cms-status">${WP ? 'WordPress' : L('Static site', 'موقع ثابت')}${!WP && hasDraft ? ' · ' + L('draft', 'مسودة') : ''}</span></div></div>
        <div class="cms-head-a">
          <button class="cms-btn cms-primary" id="cmsSave" title="Ctrl+S">${WP ? L('Save & publish', 'حفظ ونشر') : L('Save', 'حفظ')}</button>
          <button class="cms-ico" id="cmsCollapse" title="${L('Hide panel', 'إخفاء اللوحة')}">⇥</button>
        </div>
      </header>
      <nav class="cms-tabs">${TABS.map(t => `<button data-t="${t[0]}" class="${t[0] === tab ? 'on' : ''}"><i>${t[1]}</i><span>${L(t[2], t[3])}</span></button>`).join('')}</nav>
      <div class="cms-body" id="cmsBody"></div>`;
    document.body.appendChild(p);
    let fab = $('#cmsFab'); if (!fab) { fab = document.createElement('button'); fab.id = 'cmsFab'; fab.innerHTML = '✎ ' + L('Dashboard', 'لوحة التحكم'); fab.onclick = openPanel; document.body.appendChild(fab); }
    $('#cmsSave').onclick = save;
    $('#cmsCollapse').onclick = () => document.documentElement.classList.add('cms-collapsed');
    $('.cms-tabs', p).onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; tab = b.dataset.t; $$('.cms-tabs button', p).forEach(x => x.classList.toggle('on', x === b)); renderTab(); };
    renderTab();
    if (dirty) markDirty();
  }
  function freshBody() { const old = $('#cmsBody'); if (!old) return null; const nb = old.cloneNode(false); old.replaceWith(nb); return nb; }
  function renderTab() {
    const body = freshBody(); if (!body) return;
    ({ home: tabHome, texts: tabTexts, products: tabProducts, lists: tabLists, design: tabDesign, media: tabMedia, sections: tabSections, settings: tabSettings, backup: tabBackup }[tab] || tabHome)(body);
  }
  const sec = (title, inner, open) => `<details class="cms-sec" ${open ? 'open' : ''}><summary>${title}</summary><div class="cms-sec-b">${inner}</div></details>`;

  /* ---------- overview */
  function tabHome(b) {
    const n = Object.keys(C.texts).length + Object.keys(C.attrs).length + Object.keys(C.nums).length;
    b.innerHTML = `
      <div class="cms-card">
        <h4>${L('Edit the site directly', 'عدّل الموقع مباشرة')}</h4>
        <label class="cms-switch"><input type="checkbox" id="cmsInline" ${inline ? 'checked' : ''}><span></span>${L('Click-to-edit on the page', 'التعديل بالضغط على الصفحة')}</label>
        <p class="cms-hint">${L('Click any text on the page to type over it. Click any image to replace it. <b>Enter</b> = done, <b>Shift+Enter</b> = new line, <b>Esc</b> = cancel.', 'اضغط على أي نص في الصفحة واكتب مكانه. اضغط على أي صورة لتغييرها. <b>Enter</b> = تم، <b>Shift+Enter</b> = سطر جديد، <b>Esc</b> = إلغاء.')}</p>
        <div class="cms-f"><label>${L('You are editing the language', 'أنت تعدّل اللغة')}</label>
          <div class="cms-seg"><button data-l="en" class="${lang() === 'en' ? 'on' : ''}">English</button><button data-l="ar" class="${lang() === 'ar' ? 'on' : ''}">العربية</button></div></div>
      </div>
      <div class="cms-grid2">
        ${TABS.slice(1).map(t => `<button class="cms-tile" data-go="${t[0]}"><i>${t[1]}</i>${L(t[2], t[3])}</button>`).join('')}
      </div>
      <div class="cms-card cms-muted">
        <p>${WP ? L('Changes go live for every visitor when you press <b>Save & publish</b>.', 'التعديلات تظهر لكل الزوار عند الضغط على <b>حفظ ونشر</b>.') : L('Static mode: <b>Save</b> keeps changes in this browser. To publish, use Backup › Download content.json and upload it next to index.html.', 'النسخة الثابتة: <b>حفظ</b> يحفظ في هذا المتصفح. للنشر استخدم النسخ الاحتياطي › تنزيل content.json وارفعه بجانب index.html.')}</p>
        <p>${L('Customised items', 'عناصر معدّلة')}: <b>${n}</b></p>
        <div class="cms-row-btns"><button class="cms-btn" id="cmsExit">${L('Close dashboard', 'إغلاق اللوحة')}</button><button class="cms-btn cms-danger" id="cmsLogout">${L('Sign out', 'تسجيل الخروج')}</button></div>
      </div>`;
    $('#cmsInline', b).onchange = e => { inline = e.target.checked; markInline(); };
    $('.cms-seg', b).onclick = e => { const x = e.target.closest('[data-l]'); if (!x) return; finishEdit(); applyLang(x.dataset.l); buildPanel(); };
    $$('[data-go]', b).forEach(t => t.onclick = () => { tab = t.dataset.go; buildPanel(); });
    $('#cmsExit', b).onclick = () => { if (dirty && !confirm(L('You have unsaved changes. Close anyway?', 'لديك تغييرات غير محفوظة. هل تريد الإغلاق؟'))) return; exitEdit(); };
    $('#cmsLogout', b).onclick = () => { if (dirty && !confirm(L('You have unsaved changes. Sign out anyway?', 'لديك تغييرات غير محفوظة. هل تريد الخروج؟'))) return; dirty = false; logout(); };
  }

  /* ---------- texts */
  function groupOf(el) {
    const s = el.closest('section[id],#trust'); if (s) return s.id;
    if (el.closest('.util,.nav,.mmenu')) return 'nav';
    if (el.closest('footer')) return 'footer';
    if (el.closest('#modal,.lightbox')) return 'modal';
    return 'other';
  }
  function tabTexts(b) {
    const groups = {};
    $$('[data-k]').forEach(el => { const g = groupOf(el); (groups[g] = groups[g] || []).push(el.dataset.k); });
    const order = ['nav', ...SECTION_IDS, 'footer', 'modal', 'other'].filter(g => groups[g]);
    b.innerHTML = `<div class="cms-search"><input id="cmsQ" placeholder="${L('Search all texts…', 'ابحث في كل النصوص…')}"></div>
      <p class="cms-hint">${L('Every text on the site, in both languages. Tip: you can also click texts directly on the page.', 'كل نصوص الموقع باللغتين. ممكن كمان تضغط على النص في الصفحة مباشرة.')}</p>
      <div id="cmsTGroups">
      ${sec(L('Numbers (hero counters)', 'الأرقام (عدادات الهيرو)'), $$('[data-nk]').map(el => `<div class="cms-f cms-inline-f"><label>${esc(plain(el.parentElement.parentElement.innerText).slice(0, 40))}</label><input type="number" data-num="${el.dataset.nk}" value="${esc(C.nums[el.dataset.nk] != null ? C.nums[el.dataset.nk] : DEF.nums[el.dataset.nk])}"></div>`).join(''))}
      ${order.map(g => sec(`${L(NAMES[g][0], NAMES[g][1])} <small>${groups[g].length}</small>`, '', false).replace('class="cms-sec"', `class="cms-sec" data-g="${g}"`)).join('')}
      ${sec(L('Generated labels (buttons, badges, table headings)', 'العناوين المولَّدة (أزرار وشارات وعناوين جداول)'), '', false).replace('class="cms-sec"', 'class="cms-sec" data-g="__ui"')}
      </div>`;
    const fill = (d) => {
      const box = $('.cms-sec-b', d); if (box.dataset.filled) return; box.dataset.filled = 1;
      const g = d.dataset.g;
      if (g === '__ui') {
        const keys = Object.keys(window.CMS_UIREG).sort();
        box.innerHTML = keys.map(en => { const o = (C.ui || {})[en] || {}; return `<div class="cms-item" data-ui="${esc(en)}"><div class="cms-item-h">${esc(en)}</div><input class="en" value="${esc(o.en != null ? o.en : en)}"><input class="ar" dir="rtl" value="${esc(o.ar != null ? o.ar : window.CMS_UIREG[en])}"></div>`; }).join('') || `<p class="cms-hint">—</p>`;
        return;
      }
      box.innerHTML = groups[g].map(k => { const t = textFor(k), el = $(`[data-k="${k}"]`); const ph = el.dataset.kt === 'ph';
        return `<div class="cms-item" data-key="${k}"><div class="cms-item-h"><span>${ph ? L('Placeholder', 'نص إرشادي') + ' · ' : ''}${esc(plain(DEF.texts[k].en).slice(0, 48)) || k}</span><button class="cms-mini" data-loc="${k}" title="${L('Show on page', 'أظهر في الصفحة')}">◎</button></div>
          <textarea class="en" rows="${t.en.length > 70 ? 3 : 1}">${esc(t.en)}</textarea><textarea class="ar" dir="rtl" rows="${t.ar.length > 70 ? 3 : 1}">${esc(t.ar)}</textarea></div>`; }).join('');
    };
    $$('.cms-sec[data-g]', b).forEach(d => d.addEventListener('toggle', () => d.open && fill(d)));
    b.addEventListener('input', e => {
      const it = e.target.closest('.cms-item'); const n = e.target.dataset.num;
      if (n) { if (e.target.value === '' || e.target.value === DEF.nums[n]) delete C.nums[n]; else C.nums[n] = e.target.value; applyNums(); markDirty(); return; }
      if (!it) return;
      if (it.dataset.ui) { const en = it.dataset.ui; C.ui = C.ui || {}; C.ui[en] = { en: $('.en', it).value, ar: $('.ar', it).value }; window.CMS_UI = C.ui; markDirty(); clearTimeout(tabTexts.t); tabTexts.t = setTimeout(() => applyLang(lang()), 400); return; }
      setText(it.dataset.key, e.target.classList.contains('ar') ? 'ar' : 'en', e.target.value);
    });
    b.addEventListener('click', e => { const l = e.target.closest('[data-loc]'); if (l) locate(l.dataset.loc); });
    $('#cmsQ', b).addEventListener('input', e => {
      const q = e.target.value.trim().toLowerCase();
      $$('.cms-sec[data-g]', b).forEach(d => {
        if (d.dataset.g === '__ui') { d.style.display = q ? 'none' : ''; return; }
        if (q) { d.open = true; fill(d); }
        let any = false; $$('.cms-item', d).forEach(it => { const t = textFor(it.dataset.key); const hit = !q || (plain(t.en) + ' ' + plain(t.ar)).toLowerCase().includes(q); it.style.display = hit ? '' : 'none'; if (hit) any = true; });
        d.style.display = any || !q ? '' : 'none';
      });
    });
  }
  function locate(k) {
    const el = $(`[data-k="${k}"],[data-ik="${k}"]`); if (!el) return;
    const s = el.closest('.cms-hidden'); if (s) { toast(L('This section is hidden', 'هذا القسم مخفي')); return; }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('cms-flash'); setTimeout(() => el.classList.remove('cms-flash'), 1800);
  }

  /* ---------- products */
  function saveProducts() { C.data.products = clone(P); markDirty(); rerender(); }
  function tabProducts(b) {
    b.innerHTML = `<div class="cms-row-btns"><b>${P.length} ${L('products', 'منتج')}</b><span></span><button class="cms-btn cms-primary" id="cmsAddP">+ ${L('Add product', 'إضافة منتج')}</button></div>
      <div class="cms-plist">${P.map((p, i) => `<div class="cms-prow" data-i="${i}">
        <img src="${esc(img(p.id, 'front'))}" alt=""><div><b>${esc(p.en)}</b><span>${esc(p.ar)} · ${esc(p.pack)}</span></div>
        <div class="cms-prow-a"><button class="cms-mini" data-a="up" ${i === 0 ? 'disabled' : ''}>↑</button><button class="cms-mini" data-a="down" ${i === P.length - 1 ? 'disabled' : ''}>↓</button><button class="cms-mini" data-a="edit">✎</button><button class="cms-mini danger" data-a="del">✕</button></div></div>`).join('')}</div>
      ${C.data.products ? `<button class="cms-btn cms-link" id="cmsResetP">${L('Restore the original 14 products', 'استرجاع الـ 14 منتج الأصلية')}</button>` : ''}`;
    $('#cmsAddP', b).onclick = () => {
      let n = P.length + 1, id; do { id = 'product-' + n++; } while (P.find(p => p.id === id));
      P.push({ id, no: String(P.length + 1).padStart(2, '0'), en: 'New product', ar: 'منتج جديد', v: 'Premium Frozen', va: 'مجمد فاخر', cat: 'veg', hs: '0710', pack: '400 g', dEn: '', dAr: '', cuts: [], packs: ['400 g'], season: null, front: PLACEHOLDER, back: PLACEHOLDER });
      saveProducts(); editProduct(P.length - 1);
    };
    const rp = $('#cmsResetP', b); if (rp) rp.onclick = () => { if (confirm(L('Replace your product list with the original products?', 'استبدال قائمة المنتجات بالمنتجات الأصلية؟'))) { delete C.data.products; markDirty(); rerender(); renderTab(); } };
    $('.cms-plist', b).onclick = e => {
      const a = e.target.closest('[data-a]'); if (!a) return; const i = +a.closest('.cms-prow').dataset.i;
      if (a.dataset.a === 'edit') return editProduct(i);
      if (a.dataset.a === 'del') { if (!confirm(L(`Delete "${P[i].en}"?`, `حذف "${P[i].ar}"؟`))) return; P.splice(i, 1); }
      if (a.dataset.a === 'up' && i > 0) [P[i - 1], P[i]] = [P[i], P[i - 1]];
      if (a.dataset.a === 'down' && i < P.length - 1) [P[i + 1], P[i]] = [P[i], P[i + 1]];
      saveProducts(); renderTab();
    };
  }
  function editProduct(i) {
    const p = P[i], b = freshBody();
    const seasonOn = m => p.season && p.season.includes(m);
    b.innerHTML = `<button class="cms-btn cms-link" id="cmsBack">← ${L('All products', 'كل المنتجات')}</button>
      <div class="cms-pimgs">
        <div><label>${L('Front of pack', 'وجه العبوة')}</label><button class="cms-pimg" data-f="front"><img src="${esc(img(p.id, 'front'))}" alt=""><span>${L('Replace', 'تغيير')}</span></button></div>
        <div><label>${L('Back of pack', 'ظهر العبوة')}</label><button class="cms-pimg" data-f="back"><img src="${esc(img(p.id, 'back'))}" alt=""><span>${L('Replace', 'تغيير')}</span></button></div>
      </div>
      <div class="cms-2"><div class="cms-f"><label>${L('Name (English)', 'الاسم (إنجليزي)')}</label><input data-p="en" value="${esc(p.en)}"></div><div class="cms-f"><label>${L('Name (Arabic)', 'الاسم (عربي)')}</label><input data-p="ar" dir="rtl" value="${esc(p.ar)}"></div></div>
      <div class="cms-2"><div class="cms-f"><label>${L('Full product name (EN)', 'اسم المنتج الكامل (EN)')}</label><input data-p="v" value="${esc(p.v || '')}"></div><div class="cms-f"><label>${L('Full product name (AR)', 'اسم المنتج الكامل (AR)')}</label><input data-p="va" dir="rtl" value="${esc(p.va || '')}"></div></div>
      <div class="cms-3"><div class="cms-f"><label>${L('Category', 'الفئة')}</label><select data-p="cat"><option value="veg" ${p.cat === 'veg' ? 'selected' : ''}>${L('Vegetable', 'خضار')}</option><option value="fruit" ${p.cat === 'fruit' ? 'selected' : ''}>${L('Fruit', 'فاكهة')}</option><option value="potato" ${p.cat === 'potato' ? 'selected' : ''}>${L('Potato', 'بطاطس')}</option></select></div>
        <div class="cms-f"><label>${L('SKU no.', 'رقم الصنف')}</label><input data-p="no" value="${esc(p.no)}"></div><div class="cms-f"><label>${L('Retail pack', 'عبوة التجزئة')}</label><input data-p="pack" value="${esc(p.pack)}"></div></div>
      <div class="cms-2"><div class="cms-f"><label>HS</label><input data-p="hs" value="${esc(p.hs || '')}"></div><div class="cms-f"><label>${L('Formats (comma separated)', 'الصيغ (مفصولة بفاصلة)')}</label><input data-p="packs" value="${esc((p.packs || []).join(', '))}"></div></div>
      <div class="cms-f"><label>${L('Description (English)', 'الوصف (إنجليزي)')}</label><textarea data-p="dEn" rows="3">${esc(p.dEn)}</textarea></div>
      <div class="cms-f"><label>${L('Description (Arabic)', 'الوصف (عربي)')}</label><textarea data-p="dAr" rows="3" dir="rtl">${esc(p.dAr)}</textarea></div>
      <div class="cms-f"><label>${L('Cuts & grades — one per line: English | عربي', 'التقطيعات والدرجات — سطر لكل واحدة: English | عربي')}</label><textarea data-p="cuts" rows="4">${esc((p.cuts || []).map(c => c[0] + ' | ' + c[1]).join('\n'))}</textarea></div>
      <div class="cms-f"><label>${L('Harvest months', 'شهور الحصاد')}</label>
        <div class="cms-months">${MONTHS.map((m, k) => `<button type="button" data-m="${k + 1}" class="${seasonOn(k + 1) ? 'on' : ''}">${m}</button>`).join('')}</div>
        <label class="cms-check"><input type="checkbox" data-p="noseason" ${!p.season ? 'checked' : ''}> ${L('No harvest window (year-round supply)', 'بدون موسم حصاد (متاح طوال العام)')}</label></div>
      <div class="cms-checks"><label class="cms-check"><input type="checkbox" data-p="brine" ${p.brine ? 'checked' : ''}> ${L('Also available in brine', 'متوفر في محلول ملحي')}</label>
        <label class="cms-check"><input type="checkbox" data-p="isNew" ${p.isNew ? 'checked' : ''}> ${L('Show "New" badge', 'إظهار شارة "جديد"')}</label>
        <label class="cms-check"><input type="checkbox" data-p="all" ${p.all ? 'checked' : ''}> ${L('Year-round blend', 'خلطة متاحة طوال العام')}</label></div>
      <div class="cms-f"><label>${L('Product ID (used in links)', 'معرّف المنتج (في الروابط)')}</label><input data-p="id" value="${esc(p.id)}"></div>
      <div class="cms-row-btns"><button class="cms-btn cms-danger" id="cmsDelP">${L('Delete product', 'حذف المنتج')}</button><span></span><button class="cms-btn cms-primary" id="cmsDoneP">${L('Done', 'تم')}</button></div>`;
    const commit = () => { saveProducts(); };
    b.oninput = b.onchange = e => {
      const f = e.target.dataset.p; if (!f) return; const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      if (f === 'packs') p.packs = v.split(',').map(s => s.trim()).filter(Boolean);
      else if (f === 'cuts') p.cuts = v.split('\n').map(l => l.split('|').map(s => s.trim())).filter(c => c[0]).map(c => [c[0], c[1] || c[0]]);
      else if (f === 'noseason') { p.season = v ? null : (p.season || []); $$('.cms-months button', b).forEach(x => x.classList.toggle('on', !v && seasonOn(+x.dataset.m))); }
      else if (f === 'id') { const nid = v.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'); if (!nid || P.some((q, j) => j !== i && q.id === nid)) return; if (!p.front) p.front = 'assets/img/packs/' + p.id + '-front.webp'; if (!p.back) p.back = 'assets/img/packs/' + p.id + '-back.webp'; p.id = nid; }
      else if (f === 'brine' || f === 'isNew' || f === 'all') { if (v) p[f] = 1; else delete p[f]; }
      else p[f] = v;
      clearTimeout(editProduct.t); editProduct.t = setTimeout(commit, 350);
    };
    $('.cms-months', b).onclick = e => { const x = e.target.closest('[data-m]'); if (!x) return; const m = +x.dataset.m; p.season = p.season || []; p.season = p.season.includes(m) ? p.season.filter(q => q !== m) : [...p.season, m].sort((a, c) => a - c); x.classList.toggle('on'); $('[data-p=noseason]', b).checked = false; commit(); };
    $$('.cms-pimg', b).forEach(btn => btn.onclick = async () => { const f = btn.dataset.f; const r = await pickMedia({ title: btn.previousElementSibling.textContent, src: p[f] || 'assets/img/packs/' + p.id + '-' + f + '.webp' }); if (!r) return; if (r.reset) delete p[f]; else p[f] = r.src; $('img', btn).src = img(p.id, f); commit(); });
    $('#cmsBack', b).onclick = () => { renderTab(); };
    $('#cmsDoneP', b).onclick = () => { commit(); renderTab(); toast(L('Product updated — remember to Save', 'تم تحديث المنتج — لا تنس الحفظ'), 'ok'); };
    $('#cmsDelP', b).onclick = () => { if (!confirm(L(`Delete "${p.en}"?`, `حذف "${p.ar}"؟`))) return; P.splice(i, 1); saveProducts(); renderTab(); };
  }

  /* ---------- lists (FAQ, exhibitions, regions, countries, extra seasonal crops) */
  function repeater(items, fields, onChange, addTpl) {
    const wrap = document.createElement('div'); wrap.className = 'cms-rep';
    const draw = () => {
      wrap.innerHTML = items.map((it, i) => `<div class="cms-rep-i" data-i="${i}"><div class="cms-rep-h"><b>${String(i + 1).padStart(2, '0')}</b><span></span><button class="cms-mini" data-a="up" ${i === 0 ? 'disabled' : ''}>↑</button><button class="cms-mini" data-a="down" ${i === items.length - 1 ? 'disabled' : ''}>↓</button><button class="cms-mini danger" data-a="del">✕</button></div>
        ${fields.map(f => `<div class="cms-f"><label>${f.label}</label>${f.area ? `<textarea data-f="${f.key}" rows="${f.rows || 2}" ${f.rtl ? 'dir="rtl"' : ''}>${esc(f.get ? f.get(it) : it[f.key])}</textarea>` : `<input data-f="${f.key}" ${f.rtl ? 'dir="rtl"' : ''} value="${esc(f.get ? f.get(it) : it[f.key])}">`}</div>`).join('')}</div>`).join('') + `<button class="cms-btn" data-a="add">+ ${L('Add item', 'إضافة عنصر')}</button>`;
    };
    wrap.addEventListener('input', e => { const i = +e.target.closest('.cms-rep-i').dataset.i, f = fields.find(x => x.key === e.target.dataset.f); if (f.set) f.set(items[i], e.target.value); else items[i][f.key] = e.target.value; onChange(); });
    wrap.addEventListener('click', e => {
      const a = e.target.closest('[data-a]'); if (!a) return; const row = a.closest('.cms-rep-i'), i = row ? +row.dataset.i : -1;
      if (a.dataset.a === 'add') items.push(addTpl());
      if (a.dataset.a === 'del' && confirm(L('Delete this item?', 'حذف هذا العنصر؟'))) items.splice(i, 1);
      if (a.dataset.a === 'up' && i > 0) [items[i - 1], items[i]] = [items[i], items[i - 1]];
      if (a.dataset.a === 'down' && i < items.length - 1) [items[i + 1], items[i]] = [items[i], items[i + 1]];
      onChange(); draw();
    });
    draw(); return wrap;
  }
  function tabLists(b) {
    b.innerHTML = [
      sec(L('FAQ — questions & answers', 'الأسئلة الشائعة'), '<div data-l="faq"></div>', true),
      sec(L('Exhibitions strip', 'شريط المعارض'), '<div data-l="expos"></div>'),
      sec(L('Markets map — regions', 'خريطة الأسواق — المناطق'), '<div data-l="regions"></div>'),
      sec(L('Countries in the quotation form', 'الدول في نموذج الطلب'), `<p class="cms-hint">${L('One country per line.', 'دولة في كل سطر.')}</p><textarea id="cmsCountries" rows="10"></textarea>`),
      sec(L('Extra seasonal crops (planner only)', 'محاصيل موسمية إضافية (المخطط فقط)'), '<div data-l="extra"></div>')
    ].join('');
    const upd = (key, arr) => () => { C.data[key] = clone(arr); markDirty(); clearTimeout(tabLists.t); tabLists.t = setTimeout(rerender, 350); };
    const faq = clone(C.data.faq || DEF.data.faq);
    $('[data-l=faq]', b).appendChild(repeater(faq, [
      { key: 'qEn', label: L('Question (EN)', 'السؤال (EN)') }, { key: 'qAr', label: L('Question (AR)', 'السؤال (AR)'), rtl: 1 },
      { key: 'aEn', label: L('Answer (EN)', 'الإجابة (EN)'), area: 1, rows: 3 }, { key: 'aAr', label: L('Answer (AR)', 'الإجابة (AR)'), area: 1, rows: 3, rtl: 1 }
    ], upd('faq', faq), () => ({ qEn: 'New question?', qAr: 'سؤال جديد؟', aEn: 'Answer.', aAr: 'الإجابة.' })));
    const expos = (C.data.expos || DEF.data.expos).map(e => ({ n: e[0], c: e[1] }));
    const exUpd = () => { C.data.expos = expos.map(e => [e.n, e.c]); markDirty(); clearTimeout(tabLists.t); tabLists.t = setTimeout(rerender, 350); };
    $('[data-l=expos]', b).appendChild(repeater(expos, [{ key: 'n', label: L('Exhibition', 'المعرض') }, { key: 'c', label: L('City', 'المدينة') }], exUpd, () => ({ n: 'EXHIBITION', c: 'City' })));
    const regions = clone(C.data.regions || DEF.data.regions);
    $('[data-l=regions]', b).appendChild(repeater(regions, [
      { key: 'en', label: L('Region (EN)', 'المنطقة (EN)') }, { key: 'ar', label: L('Region (AR)', 'المنطقة (AR)'), rtl: 1 },
      { key: 'c', label: L('Countries (EN, comma separated)', 'الدول (EN، بفاصلة)'), area: 1, get: r => (r.c || []).join(', '), set: (r, v) => r.c = v.split(',').map(s => s.trim()).filter(Boolean) },
      { key: 'ca', label: L('Countries (AR, comma separated)', 'الدول (AR، بفاصلة)'), area: 1, rtl: 1, get: r => (r.ca || []).join('، '), set: (r, v) => r.ca = v.split(/[,،]/).map(s => s.trim()).filter(Boolean) }
    ], upd('regions', regions), () => ({ k: 'r' + Date.now(), en: 'New region', ar: 'منطقة جديدة', c: [], ca: [], h: [] })));
    const ta = $('#cmsCountries', b); ta.value = (C.data.countries || DEF.data.countries).join('\n');
    ta.oninput = () => { C.data.countries = ta.value.split('\n').map(s => s.trim()).filter(Boolean); markDirty(); clearTimeout(tabLists.t); tabLists.t = setTimeout(rerender, 500); };
    const extra = clone(C.data.extra || DEF.data.extra);
    $('[data-l=extra]', b).appendChild(repeater(extra, [
      { key: 'en', label: L('Crop (EN)', 'المحصول (EN)') }, { key: 'ar', label: L('Crop (AR)', 'المحصول (AR)'), rtl: 1 },
      { key: 'season', label: L('Months (e.g. 6,7,8)', 'الشهور (مثال 6,7,8)'), get: r => (r.season || []).join(','), set: (r, v) => r.season = v.split(/[,\s]+/).map(Number).filter(n => n >= 1 && n <= 12) }
    ], upd('extra', extra), () => ({ en: 'Crop', ar: 'محصول', season: [] })));
  }

  /* ---------- design */
  const toHex = v => { v = (v || '').trim(); if (/^#[0-9a-f]{6}$/i.test(v)) return v; if (/^#[0-9a-f]{3}$/i.test(v)) return '#' + v.slice(1).split('').map(c => c + c).join(''); const m = v.match(/\d+/g); if (m && m.length >= 3) return '#' + m.slice(0, 3).map(n => (+n).toString(16).padStart(2, '0')).join(''); return '#000000'; };
  function tabDesign(b) {
    const t = C.theme; t.vars = t.vars || {}; t.fonts = t.fonts || {};
    const fontSel = (k, label) => `<div class="cms-f"><label>${label}</label><select data-font="${k}"><option value="">${L('Default', 'الافتراضي')} (${FONTS[k][0]})</option>${FONTS[k].map(f => `<option ${t.fonts[k] === f ? 'selected' : ''}>${f}</option>`).join('')}${t.fonts[k] && !FONTS[k].includes(t.fonts[k]) ? `<option selected>${esc(t.fonts[k])}</option>` : ''}</select><input data-fontc="${k}" placeholder="${L('or any Google Font name', 'أو أي اسم خط من Google Fonts')}" value=""></div>`;
    b.innerHTML = sec(L('Brand colors', 'ألوان الهوية'), `<div class="cms-colors">${TOKENS.map(([v, en, ar]) => { const cur = t.vars[v] || DEF.vars[v]; return `<label class="cms-color"><input type="color" data-var="${v}" value="${toHex(cur)}"><span><b>${L(en, ar)}</b><input class="cms-hex" data-hex="${v}" value="${esc(toHex(cur))}"></span>${t.vars[v] ? `<button class="cms-mini" data-rv="${v}" title="Reset">↺</button>` : ''}</label>`; }).join('')}</div>
        <div class="cms-row-btns"><button class="cms-btn" id="cmsResetColors">${L('Reset all colors', 'استرجاع كل الألوان')}</button></div>`, true)
      + sec(L('Fonts', 'الخطوط'), fontSel('display', L('Headings', 'العناوين')) + fontSel('body', L('Body text', 'نص المحتوى')) + fontSel('ar', L('Arabic', 'العربي')) + fontSel('mono', L('Labels (mono)', 'التسميات (mono)')), true)
      + sec(L('Layout', 'التخطيط'), `
        <div class="cms-f"><label>${L('Content width', 'عرض المحتوى')}: <b id="vWrap">${t.wrap || 1180}px</b></label><input type="range" min="960" max="1480" step="20" data-lay="wrap" value="${t.wrap || 1180}"></div>
        <div class="cms-f"><label>${L('Corner radius', 'استدارة الزوايا')}: <b id="vR">${t.r != null && t.r !== '' ? t.r : 6}px</b></label><input type="range" min="0" max="20" step="1" data-lay="r" value="${t.r != null && t.r !== '' ? t.r : 6}"></div>
        <div class="cms-f"><label>${L('Text size', 'حجم النص')}: <b id="vS">${t.scale || 100}%</b></label><input type="range" min="85" max="120" step="1" data-lay="scale" value="${t.scale || 100}"></div>
        <div class="cms-row-btns"><button class="cms-btn" id="cmsResetLay">${L('Reset layout', 'استرجاع التخطيط')}</button></div>`, true);
    const up = () => { applyTheme(); markDirty(); };
    b.oninput = e => {
      const v = e.target.dataset.var, hx = e.target.dataset.hex, lay = e.target.dataset.lay, fc = e.target.dataset.fontc;
      if (v) { t.vars[v] = e.target.value; $(`[data-hex="${v}"]`, b).value = e.target.value; up(); }
      if (hx && /^#[0-9a-f]{6}$/i.test(e.target.value)) { t.vars[hx] = e.target.value; $(`[data-var="${hx}"]`, b).value = e.target.value; up(); }
      if (lay) { t[lay] = +e.target.value; ({ wrap: $('#vWrap', b), r: $('#vR', b), scale: $('#vS', b) })[lay].textContent = e.target.value + (lay === 'scale' ? '%' : 'px'); up(); }
      if (fc) { clearTimeout(tabDesign.t); tabDesign.t = setTimeout(() => { if (e.target.value.trim()) { t.fonts[fc] = e.target.value.trim(); up(); } }, 700); }
    };
    b.onchange = e => { const f = e.target.dataset.font; if (f !== undefined) { if (e.target.value) t.fonts[f] = e.target.value; else delete t.fonts[f]; up(); } };
    b.onclick = e => {
      const r = e.target.closest('[data-rv]'); if (r) { delete t.vars[r.dataset.rv]; up(); tabDesign(b); }
      if (e.target.id === 'cmsResetColors') { t.vars = {}; up(); tabDesign(b); }
      if (e.target.id === 'cmsResetLay') { delete t.wrap; delete t.r; delete t.scale; up(); tabDesign(b); }
    };
  }

  /* ---------- media */
  function tabMedia(b) {
    const items = $$('[data-ik]').map(el => ({ k: el.dataset.ik, el, video: el.tagName === 'VIDEO', g: groupOf(el) }));
    const card = (k, src, label, video) => `<button class="cms-mcard2" data-mk="${k}">${video ? `<video src="${esc(URLX(src))}" muted></video>` : `<img src="${esc(URLX(src))}" alt="">`}<span>${esc(label)}</span>${C.attrs[k] ? '<i>●</i>' : ''}</button>`;
    const bg = n => attrFor('bg:' + n).src;
    b.innerHTML = sec(L('Hero video & page backgrounds', 'فيديو الهيرو وخلفيات الصفحة'), `<div class="cms-mgrid">
        ${items.filter(i => i.video).map(i => card(i.k, attrFor(i.k).src, L('Hero video', 'فيديو الهيرو'), true)).join('')}
        ${card('poster', attrFor(items.find(i => i.video)?.k || '').poster || 'assets/img/misc/hero-poster.jpg', L('Video poster (before it loads)', 'صورة قبل تحميل الفيديو'))}
        ${card('bg:prod', bg('prod'), L('Production background', 'خلفية قسم الإنتاج'))}
        ${card('bg:rfq', bg('rfq'), L('Quotation panel background', 'خلفية لوحة طلب السعر'))}
        ${card('favicon', attrFor('favicon').src, L('Browser icon (favicon)', 'أيقونة المتصفح'))}</div>`, true)
      + ['nav', ...SECTION_IDS, 'footer', 'other'].map(g => { const list = items.filter(i => !i.video && i.g === g); return list.length ? sec(`${L(NAMES[g][0], NAMES[g][1])} <small>${list.length}</small>`, `<div class="cms-mgrid">${list.map(i => card(i.k, attrFor(i.k).src, attrFor(i.k).alt || i.k)).join('')}</div>`, g === 'nav' || g === 'company') : ''; }).join('')
      + `<p class="cms-hint">${L('Product pack images are edited in the Products tab.', 'صور عبوات المنتجات تتعدل من تبويب المنتجات.')}</p>`;
    b.onclick = async e => {
      const c = e.target.closest('[data-mk]'); if (!c) return; const k = c.dataset.mk;
      if (k === 'poster') {
        const vk = items.find(i => i.video).k, a = attrFor(vk);
        const r = await pickMedia({ title: L('Video poster', 'صورة الفيديو'), src: a.poster || 'assets/img/misc/hero-poster.jpg' }); if (!r) return;
        C.attrs[vk] = Object.assign({}, C.attrs[vk] || {}); if (r.reset) delete C.attrs[vk].poster; else C.attrs[vk].poster = r.src;
      } else if (/^(bg:|favicon)/.test(k)) {
        const r = await pickMedia({ title: c.querySelector('span').textContent, src: attrFor(k).src }); if (!r) return;
        if (r.reset) delete C.attrs[k]; else C.attrs[k] = { src: r.src };
      } else return editImage(k);
      applyAttrs(); markDirty(); tabMedia(b);
    };
  }

  /* ---------- sections */
  function tabSections(b) {
    const order = (C.sections.order && C.sections.order.length ? C.sections.order : DEF.order).filter(id => document.getElementById(id));
    const hid = C.sections.hidden || (C.sections.hidden = {});
    b.innerHTML = `<p class="cms-hint">${L('Show, hide and reorder the page sections.', 'إظهار وإخفاء وترتيب أقسام الصفحة.')}</p>
      <div class="cms-slist">${order.map((id, i) => `<div class="cms-srow ${hid[id] ? 'off' : ''}" data-id="${id}">
        <label class="cms-switch sm"><input type="checkbox" ${hid[id] ? '' : 'checked'}><span></span></label>
        <b>${L(NAMES[id][0], NAMES[id][1])}</b>
        <button class="cms-mini" data-a="go" title="${L('Go to', 'اذهب')}">◎</button><button class="cms-mini" data-a="up" ${i === 0 ? 'disabled' : ''}>↑</button><button class="cms-mini" data-a="down" ${i === order.length - 1 ? 'disabled' : ''}>↓</button></div>`).join('')}</div>
      <div class="cms-row-btns"><button class="cms-btn" id="cmsResetS">${L('Restore original order', 'استرجاع الترتيب الأصلي')}</button></div>`;
    b.onchange = e => { const r = e.target.closest('.cms-srow'); if (!r) return; if (e.target.checked) delete hid[r.dataset.id]; else hid[r.dataset.id] = true; applySections(); markDirty(); tabSections(b); };
    b.onclick = e => {
      if (e.target.id === 'cmsResetS') { C.sections = { hidden: {}, order: null }; applySections(); markDirty(); return tabSections(b); }
      const a = e.target.closest('[data-a]'); if (!a) return; const id = a.closest('.cms-srow').dataset.id, i = order.indexOf(id);
      if (a.dataset.a === 'go') { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth' }); return; }
      if (a.dataset.a === 'up' && i > 0) [order[i - 1], order[i]] = [order[i], order[i - 1]];
      if (a.dataset.a === 'down' && i < order.length - 1) [order[i + 1], order[i]] = [order[i], order[i + 1]];
      C.sections.order = order.slice(); applySections(); markDirty(); tabSections(b);
    };
  }

  /* ---------- SEO & settings */
  function tabSettings(b) {
    const s = Object.assign({}, DEF.seo, C.seo || {}), st = C.settings || (C.settings = {});
    b.innerHTML = sec(L('Search engines (SEO)', 'محركات البحث (SEO)'), `
        <div class="cms-f"><label>${L('Page title (EN)', 'عنوان الصفحة (EN)')}</label><input data-seo="titleEn" value="${esc(s.titleEn)}"></div>
        <div class="cms-f"><label>${L('Page title (AR)', 'عنوان الصفحة (AR)')}</label><input data-seo="titleAr" dir="rtl" value="${esc(s.titleAr)}"></div>
        <div class="cms-f"><label>${L('Meta description (EN)', 'الوصف التعريفي (EN)')}</label><textarea data-seo="descEn" rows="3">${esc(s.descEn)}</textarea></div>
        <div class="cms-f"><label>${L('Meta description (AR)', 'الوصف التعريفي (AR)')}</label><textarea data-seo="descAr" rows="3" dir="rtl">${esc(s.descAr)}</textarea></div>`, true)
      + sec(L('Website settings', 'إعدادات الموقع'), `
        <div class="cms-f"><label>${L('Default language for new visitors', 'اللغة الافتراضية للزوار الجدد')}</label><select data-set="defaultLang"><option value="en" ${st.defaultLang !== 'ar' ? 'selected' : ''}>English</option><option value="ar" ${st.defaultLang === 'ar' ? 'selected' : ''}>العربية</option></select></div>
        <div class="cms-f"><label>${L('Quotation requests are sent to', 'طلبات عروض الأسعار تُرسل إلى')}</label><input data-set="rfqEmail" type="email" value="${esc(st.rfqEmail || 'export@frosty-foods.com')}"></div>`, true)
      + sec(L('Dashboard access code', 'كود دخول اللوحة'), `
        ${WP ? `<div class="cms-f"><label>${L('Current code', 'الكود الحالي')}</label><input type="password" id="cmsOld" autocomplete="off"></div>` : ''}
        <div class="cms-f"><label>${L('New code (min. 4 characters)', 'الكود الجديد (4 حروف على الأقل)')}</label><input type="password" id="cmsNew" autocomplete="new-password"></div>
        <div class="cms-f"><label>${L('Repeat new code', 'أعد كتابة الكود الجديد')}</label><input type="password" id="cmsNew2" autocomplete="new-password"></div>
        <button class="cms-btn cms-primary" id="cmsCode">${L('Change code', 'تغيير الكود')}</button>
        <p class="cms-hint">${WP ? L('Stored securely (hashed) in WordPress.', 'يُحفظ بشكل آمن (مشفّر) في ووردبريس.') : L('Static mode: the new code applies after you Save and publish content.json.', 'النسخة الثابتة: الكود الجديد يُطبّق بعد الحفظ ونشر content.json.')}</p>`);
    b.oninput = e => {
      const k = e.target.dataset.seo, st2 = e.target.dataset.set;
      if (k) { C.seo = C.seo || {}; C.seo[k] = e.target.value; applySeo(); applyLang(lang()); markDirty(); }
      if (st2) { st[st2] = e.target.value; window.CMS_SETTINGS = Object.assign({}, st); markDirty(); }
    };
    $('#cmsCode', b).onclick = async () => {
      const n1 = $('#cmsNew', b).value, n2 = $('#cmsNew2', b).value;
      if (n1.length < 4) return toast(L('The code must be at least 4 characters', 'الكود لازم يكون 4 حروف على الأقل'), 'bad');
      if (n1 !== n2) return toast(L('The two codes do not match', 'الكودان غير متطابقين'), 'bad');
      if (WP) {
        const r = await fetch(WP.rest + 'code', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()), body: JSON.stringify({ current: $('#cmsOld', b).value, code: n1 }) });
        const j = await r.json().catch(() => ({})); if (!r.ok) return toast(j.message || 'Error', 'bad');
        toast(L('Code changed', 'تم تغيير الكود'), 'ok');
      } else { st.codeHash = sha256(n1); markDirty(); toast(L('Code updated — press Save', 'تم تحديث الكود — اضغط حفظ'), 'ok'); }
      $$('input[type=password]', b).forEach(i => i.value = '');
    };
  }

  /* ---------- backup */
  function tabBackup(b) {
    b.innerHTML = `
      <div class="cms-card"><h4>${L('Export', 'تصدير')}</h4><p class="cms-hint">${L('Download all your edits as one JSON file (a full backup).', 'نزّل كل تعديلاتك في ملف JSON واحد (نسخة احتياطية كاملة).')}</p>
        <button class="cms-btn" id="cmsExport">⇩ ${L('Download backup', 'تنزيل نسخة احتياطية')}</button></div>
      ${WP ? '' : `<div class="cms-card"><h4>${L('Publish (static site)', 'النشر (الموقع الثابت)')}</h4><p class="cms-hint">${L('Download <b>content.json</b> and upload it to the same folder as index.html on your hosting. Every visitor will then see your edits.', 'نزّل ملف <b>content.json</b> وارفعه في نفس فولدر index.html على الاستضافة. بعدها كل الزوار هيشوفوا تعديلاتك.')}</p>
        <button class="cms-btn cms-primary" id="cmsPublish">⇩ content.json</button></div>`}
      <div class="cms-card"><h4>${L('Import', 'استيراد')}</h4><p class="cms-hint">${L('Load a backup or content.json file. It replaces the current edits (press Save afterwards).', 'حمّل نسخة احتياطية أو ملف content.json. سيستبدل التعديلات الحالية (اضغط حفظ بعدها).')}</p>
        <label class="cms-btn cms-file">⇧ ${L('Choose file', 'اختر ملف')}<input type="file" accept="application/json,.json" id="cmsImport"></label></div>
      <div class="cms-card cms-dz"><h4>${L('Reset', 'إعادة الضبط')}</h4><p class="cms-hint">${L('Remove every edit and return the site to its original design and content.', 'احذف كل التعديلات وارجع الموقع لتصميمه ومحتواه الأصلي.')}</p>
        <button class="cms-btn cms-danger" id="cmsReset">${L('Reset everything', 'إعادة ضبط كل شيء')}</button>
        ${!WP && hasDraft ? `<button class="cms-btn" id="cmsDropDraft">${L('Discard browser draft', 'حذف مسودة المتصفح')}</button>` : ''}</div>`;
    const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    $('#cmsExport', b).onclick = () => download(`frosty-backup-${stamp()}.json`, JSON.stringify(C, null, 1));
    const pb = $('#cmsPublish', b); if (pb) pb.onclick = () => { finishEdit(); download('content.json', JSON.stringify(C)); };
    $('#cmsImport', b).onchange = e => {
      const f = e.target.files[0]; if (!f) return; const fr = new FileReader();
      fr.onload = () => { try { const j = JSON.parse(fr.result); if (typeof j !== 'object' || !j.texts) throw 0; const code = C.settings && C.settings.codeHash; C = merge(EMPTY(), j); if (code && !C.settings.codeHash) C.settings.codeHash = code; rerender(); markDirty(); toast(L('Imported — press Save to keep it', 'تم الاستيراد — اضغط حفظ للاحتفاظ به'), 'ok'); } catch (x) { toast(L('This is not a valid Frosty CMS file', 'هذا ليس ملف صالح للوحة التحكم'), 'bad'); } };
      fr.readAsText(f);
    };
    $('#cmsReset', b).onclick = () => { if (!confirm(L('Reset ALL content and design to the original? (press Save afterwards to publish)', 'إعادة ضبط كل المحتوى والتصميم للأصل؟ (اضغط حفظ بعدها للنشر)'))) return; const code = C.settings && C.settings.codeHash; C = EMPTY(); if (code) C.settings.codeHash = code; rerender(); markDirty(); toast(L('Reset done', 'تمت إعادة الضبط'), 'ok'); };
    const dd = $('#cmsDropDraft', b); if (dd) dd.onclick = () => { if (!confirm(L('Discard the draft saved in this browser?', 'حذف المسودة المحفوظة في هذا المتصفح؟'))) return; localStorage.removeItem(LS_KEY); hasDraft = false; C = merge(EMPTY(), published || {}); rerender(); markClean(); tabBackup(b); };
  }
})();

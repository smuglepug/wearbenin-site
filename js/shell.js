/* ==========================================================================
   WearBenin v2 — app shell: utility bar, header, drawer, footer, bottom nav
   Home sections 1, 2 and 15 (+ mobile chrome from §2)
   ========================================================================== */

import { icon, BRAND_PATHS } from './icons.js';
import { esc, qs, qsa, buildQuery } from './util.js';
import { avatarTag, toast } from './ui.js';
import { session, subscribeSession, logout } from './session.js';
import { siteSocialRow, siteSocialLinks, shareMarketplaceButton, wireShareSite } from './social.js';
import { navigate, buildHref } from './router.js';
import { cartCount, onCart, openCart, wireCartDrawer, wireCartCards } from './cart.js';

const CFG = () => window.WB_CONFIG || {};
const BRAND = () => CFG().brand || {};

let META = null;
let currentPath = '/';

const LEGAL = [
  ['#/legal/terms.html', 'Terms of Service'],
  ['#/legal/privacy.html', 'Privacy Policy'],
  ['#/legal/cookies.html', 'Cookie Notice'],
  ['#/legal/vendor-agreement.html', 'Vendor Agreement'],
  ['#/legal/prohibited-items.html', 'Prohibited Items'],
  ['#/legal/refunds-disputes.html', 'Refunds & Disputes'],
  ['#/legal/payments-delivery.html', 'Payments & Delivery'],
  ['#/legal/ip-takedown.html', 'IP & Takedown'],
  ['#/legal/community-safety.html', 'Community Safety'],
  ['#/legal/fees.html', 'Fees & Commission'],
  ['#/legal/data-deletion.html', 'Data Deletion'],
  ['#/legal/accessibility.html', 'Accessibility']
];

/* ------------------------------------------------------------------ utility bar (section 1) */
function utilityBar() {
  const parts = String(BRAND().city || 'Benin City, Edo State, Nigeria').split(',').map(s => s.trim());
  const location = `${esc(parts[0] || 'Benin City')}${parts.length > 1 ? `<span class="ub-hide-sm">, ${esc(parts.slice(1).join(', '))}</span>` : ''}`;
  return `<div class="container">
    <div class="utility-left">
      <span class="ub-item">${icon('pin')} ${location}</span>
      <span class="ub-item ub-hide-sm">${icon('shield')} Verified vendors · Chat before you pay</span>
      <div class="utility-follow">
        <span class="fb-label">Follow us</span>
        ${siteSocialLinks().map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer" aria-label="WearBenin on ${esc(l.label)}" title="WearBenin on ${esc(l.label)}">${icon(l.key)}</a>`).join('')}
      </div>
    </div>
    <div class="utility-right">
      <a href="#/sell">${icon('plus')} Sell<span class="ub-hide-sm"> on WearBenin</span></a>
      <a href="#/help">${icon('info')} Help</a>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ header (section 2) */
function areaOptions(selected) {
  /* Areas with no live ads are dead ends in a search filter, so they are not
     offered — unless the current URL already filters by one. */
  const areas = ((META && META.areas) || []).filter(a => Number(a.count || 0) > 0 || a.name === selected);
  return `<option value="">All Benin City</option>` + areas.map(a =>
    `<option value="${esc(a.name)}" ${a.name === selected ? 'selected' : ''}>${esc(a.name)}${a.count ? ` (${Number(a.count)})` : ''}</option>`).join('');
}

export function searchShell(query = '', area = '', idPrefix = '') {
  return `<form class="search-shell" id="${idPrefix}wb-search-form" role="search" data-search-form>
    <label class="search-loc" title="Choose an area in Benin City">
      ${icon('pin')}
      <select name="area" aria-label="Area">${areaOptions(area)}</select>
    </label>
    <span class="search-ico" aria-hidden="true">${icon('search')}</span>
    <span class="search-qwrap">
      <input type="search" name="q" value="${esc(query)}" placeholder="Search ankara, agbada, sneakers, gele…" aria-label="Search listings" autocomplete="off">
    </span>
    <button class="search-btn" type="submit">${icon('search')}<span>Search</span></button>
  </form>`;
}

function header() {
  const u = session.user;
  const loggedIn = !!u;
  const favCount = session.favorites.size;
  const cartN = cartCount();
  const unread = session.unread;
  return `
  <div class="container">
    <div class="header-inner">
      <button class="icon-btn header-burger" id="wb-burger" aria-label="Open menu" aria-expanded="false">
        <span class="hb"></span><span class="hb"></span><span class="hb"></span></button>

      <a class="brand" href="#/" aria-label="WearBenin home">
        <span class="brand-mark" aria-hidden="true">W</span>
        <span class="brand-text">
          <span class="brand-name">WearBenin</span>
          <span class="brand-sub">Benin City Fashion</span>
        </span>
      </a>

      <div class="header-search">${searchShell('', '', 'h-')}</div>

      <div class="header-actions">
        <a class="hact hact-desktop" href="#/saved" aria-label="Saved items">
          ${icon('heart')}<span class="hact-label">Saved</span>
          ${favCount ? `<span class="badge">${favCount > 99 ? '99+' : favCount}</span>` : ''}
        </a>
        <a class="hact hact-desktop" href="#/inbox" aria-label="Inbox">
          ${icon('inbox')}<span class="hact-label">Inbox</span>
          ${unread ? `<span class="badge">${unread > 99 ? '99+' : unread}</span>` : ''}
        </a>
        <button class="hact" id="wb-open-cart" type="button" aria-label="Open cart">
          ${icon('cart')}<span class="hact-label">Cart</span>
          ${cartN ? `<span class="badge">${cartN > 99 ? '99+' : cartN}</span>` : ''}
        </button>
        <a class="hact" href="${loggedIn ? '#/account' : '#/login'}" aria-label="${loggedIn ? 'Your account' : 'Sign in'}">
          ${loggedIn && u.avatar ? avatarTag(u.avatar, u.name, 'avatar sm') : icon('user')}
          <span class="hact-label">${loggedIn ? esc(String(u.name || 'Account').split(' ')[0]) : 'Account'}</span>
        </a>
        <a class="header-sell" href="#/sell">${icon('plus')} SELL</a>
      </div>
    </div>
    <div class="header-searchmobile">${searchShell('', '', 'm-')}</div>
  </div>
  <div class="header-catnav"><div class="container">
    <a href="#/categories">All categories</a>
    ${((META && META.categories) || []).map(c =>
      `<a href="#/category/${esc(c.id)}" data-cat="${esc(c.id)}">${esc(c.name)}</a>`).join('')}
  </div></div>`;
}

/* ------------------------------------------------------------------ footer (section 15) */
function footer() {
  const cats = (META && META.categories) || [];
  return `
  <div class="footer-top"><div class="container"><div class="footer-grid">
    <div class="footer-brand">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true">W</span>
        <span class="brand-text"><span class="brand-name">WearBenin</span><span class="brand-sub">Benin City Fashion</span></span>
      </div>
      <p class="footer-about">${esc(BRAND().tagline || '')} From Oba Market to your doorstep — verified vendors, real prices in Naira, and WhatsApp chat before you pay.</p>
      ${siteSocialRow({ onDark: true })}
      <div style="margin-top:20px">${shareMarketplaceButton('btn btn-light btn-sm')}</div>
    </div>

    <div class="footer-col">
      <h4>Categories</h4>
      <ul>
        ${cats.map(c => `<li><a class="footer-cat" href="#/category/${esc(c.id)}"><span class="footer-cat-name">${esc(c.name)}</span><span class="footer-count">${Number(c.count || 0)}</span></a></li>`).join('')}
        <li><a href="#/categories">All categories ${icon('arrowRight')}</a></li>
      </ul>
    </div>

    <div class="footer-col">
      <h4>For Vendors</h4>
      <ul>
        <li><a href="#/sell">Post an ad</a></li>
        <li><a href="#/dashboard">Vendor dashboard</a></li>
          <li><a href="#/onboarding">Start selling</a></li>
          <li><a href="#/referral">Refer a vendor · earn ₦500</a></li>
        <li><a href="#/how-it-works">How it works</a></li>
        <li><a href="#/legal/fees.html">Fees &amp; commission</a></li>
        <li><a href="#/legal/vendor-agreement.html">Vendor agreement</a></li>
      </ul>
    </div>

    <div class="footer-col">
      <h4>Safety &amp; Trust</h4>
      <ul>
        <li><a href="#/safety">Safety centre</a></li>
        <li><a href="#/legal/community-safety.html">Community guidelines</a></li>
        <li><a href="#/legal/prohibited-items.html">Prohibited items</a></li>
        <li><a href="#/legal/refunds-disputes.html">Refunds &amp; disputes</a></li>
        <li><a href="#/legal/payments-delivery.html">Payments &amp; delivery</a></li>
      </ul>
    </div>

    <div class="footer-col">
      <h4>Company</h4>
      <ul>
        <li><a href="#/about">About WearBenin</a></li>
        <li><a href="#/contact">Contact us</a></li>
        <li><a href="#/help">Help &amp; FAQ</a></li>
        <li><a href="mailto:${esc(BRAND().email || '')}">${esc(BRAND().email || 'hello@wearbenin.ng')}</a></li>
        <li><a href="${esc(BRAND().whatsappChannel || '#')}" target="_blank" rel="noopener noreferrer">WhatsApp community</a></li>
      </ul>
    </div>
  </div></div></div>

  <div class="container"><div class="footer-bottom">
    <div class="footer-legal">
      ${LEGAL.map(([href, label]) => `<a href="${href}">${esc(label)}</a>`).join('')}
    </div>
    <div class="footer-pay">
      <span class="pay-chip">${icon('lock', '')} No card details stored</span>
      <span class="pay-chip">NDPA 2023 compliant</span>
      <span class="pay-chip">Pay on delivery</span>
    </div>
  </div>
  <div class="footer-bottom" style="border-top:0;padding-top:0">
    <span>© ${new Date().getFullYear()} WearBenin. Made in Benin City.</span>
    <span>Prices in Nigerian Naira (₦). WearBenin is an advertising platform and is not a party to any sale. Payments are arranged directly between buyer and vendor.</span>
  </div></div>`;
}

/* ------------------------------------------------------------------ bottom nav (mobile) */
function bottomNav() {
  const seg = '/' + (currentPath.split('/')[1] || '');
  const items = [
    { href: '#/', ico: 'home', label: 'Home', match: ['/'] },
    { href: '#/categories', ico: 'grid', label: 'Categories', match: ['/categories', '/category'] },
    { href: '#/sell', ico: 'plus', label: 'Sell', sell: true, match: ['/sell'] },
    { href: '#/saved', ico: 'heart', label: 'Saved', badge: session.favorites.size, match: ['/saved', '/saved-searches'] },
    { href: '#/inbox', ico: 'inbox', label: 'Inbox', badge: session.unread, match: ['/inbox'] }
  ];
  return `<div class="bottom-nav-inner">${items.map(it => {
    const active = it.match.some(m => m === '/' ? currentPath === '/' : currentPath.startsWith(m));
    if (it.sell) {
      return `<a class="bn-item bn-sell ${active ? 'active' : ''}" href="${it.href}">
        <span class="bn-orb">${icon('plus')}</span><span>Sell</span></a>`;
    }
    return `<a class="bn-item ${active ? 'active' : ''}" href="${it.href}">
      ${icon(it.ico)}<span>${it.label}</span>
      ${it.badge ? `<span class="badge">${it.badge > 99 ? '99+' : it.badge}</span>` : ''}</a>`;
  }).join('')}</div>`;
}

/* ------------------------------------------------------------------ drawer */
function drawerHTML() {
  const cats = (META && META.categories) || [];
  const u = session.user;
  return `
  <div class="drawer-scrim" data-drawer-close></div>
  <aside class="drawer-panel" role="dialog" aria-modal="true" aria-label="Menu">
    <div class="drawer-head">
      <div class="brand"><span class="brand-mark">W</span>
        <span class="brand-text"><span class="brand-name">WearBenin</span>
        <span class="brand-sub">Benin City Fashion</span></span></div>
      <button class="icon-btn sm" data-drawer-close aria-label="Close menu">${icon('close')}</button>
    </div>
    <div class="drawer-body">
      ${u ? `<div class="drawer-sec" style="display:flex;gap:12px;align-items:center">
        ${avatarTag(u.avatar, u.name)}
        <div style="min-width:0"><b style="display:block;font-size:15px">${esc(u.name || '')}</b>
        <span class="text-micro text-muted">${esc(u.email || '')}</span></div>
      </div>` : `<div class="drawer-sec">
        <a class="btn btn-primary btn-block" href="#/login">Sign in</a>
        <a class="btn btn-ghost btn-block" style="margin-top:10px" href="#/register">Create an account</a>
      </div>`}

      <div class="drawer-sec">
        <h4>Browse categories</h4>
        ${cats.map(c => `<a class="drawer-link" href="#/category/${esc(c.id)}" data-drawer-close>
          ${icon('chevronRight')}${esc(c.name)}
          <span class="count">${Number(c.count || 0)}</span></a>`).join('')}
        <a class="drawer-link" href="#/categories" data-drawer-close>${icon('grid')} All categories</a>
      </div>

      <div class="drawer-sec">
        <h4>My WearBenin</h4>
        <a class="drawer-link" href="#/dashboard" data-drawer-close>${icon('chart')} Vendor dashboard</a>
        <a class="drawer-link" href="#/my-ads" data-drawer-close>${icon('tag')} My ads</a>
        <a class="drawer-link" href="#/saved" data-drawer-close>${icon('heart')} Saved listings</a>
        <a class="drawer-link" href="#/saved-searches" data-drawer-close>${icon('bookmark')} Saved searches</a>
        <a class="drawer-link" href="#/onboarding" data-drawer-close>${icon('tag')} Start selling</a>
        <a class="drawer-link" href="#/referral" data-drawer-close>${icon('share')} Refer a vendor · earn ₦500</a>
        <a class="drawer-link" href="#/inbox" data-drawer-close>${icon('inbox')} Inbox</a>
        <a class="drawer-link" href="#/account" data-drawer-close>${icon('user')} Account settings</a>
        <a class="drawer-link" href="#/admin" data-drawer-close>${icon('shield')} Admin</a>
      </div>

      <div class="drawer-sec">
        <h4>Company &amp; help</h4>
        <a class="drawer-link" href="#/about" data-drawer-close>${icon('info')} About</a>
        <a class="drawer-link" href="#/how-it-works" data-drawer-close>${icon('sparkle')} How it works</a>
        <a class="drawer-link" href="#/safety" data-drawer-close>${icon('shield')} Safety centre</a>
        <a class="drawer-link" href="#/help" data-drawer-close>${icon('chat')} Help &amp; FAQ</a>
        <a class="drawer-link" href="#/contact" data-drawer-close>${icon('mail')} Contact</a>
      </div>

      <div class="drawer-sec">
        <h4>Legal</h4>
        ${LEGAL.map(([href, label]) => `<a class="drawer-link" href="${href}" data-drawer-close>${esc(label)}</a>`).join('')}
      </div>

      <div class="drawer-sec">
        <h4>Follow WearBenin</h4>
        ${siteSocialRow()}
        <div style="margin-top:16px">${shareMarketplaceButton('btn btn-ghost btn-sm')}</div>
      </div>

      ${u ? `<div class="drawer-sec"><button class="btn btn-ghost btn-block" id="wb-drawer-logout">${icon('arrowRight')} Sign out</button></div>` : ''}
    </div>
  </aside>`;
}

/* ------------------------------------------------------------------ public API */
export function setMeta(m) { META = m; }
export function getMeta() { return META; }

export function renderShell() {
  qs('#wb-utility').innerHTML = utilityBar();
  qs('#wb-header').innerHTML = header();
  qs('#wb-footer').innerHTML = footer();
  qs('#wb-bottomnav').innerHTML = bottomNav();
  wireShellEvents();
}

export function renderChrome() {
  const u = qs('#wb-utility'), h = qs('#wb-header'), f = qs('#wb-footer'), b = qs('#wb-bottomnav');
  if (u) u.innerHTML = utilityBar();
  if (h) h.innerHTML = header();
  if (f) f.innerHTML = footer();
  if (b) b.innerHTML = bottomNav();
  wireShellEvents();
}

export function setActivePath(path) {
  currentPath = path || '/';
  qsa('.header-catnav a').forEach(a => {
    const m = /#\/category\/(.+)$/.exec(a.getAttribute('href') || '');
    a.classList.toggle('active', !!m && currentPath.startsWith('/category/' + m[1]));
  });
  const bn = qs('#wb-bottomnav');
  if (bn) bn.innerHTML = bottomNav();
}

/* ------------------------------------------------------------------ nav progress bar */
export function runProgress(done = false) {
  let p = qs('#wb-progress');
  if (!p) {
    p = document.createElement('div');
    p.id = 'wb-progress';
    p.className = 'nav-progress';
    p.setAttribute('aria-hidden', 'true');
    document.body.prepend(p);
  }
  if (done) {
    p.style.transition = 'width .22s ease, opacity .5s ease .3s';
    p.style.width = '100%';
    setTimeout(() => { p.style.opacity = '0'; }, 240);
    setTimeout(() => { p.style.width = '0'; p.style.transition = 'none'; }, 820);
    return;
  }
  p.style.transition = 'none';
  p.style.width = '0';
  p.style.opacity = '1';
  requestAnimationFrame(() => {
    p.style.transition = 'width .30s ease';
    p.style.width = '74%';
  });
}

/* ------------------------------------------------------------------ wiring */
let wired = false;
function wireShellEvents() {
  /* search forms (desktop + mobile) */
  qsa('[data-search-form]').forEach(form => {
    if (form.dataset.wired) return;
    form.dataset.wired = '1';
    form.addEventListener('submit', e => {
      e.preventDefault();
      const q = (form.querySelector('input[name=q]').value || '').trim();
      const area = form.querySelector('select[name=area]')?.value || '';
      const params = {};
      if (q) params.q = q;
      if (area) params.area = area;
      location.hash = buildHref('/search', params);
    });
  });

  if (wired) return;
  wired = true;

  /* burger / drawer */
  document.addEventListener('click', e => {
    if (e.target.closest('#wb-burger')) { openDrawer(); return; }
    if (e.target.closest('[data-drawer-close]')) { closeDrawer(); return; }
    if (e.target.closest('#wb-drawer-logout')) {
      logout(); closeDrawer(); navigate('/');
    }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
  window.addEventListener('hashchange', () => {
    runProgress();
    setTimeout(() => runProgress(true), 600);
  }, { passive: true });
  let _lastY = window.scrollY || 0, _tick = false, _lockUntil = 0;
  let _accDown = 0, _accUp = 0;
  const _dirHide = () => {
    const now = Date.now();
    /* Distance-accumulation logic is what kills the flicker. We accrue how far the user
       has travelled in the current direction and only flip when one direction has held
       for > DIR (170px) WITHOUT reversing — any reversal zeroes the accumulator. A plain
       delta check flips on every micro-jitter (the collapse reflows the page and flips
       the scroll delta sign, causing the "up and down" rapid flicker). The cooldown is a
       second backstop, and near-the-bottom we refuse to collapse to avoid the scroll-clamp
       bounce. */
    const DIR = 170, y = window.scrollY || 0;
    const by = y - _lastY; _lastY = y;
    if (now < _lockUntil) return;
    if (by > 0) { _accDown += by; _accUp = 0; }
    else if (by < 0) { _accUp += -by; _accDown = 0; }
    const nearBottom = (y + (window.innerHeight || 0)) >= (document.documentElement.scrollHeight - 140);
    const h = qs('#wb-header'), bn = qs('.bottom-nav');
    if (_accDown > DIR && y > 140 && !nearBottom) {
      h && h.classList.add('slim'); bn && bn.classList.add('scroll-hide');
      _accDown = 0; _accUp = 0; _lockUntil = now + 360;
    } else if (_accUp > DIR) {
      h && h.classList.remove('slim'); bn && bn.classList.remove('scroll-hide');
      _accDown = 0; _accUp = 0; _lockUntil = now + 360;
    }
  };
  window.addEventListener('scroll', () => {
    /* Everything the scroll does happens once per animation frame, not once per
       scroll event - on a 120Hz screen that is the difference between ~120 and
       ~600 style recalcs a second. */
    if (_tick) return; _tick = true;
    requestAnimationFrame(() => {
      const h = qs('#wb-header');
      if (h) {
        const stuck = window.scrollY > 6;
        if (h.classList.contains('is-stuck') !== stuck) h.classList.toggle('is-stuck', stuck);
      }
      _dirHide();
      _tick = false;
    });
  }, { passive: true });
  wireShareSite(document.body);
  subscribeSession(() => renderChrome());
  onCart(() => renderChrome());
  /* delegated so it survives renderChrome re-renders (fresh header node each cart change) */
  document.addEventListener('click', e => { if (e.target.closest('#wb-open-cart')) openCart(); });
  wireCartDrawer();
  wireCartCards();
}

export function openDrawer() {
  const d = qs('#wb-drawer');
  d.innerHTML = drawerHTML();
  d.classList.add('open');
  d.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  const btn = qs('#wb-burger'); if (btn) { btn.setAttribute('aria-expanded', 'true'); btn.classList.add('is-open'); }
}
export function closeDrawer() {
  const d = qs('#wb-drawer');
  if (!d) return;
  d.classList.remove('open');
  d.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  const btn = qs('#wb-burger'); if (btn) { btn.setAttribute('aria-expanded', 'false'); btn.classList.remove('is-open'); }
}

/* offline banner control (used by app.js) */
export function setOfflineBanner(show) {
  const b = qs('#wb-offline-banner');
  if (!b) return;
  b.hidden = !show;
}

/* ==========================================================================
   WearBenin v2 — app bootstrap
   Wires the router, the shell, the API client, session refresh and global
   delegated behaviours (favourite hearts, quick view, share).
   ========================================================================== */

import api, { auth, checkHealth, subscribe as subscribeApi, state as apiState } from './api.js';
import { icon } from './icons.js';
import { esc, money, qs, qsa, timeAgo, imgUrl, normaliseImages } from './util.js';
import { route, setNotFound, start, setTitle, navigate, onRouteChange } from './router.js';
import { renderShell, setMeta, setActivePath, setOfflineBanner } from './shell.js';
import { bootSession, session, toggleFavorite, subscribeSession } from './session.js';
import { toast, toastError, openModal, stars, avatarTag } from './ui.js';
import { shareRow, socialRow, waLink, wireShareDelegation } from './social.js';
import { initTypeahead } from './typeahead.js';

/* ---------- page modules ---------- */
import { renderHome } from './pages/home.js';
import { renderCategory, renderSearch, renderCategories } from './pages/browse.js';
import { renderListing } from './pages/listing.js';
import { renderVendor, renderVendors } from './pages/vendor.js';
import { renderSell } from './pages/sell.js';
import { renderMyAds } from './pages/myads.js';
import { renderSaved, renderSavedSearches } from './pages/saved.js';
import { renderCart } from './pages/cart.js';
import { renderInbox } from './pages/inbox.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderAccount } from './pages/account.js';
import { renderReferral } from './pages/referral.js';
import { renderOnboarding } from './pages/onboarding.js';
import { renderLogin, renderRegister } from './pages/auth.js';
import { renderAdmin } from './pages/admin.js';
import {
  renderAbout, renderHowItWorks, renderSafety, renderHelp, renderContact,
  renderLegal, renderNotFound
} from './pages/static.js';


/* ------------------------------------------------------------------ SEO meta */
const SEO_BASE = 'https://smuglepug.github.io/wearbenin-site/';
const ROUTE_META = {
  '/': "Shop Benin City's fashion at market prices. Ankara, agbada, iro & buba, sneakers and bags from verified vendors across Edo State. Chat on WhatsApp before you pay.",
  '/categories': "Browse every clothing category on WearBenin - ankara, agbada, sneakers, bags and more - with prices from Benin City vendors.",
  '/search': "Search clothes, shoes and accessories for sale in Benin City. Filter by area, price and condition, then chat with the vendor on WhatsApp.",
  '/sell': "Sell your clothes to buyers across Benin City and Edo State. Post photos in minutes, chat on WhatsApp, reach a wider audience on WearBenin.",
  '/vendors': "Meet verified clothing vendors selling across Benin City and Edo State on WearBenin.",
  '/browse': "Browse every clothing category on WearBenin - ankara, agbada, sneakers, bags and more from Benin City vendors.",
  '/post': "Sell your clothes to buyers across Benin City and Edo State. Post photos in minutes, reach a wider audience on WearBenin.",
  '/cart': "Review the items you want to buy on WearBenin and check out with each vendor on WhatsApp."
};
function applyRouteMeta(cur) {
  const path = (cur && cur.path) || '/';
  const desc = ROUTE_META[path] || ROUTE_META['/'];
  let m = document.querySelector('meta[name="description"]');
  if (!m) { m = document.createElement('meta'); m.setAttribute('name', 'description'); document.head.appendChild(m); }
  m.setAttribute('content', desc);
  const ogd = document.querySelector('meta[property="og:description"]');
  if (ogd) ogd.setAttribute('content', desc);
  let c = document.querySelector('link[rel="canonical"]');
  if (!c) { c = document.createElement('link'); c.rel = 'canonical'; document.head.appendChild(c); }
  c.setAttribute('href', SEO_BASE);
}

/* ------------------------------------------------------------------ routes */
function registerRoutes() {
  route('/', renderHome);
  route('/home', renderHome);
  onRouteChange(applyRouteMeta);
  route('/browse', renderCategories); /* alias - old links */
  route('/post', renderSell);          /* alias - old links */
  route('/categories', renderCategories);
  route('/category/:cat', renderCategory);
  route('/search', renderSearch);
  route('/listing/:slug', renderListing);
  route('/l/:slug', renderListing);
  route('/vendors', renderVendors);
  route('/vendor/:slug', renderVendor);
  route('/sell', renderSell);
  route('/onboarding', renderOnboarding);
  route('/start-selling', renderOnboarding);
  route('/my-ads', renderMyAds);
  route('/cart', renderCart);
  route('/saved', renderSaved);
  route('/saved-searches', renderSavedSearches);
  route('/inbox', renderInbox);
  route('/inbox/:id', renderInbox);
  route('/dashboard', renderDashboard);
  route('/account', renderAccount);
  route('/referral', renderReferral);
  route('/refer', renderReferral);
  route('/login', renderLogin);
  route('/register', renderRegister);
  route('/admin', renderAdmin);
  route('/about', renderAbout);
  route('/how-it-works', renderHowItWorks);
  route('/safety', renderSafety);
  route('/help', renderHelp);
  route('/contact', renderContact);
  route('/legal/:file', renderLegal);
  route('/terms', renderLegal);
  setNotFound(renderNotFound);
}

/* ------------------------------------------------------------------ global delegation */
let delegated = false;
function wireGlobal() {
  if (delegated) return;
  delegated = true;

  /* favourite hearts on any card, anywhere */
  document.addEventListener('click', async e => {
    const fav = e.target.closest('[data-fav]');
    if (fav) {
      e.preventDefault();
      e.stopPropagation();
      const id = fav.dataset.fav;
      const now = await toggleFavorite(id, fav.dataset.slug);
      qsa(`[data-fav="${CSS.escape(String(id))}"]`).forEach(b => {
        b.classList.toggle('on', now);
        b.setAttribute('aria-pressed', String(now));
        b.setAttribute('aria-label', now ? 'Remove from saved' : 'Save this listing');
      });
      return;
    }

    /* Quick view on card hover button */
    const quick = e.target.closest('.card-quick');
    if (quick) {
      e.preventDefault();
      const card = quick.closest('.card');
      if (!card) return;
      const link = card.querySelector('.card-media');
      const slug = link ? decodeURIComponent((link.getAttribute('href') || '').replace('#/listing/', '').split('?')[0]) : '';
      if (slug) openQuickView(slug, card.dataset.listing);
    }
  });

  wireShareDelegation(document.body);

  window.addEventListener('unhandledrejection', ev => {
    console.warn('[WearBenin] unhandled rejection', ev.reason);
  });
}

/* ------------------------------------------------------------------ quick view */
async function openQuickView(slug, id) {
  const close = openModal({
    title: 'Quick view',
    size: '760px',
    body: `<div id="wb-qv" style="min-height:260px;display:grid;place-items:center">
      <div class="sk sk-line w80" style="height:20px"></div></div>`,
    footer: `<button class="btn btn-ghost" data-close>Close</button>`
  });
  let l;
  try { l = await api.listing(slug); }
  catch (e) { toastError(e); close(); return; }
  if (!l) { toast('That listing is no longer available.', 'err'); close(); return; }
  window.__wbCurrentListing = l;
  const imgs = normaliseImages(l.images);
  const host = qs('#wb-qv');
  const vendor = l.vendor || {};
  host.innerHTML = `<div style="display:grid;grid-template-columns:minmax(0,240px) minmax(0,1fr);gap:22px">
      <div style="aspect-ratio:4/5;border-radius:14px;overflow:hidden;background:var(--line-2)">
        ${imgs[0] ? `<img src="${esc(imgUrl(imgs[0]))}" alt="${esc(l.title)}" style="width:100%;height:100%;object-fit:cover">` : ''}
      </div>
      <div>
        <div class="card-price" style="font-size:24px">${money(l.price)}${l.negotiable ? '<span class="neg">Negotiable</span>' : ''}</div>
        <h3 style="font-size:17px;margin:10px 0 12px;line-height:1.4">${esc(l.title)}</h3>
        <div class="buy-facts" style="margin:0 0 16px">
          <div class="buy-fact">${icon('pin')} <span>${esc(l.area || '')} · ${esc(timeAgo(l.published_at || l.created_at))}</span></div>
          <div class="buy-fact">${icon('tag')} <span>${esc(l.condition || '')}</span></div>
          <div class="buy-fact">${stars(vendor.rating_avg || l.vendor_rating_avg, vendor.rating_count || l.vendor_rating_count)}</div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <a class="btn btn-wa" href="${esc(waLink(vendor.whatsapp || l.vendor_whatsapp, { ...l, vendor_name: vendor.name }))}" target="_blank" rel="noopener noreferrer">${icon('whatsapp')} WhatsApp</a>
          <a class="btn btn-primary" href="#/listing/${encodeURIComponent(l.slug || l.id)}" data-close>${icon('eye')} Full details</a>
        </div>
      </div>
    </div>
    <div style="margin-top:22px" data-share-url="${esc(location.origin + '/l/' + encodeURIComponent(l.slug || l.id))}"
      data-share-listing="${esc(JSON.stringify({ id: l.id, slug: l.slug, title: l.title, price: l.price, negotiable: l.negotiable, area: l.area, condition: l.condition, vendor_name: vendor.name, images: imgs.slice(0, 1) }))}">
      ${shareRow(l)}
    </div>`;
  const mp = document.querySelector('.modal-panel');
  if (mp && window.matchMedia('(max-width:640px)').matches) {
    host.style.gridTemplateColumns = '1fr';
  }
}

/* ------------------------------------------------------------------ meta cache
   Categories/areas/counts change slowly, so a repeat visit should paint the
   chrome from cache instantly and refresh in the background. ---------------- */
const META_KEY = 'wb:meta:v1';
const META_TTL = 6 * 60 * 60 * 1000;
function readCachedMeta() {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return null;
    const { t, v } = JSON.parse(raw);
    if (!v || Date.now() - t > META_TTL) return null;
    return v;
  } catch { return null; }
}
function writeCachedMeta(v) {
  try { localStorage.setItem(META_KEY, JSON.stringify({ t: Date.now(), v })); } catch { /* quota */ }
}

/* ------------------------------------------------------------------ boot */
async function boot() {
  renderShell();
  registerRoutes();
  wireGlobal();
  initTypeahead();
  animateViews();

  onRouteChange(route => { setActivePath(route.path); });
  subscribeSession(() => { /* header re-rendered by shell */ });
  subscribeApi(s => { setOfflineBanner(s.online === false); });

  /* first paint: shell is up, session and meta load in parallel with the route */
  bootSession().catch(() => {});
  import('./session.js').then(m => m.handleSupabaseSession()).catch(() => {});
  start();

  /* The splash must never wait on the network: clear it on the first real paint
     after the route skeleton is up, with a hard ceiling so a slow route can
     never trap it. */
  const clearSplash = () => {
    const sp = document.getElementById('splash');
    if (sp && !sp.dataset.done) {
      sp.dataset.done = '1';
      requestAnimationFrame(() => sp.classList.add('done'));
      setTimeout(() => { if (sp.parentNode) sp.parentNode.removeChild(sp); }, 600);
    }
  };
  requestAnimationFrame(() => requestAnimationFrame(clearSplash));
  setTimeout(clearSplash, 1200);

  /* Meta (categories/areas/counts): render the cached copy instantly, then
     refresh in the background so a repeat visit paints with no wait at all. */
  const cachedMeta = readCachedMeta();
  if (cachedMeta) { setMeta(cachedMeta); import('./shell.js').then(m => m.renderChrome()); }
  api.meta()
    .then(m => { setMeta(m); writeCachedMeta(m); return import('./shell.js'); })
    .then(m => m.renderChrome())
    .catch(e => console.warn('[WearBenin] meta unavailable', e));
  document.body.dataset.booted = '1';

  /* No /api/health call on boot: the api subscriber already flips the offline
     banner the moment a real request fails, so the extra round trip was pure
     overhead (measured: one of the slowest calls on the home route). */

  const retry = qs('#wb-offline-retry');
  if (retry) retry.addEventListener('click', async () => {
    const h = await checkHealth(true);
    setOfflineBanner(!h);
    if (h) { toast('Reconnected to the WearBenin API.', 'ok'); const meta = await api.meta().catch(() => null); if (meta) { setMeta(meta); (await import('./shell.js')).renderChrome(); } }
    else toast('Still offline — check that the server is running on port 4000.', 'err');
  });
}

/* Re-trigger a light entrance animation on #main whenever a page swaps its content,
   so clicking the menu/drawer, your profile, the cart (and every nav) fades+sinks in
   instead of snapping. Respects prefers-reduced-motion. */
function animateViews() {
  const main = document.getElementById('main');
  if (!main) return;
  const off = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let busy = false;
  const punch = () => {
    if (off || busy) return;
    busy = true;
    main.classList.remove('page-in');
    void main.offsetWidth;
    main.classList.add('page-in');
    setTimeout(() => { busy = false; }, 320);
  };
  if (window.MutationObserver) new MutationObserver(() => punch()).observe(main, { childList: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

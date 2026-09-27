/* ==========================================================================
   WearBenin v2 — shared UI components
   ========================================================================== */

import { icon, BRAND_LABEL } from './icons.js';
import { esc, money, timeAgo, initials, gradFor, imgUrl, normaliseImages, qs, srcsetFor } from './util.js';
import { categoryImage } from './images.js';
import { cartHas } from './cart.js';

/* ---------------- toasts ---------------- */
export function toast(msg, kind = '', opts = {}) {
  const stack = qs('#wb-toasts');
  if (!stack) return;
  const node = document.createElement('div');
  node.className = 'toast ' + kind;
  const ico = kind === 'err' ? 'alert' : kind === 'ok' ? 'checkCircle' : 'info';
  node.innerHTML = `${icon(ico)}<div>${esc(msg)}${opts.href ? ` <a href="${esc(opts.href)}">${esc(opts.hrefText || 'View')}</a>` : ''}</div>`;
  stack.appendChild(node);
  const life = opts.duration || (kind === 'err' ? 6000 : 3600);
  setTimeout(() => { node.classList.add('out'); setTimeout(() => node.remove(), 260); }, life);
}

export function toastError(e) {
  const m = (e && (e.message || e.error?.message)) || 'Something went wrong.';
  toast(m, 'err');
  console.warn('[WearBenin]', e);
}

/* ---------------- image with graceful fallback ---------------- */
export function imgTag(src, alt, className = '', extra = '') {
  const url = imgUrl(src);
  if (!url) return `<div class="img-fallback ${className}">${icon('image')}</div>`;
  const ss = srcsetFor(url);
  const ssAttr = ss ? `srcset="${esc(ss)}" sizes="(max-width:640px) 48vw, 260px"` : "";
  return `<img src="${esc(url)}" ${ssAttr} alt="${esc(alt)}" class="${className}" loading="lazy" decoding="async"
     onerror="this.onerror=null;this.replaceWith(Object.assign(document.createElement('div'),{className:'img-fallback ${esc(className)}',innerHTML:'<svg viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'1.6\\'><rect x=\\'3\\' y=\\'3\\' width=\\'18\\' height=\\'18\\' rx=\\'3\\'/><path d=\\'m21 15-5-5L5 21\\'/></svg>'}))" ${extra}>`;
}

/* ---------------- stars ----------------
   Fractional rendering: a filled row is clipped over an outline row, so a 4.8
   shop shows 4.8 stars instead of rounding up to a perfect five. */
export function stars(rating = 0, count = null, size = '') {
  const r = Math.max(0, Math.min(5, Number(rating) || 0));
  const pct = Math.round((r / 5) * 1000) / 10;
  const row = (n, ico) => Array.from({ length: 5 }, (_, i) => (i < n ? icon(ico, size) : icon('starOutline', size))).join('');
  let out = `<span class="stars" role="img" aria-label="${r.toFixed(1)} out of 5 stars">`
    + `<span class="stars-track">${row(5, 'starOutline')}<span class="stars-fill" style="width:${pct}%">${row(5, 'star')}</span></span>`;
  if (count !== null && count !== undefined) out += `<span class="num">${Number(count)}</span>`;
  return out + '</span>';
}

/**
 * Rating line used on seller cards: stars + numeric average + review count.
 * The API returns ratingAvg/ratingCount (camelCase) on vendors and listings,
 * but older payloads use rating_avg/rating_count — normalise both here.
 */
export function normVendor(v) {
  const x = v || {};
  const avg = x.ratingAvg ?? x.rating_avg ?? (x.reviewSummary && x.reviewSummary.ratingAvg) ?? (x.reviewSummary && x.reviewSummary.avg) ?? 0;
  const count = x.ratingCount ?? x.rating_count ?? (x.reviewSummary && x.reviewSummary.ratingCount) ?? (x.reviewSummary && x.reviewSummary.count) ?? 0;
  const ads = x.listingCount ?? x.listing_count ?? x.listings_count ?? (Array.isArray(x.listings) ? x.listings.length : 0) ?? 0;
  const minutes = x.responseMinutes ?? x.response_minutes ?? null;
  return {
    ...x,
    ratingAvg: Number(avg) || 0,
    ratingCount: Number(count) || 0,
    listingCount: Number(ads) || 0,
    responseMinutes: minutes === null || minutes === undefined ? null : Number(minutes)
  };
}

export function ratingLine(avg, count, opts = {}) {
  const r = Number(avg) || 0;
  const c = Number(count) || 0;
  if (!c && !r) return '<span class="rating-none">No reviews yet</span>';
  return `<span class="rating-line">${stars(r)}<b>${r.toFixed(1)}</b>${
    c ? `<span class="rating-count">(${c.toLocaleString('en-NG')} review${c === 1 ? '' : 's'})</span>` : ''}</span>${
    opts.suffix ? ` ${opts.suffix}` : ''}`;
}

/* ---------------- vendor cover ----------------
   A vendor card must always carry a real photograph. Preference:
     1. the vendor's own cover,
     2. the first photo of one of their live listings (pass the listing pool),
     3. the editorial photo for that listing's category,
     4. the editorial photo for a default category.
   The old fallback was an empty grey panel, and the unstyled map-pin SVG next
   to it rendered at its intrinsic 300×150 and swallowed the card body. */
export function vendorCover(v, pool) {
  const x = v || {};
  if (x.cover) return x.cover;
  const mine = (pool || []).filter(l => l && (
    (l.vendor && (l.vendor.slug === x.slug || Number(l.vendor.id) === Number(x.id))) ||
    Number(l.vendor_id) === Number(x.id)
  ));
  const withImg = mine.find(l => normaliseImages(l.images).length);
  if (withImg) return normaliseImages(withImg.images)[0];
  const withCat = mine.find(l => l.category);
  return (withCat && categoryImage(withCat.category)) || categoryImage('womens-fashion') || '';
}

/* ---------------- avatar ---------------- */
export function initialsAvatar(name, cls = '') {
  return `<span class="avatar ${cls}" style="background:${gradFor(name)};color:#fff">${esc(initials(name))}</span>`;
}

export function avatarTag(url, name, cls = '') {
  const u = imgUrl(url);
  if (!u) return initialsAvatar(name, cls);
  // If the logo URL 404s the browser would paint an empty box — swap in initials.
  const fb = esc(initials(name));
  const bg = gradFor(name);
  return `<img class="avatar ${cls}" src="${esc(u)}" alt="${esc(name)}" loading="lazy"
     onerror="this.onerror=null;this.replaceWith(Object.assign(document.createElement('span'),{className:'avatar ${esc(cls)}',style:'background:${bg};color:#fff',textContent:'${fb}'}))">`;
}

/* ---------------- listing card ----------------
   Badge budget (deliberate): at most TWO overlays on the photo — one left
   ribbon (Sold / Hot / Featured) and one condition pill. "Negotiable" is a
   subtle chip next to the price, not a third image badge. Location and age
   stay as quiet meta text, and the heart is a control, not a badge. */
export function listingCard(l, opts = {}) {
  const imgs = normaliseImages(l.images);
  const img = imgs[0] || l.image || '';
  const isFav = !!l.is_favorite || !!l.fav;
  const sold = String(l.status || '').toLowerCase() === 'sold';
  const href = '#/listing/' + encodeURIComponent(l.slug || l.id);
  const cond = l.condition || l.condition_label;

  const ribbon = sold ? '<span class="pill pill-ink">Sold</span>'
    : l.hot ? '<span class="pill pill-hot">Hot</span>'
      : l.featured ? '<span class="pill pill-brand">Featured</span>'
        : '';

  return `<article class="card" data-listing="${esc(l.id)}">
    <a class="card-media" href="${href}" aria-label="${esc(l.title)}">
      ${imgTag(img, l.title, '')}
      ${ribbon ? `<div class="card-ribbon">${ribbon}</div>` : ''}
      ${cond && !sold ? `<span class="card-cond">${esc(cond)}</span>` : ''}
      ${sold ? '<div class="card-sold">Sold</div>' : ''}
      <span class="card-quick">${icon('eye')} Quick view</span>
      ${l.video ? `<span class="card-video-badge">${icon('camera')} Video</span>` : ''}
    </a>
    <button class="card-fav ${isFav ? 'on' : ''}" data-fav="${esc(l.id)}" data-slug="${esc(l.slug || '')}"
            aria-label="${isFav ? 'Remove from saved' : 'Save this listing'}" aria-pressed="${isFav}">${icon('heart')}</button>
    <button class="card-cart ${cartHas(l.slug || l.id) ? 'on' : ''}" data-cart-add="${esc(l.slug || l.id)}" data-cart-id="${esc(l.id)}" data-price="${esc(l.price)}"
            data-vendor-name="${esc((l.vendor && l.vendor.name) || '')}" data-vendor-slug="${esc((l.vendor && l.vendor.slug) || '')}"
            data-vendor-phone="${esc((l.vendor && (l.vendor.phone || l.vendor.whatsapp)) || '')}"
            aria-label="${cartHas(l.slug || l.id) ? 'In cart' : 'Add to cart'}">${icon('cart')}</button>
    <div class="card-body">
      <div class="card-price">${money(l.price)}${l.negotiable ? '<span class="neg">Negotiable</span>' : ''}</div>
      <a class="card-title clamp-2" href="${href}">${esc(l.title)}</a>
      <div class="card-meta">
        ${icon('pin')}<span>${esc(l.area || l.vendor_area || '—')}</span>
        <span class="dot"></span>
        <span>${esc(timeAgo(l.published_at || l.created_at))}</span>
        ${l.vendor_verified ? `<span class="dot"></span><span class="meta-verified">${icon('verified', 'tick')} Verified</span>` : ''}
      </div>
    </div>
  </article>`;
}

export function listingCardGrid(items, opts = {}) {
  if (!items || !items.length) return '';
  return `<div class="grid-cards">${items.map(l => listingCard(l, opts)).join('')}</div>`;
}

/* ---------------- skeletons ---------------- */
export function skeletonCards(n = 8, cls = 'sk-grid') {
  let out = `<div class="${cls}">`;
  for (let i = 0; i < n; i++) {
    out += `<div class="sk-card"><div class="sk sk-media"></div><div class="sk-body">
      <div class="sk sk-line h20 w40"></div><div class="sk sk-line w95"></div><div class="sk sk-line w60"></div>
      <div class="sk sk-line w40"></div></div></div>`;
  }
  return out + '</div>';
}

export function skeletonRail(n = 4, cls = 'sk-rail') {
  let out = `<div class="${cls}">`;
  for (let i = 0; i < n; i++) {
    out += `<div class="sk-card"><div class="sk sk-media" style="aspect-ratio:4/5"></div><div class="sk-body">
      <div class="sk sk-line h20 w40"></div><div class="sk sk-line w80"></div></div></div>`;
  }
  return out + '</div>';
}

export function skeletonLines(n = 4) {
  return `<div class="stack-16">${Array.from({ length: n }).map(() => '<div class="sk sk-line w95" style="height:16px"></div>').join('')}</div>`;
}

/* ---------------- empty / error states ---------------- */
const ILL = {
  empty: `<svg class="state-ill" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="80" cy="80" r="72" fill="#F0F1F4"/>
    <rect x="44" y="46" width="72" height="80" rx="12" fill="#fff" stroke="#E5E7EB" stroke-width="2"/>
    <rect x="56" y="58" width="48" height="34" rx="7" fill="#FFF4E8"/>
    <path d="M62 84h36M62 94h24" stroke="#E85D04" stroke-width="3.4" stroke-linecap="round"/>
    <circle cx="112" cy="112" r="20" fill="#E85D04"/>
    <path d="M104 112h16M112 104v16" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/>
  </svg>`,
  search: `<svg class="state-ill" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="80" cy="80" r="72" fill="#F0F1F4"/>
    <circle cx="72" cy="72" r="30" fill="#fff" stroke="#6B7280" stroke-width="2.6"/>
    <path d="m95 95 20 20" stroke="#6B7280" stroke-width="4.6" stroke-linecap="round"/>
    <path d="M60 70c3-6 10-9 16-7" stroke="#E85D04" stroke-width="3.4" stroke-linecap="round"/>
  </svg>`,
  error: `<svg class="state-ill" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="80" cy="80" r="72" fill="#FEF2F2"/>
    <path d="M80 40 132 122H28L80 40Z" fill="#fff" stroke="#DC2626" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M80 68v22M80 102h.02" stroke="#DC2626" stroke-width="5" stroke-linecap="round"/>
  </svg>`,
  lock: `<svg class="state-ill" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="80" cy="80" r="72" fill="#FFF4E8"/>
    <rect x="48" y="72" width="64" height="52" rx="12" fill="#fff" stroke="#E85D04" stroke-width="2.6"/>
    <path d="M62 72V60a18 18 0 0 1 36 0v12" stroke="#E85D04" stroke-width="4" stroke-linecap="round"/>
    <circle cx="80" cy="97" r="6" fill="#E85D04"/>
  </svg>`
};

export function emptyState({ title, text, actionHref, actionText, secondaryHref, secondaryText, art = 'empty' }) {
  return `<div class="state-box">
    ${ILL[art] || ILL.empty}
    <h3>${esc(title)}</h3>
    ${text ? `<p>${esc(text)}</p>` : ''}
    ${(actionText || secondaryText) ? `<div class="state-actions">
      ${actionText ? `<a class="btn btn-primary" href="${esc(actionHref || '#/')}">${esc(actionText)}</a>` : ''}
      ${secondaryText ? `<a class="btn btn-ghost" href="${esc(secondaryHref || '#/')}">${esc(secondaryText)}</a>` : ''}
    </div>` : ''}
  </div>`;
}

export function errorState(e, retryId = 'retry') {
  const offline = e && e.code === 'network_error';
  return `<div class="state-box">
    ${ILL.error}
    <h3>${offline ? 'We can&rsquo;t reach the server' : 'Something went wrong'}</h3>
    <p>${esc((e && e.message) || 'An unexpected error occurred.')}</p>
    <div class="state-actions">
      <button class="btn btn-primary" id="${esc(retryId)}">${icon('refresh')} Try again</button>
      <a class="btn btn-ghost" href="#/">Back to home</a>
    </div>
  </div>`;
}

/* ---------------- signed-out wall ----------------
   Every account-gated route renders this instead of returning early: the
   page keeps its URL, explains itself, and offers a way in. (Before this,
   requireAuth() bailed out before #main was touched and the visitor was left
   staring at the boot splash under a new URL.) */
export function authWall({ title, sub, perks, crumbPath = [], next = '' }) {
  const n = next || (location.hash || '').replace(/^#/, '') || '/';
  const q = '?next=' + encodeURIComponent(n);
  const items = perks && perks.length ? perks : [
    ['heart', 'Save favourites', 'Heart any listing and it waits for you here.'],
    ['bookmark', 'Saved searches', 'Store the filters you use most and re-run them in one tap.'],
    ['inbox', 'Inbox', 'Message vendors and keep every reply in one place.'],
    ['tag', 'Post your own ads', 'List what you no longer wear — free while we are in launch.']
  ];
  return `<div class="container">
    ${crumbPath.length ? crumbs(crumbPath) : ''}
    <div class="auth-wall">
      ${ILL.lock}
      <h1>${esc(title)}</h1>
      <p class="auth-wall-sub">${esc(sub)}</p>
      <div class="auth-wall-actions">
        <a class="btn btn-primary btn-lg" href="#/login${esc(q)}">${icon('user')} Sign in</a>
        <a class="btn btn-ghost btn-lg" href="#/register${esc(q)}">Create account</a>
      </div>
      <div class="auth-wall-perks">
        <h2>An account gives you</h2>
        <ul>
          ${items.map(([ico, t, d]) => `<li>${icon(ico)}<div><b>${esc(t)}</b><span>${esc(d)}</span></div></li>`).join('')}
        </ul>
      </div>
      <p class="text-micro text-muted">Free to join. WearBenin never stores card details.</p>
    </div>
  </div>`;
}

/* ---------------- breadcrumbs ---------------- */
export function crumbs(items) {
  return `<nav class="crumbs" aria-label="Breadcrumb">${items.map((it, i) => {
    const last = i === items.length - 1;
    const sep = i ? icon('chevronRight') : '';
    if (last || !it.href) return `${sep}<span class="current">${esc(it.label)}</span>`;
    return `${sep}<a href="${esc(it.href)}">${esc(it.label)}</a>`;
  }).join('')}</nav>`;
}

/* ---------------- section head ---------------- */
export function sectionHead(title, sub, actionText, actionHref) {
  return `<div class="section-head">
    <div><h2>${esc(title)}</h2>${sub ? `<div class="section-sub">${esc(sub)}</div>` : ''}</div>
    ${actionText ? `<a class="link-action section-action" href="${esc(actionHref || '#/')}">${esc(actionText)} ${icon('arrowRight')}</a>` : ''}
  </div>`;
}

/* ---------------- pagination ---------------- */
export function pagination(page, pages, makeHref) {
  page = Number(page) || 1; pages = Number(pages) || 1;
  if (pages <= 1) return '';
  const out = [];
  out.push(`<a class="page-btn" ${page <= 1 ? 'disabled' : ''} href="${esc(page <= 1 ? '#' : makeHref(page - 1))}">${icon('chevronLeft')}</a>`);
  const nums = new Set([1, pages, page, page - 1, page + 1]);
  const sorted = Array.from(nums).filter(n => n >= 1 && n <= pages).sort((a, b) => a - b);
  let prev = 0;
  sorted.forEach(n => {
    if (prev && n - prev > 1) out.push('<span class="page-btn" style="pointer-events:none;border:0">…</span>');
    out.push(`<a class="page-btn ${n === page ? 'active' : ''}" href="${esc(makeHref(n))}">${n}</a>`);
    prev = n;
  });
  out.push(`<a class="page-btn" ${page >= pages ? 'disabled' : ''} href="${esc(page >= pages ? '#' : makeHref(page + 1))}">${icon('chevronRight')}</a>`);
  return `<nav class="pagination" aria-label="Pagination">${out.join('')}</nav>`;
}

/* ---------------- modal ---------------- */
let modalCleanup = null;
export function openModal({ title, body, footer, onMount, size }) {
  const root = qs('#wb-modal');
  root.innerHTML = `<div class="modal-scrim" data-close></div>
    <div class="modal-panel" role="dialog" aria-modal="true" aria-label="${esc(title || 'Dialog')}" ${size ? `style="width:min(94vw,${size})"` : ''}>
      <div class="modal-head"><h3>${esc(title || '')}</h3><button class="icon-btn sm" data-close aria-label="Close">${icon('close')}</button></div>
      <div class="modal-body">${body || ''}</div>
      ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
    </div>`;
  root.classList.add('open');
  root.setAttribute('aria-hidden', 'false');
  const close = () => closeModal();
  root.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', escClose);
  function escClose(e) { if (e.key === 'Escape') close(); }
  modalCleanup = () => {
    root.removeEventListener('click', close);
    document.removeEventListener('keydown', escClose);
  };
  if (onMount) onMount(root, close);
  return close;
}
export function closeModal() {
  const root = qs('#wb-modal');
  if (!root) return;
  root.classList.remove('open');
  root.setAttribute('aria-hidden', 'true');
  setTimeout(() => { root.innerHTML = ''; }, 260);
  if (modalCleanup) { modalCleanup(); modalCleanup = null; }
}

/* ---------------- confirm ---------------- */
export function confirmDialog({ title, text, confirmText = 'Confirm', danger = false, onConfirm }) {
  openModal({
    title,
    body: `<p style="font-size:15px;line-height:1.7;color:var(--ink-2)">${esc(text)}</p>`,
    footer: `<button class="btn btn-ghost" data-close>Cancel</button>
             <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="wb-confirm-ok">${esc(confirmText)}</button>`,
    onMount(root, close) {
      root.querySelector('#wb-confirm-ok').addEventListener('click', async () => {
        const btn = root.querySelector('#wb-confirm-ok');
        btn.classList.add('is-loading');
        try { await onConfirm(); close(); }
        catch (e) { btn.classList.remove('is-loading'); toastError(e); }
      });
    }
  });
}

/* ---------------- bottom sheet (mobile filters) ---------------- */
let sheetCleanup = null;
export function openSheet({ title, body, footer, onMount }) {
  const root = qs('#wb-sheet');
  root.innerHTML = `<div class="sheet-scrim" data-close></div>
    <div class="sheet-panel" role="dialog" aria-modal="true" aria-label="${esc(title || 'Options')}">
      <div class="sheet-grab"></div>
      <div class="sheet-head"><h3>${esc(title || '')}</h3><button class="icon-btn sm" data-close aria-label="Close">${icon('close')}</button></div>
      <div class="sheet-body">${body || ''}</div>
      ${footer ? `<div class="sheet-foot">${footer}</div>` : ''}
    </div>`;
  root.classList.add('open');
  root.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  root.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeSheet(); });
  sheetCleanup = () => { document.body.style.overflow = ''; };
  if (onMount) onMount(root, closeSheet);
  return closeSheet;
}
export function closeSheet() {
  const root = qs('#wb-sheet');
  if (!root) return;
  root.classList.remove('open');
  root.setAttribute('aria-hidden', 'true');
  if (sheetCleanup) { sheetCleanup(); sheetCleanup = null; }
  setTimeout(() => { root.innerHTML = ''; }, 300);
}

/* ---------------- lightbox ---------------- */
export function openLightbox(images, index = 0) {
  const root = qs('#wb-lightbox');
  const imgs = (images || []).map(imgUrl).filter(Boolean);
  if (!imgs.length) return;
  let i = index;
  const render = () => {
    root.innerHTML = `<button class="lightbox-close" aria-label="Close">${icon('close')}</button>
      ${imgs.length > 1 ? `<button class="lightbox-nav prev" aria-label="Previous">${icon('chevronLeft')}</button>
      <button class="lightbox-nav next" aria-label="Next">${icon('chevronRight')}</button>` : ''}
      <img src="${esc(imgs[i])}" alt="">`;
    root.querySelector('.lightbox-close').onclick = closeLightbox;
    const p = root.querySelector('.lightbox-nav.prev'); if (p) p.onclick = () => { i = (i - 1 + imgs.length) % imgs.length; render(); };
    const n = root.querySelector('.lightbox-nav.next'); if (n) n.onclick = () => { i = (i + 1) % imgs.length; render(); };
  };
  render();
  root.classList.add('open');
  root.onclick = e => { if (e.target === root) closeLightbox(); };
  document.addEventListener('keydown', keyNav);
  function keyNav(e) {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight' && imgs.length > 1) { i = (i + 1) % imgs.length; render(); }
    if (e.key === 'ArrowLeft' && imgs.length > 1) { i = (i - 1 + imgs.length) % imgs.length; render(); }
  }
  function closeLightbox() {
    root.classList.remove('open'); root.innerHTML = '';
    document.removeEventListener('keydown', keyNav);
  }
}

/* ---------------- social icon row ---------------- */
export function socialRow(links, opts = {}) {
  const order = ['whatsapp', 'instagram', 'tiktok', 'facebook', 'x'];
  const size = opts.size === 'sm' ? ' sm' : '';
  const dark = opts.onDark ? ' on-dark' : '';
  const out = order.filter(k => {
    const v = links && links[k];
    if (!v) return false;
    if (k === 'whatsapp') return true;
    return typeof v === 'string' && (v.startsWith('http') || v.length > 1);
  }).map(k => {
    let url = links[k];
    if (k === 'whatsapp' && !/^https?:/.test(url)) url = 'https://wa.me/' + String(url).replace(/\D/g, '');
    else if (!/^https?:/.test(url)) {
      const handle = String(url).replace(/^@/, '');
      url = k === 'instagram' ? 'https://instagram.com/' + handle
        : k === 'tiktok' ? 'https://tiktok.com/@' + handle
          : k === 'facebook' ? 'https://facebook.com/' + handle
            : 'https://x.com/' + handle;
    }
    return `<a class="social-btn brand-${k}${size}${dark}" href="${esc(url)}" target="_blank" rel="noopener noreferrer"
      title="${esc(BRAND_LABEL[k])}" aria-label="${esc(BRAND_LABEL[k])}">${icon(k)}</a>`;
  }).join('');
  return `<div class="social-row">${out}</div>`;
}

/* ---------------- reputation badge ---------------- */
export function verifiedBadge(v) {
  return v ? `<span class="pill pill-verified">${icon('verified')} Verified</span>` : '';
}

/* ---------------- loading button helper ---------------- */
export function setBusy(btn, busy, label) {
  if (!btn) return;
  if (busy) { btn.dataset._label = btn.innerHTML; btn.classList.add('is-loading'); btn.disabled = true; if (label) btn.innerHTML = label; }
  else { btn.classList.remove('is-loading'); btn.disabled = false; if (btn.dataset._label) btn.innerHTML = btn.dataset._label; }
}

/* ---------------- form helpers ---------------- */
export function fieldHTML({ id, label, type = 'text', value = '', placeholder = '', required, hint, opts, rows, span2, attrs = '' }) {
  const wrap = span2 ? ' span-2' : '';
  if (type === 'select') {
    return `<div class="field${wrap}">
      <label for="${esc(id)}">${esc(label)}${required ? ' *' : ''}</label>
      <select class="select" id="${esc(id)}" name="${esc(id)}" ${required ? 'required' : ''} ${attrs}>
        ${(opts || []).map(o => `<option value="${esc(o.value)}" ${String(o.value) === String(value) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
      </select>${hint ? `<span class="hint">${esc(hint)}</span>` : ''}
    </div>`;
  }
  if (type === 'textarea') {
    return `<div class="field${wrap}">
      <label for="${esc(id)}">${esc(label)}${required ? ' *' : ''}</label>
      <textarea class="textarea" id="${esc(id)}" name="${esc(id)}" rows="${rows || 6}" placeholder="${esc(placeholder)}" ${required ? 'required' : ''} ${attrs}>${esc(value)}</textarea>
      ${hint ? `<span class="hint">${esc(hint)}</span>` : ''}
    </div>`;
  }
  return `<div class="field${wrap}">
    <label for="${esc(id)}">${esc(label)}${required ? ' *' : ''}</label>
    <input class="input" type="${esc(type)}" id="${esc(id)}" name="${esc(id)}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${required ? 'required' : ''} ${attrs}>
    ${hint ? `<span class="hint">${esc(hint)}</span>` : ''}
  </div>`;
}

export function fieldValue(root, id) {
  const el = root.querySelector('#' + CSS.escape(id));
  if (!el) return '';
  if (el.type === 'checkbox') return el.checked;
  return el.value.trim();
}

/* ---------------- stat card ---------------- */
export function statCard(label, value, delta) {
  return `<div class="stat-card"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div>
    ${delta ? `<div class="delta">${esc(delta)}</div>` : ''}</div>`;
}

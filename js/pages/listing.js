/* ==========================================================================
   WearBenin v2 — Listing detail
   58/42 two-column, sticky buy card, WhatsApp CTA, share row, IG story card
   ========================================================================== */

import api, { normaliseImages } from '../api.js';
import { icon } from '../icons.js';
import { esc, money, qs, qsa, timeAgo, fmtDate, imgUrl, clampText, titleCase } from '../util.js';
import {
  crumbs, listingCard, skeletonCards, stars, ratingLine, avatarTag, normVendor, verifiedBadge,
  openLightbox, openModal, toast, toastError, errorState, setBusy, fieldHTML, fieldValue
} from '../ui.js';
import { galleryImages } from '../images.js';
import { shareRow, waLink, socialRow, wireShareDelegation } from '../social.js';
import { setTitle, navigate } from '../router.js';
import { addToCart, cartHas, removeFromCart, cartQty } from '../cart.js';
import { session, toggleFavorite, isFavorite, requireAuth } from '../session.js';

const REPORT_REASONS = [
  ['counterfeit', 'Counterfeit or fake item'],
  ['prohibited', 'Prohibited item'],
  ['misleading', 'Misleading photos or description'],
  ['wrong_price', 'Wrong or deceptive price'],
  ['fraud', 'Suspected fraud / scam'],
  ['duplicate', 'Duplicate listing'],
  ['contact', 'Listing asks for off-platform payment'],
  ['other', 'Something else']
];

/* Badges are shown ONCE per page — above the price in the buy card.
   (They used to be printed twice: over the gallery photo and again in the
   sticky card, which read as visual noise.) */
function flagPills(l) {
  const out = [];
  if (String(l.status).toLowerCase() === 'sold') out.push('<span class="pill pill-ink">Sold</span>');
  if (l.hot) out.push('<span class="pill pill-hot">Hot</span>');
  if (l.featured) out.push('<span class="pill pill-brand">Featured</span>');
  if (l.negotiable) out.push('<span class="pill pill-green">Negotiable</span>');
  if (l.condition) out.push(`<span class="pill pill-grey">${esc(l.condition)}</span>`);
  return out.join('');
}

/* The API hands sizes/colours back as arrays — join them with a real space
   after the comma instead of letting Array#toString squash them together. */
function listOf(v) {
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  if (v === null || v === undefined || v === '') return [];
  return String(v).split(',').map(s => s.trim()).filter(Boolean);
}

function catLabel(l) {
  const name = l.categoryName || (l.category ? titleCase(l.category) : '');
  const sub = l.subcategoryName || (l.subcategory ? titleCase(l.subcategory) : '');
  return { name: name || '—', sub: sub || '' };
}

export async function renderListing(ctx) {
  const slug = ctx.params.slug;
  const main = qs('#main');
  main.innerHTML = `<div class="container">
    <div class="sk sk-line" style="height:18px;width:280px;margin:18px 0 24px"></div>
    <div class="detail">
      <div><div class="sk" style="aspect-ratio:16/11;border-radius:20px"></div>
        <div class="gallery-thumbs">${Array.from({ length: 4 }).map(() => '<div class="sk" style="aspect-ratio:1;border-radius:14px"></div>').join('')}</div></div>
      <div class="sk" style="height:520px;border-radius:20px"></div>
    </div></div>`;

  let l;
  try { l = await api.listing(slug); }
  catch (e) { main.innerHTML = `<div class="container" style="padding-top:48px">${errorState(e, 'wb-l-retry')}</div>`; qs('#wb-l-retry').onclick = () => renderListing(ctx); return; }

  if (!l) {
    main.innerHTML = `<div class="container"><div class="state-box" style="margin-top:56px">
      <h3>This listing is no longer available</h3>
      <p>It may have been sold or removed by the vendor. Here are other listings you might like.</p>
      <div class="state-actions"><a class="btn btn-primary" href="#/search">Browse listings</a>
      <a class="btn btn-ghost" href="#/">Back to home</a></div></div></div>`;
    setTitle('Listing not found');
    return;
  }

  setTitle(l.title);
  window.__wbCurrentListing = l;

  const vendor = normVendor(l.vendor || {});
  const imgs = galleryImages(l, normaliseImages(l.images));
  const sizes = listOf(l.sizes);
  const colours = listOf(l.colors || l.colours);
  const similar = l.similar || l.similar_items || [];
  const sold = String(l.status).toLowerCase() === 'sold';
  const fav = isFavorite(l.id);
  const wa = waLink(vendor.whatsapp || l.vendor_whatsapp, { ...l, vendor_name: vendor.name || l.vendor_name });

  /* view counter (fire and forget) */
  if (l.id) api.viewListing(l.id);

  const cat = catLabel(l);

  main.innerHTML = `<div class="container">
    ${crumbs([
      { label: 'Home', href: '#/' },
      { label: 'Listings', href: '#/search' },
      { label: cat.name, href: '#/category/' + encodeURIComponent(l.category || '') },
      { label: clampText(l.title, 42) }
    ])}

    <div class="detail">
      <div>
        <div class="detail-gallery">
          <div class="gallery-main" id="wb-gallery-mainwrap">
            ${sold ? '<div class="gallery-sold">Sold</div>' : ''}
            ${imgs.length
              ? `<img id="wb-gallery-main" src="${esc(imgUrl(imgs[0]))}" alt="${esc(l.title)}">
                 <button class="gallery-zoom" type="button" id="wb-gallery-zoom" aria-label="Zoom photo">
                   ${icon('search')} <span>Tap to zoom</span></button>`
              : `<div class="img-fallback" style="height:100%">${icon('image')}</div>`}
          </div>
          ${imgs.length > 1 ? `<div class="gallery-thumbs">
            ${imgs.slice(0, 4).map((src, i) => `<button class="gallery-thumb ${i === 0 ? 'active' : ''}" data-thumb="${i}" aria-label="View photo ${i + 1}">
              <img src="${esc(imgUrl(src))}" alt="" loading="lazy"></button>`).join('')}
          </div>` : ''}
        </div>

        ${l.video ? `<section class="detail-section">
          <h2>Product video</h2>
          <div class="detail-video">
            <video src="${esc(imgUrl(l.video))}" controls playsinline preload="metadata" aria-label="Product video for ${esc(l.title)}"></video>
          </div>
        </section>` : ''}

        <section class="detail-section">
          <h2>Description</h2>
          <div class="detail-desc">${esc(l.description || 'The vendor has not added a description for this item yet. Message them on WhatsApp for measurements, fabric details and delivery.')}</div>
        </section>

        <section class="detail-section">
          <h2>Item details</h2>
          <table class="spec-table">
            <tbody>
              <tr><th>Condition</th><td>${esc(l.condition || '—')}</td></tr>
              <tr><th>Category</th><td><span class="spec-cat">${esc(cat.name)}${cat.sub ? `<span class="spec-sep">›</span>${esc(cat.sub)}` : ''}</span></td></tr>
              <tr><th>Area</th><td>${esc(l.area || '—')}</td></tr>
              ${sizes.length ? `<tr><th>Available sizes</th><td><span class="spec-tags">${sizes.map(s => `<span class="spec-tag">${esc(s)}</span>`).join('')}</span></td></tr>` : ''}
              ${colours.length ? `<tr><th>Colours</th><td><span class="spec-tags">${colours.map(c => `<span class="spec-tag">${esc(c)}</span>`).join('')}</span></td></tr>` : ''}
              ${l.stock !== undefined && l.stock !== null ? `<tr><th>In stock</th><td>${esc(l.stock)}</td></tr>` : ''}
              <tr><th>Delivery</th><td>${l.delivery ? `Delivery available — the vendor arranges it with you${l.delivery_area ? ' across ' + esc(l.delivery_area) : ' across Benin City'}` : 'Pick-up / meet in person (no delivery offered)'}</td></tr>
              <tr><th>Negotiable</th><td>${l.negotiable ? 'Yes — vendors expect reasonable offers' : 'Fixed price'}</td></tr>
              <tr><th>Views</th><td>${Number(l.views || 0).toLocaleString('en-NG')}</td></tr>
              <tr><th>Posted</th><td>${esc(fmtDate(l.published_at || l.created_at))} (${esc(timeAgo(l.published_at || l.created_at))})</td></tr>
              <tr><th>Listing ID</th><td>#${esc(l.id)}</td></tr>
            </tbody>
          </table>
        </section>

        <section class="detail-section">
          <h2>Safety tips</h2>
          <div class="safety-panel">
            <h4>${icon('shield')} Buy safely on WearBenin</h4>
            <ul>
              <li>${icon('check')} Meet in a busy public place — Ogbe Stadium, Ring Road, or inside a bank.</li>
              <li>${icon('check')} Inspect the item in daylight before you hand over any money.</li>
              <li>${icon('check')} Never pay a deposit before seeing the item, and never send airtime or gift cards.</li>
              <li>${icon('check')} Keep the WhatsApp conversation — it is your evidence if you need to report.</li>
              <li>${icon('check')} Read our <a href="#/safety" style="color:inherit;text-decoration:underline">safety centre</a> and <a href="#/legal/community-safety.html" style="color:inherit;text-decoration:underline">community guidelines</a>.</li>
            </ul>
          </div>
        </section>
      </div>

      <aside>
        <div class="buy-card">
          <div class="buy-flagrow">${flagPills(l)}</div>
          <div class="buy-price">${money(l.price)}</div>
          <h1 class="buy-title" style="font-size:22px">${esc(l.title)}</h1>

          <div class="buy-facts">
            <div class="buy-fact">${icon('pin')} <span><b>${esc(l.area || 'Benin City')}</b> · posted ${esc(timeAgo(l.published_at || l.created_at))}</span></div>
            <div class="buy-fact">${icon('tag')} <span>${esc(l.condition || 'Condition on request')}</span></div>
            <div class="buy-fact">${icon('truck')} <span>${l.delivery ? 'Delivery by vendor, arranged in chat' : 'Meet in person · inspect before you pay'}</span></div>
            <div class="buy-fact">${icon('eye')} <span>${Number(l.views || 0).toLocaleString('en-NG')} views</span></div>
          </div>

          ${sold ? `<div class="inline-error" style="background:#F0F1F4;border-color:#E5E7EB;color:#2A2F3A">${icon('info')}
            <span><b>This item has been marked sold.</b> Message the vendor anyway — they often have similar stock.</span></div><div style="height:14px"></div>` : ''}

          <div class="buy-actions">
            <button class="btn btn-dark btn-lg btn-block" id="wb-add-cart" type="button">
              ${icon('bag')} <span id="wb-add-cart-label">${cartHas(l.slug || l.id) ? 'In cart — view' : 'Add to cart'}</span></button>
            <a class="btn btn-wa btn-lg btn-block" href="${esc(wa)}" target="_blank" rel="noopener noreferrer" id="wb-wa-cta">
              ${icon('whatsapp')} Chat on WhatsApp</a>
            <div class="buy-actions-row">
              ${vendor.phone || l.vendor_phone
                ? `<a class="btn btn-ghost" href="tel:${esc(String(vendor.phone || l.vendor_phone).replace(/\s/g, ''))}">${icon('phone')} Call</a>`
                : `<a class="btn btn-ghost" href="#/contact">${icon('phone')} Request call</a>`}
              <button class="btn btn-ghost" id="wb-l-fav" aria-pressed="${fav}">
                ${icon('heart')} <span id="wb-l-fav-label">${fav ? 'Saved' : 'Save'}</span></button>
            </div>
          </div>

          <div class="buy-divider"></div>

          <a class="seller-box" href="#/vendor/${encodeURIComponent(vendor.slug || '')}">
            ${avatarTag(vendor.logo, vendor.name || l.vendor_name || 'Vendor')}
            <div style="min-width:0;flex:1">
              <div class="seller-name">${esc(vendor.name || l.vendor_name || 'WearBenin vendor')}
                ${(vendor.verified || l.vendor_verified) ? `<span class="tick">${icon('verified')}</span>` : ''}</div>
              <div class="seller-meta">
                ${stars(vendor.rating_avg || l.vendor_rating_avg, vendor.rating_count || l.vendor_rating_count)}
                ${vendor.response_minutes ? `<span class="dot"></span><span>Replies in ~${Number(vendor.response_minutes)} min</span>` : ''}
                ${vendor.since ? `<span class="dot"></span><span>Since ${esc(vendor.since)}</span>` : ''}
              </div>
            </div>
            ${icon('chevronRight')}
          </a>

          <div style="margin-top:18px">
            ${socialRow({
              whatsapp: vendor.whatsapp || l.vendor_whatsapp,
              instagram: vendor.instagram, tiktok: vendor.tiktok, facebook: vendor.facebook, x: vendor.x
            }, { size: 'sm' })}
          </div>

          <p class="text-micro text-muted" style="margin-top:14px;line-height:1.6">
            ${esc(vendor.name || 'This vendor')} usually replies within ${Number(vendor.response_minutes || 30)} minutes during market hours. Your message is pre-filled with the item and price.
          </p>

          <div class="buy-divider"></div>

          <div data-share-url="${esc(location.origin + '/l/' + encodeURIComponent(l.slug || l.id))}"
               data-share-title="${esc(l.title)}"
               data-share-text="${esc(l.title + ' — ' + money(l.price) + ' on WearBenin')}"
               data-share-listing="${esc(JSON.stringify({ id: l.id, slug: l.slug, title: l.title, price: l.price, negotiable: l.negotiable, area: l.area, condition: l.condition, vendor_name: vendor.name || l.vendor_name, images: imgs.slice(0, 1) }))}">
            ${shareRow(l)}
          </div>

          <div style="margin-top:22px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <button class="link-action" id="wb-report" style="color:var(--muted)">${icon('flag')} Report this ad</button>
            <a class="link-action" href="#/safety">${icon('shield')} Buyer protection</a>
          </div>
        </div>
      </aside>
    </div>

    ${similar.length ? `<section class="section">
      <div class="section-head"><div><h2>Similar items</h2>
        <div class="section-sub">More from ${esc(l.area || 'Benin City')} and nearby vendors</div></div>
        <a class="link-action section-action" href="#/category/${encodeURIComponent(cat)}">See all ${icon('arrowRight')}</a></div>
      <div class="rail rail-similar">${similar.slice(0, 8).map(s => listingCard(s)).join('')}</div>
    </section>` : ''}
  </div>`;

  /* ---------- gallery ---------- */
  const mainImg = qs('#wb-gallery-main');
  qsa('[data-thumb]').forEach(t => t.addEventListener('click', () => {
    const i = Number(t.dataset.thumb);
    if (mainImg) { mainImg.src = imgUrl(imgs[i]); mainImg.style.opacity = '0'; requestAnimationFrame(() => { mainImg.style.transition = 'opacity .25s'; mainImg.style.opacity = '1'; }); }
    qsa('.gallery-thumb').forEach(x => x.classList.toggle('active', x === t));
  }));
  if (mainImg && imgs.length) mainImg.addEventListener('click', () => openLightbox(imgs, 0));

  /* ---------- cart ---------- */
  const addCart = qs('#wb-add-cart');
  if (addCart) addCart.addEventListener('click', () => {
    const key = l.slug || l.id;
    if (cartHas(key)) {
      removeFromCart(key);
      qs('#wb-add-cart-label').textContent = 'Add to cart';
      toast('Removed from cart.');
    } else {
      addToCart(l, vendor);
      qs('#wb-add-cart-label').textContent = 'In cart — view';
      toast('Added to cart.', 'ok');
    }
  });

  /* ---------- favourite ---------- */
  const favBtn = qs('#wb-l-fav');
  if (favBtn) favBtn.addEventListener('click', async () => {
    const now = await toggleFavorite(l.id, l.slug);
    favBtn.setAttribute('aria-pressed', String(now));
    qs('#wb-l-fav-label').textContent = now ? 'Saved' : 'Save';
    favBtn.style.color = now ? 'var(--brand)' : '';
  });

  /* ---------- report ---------- */
  const rep = qs('#wb-report');
  if (rep) rep.addEventListener('click', () => {
    openModal({
      title: 'Report this listing',
      body: `<p class="text-small text-muted" style="margin-bottom:18px">
          Reports go to the WearBenin trust &amp; safety queue. We review every report and remove listings that break our
          <a href="#/legal/prohibited-items.html" style="color:var(--brand)">prohibited items policy</a>.</p>
        ${fieldHTML({ id: 'rep-reason', label: 'Reason', type: 'select', value: 'counterfeit', required: true, opts: REPORT_REASONS.map(([v, t]) => ({ value: v, label: t })) })}
        <div style="height:16px"></div>
        ${fieldHTML({ id: 'rep-details', label: 'What happened?', type: 'textarea', rows: 4, placeholder: 'Share anything that helps us review quickly (optional)' })}`,
      footer: `<button class="btn btn-ghost" data-close>Cancel</button>
               <button class="btn btn-danger" id="wb-rep-send">${icon('flag')} Submit report</button>`,
      onMount(root, close) {
        root.querySelector('#wb-rep-send').addEventListener('click', async () => {
          const btn = root.querySelector('#wb-rep-send');
          const reason = fieldValue(root, 'rep-reason');
          const details = fieldValue(root, 'rep-details');
          if (!reason) { toast('Choose a reason first.', 'err'); return; }
          setBusy(btn, true);
          try {
            await api.report({ listingId: l.id, reason, details });
            close();
            toast('Thanks — our team will review this listing.', 'ok');
          } catch (e) { setBusy(btn, false); toastError(e); }
        });
      }
    });
  });

  wireShareDelegation(main);
}

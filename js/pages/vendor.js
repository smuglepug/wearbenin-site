/* ==========================================================================
   WearBenin v2 — Vendor shop, vendor index, reviews submission (§3)
   ========================================================================== */

import api from '../api.js';
import { icon } from '../icons.js';
import { esc, qs, qsa, money, timeAgo, fmtDate } from '../util.js';
import {
  crumbs, listingCard, skeletonCards, stars, ratingLine, avatarTag, openModal, toast,
  toastError, setBusy, fieldHTML, fieldValue, emptyState, errorState, imgTag, vendorCover, normVendor
} from '../ui.js';
import { socialRow, waLink } from '../social.js';
import { setTitle } from '../router.js';
import { session, requireAuth, refreshUser } from '../session.js';

/* ------------------------------------------------------------------ shop */
export async function renderVendor(ctx) {
  const slug = ctx.params.slug;
  const main = qs('#main');
  main.innerHTML = `<div class="container">
    <div class="sk" style="height:290px;border-radius:20px;margin-top:16px"></div>
    <div style="height:32px"></div>${skeletonCards(8)}</div>`;

  let v;
  try { v = await api.vendor(slug); }
  catch (e) { main.innerHTML = `<div class="container" style="padding-top:48px">${errorState(e, 'wb-v-retry')}</div>`; qs('#wb-v-retry').onclick = () => renderVendor(ctx); return; }

  if (!v) {
    main.innerHTML = `<div class="container" style="padding-top:40px">
      ${crumbs([{ label: 'Home', href: '#/' }, { label: 'Vendors', href: '#/vendors' }, { label: 'Not found' }])}
      ${emptyState({ title: 'This shop is not available', text: 'The vendor may have closed their shop or changed their link.', actionText: 'Browse all vendors', actionHref: '#/vendors', secondaryText: 'Go home', secondaryHref: '#/' })}</div>`;
    setTitle('Vendor not found');
    return;
  }

  setTitle(v.name);
  const listings = v.listings || [];
  const reviews = v.reviews || [];
  const rating = v.rating_avg ?? (v.reviewSummary && v.reviewSummary.avg) ?? 0;
  const ratingCount = v.rating_count ?? (v.reviewSummary && v.reviewSummary.count) ?? reviews.length;
  const wa = waLink(v.whatsapp, null);

  main.innerHTML = `<div class="container">
    ${crumbs([{ label: 'Home', href: '#/' }, { label: 'Vendors', href: '#/vendors' }, { label: v.name }])}

    <div class="shop-hero">
      ${v.cover ? `<img src="${esc(v.cover)}" alt="${esc(v.name)} cover photo">` : ''}
      <div class="shop-hero-text">
        <div style="display:flex;gap:18px;align-items:center;min-width:0;flex:1">
          ${avatarTag(v.logo, v.name, 'lg ring')}
          <div style="min-width:0">
            <h1>${esc(v.name)} ${v.verified ? `<span class="tick">${icon('verified')}</span>` : ''}</h1>
            <div class="shop-meta">
              <span>${stars(rating, ratingCount)}</span>
              <span>${icon('pin')} ${esc(v.area || 'Benin City')}</span>
              ${v.since ? `<span>${icon('calendar')} Trading since ${esc(v.since)}</span>` : ''}
              ${v.response_minutes ? `<span>${icon('clock')} Replies in ~${Number(v.response_minutes)} min</span>` : ''}
            </div>
          </div>
        </div>
        <div class="shop-hero-actions">
          ${socialRow({ whatsapp: v.whatsapp, instagram: v.instagram, tiktok: v.tiktok, facebook: v.facebook, x: v.x }, { size: 'sm' })}
          <a class="btn btn-wa" href="${esc(wa)}" target="_blank" rel="noopener noreferrer">${icon('whatsapp')} Chat with ${esc(String(v.name).split(' ')[0])}</a>
        </div>
      </div>
    </div>

    <div class="shop-stats">
      <div class="shop-stat"><div class="k">Listings</div><div class="v">${Number(v.listing_count || listings.length)}</div></div>
      <div class="shop-stat"><div class="k">Rating</div><div class="v">${rating ? Number(rating).toFixed(1) + ' / 5' : 'New'}</div></div>
      <div class="shop-stat"><div class="k">Reviews</div><div class="v">${Number(ratingCount || 0)}</div></div>
      <div class="shop-stat"><div class="k">Seller type</div><div class="v">${v.verified ? 'Verified' : 'Standard'}</div></div>
    </div>

    <section class="section">
      <div class="section-head">
        <div><h2>About ${esc(v.name)}</h2>
          <div class="section-sub">${esc(v.area ? 'Based in ' + v.area + ', Benin City' : 'Benin City vendor')}</div></div>
        <a class="btn btn-ghost btn-sm" href="${esc(wa)}" target="_blank" rel="noopener noreferrer">${icon('whatsapp')} Message vendor</a>
      </div>
      <div class="info-card" style="font-size:15.5px;line-height:1.85;color:var(--ink-2)">
        ${esc(v.bio || 'This vendor has not written a shop description yet. Message them on WhatsApp for their full stock list, prices and delivery options.')}
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div><h2>Listings from this shop</h2><div class="section-sub">${listings.length} item${listings.length === 1 ? '' : 's'} available now</div></div>
      </div>
      ${listings.length ? `<div class="grid-cards">${listings.map(l => listingCard(l)).join('')}</div>`
        : emptyState({ title: 'No live listings', text: 'This vendor has no active ads right now. Message them on WhatsApp to ask what is in stock.', actionText: 'Message on WhatsApp', actionHref: wa, secondaryText: 'Browse other vendors', secondaryHref: '#/vendors' })}
    </section>

    <section class="section">
      <div class="section-head">
        <div><h2>Reviews</h2><div class="section-sub">${ratingCount ? `${ratingCount} review${ratingCount === 1 ? '' : 's'} · average ${Number(rating).toFixed(1)}/5` : 'Be the first to review this vendor'}</div></div>
        <button class="btn btn-primary btn-sm" id="wb-write-review">${icon('starOutline')} Write a review</button>
      </div>
      ${reviews.length ? `<div class="review-list">${reviews.map(r => `
        <div class="review-row">
          <div class="rr-head">
            ${avatarTag(r.user_avatar, r.user_name || 'Buyer', 'sm')}
            <div><b>${esc(r.user_name || 'WearBenin buyer')}</b>
              <span>${esc(fmtDate(r.created_at))}${r.verified_purchase ? ' · verified purchase' : ''}</span></div>
            <span style="margin-left:auto">${stars(r.rating)}</span>
          </div>
          <p>${esc(r.body || '')}</p>
        </div>`).join('')}</div>`
        : `<div class="state-box" style="padding:48px 24px"><h3>No reviews yet</h3>
           <p>Bought from ${esc(v.name)}? A short, honest review helps every buyer in Benin City.</p></div>`}
    </section>
  </div>`;

  /* write review */
  const wr = qs('#wb-write-review');
  if (wr) wr.addEventListener('click', () => {
    if (!requireAuth('Sign in to leave a review.')) return;
    let rating = 5;
    openModal({
      title: `Review ${v.name}`,
      body: `
        <p class="text-small text-muted" style="margin-bottom:16px">One review per buyer, per vendor. Reviews cannot be edited after they are submitted.</p>
        <div class="field"><span class="field-label">Your rating</span>
          <div class="chip-row" id="wb-rating-row">
            ${[1, 2, 3, 4, 5].map(n => `<button class="chip ${n <= 5 ? 'active' : ''}" data-rate="${n}">${icon('star')} ${n}</button>`).join('')}
          </div>
        </div>
        <div style="height:18px"></div>
        ${fieldHTML({ id: 'rev-body', label: 'Your review', type: 'textarea', rows: 5, required: true, placeholder: 'Was the item as described? How fast did they reply? Would you buy again?' })}`,
      footer: `<button class="btn btn-ghost" data-close>Cancel</button>
               <button class="btn btn-primary" id="wb-rev-submit">Publish review</button>`,
      onMount(root, close) {
        root.querySelectorAll('[data-rate]').forEach(b => b.addEventListener('click', () => {
          rating = Number(b.dataset.rate);
          root.querySelectorAll('[data-rate]').forEach(x => x.classList.toggle('active', Number(x.dataset.rate) <= rating));
        }));
        root.querySelector('#wb-rev-submit').addEventListener('click', async () => {
          const btn = root.querySelector('#wb-rev-submit');
          const body = fieldValue(root, 'rev-body');
          if (!body || body.length < 10) { toast('Please write at least a sentence about your experience.', 'err'); return; }
          setBusy(btn, true);
          try {
            await api.addReview(v.slug, { rating, body });
            close();
            toast('Review published — thank you.', 'ok');
            renderVendor(ctx);
          } catch (e) { setBusy(btn, false); toastError(e); }
        });
      }
    });
  });
}

/* ------------------------------------------------------------------ index */
export async function renderVendors(ctx) {
  const q = ctx.query.q || '';
  const area = ctx.query.area || '';
  const sort = ctx.query.sort || 'rating';
  setTitle('Vendors in Benin City');
  const main = qs('#main');
  main.innerHTML = `<div class="container">${crumbs([{ label: 'Home', href: '#/' }, { label: 'Vendors' }])}
    <div class="page-head"><div><h1>Vendors in Benin City</h1>
      <div class="page-sub">Real shops, verified sellers and WhatsApp response times</div></div></div>
    ${skeletonCards(6)}</div>`;

  let data, pool = [];
  try {
    const [vd, ls] = await Promise.all([
      api.vendors({ q, area, sort, limit: 40 }),
      api.listings({ sort: 'popular', limit: 60 }).catch(() => ({ items: [] }))
    ]);
    data = vd;
    pool = (ls && ls.items) || [];
  } catch (e) { main.innerHTML = `<div class="container" style="padding-top:40px">${errorState(e, 'wb-vs-retry')}</div>`; qs('#wb-vs-retry').onclick = () => renderVendors(ctx); return; }

  const items = (data && (data.items || data)) || [];
  main.innerHTML = `<div class="container">
    ${crumbs([{ label: 'Home', href: '#/' }, { label: 'Vendors' }])}
    <div class="page-head">
      <div><h1>Vendors in Benin City</h1>
        <div class="page-sub">${items.length} shop${items.length === 1 ? '' : 's'} · message any of them on WhatsApp</div></div>
      <form class="row" id="wb-vsearch" style="display:flex;gap:10px;flex-wrap:wrap">
        <input class="input" name="q" value="${esc(q)}" placeholder="Search shops…" style="min-width:220px">
        <select class="select" name="sort" style="min-width:170px">
          <option value="rating" ${sort === 'rating' ? 'selected' : ''}>Top rated</option>
          <option value="newest" ${sort === 'newest' ? 'selected' : ''}>Newest shops</option>
          <option value="listings" ${sort === 'listings' ? 'selected' : ''}>Most listings</option>
        </select>
        <button class="btn btn-dark" type="submit">${icon('search')} Search</button>
      </form>
    </div>
    ${items.length ? `<div class="grid-cards" style="gap:24px">
      ${items.map(v => {
        const nv = normVendor(v);
        return `<article class="vendor-card">
        <a href="#/vendor/${esc(v.slug)}">${imgTag(vendorCover(v, pool), v.name + ' shop', 'vendor-cover')}</a>
        <div class="vendor-card-body">
          <a class="vendor-logo-link" href="#/vendor/${esc(v.slug)}">${avatarTag(v.logo, v.name, 'vendor-logo')}</a>
          <div class="vendor-name"><a href="#/vendor/${esc(v.slug)}">${esc(v.name)}</a>${v.verified ? `<span class="tick">${icon('verified')}</span>` : ''}</div>
          <a class="vendor-rating" href="#/vendor/${esc(v.slug)}?reviews=1">${ratingLine(nv.ratingAvg, nv.ratingCount)}</a>
          <div class="vendor-sub">${icon('pin')}<span>${esc(v.area || 'Benin City')}</span>${nv.responseMinutes ? `<span class="dot"></span><span>Replies in ~${nv.responseMinutes} min</span>` : ''}</div>
          <div class="vendor-card-foot">
            <span class="pill pill-grey">${nv.listingCount} live ${nv.listingCount === 1 ? 'ad' : 'ads'}</span>
            <a class="btn btn-ghost btn-sm" href="#/vendor/${esc(v.slug)}">Visit shop ${icon('arrowRight')}</a>
          </div>
        </div>
      </article>`;
      }).join('')}</div>`
      : emptyState({ title: 'No vendors match that search', text: 'Try a different name or clear the search to see every shop on WearBenin.', actionText: 'Clear search', actionHref: '#/vendors' })}
  </div>`;

  const f = qs('#wb-vsearch');
  if (f) f.addEventListener('submit', e => {
    e.preventDefault();
    const p = new URLSearchParams();
    const qq = f.querySelector('[name=q]').value.trim();
    const ss = f.querySelector('[name=sort]').value;
    if (qq) p.set('q', qq);
    if (ss && ss !== 'rating') p.set('sort', ss);
    location.hash = '#/vendors' + (p.toString() ? '?' + p.toString() : '');
  });
}

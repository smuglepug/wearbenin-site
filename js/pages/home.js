/* ==========================================================================
   WearBenin v2 — HOME  (all 15 sections, spec §2)
   ========================================================================== */

import api, { normaliseImages } from '../api.js';
import { icon } from '../icons.js';
import { esc, money, qs, qsa, timeAgo } from '../util.js';
import {
  listingCard, skeletonCards, skeletonRail, sectionHead, stars, ratingLine, avatarTag, normVendor,
  errorState, toast, toastError, emptyState, imgTag, vendorCover
} from '../ui.js';
import { heroImage, categoryImage } from '../images.js';
import { shareMarketplaceButton } from '../social.js';
import { setTitle, navigate } from '../router.js';
import { getMeta, searchShell } from '../shell.js';

const CFG = () => window.WB_CONFIG || {};
const BRAND = () => CFG().brand || {};

/* Editorial hero copy (site content, not listing data) keyed by category id. */
const HERO_COPY = {
  'womens-fashion': { kicker: 'Ankara · Aso-Ebi · Gowns', title: 'Own the room in fresh Aso-Ebi', sub: "Dresses, gele and complete traditional sets from Oba Market's best vendors — settled in Naira, delivered across Benin City." },
  'mens-fashion': { kicker: 'Shirts · Senator · Native', title: 'Sharp menswear, market prices', sub: 'Senator wear, native shirts and tailored trousers from vendors who answer fast and deliver.' },
  traditional: { kicker: 'Agbada · Iro & Buba · Lace', title: 'Agbada season is here', sub: 'Premium 3-piece agbada, george and lace sets, ready for your next owambe in Edo State.' },
  footwear: { kicker: 'Sneakers · Heels · Sandals', title: 'Step fresh, pay market price', sub: 'Sneakers, block heels and slippers from Aduwawa to Ring Road — bargaining always welcome.' },
  'bags-accessories': { kicker: 'Bags · Watches · Jewellery', title: 'Finish the look', sub: 'Handbags, wristwatches and jewellery that make an outfit land the way you meant it to.' },
  'kids-baby': { kicker: 'Kids · Baby · School', title: 'Little fits, big style', sub: "Ankara sets, school shoes and baby dresses from vendors parents in Benin City already trust." }
};

const PROMOS = [
  { cls: 'promo-1', href: '#/sell', title: 'Sell your wardrobe in 3 minutes', text: 'Snap, price, publish. Free listings at launch — buyers message you straight on WhatsApp.', cta: 'Post a free ad' },
  { cls: 'promo-2', href: '#/safety', title: 'Buy safely, every time', text: 'Meet in public, inspect before you pay, and never send money to an unverified vendor.', cta: 'Read the safety centre' }
];

function hero(categories, listingPool) {
  const picks = categories.filter(c => c && (c.count || 0) > 0).slice(0, 3);
  if (!picks.length) return '';
  const slides = picks.map((c, i) => {
    const copy = HERO_COPY[c.id] || {
      kicker: c.name,
      title: `Shop ${c.name} in Benin City`,
      sub: 'Verified vendors, real prices in Naira, and WhatsApp chat before you pay.'
    };
    // Editorial photo first (curated + visually verified to match the copy),
    // then the newest real listing photo as a fallback.
    const l = listingPool.find(x => x.category === c.id && normaliseImages(x.images).length);
    const img = heroImage(c.id) || (l ? normaliseImages(l.images)[0] : '');
    return { ...copy, img, href: '#/category/' + c.id, active: i === 0, name: c.name };
  });

  return `<section class="hero" id="wb-hero" aria-label="Featured">
    ${slides.map((s, i) => `<div class="hero-slide ${s.active ? 'active' : ''}" data-hero-slide="${i}">
      ${s.img ? `<img src="${esc(s.img)}" alt="${esc(s.name)}" ${i === 0 ? '' : 'loading="lazy"'}>` : ''}
      <div class="hero-inner">
        <span class="hero-kicker">${icon('sparkle')} ${esc(s.kicker)}</span>
        <h2 class="hero-slide-title">${esc(s.title)}</h2>
        <p>${esc(s.sub)}</p>
        <div class="hero-ctas">
          <a class="btn btn-primary btn-lg" href="${esc(s.href)}">${esc('Shop ' + s.name)}</a>
          <a class="btn btn-light btn-lg" href="#/how-it-works">${icon('shield')} How it works</a>
        </div>
      </div>
    </div>`).join('')}
    <button class="hero-arrow prev" data-hero-prev aria-label="Previous slide">${icon('chevronLeft')}</button>
    <button class="hero-arrow next" data-hero-next aria-label="Next slide">${icon('chevronRight')}</button>
    <div class="hero-dots">${slides.map((s, i) => `<button class="hero-dot ${s.active ? 'active' : ''}" data-hero-dot="${i}" aria-label="Slide ${i + 1}"></button>`).join('')}</div>
  </section>`;
}


/* Above-the-fold statement: what WearBenin is and who it serves, in one screen.
   This is the page's single <h1> (products still lead directly beneath it). */
function heroStatement() {
  return `<section class="hero-statement" aria-labelledby="wb-home-h1">
    <h1 id="wb-home-h1">Buy and sell clothes in Benin City</h1>
    <p>Ankara, agbada, sneakers, bags and more from verified vendors across Edo State.
       Chat on WhatsApp before you pay &mdash; no middleman holds your money.</p>
    <div class="hero-statement-ctas">
      <a class="btn btn-primary" href="#/categories">Browse clothes</a>
      <a class="btn" href="#/sell">Sell an item</a>
    </div>
  </section>`;
}

/* Jiji-style hero band: flat brand slab with the primary search *inside* it.
   The editorial photo carousel below is kept intact as the featured-ads section. */
function heroBand() {
  return `<section class="hero-band" aria-label="Search WearBenin">
    <div class="container hero-band-inner">
      <h2 class="hero-band-title">What are you looking for?</h2>
      <p class="hero-band-sub">Clothing, shoes and accessories from verified vendors in Benin City.</p>
      <div class="hero-band-search" id="wb-band-search">${searchShell('', '', 'hb-')}</div>
      <div class="hero-band-links">
        <a href="#/sell">${icon('plus')} How to sell</a>
        <a href="#/how-it-works">${icon('shield')} How to buy safely</a>
        <a href="#/legal/safety-centre">${icon('check')} Safety tips</a>
      </div>
    </div>
  </section>`;
}

function wireHeroBand() {
  const form = document.querySelector('#wb-band-search [data-search-form]');
  if (!form || form.dataset.wired) return;
  form.dataset.wired = '1';
  form.addEventListener('submit', e => {
    e.preventDefault();
    const q = (form.querySelector('input[name=q]')?.value || '').trim();
    const area = form.querySelector('select[name=area]')?.value || '';
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (area) p.set('area', area);
    const qs = p.toString();
    location.hash = '#/search' + (qs ? '?' + qs : '');
  });
}

function categoryTiles(categories, listingPool) {
  const tiles = categories.slice(0, 6).map(c => {
    const l = listingPool.find(x => x.category === c.id && normaliseImages(x.images).length);
    const img = categoryImage(c.id) || (l ? normaliseImages(l.images)[0] : '');
    return `<a class="cat-tile" href="#/category/${esc(c.id)}">
      ${img ? `<img src="${esc(img)}" alt="${esc(c.name)}" loading="lazy">` : '<div style="width:100%;height:100%;background:linear-gradient(135deg,#2A2F3A,#111318)"></div>'}
      <span class="cat-tile-grad"></span>
      <span class="cat-tile-text">
        <b>${esc(c.name)}</b>
        <span>${Number(c.count || 0)} live ${Number(c.count || 0) === 1 ? 'ad' : 'ads'}</span>
      </span>
    </a>`;
  }).join('');
  if (!tiles) return '';
  return `<section class="section cv-auto" aria-labelledby="sec-cats">
    <div class="section-head" id="sec-cats">
      <div><h2>Shop by category</h2><div class="section-sub">Six ways to find what you came for</div></div>
      <a class="link-action section-action" href="#/categories">All categories ${icon('arrowRight')}</a>
    </div>
    <div class="cat-tile-row">${tiles}</div>
  </section>`;
}

function trustStrip() {
  const items = [
    ['verified', 'Verified vendors', 'ID-checked sellers with a real trading history'],
    ['chat', 'Chat before you pay', 'Message on WhatsApp and agree the price first'],
    ['pin', 'Meet in public', 'Ogbe Stadium, Ring Road, or any busy bank'],
    ['shield', 'NDPA-compliant', 'Your data handled under the Nigeria Data Protection Act 2023']
  ];
  return `<section class="section cv-auto" aria-label="Why buy on WearBenin">
    <div class="trust-strip">
      ${items.map(([ico, t, s]) => `<div class="trust-item">
        <span class="trust-ico">${icon(ico)}</span>
        <div><b>${esc(t)}</b><span>${esc(s)}</span></div></div>`).join('')}
    </div>
  </section>`;
}

function hotRail(items) {
  if (!items.length) return '';
  const week = items.slice(0, 3).map(l => `${l.views || 0}`).reduce((a, b) => a + Number(b), 0);
  return `<section class="section" aria-labelledby="sec-hot">
    <div class="section-head" id="sec-hot">
      <div><h2>${icon('fire')} Hot deals this week</h2>
        <div class="section-sub">${week ? `Over ${week} views on these listings in the last 7 days` : 'The listings buyers keep opening'}</div></div>
      <a class="link-action section-action" href="#/search?hot=1">See all hot deals ${icon('arrowRight')}</a>
    </div>
    <div class="rail rail-hot">
      ${items.slice(0, 10).map(l => `<div style="position:relative">
        ${listingCard(l)}
      </div>`).join('')}
    </div>
  </section>`;
}

function promos() {
  return `<section class="section cv-auto" aria-label="Promotions">
    <div class="promo-grid">
      ${PROMOS.map(p => `<div class="promo ${p.cls}">
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.text)}</p>
        <a class="btn btn-primary promo-cta" href="${esc(p.href)}">${esc(p.cta)} ${icon('arrowRight')}</a>
      </div>`).join('')}
    </div>
  </section>`;
}

function newGrid(items) {
  return `<section class="section" aria-labelledby="sec-new">
    <div class="section-head" id="sec-new">
      <div><h2>New in Benin City</h2><div class="section-sub">Just listed by vendors across Edo State</div></div>
      <a class="link-action section-action" href="#/search?sort=newest">See all ${icon('arrowRight')}</a>
    </div>
    ${items.length ? `<div class="grid-cards">${items.slice(0, 12).map(l => listingCard(l)).join('')}</div>`
      : emptyState({ title: 'No listings yet', text: 'Vendors have not published anything here yet. Check back shortly.', actionText: 'Post the first ad', actionHref: '#/sell' })}
  </section>`;
}

/* Cover photo for a spotlight card comes from the shared vendorCover() helper
   (vendor cover → their first listing photo → editorial category photo), so a
   card can never fall back to an empty grey panel. */
function vendorRail(vendors, pool) {
  // Only real, trading shops: live rating data and at least one active ad.
  const live = (vendors || []).map(normVendor).filter(v => v.listingCount > 0);
  if (!live.length) return '';
  return `<section class="section cv-auto" aria-labelledby="sec-vend">
    <div class="section-head" id="sec-vend">
      <div><h2>Vendor spotlight</h2><div class="section-sub">Real shops in Benin City you can message today</div></div>
      <a class="link-action section-action" href="#/vendors">All vendors ${icon('arrowRight')}</a>
    </div>
    <div class="rail rail-vendor">
      ${live.slice(0, 8).map(v => `<article class="vendor-card">
        <a href="#/vendor/${esc(v.slug)}">${imgTag(vendorCover(v, pool), v.name + ' shop', 'vendor-cover')}</a>
        <div class="vendor-card-body">
          <a class="vendor-logo-link" href="#/vendor/${esc(v.slug)}">${avatarTag(v.logo, v.name, 'vendor-logo')}</a>
          <div class="vendor-name"><a href="#/vendor/${esc(v.slug)}">${esc(v.name)}</a>
            ${v.verified ? `<span class="tick">${icon('verified')}</span>` : ''}</div>
          <a class="vendor-rating" href="#/vendor/${esc(v.slug)}?reviews=1" title="Read reviews of ${esc(v.name)}">
            ${ratingLine(v.ratingAvg, v.ratingCount)}
          </a>
          <div class="vendor-sub">
            ${icon('pin')}<span>${esc(v.area || 'Benin City')}</span>
            ${v.responseMinutes ? `<span class="dot"></span><span>Replies in ~${Number(v.responseMinutes)} min</span>` : ''}
          </div>
          <div class="vendor-card-foot">
            <span class="pill pill-grey">${Number(v.listingCount)} live ${Number(v.listingCount) === 1 ? 'ad' : 'ads'}</span>
            <a class="btn btn-ghost btn-sm" href="#/vendor/${esc(v.slug)}">Visit shop ${icon('arrowRight')}</a>
          </div>
        </div>
      </article>`).join('')}
    </div>
  </section>`;
}

/* Discovery: two deliberately different treatments so the page stops reading
   like one long SEO link farm.
     1. "Shop by area"  — a real directory panel: white surface, market rows
        with counts and an affordance arrow.
     2. "Trending"      — a quiet, borderless numbered list of search terms
        on its own band, no pill chrome. */
function discoveryBand(areas, searches) {
  /* Dead neighbourhoods must not be advertised: an area with zero live ads is
     a link to an empty search page, so it is filtered out here. */
  const liveAreas = (areas || []).filter(a => Number(a.count || 0) > 0);
  const areaPanel = liveAreas.length ? `<section class="section cv-auto" aria-labelledby="sec-area">
    <div class="section-head" id="sec-area">
      <div><h2>Shop by area</h2><div class="section-sub">Markets and neighbourhoods across Benin City with ads live today</div></div>
      <a class="link-action section-action" href="#/search">Browse everything ${icon('arrowRight')}</a>
    </div>
    <div class="area-panel">
      ${liveAreas.slice(0, 12).map(a => `<a class="area-row" href="#/search?area=${encodeURIComponent(a.name)}">
        <span class="area-ico">${icon('pin')}</span>
        <span class="area-name">${esc(a.name)}</span>
        <span class="area-count">${Number(a.count || 0)} ${Number(a.count || 0) === 1 ? 'ad' : 'ads'}</span>
        <span class="area-go">${icon('arrowRight')}</span>
      </a>`).join('')}
    </div>
  </section>` : '';

  const trendBand = (searches && searches.length) ? `<section class="section trend-section cv-auto" aria-labelledby="sec-pop">
    <div class="trend-band">
      <div class="trend-head">
        <span class="trend-eyebrow">${icon('fire')} Trending in Benin City</span>
        <h2 id="sec-pop">Popular searches this week</h2>
      </div>
      <ol class="trend-list">
        ${searches.slice(0, 8).map((s, i) => `<li>
          <a href="#/search?q=${encodeURIComponent(s)}"><span class="trend-rank">${String(i + 1).padStart(2, '0')}</span>
          <span class="trend-term">${esc(s)}</span></a></li>`).join('')}
      </ol>
    </div>
  </section>` : '';

  return areaPanel + trendBand;
}

function howItWorks() {
  const steps = [
    ['Search or browse', 'Filter by category, area, condition and price. Every listing shows the vendor, the area and how fast they reply.'],
    ['Chat on WhatsApp', 'Tap “Chat on WhatsApp” and the message is pre-filled with the item and its price. Agree the deal in chat.'],
    ['Meet and pay', 'Meet in a public place, inspect the item, then pay on handover. WearBenin never takes your card details.']
  ];
  return `<section class="section cv-auto" aria-labelledby="sec-how">
    <div class="section-head" id="sec-how">
      <div><h2>How WearBenin works</h2><div class="section-sub">Three steps, no middleman holding your money</div></div>
      <a class="link-action section-action" href="#/how-it-works">Read the full guide ${icon('arrowRight')}</a>
    </div>
    <div class="steps">
      ${steps.map(([t, d], i) => `<div class="step">
        <div class="step-num">${i + 1}</div><h3>${esc(t)}</h3><p>${esc(d)}</p></div>`).join('')}
    </div>
  </section>`;
}

function testimonials(reviews) {
  if (!reviews.length) return '';
  return `<section class="section cv-auto" aria-labelledby="sec-rev">
    <div class="section-head" id="sec-rev">
      <div><h2>What buyers and vendors say</h2><div class="section-sub">Reviews left on WearBenin vendor shops</div></div>
    </div>
    <div class="review-grid">
      ${reviews.slice(0, 3).map(r => `<div class="review-card">
        <span style="color:var(--star);display:inline-flex">${stars(r.rating)}</span>
        <blockquote>“${esc(r.body || '')}”</blockquote>
        <div class="who">
          ${avatarTag(r.user_avatar, r.user_name || 'WearBenin user', 'sm')}
          <div><b>${esc(r.user_name || 'WearBenin buyer')}</b>
            <span>on ${esc(r.vendor_name || 'a WearBenin shop')}</span></div>
        </div>
      </div>`).join('')}
    </div>
  </section>`;
}

function communityStrip() {
  return `<section class="section cv-auto" aria-label="Community">
    <div class="community-strip">
      <div class="community-copy">
        <span class="community-eyebrow">${icon('chat')} Community</span>
        <h2>Join 4,000+ shoppers in our WhatsApp community</h2>
        <p>New drops from Oba Market, Ekiosa and Ring Road vendors land there first — plus our weekly price guide.</p>
        <div class="community-ctas">
          <a class="btn btn-wa btn-lg" href="${esc(BRAND().whatsappChannel || '#')}" target="_blank" rel="noopener noreferrer">${icon('whatsappChannel')} Join the WhatsApp channel</a>
          ${shareMarketplaceButton('btn btn-light btn-lg')}
        </div>
      </div>
      <div class="community-form">
        <form class="newsletter" id="wb-newsletter">
          <input type="email" name="email" placeholder="you@email.com" aria-label="Email address" required>
          <button class="btn btn-primary btn-lg" type="submit">Get the drop list</button>
        </form>
        <p class="text-micro community-note">
          One email a week. No spam. Unsubscribe any time — see our
          <a href="#/legal/privacy.html">privacy policy</a>.
        </p>
      </div>
    </div>
  </section>`;
}

/* ------------------------------------------------------------------ page */
export async function renderHome(ctx) {
  setTitle('Benin City fashion marketplace');
  const main = qs('#main');
  /* Paint the value proposition and a skeleton immediately: it is static copy,
     so it must not wait on four API round-trips to appear (it is the LCP). */
  main.innerHTML = `<div class="container">
    ${heroStatement()}
    <section class="section">
      <div class="section-head"><div><h2>Hot deals this week</h2></div></div>
      ${skeletonCards(6)}
    </section>
  </div>`;

  const meta = getMeta() || (await api.meta());

  let newest = { items: [] }, hot = { items: [] }, pool = { items: [] }, vendors = { items: [] };
  const errors = [];

  const results = await Promise.allSettled([
    api.listings({ sort: 'newest', limit: 18, page: 1 }),
    api.listings({ hot: true, limit: 10, page: 1 }),
    api.listings({ sort: 'popular', limit: 30, page: 1 }),
    api.vendors({ sort: 'rating', limit: 8 })
  ]);
  const pick = (i, dflt) => results[i].status === 'fulfilled' ? results[i].value : (errors.push(results[i].reason), dflt);
  newest = pick(0, { items: [] });
  hot = pick(1, { items: [] });
  pool = pick(2, { items: [] });
  vendors = pick(3, { items: [] });

  if (errors.length && (!newest.items || !newest.items.length) && (!pool.items || !pool.items.length)) {
    main.innerHTML = `<div class="container" style="padding-top:48px">${errorState(errors[0], 'wb-home-retry')}</div>`;
    const b = qs('#wb-home-retry');
    if (b) b.onclick = () => renderHome(ctx);
    return;
  }

  const categories = (meta && meta.categories) || [];
  const areas = (meta && meta.areas) || [];
  const listingPool = [...(pool.items || []), ...(newest.items || [])];

  const hotItems = (hot.items && hot.items.length) ? hot.items : (pool.items || []).filter(l => l.hot).slice(0, 8);

  /* "New in Benin City" must not repeat what the Hot deals rail already shows. */
  const hotIds = new Set(hotItems.map(l => String(l.id)));
  const hotSlugs = new Set(hotItems.map(l => String(l.slug || '')));
  const freshItems = (newest.items || []).filter(l => !hotIds.has(String(l.id)) && !hotSlugs.has(String(l.slug || '')));

  /* Above-the-fold first: the value prop, hot rail and new-arrivals grid paint in
     one small chunk. Everything below is appended on the next idle frame, so the
     main thread never parses ~12,000px of markup in a single task (measured TBT
     was 1456ms with 627/696ms long tasks at 4x CPU throttle). */
  main.innerHTML = `<div class="container">
    ${heroStatement()}
    ${hotRail(hotItems)}
    ${newGrid(freshItems)}
    <div id="wb-home-rest"></div>
  </div>`;

  const renderRest = () => {
    const rest = document.getElementById('wb-home-rest');
    if (!rest) return;
    /* Chunk 1: the sections a scroller meets first. */
    rest.innerHTML = `
      ${heroBand()}
      ${hero(categories, listingPool)}
      ${categoryTiles(categories, listingPool)}
      <div id="wb-home-deep"></div>`;
    initHero();
    /* Chunk 2: everything past the first few screens, on the NEXT idle frame. */
    const renderDeep = () => {
      const deep = document.getElementById('wb-home-deep');
      if (!deep) return;
      deep.innerHTML = `
        ${trustStrip()}
        ${promos()}
        ${vendorRail(vendors.items || [], listingPool)}
        ${discoveryBand(areas, meta && meta.popularSearches)}
        ${howItWorks()}
        <div id="wb-testimonials"></div>
        ${communityStrip()}`;
    };
    if (window.requestIdleCallback) requestIdleCallback(renderDeep, { timeout: 1200 });
    else setTimeout(renderDeep, 80);
  };
  if (window.requestIdleCallback) requestIdleCallback(renderRest, { timeout: 900 });
  else setTimeout(renderRest, 40);

  /* Testimonials sit far below the fold - load them after the page has painted
     so three extra API calls never delay first content. */
  (async () => {
    try {
      const top = (vendors.items || []).slice(0, 3);
      if (!top.length) return;
      const rrs = await Promise.allSettled(top.map(v => api.vendorReviews(v.slug)));
      const reviews = [];
      rrs.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          const list = (r.value && (r.value.items || r.value.reviews || r.value)) || [];
          list.filter(x => x && x.body).slice(0, 2).forEach(x => reviews.push({ ...x, vendor_name: top[i].name }));
        }
      });
      const keep = reviews.filter(r => (r.body || '').trim().length > 24).slice(0, 3);
      const host = document.getElementById('wb-testimonials');
      if (keep.length && host) host.innerHTML = testimonials(keep);
    } catch { /* testimonials are optional */ }
  })();


  wireHeroBand();
  const nl = qs('#wb-newsletter');
  if (nl) nl.addEventListener('submit', e => {
    e.preventDefault();
    const email = nl.querySelector('input').value;
    toast(`Thanks! ${email} is on the drop list.`, 'ok');
    nl.reset();
  });
}

/* hero carousel: autoplay 6s, pause on hover, dots + arrows */
function initHero() {
  const hero = qs('#wb-hero');
  if (!hero) return;
  const slides = qsa('[data-hero-slide]', hero);
  const dots = qsa('[data-hero-dot]', hero);
  if (slides.length < 2) return;
  let i = 0, timer = null;
  const go = n => {
    i = (n + slides.length) % slides.length;
    slides.forEach((s, k) => s.classList.toggle('active', k === i));
    dots.forEach((d, k) => d.classList.toggle('active', k === i));
  };
  const play = () => { stop(); if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(() => go(i + 1), 6000); };
  const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
  hero.addEventListener('mouseenter', stop);
  hero.addEventListener('mouseleave', play);
  hero.addEventListener('focusin', stop);
  hero.addEventListener('click', e => {
    if (e.target.closest('[data-hero-next]')) { go(i + 1); play(); }
    else if (e.target.closest('[data-hero-prev]')) { go(i - 1); play(); }
    else {
      const d = e.target.closest('[data-hero-dot]');
      if (d) { go(Number(d.dataset.heroDot)); play(); }
    }
  });
  play();
}

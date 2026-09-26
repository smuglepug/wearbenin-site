/* ==========================================================================
   WearBenin v2 — Vendor dashboard (stats · my listings · profile + socials)
   ========================================================================== */

import api, { normaliseImages } from '../api.js';
import { icon } from '../icons.js';
import { esc, qs, qsa, money, timeAgo, imgUrl } from '../util.js';
import {
  crumbs, emptyState, errorState, toast, toastError, confirmDialog, setBusy,
  statCard, fieldHTML, fieldValue, stars, avatarTag, openModal, authWall
} from '../ui.js';
import { socialRow } from '../social.js';
import { setTitle, navigate } from '../router.js';
import { session, requireAuth, refreshUser } from '../session.js';
import { getMeta } from '../shell.js';

const TABS = [['listings', 'My listings'], ['profile', 'Shop profile & socials'], ['stats', 'Performance']];

export async function renderDashboard(ctx) {
  setTitle('Vendor dashboard');
  const tab = TABS.some(t => t[0] === ctx.query.tab) ? ctx.query.tab : 'listings';
  const main = qs('#main');
  main.innerHTML = '';
  if (!requireAuth('Sign in to open your vendor dashboard.')) {
    main.innerHTML = authWall({
      title: 'Vendor dashboard',
      sub: 'Your shop at a glance — live ads, views, sold items and your public shop profile.',
      crumbPath: [{ label: 'Home', href: '#/' }, { label: 'Vendor dashboard' }],
      perks: [
        ['chart', 'Track every ad', 'Views and sold counts for each listing, updated live.'],
        ['building', 'Shop profile & socials', 'Your bio, area, response time and social handles.'],
        ['inbox', 'Inbox', 'Buyer enquiries arrive here and in your inbox.'],
        ['tag', 'Post and edit ads', 'Publish new listings or mark items sold in a tap.']
      ]
    });
    return;
  }
  main.innerHTML = `<div class="container">${crumbs([{ label: 'Home', href: '#/' }, { label: 'Vendor dashboard' }])}
    <div class="page-head"><div><h1>Vendor dashboard</h1><div class="page-sub">Loading your shop…</div></div></div>
    <div class="sk" style="height:320px;border-radius:18px"></div></div>`;

  const me = await refreshUser(true).then(() => session.user).catch(() => session.user) || session.user;
  let vendor = session.vendor;
  let listings = [];

  /* listings */
  try {
    const res = await api.listings({ mine: 1, limit: 100, sort: 'newest' });
    listings = (res && res.items) || [];
  } catch {
    if (vendor && vendor.slug) {
      try { const v = await api.vendor(vendor.slug); listings = (v && v.listings) || []; vendor = Object.assign({}, vendor, v); }
      catch (e) { main.innerHTML = `<div class="container" style="padding-top:32px">${errorState(e, 'wb-dash-retry')}</div>`; qs('#wb-dash-retry').onclick = () => renderDashboard(ctx); return; }
    }
  }

  const active = listings.filter(l => String(l.status || 'active') !== 'sold');
  const sold = listings.filter(l => String(l.status) === 'sold');
  const views = listings.reduce((n, l) => n + Number(l.views || 0), 0);

  main.innerHTML = `<div class="container">
    ${crumbs([{ label: 'Home', href: '#/' }, { label: 'Vendor dashboard' }])}
    <div class="page-head">
      <div><h1>Vendor dashboard</h1>
        <div class="page-sub">${vendor ? esc(vendor.name) : esc((me && me.name) || 'Your shop')} · ${vendor && vendor.area ? esc(vendor.area) : 'Benin City'}</div></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${vendor && vendor.slug ? `<a class="btn btn-ghost" href="#/vendor/${esc(vendor.slug)}">${icon('eye')} View public shop</a>` : ''}
        <a class="btn btn-primary" href="#/sell">${icon('plus')} Post an ad</a>
      </div>
    </div>

    <div class="stat-grid">
      ${statCard('Live ads', String(active.length))}
      ${statCard('Total views', views.toLocaleString('en-NG'))}
      ${statCard('Sold', String(sold.length))}
      ${statCard('Rating', vendor && vendor.rating_avg ? `${Number(vendor.rating_avg).toFixed(1)} / 5` : '—', vendor && vendor.rating_count ? `${vendor.rating_count} reviews` : 'No reviews yet')}
    </div>

    <div class="dash">
      <nav class="dash-nav" aria-label="Dashboard sections">
        ${TABS.map(([k, label]) => `<a class="side-link ${tab === k ? 'active' : ''}" href="#/dashboard?tab=${k}">${esc(label)}</a>`).join('')}
        <a class="side-link" href="#/my-ads">${icon('tag')} My ads</a>
        <a class="side-link" href="#/inbox">${icon('inbox')} Inbox${session.unread ? ` <span class="side-count">${session.unread}</span>` : ''}</a>
        <a class="side-link" href="#/account">${icon('user')} Account settings</a>
      </nav>
      <div id="wb-dash-panel"></div>
    </div>
  </div>`;

  const panel = qs('#wb-dash-panel');
  if (tab === 'listings') panel.innerHTML = listingsPanel(listings, active, sold);
  else if (tab === 'profile') panel.innerHTML = profilePanel(vendor, me);
  else panel.innerHTML = statsPanel(listings);

  if (tab === 'listings') wireListingActions(listings, ctx);
  if (tab === 'profile') wireProfile(vendor, me, ctx);
}

function listingsPanel(listings, active, sold) {
  if (!listings.length) {
    return emptyState({
      title: 'Your shop has no ads yet',
      text: 'Post your first listing — it takes about three minutes and it is free while we are in launch.',
      actionText: 'Post an ad', actionHref: '#/sell'
    });
  }
  return `<div class="table-wrap"><table class="data">
    <thead><tr><th>Item</th><th>Price</th><th>Views</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${listings.map(l => {
      const img = normaliseImages(l.images)[0];
      const isSold = String(l.status) === 'sold';
      return `<tr>
        <td><div style="display:flex;gap:12px;align-items:center;min-width:240px">
          ${img ? `<img class="mini-thumb" src="${esc(imgUrl(img))}" alt="">` : '<div class="mini-thumb"></div>'}
          <div><a href="#/listing/${esc(l.slug || l.id)}" style="font-weight:600">${esc(l.title)}</a>
            <div class="text-micro text-muted">${esc(l.area || '')} · ${esc(timeAgo(l.published_at || l.created_at))}</div></div></div></td>
        <td><b>${money(l.price)}</b></td>
        <td>${Number(l.views || 0).toLocaleString('en-NG')}</td>
        <td>${isSold ? '<span class="pill pill-ink">Sold</span>' : '<span class="pill pill-green">Live</span>'}</td>
        <td><div class="td-actions">
          <a class="btn btn-ghost btn-sm" href="#/sell?edit=${esc(l.id)}&slug=${encodeURIComponent(l.slug || '')}">${icon('edit')} Edit</a>
          ${isSold ? '' : `<button class="btn btn-soft btn-sm" data-sold="${esc(l.id)}">${icon('check')} Mark sold</button>`}
          <button class="btn btn-danger btn-sm" data-del="${esc(l.id)}" data-title="${esc(l.title)}">${icon('trash')}</button>
        </div></td></tr>`;
    }).join('')}</tbody></table></div>`;
}

function profilePanel(vendor, me) {
  const v = vendor || {};
  return `<div class="form-card" style="max-width:none">
    <h3 style="font-size:var(--fs-h3);margin-bottom:6px">Shop profile</h3>
    <p class="text-small text-muted" style="margin-bottom:24px">This is what buyers see on your shop page and under every listing. Social handles are rendered as icon buttons on your shop.</p>
    <form id="wb-profile-form">
      <div class="form-grid">
        ${fieldHTML({ id: 'p-name', label: 'Shop name', value: v.name || (me && me.name) || '', required: true, placeholder: "Mama Vero's Ankara" })}
        ${fieldHTML({ id: 'p-area', label: 'Area in Benin City', value: v.area || '', placeholder: 'Oba Market' })}
        ${fieldHTML({ id: 'p-phone', label: 'Phone', type: 'tel', value: v.phone || (me && me.phone) || '', placeholder: '0803 123 4501' })}
        ${fieldHTML({ id: 'p-whatsapp', label: 'WhatsApp number', type: 'tel', value: v.whatsapp || '', placeholder: '2348031234501', hint: 'International format without + — used for the Chat on WhatsApp button.' })}
        ${fieldHTML({ id: 'p-since', label: 'Trading since', value: v.since || '', placeholder: '2019' })}
        ${fieldHTML({ id: 'p-response', label: 'Typical reply time (minutes)', type: 'number', value: v.response_minutes || '', placeholder: '15' })}
      </div>
      ${fieldHTML({ id: 'p-bio', label: 'Shop description', type: 'textarea', rows: 4, value: v.bio || '', span2: true, placeholder: 'What you sell, where you are based, what makes your shop worth a visit.' })}

      <h3 style="font-size:var(--fs-h3);margin:32px 0 6px">Social media</h3>
      <p class="text-small text-muted" style="margin-bottom:20px">Paste a full link or just your handle — we build the correct URL. These become tappable brand icon buttons for buyers.</p>
      <div class="form-grid">
        ${fieldHTML({ id: 'p-instagram', label: 'Instagram', value: v.instagram || '', placeholder: '@yourshop or full link' })}
        ${fieldHTML({ id: 'p-tiktok', label: 'TikTok', value: v.tiktok || '', placeholder: '@yourshop' })}
        ${fieldHTML({ id: 'p-facebook', label: 'Facebook page', value: v.facebook || '', placeholder: 'facebook.com/yourshop' })}
        ${fieldHTML({ id: 'p-x', label: 'X (Twitter)', value: v.x || '', placeholder: '@yourshop' })}
        ${fieldHTML({ id: 'p-cover', label: 'Cover image URL', value: v.cover || '', span2: true, placeholder: 'https://…' })}
        ${fieldHTML({ id: 'p-logo', label: 'Logo image URL', value: v.logo || '', span2: true, placeholder: 'https://…' })}
      </div>

      <div class="safety-panel" style="margin-top:26px">
        <h4>${icon('share')} How your socials look</h4>
        <div style="margin-top:14px">${socialRow({
          whatsapp: v.whatsapp || '2348031234501', instagram: v.instagram || 'yourshop',
          tiktok: v.tiktok || 'yourshop', facebook: v.facebook || 'yourshop', x: v.x || 'yourshop'
        })}</div>
        <p class="text-micro" style="margin-top:12px;color:#7C2D12">Buttons open in a new tab with <code>rel="noopener"</code>.</p>
      </div>

      <div class="form-actions">
        <span class="text-micro text-muted">Saved to your vendor profile on the WearBenin API.</span>
        <button class="btn btn-primary btn-lg" type="submit" id="wb-profile-save">${icon('check')} Save profile</button>
      </div>
    </form>
  </div>`;
}

function statsPanel(listings) {
  const sorted = listings.slice().sort((a, b) => Number(b.views || 0) - Number(a.views || 0));
  const total = sorted.reduce((n, l) => n + Number(l.views || 0), 0);
  const withImg = listings.filter(l => normaliseImages(l.images).length).length;
  const negotiable = listings.filter(l => l.negotiable).length;
  return `<div class="stack-24">
    <div class="stat-grid" style="margin-bottom:0">
      ${statCard('Total views', total.toLocaleString('en-NG'))}
      ${statCard('Average views / ad', listings.length ? Math.round(total / listings.length).toLocaleString('en-NG') : '0')}
      ${statCard('Ads with photos', `${withImg}/${listings.length}`)}
      ${statCard('Negotiable ads', `${negotiable}/${listings.length}`)}
    </div>
    <div class="table-wrap"><table class="data">
      <thead><tr><th>Listing</th><th>Views</th><th>Share of views</th></tr></thead>
      <tbody>${sorted.map(l => `<tr>
        <td><a href="#/listing/${esc(l.slug || l.id)}">${esc(l.title)}</a></td>
        <td>${Number(l.views || 0).toLocaleString('en-NG')}</td>
        <td><div style="height:8px;background:var(--line-2);border-radius:4px;overflow:hidden;max-width:260px">
          <div style="height:100%;width:${total ? Math.round(Number(l.views || 0) / total * 100) : 0}%;background:linear-gradient(90deg,var(--brand-2),var(--brand))"></div></div></td>
      </tr>`).join('')}</tbody></table></div>
    <div class="safety-panel">
      <h4>${icon('sparkle')} Practical tips that lift views</h4>
      <ul>
        <li>${icon('check')} Listings with 3+ photos get noticeably more WhatsApp replies — show fabric close-ups and the full outfit.</li>
        <li>${icon('check')} Put the size and condition in the title. “Size M” beats “Nice dress”.</li>
        <li>${icon('check')} Reply within the hour. Fast replies convert to sales in Benin City.</li>
        <li>${icon('check')} Mark items sold as soon as they go — buyers trust a shop that keeps its stock honest.</li>
      </ul>
    </div>
  </div>`;
}

function wireListingActions(listings, ctx) {
  qsa('[data-sold]').forEach(b => b.addEventListener('click', () => {
    confirmDialog({
      title: 'Mark this ad as sold?',
      text: 'The listing keeps a visible “Sold” badge but stops taking new enquiries.',
      confirmText: 'Mark as sold',
      onConfirm: async () => { await api.markSold(b.dataset.sold); toast('Marked as sold.', 'ok'); renderDashboard(ctx); }
    });
  }));
  qsa('[data-del]').forEach(b => b.addEventListener('click', () => {
    confirmDialog({
      title: 'Delete this ad?',
      text: `“${b.dataset.title}” will be removed permanently. This cannot be undone.`,
      confirmText: 'Delete',
      danger: true,
      onConfirm: async () => { await api.deleteListing(b.dataset.del); toast('Ad deleted.', 'ok'); renderDashboard(ctx); }
    });
  }));
}

function wireProfile(vendor, me, ctx) {
  const form = qs('#wb-profile-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = qs('#wb-profile-save');
    const body = {
      name: fieldValue(form, 'p-name'),
      area: fieldValue(form, 'p-area'),
      phone: fieldValue(form, 'p-phone'),
      whatsapp: fieldValue(form, 'p-whatsapp'),
      since: fieldValue(form, 'p-since') || null,
      response_minutes: fieldValue(form, 'p-response') ? Number(fieldValue(form, 'p-response')) : null,
      bio: fieldValue(form, 'p-bio'),
      instagram: fieldValue(form, 'p-instagram'),
      tiktok: fieldValue(form, 'p-tiktok'),
      facebook: fieldValue(form, 'p-facebook'),
      x: fieldValue(form, 'p-x'),
      cover: fieldValue(form, 'p-cover') || null,
      logo: fieldValue(form, 'p-logo') || null
    };
    setBusy(btn, true, 'Saving…');
    try {
      await api.updateVendorMe(body);
      await refreshUser(true);
      toast('Shop profile saved.', 'ok');
      renderDashboard(ctx);
    } catch (err) {
      setBusy(btn, false);
      if (err.status === 403 || err.status === 404) {
        openModal({
          title: 'Vendor profile unavailable',
          body: `<div class="inline-error">${icon('alert')}<span>${esc(err.message || 'This account does not have a vendor profile yet.')}</span></div>
            <p class="text-small text-muted" style="margin-top:14px">Register with the “Sell / open a shop” option, or ask the WearBenin team to upgrade your account.</p>`,
          footer: `<button class="btn btn-primary" data-close>OK</button>`
        });
      } else toastError(err);
    }
  });
}

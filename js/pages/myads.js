/* ==========================================================================
   WearBenin v2 — My Ads (edit · mark sold · delete)
   ========================================================================== */

import api, { normaliseImages } from '../api.js';
import { icon } from '../icons.js';
import { esc, qs, qsa, money, timeAgo, imgUrl } from '../util.js';
import { crumbs, emptyState, errorState, toast, toastError, confirmDialog, setBusy, statCard, authWall } from '../ui.js';
import { setTitle, navigate } from '../router.js';
import { session, requireAuth } from '../session.js';

export async function renderMyAds(ctx) {
  setTitle('My ads');
  const main = qs('#main');
  main.innerHTML = '';
  if (!requireAuth('Sign in to manage your ads.')) {
    main.innerHTML = authWall({
      title: 'My ads',
      sub: 'Everything you have posted on WearBenin — edit prices, mark items sold or take them down.',
      crumbPath: [{ label: 'Home', href: '#/' }, { label: 'My ads' }]
    });
    return;
  }
  main.innerHTML = `<div class="container">${crumbs([{ label: 'Home', href: '#/' }, { label: 'My ads' }])}
    <div class="page-head"><div><h1>My ads</h1><div class="page-sub">Loading your listings…</div></div></div>
    <div class="sk" style="height:280px;border-radius:18px"></div></div>`;

  let data;
  try {
    data = await api.listings({ mine: 1, limit: 100, sort: 'newest' });
  } catch (e) {
    /* fall back to the vendor endpoint when the API does not support ?mine */
    try {
      const v = session.vendor || (await api.me().then(r => (r && r.vendor) || null).catch(() => null));
      if (v && v.slug) data = await api.vendor(v.slug);
      else throw e;
    } catch { main.innerHTML = `<div class="container" style="padding-top:32px">${errorState(e, 'wb-myads-retry')}</div>`; qs('#wb-myads-retry').onclick = () => renderMyAds(ctx); return; }
  }

  const items = (data && (data.items || data.listings)) || [];
  const active = items.filter(l => String(l.status || 'active') !== 'sold');
  const sold = items.filter(l => String(l.status) === 'sold');
  const views = items.reduce((n, l) => n + Number(l.views || 0), 0);

  main.innerHTML = `<div class="container">
    ${crumbs([{ label: 'Home', href: '#/' }, { label: 'My ads' }])}
    <div class="page-head">
      <div><h1>My ads</h1>
        <div class="page-sub">${items.length} listing${items.length === 1 ? '' : 's'} · ${active.length} live · ${sold.length} sold</div></div>
      <a class="btn btn-primary" href="#/sell">${icon('plus')} Post a new ad</a>
    </div>

    <div class="stat-grid">
      ${statCard('Live ads', String(active.length))}
      ${statCard('Sold', String(sold.length))}
      ${statCard('Total views', views.toLocaleString('en-NG'))}
      ${statCard('Saved by buyers', String(items.reduce((n, l) => n + Number(l.favorites_count || 0), 0)))}
    </div>

    ${items.length ? `
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>Item</th><th>Price</th><th>Area</th><th>Views</th><th>Posted</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${items.map(l => {
              const img = normaliseImages(l.images)[0];
              const isSold = String(l.status) === 'sold';
              return `<tr>
                <td><div style="display:flex;gap:12px;align-items:center;min-width:260px">
                  ${img ? `<img class="mini-thumb" src="${esc(imgUrl(img))}" alt="">` : `<div class="mini-thumb"></div>`}
                  <a href="#/listing/${esc(l.slug || l.id)}" style="font-weight:600">${esc(l.title)}</a>
                </div></td>
                <td><b>${money(l.price)}</b>${l.negotiable ? '<br><span class="pill pill-green" style="margin-top:4px">Negotiable</span>' : ''}</td>
                <td>${esc(l.area || '—')}</td>
                <td>${Number(l.views || 0).toLocaleString('en-NG')}</td>
                <td>${esc(timeAgo(l.published_at || l.created_at))}</td>
                <td>${isSold ? '<span class="pill pill-ink">Sold</span>' : '<span class="pill pill-green">Live</span>'}</td>
                <td><div class="td-actions">
                  <a class="btn btn-ghost btn-sm" href="#/sell?edit=${esc(l.id)}&slug=${encodeURIComponent(l.slug || '')}">${icon('edit')} Edit</a>
                  ${isSold ? '' : `<button class="btn btn-soft btn-sm" data-sold="${esc(l.id)}">${icon('check')} Mark sold</button>`}
                  <button class="btn btn-danger btn-sm" data-del="${esc(l.id)}" data-title="${esc(l.title)}">${icon('trash')} Delete</button>
                </div></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`
      : emptyState({
        title: 'You have no ads yet',
        text: 'Post your first ad in three steps — photos, price and area. It is free to list while we are in launch.',
        actionText: 'Post a free ad', actionHref: '#/sell'
      })}
  </div>`;

  /* mark sold */
  qsa('[data-sold]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.sold;
    confirmDialog({
      title: 'Mark this ad as sold?',
      text: 'The listing stays visible with a “Sold” badge so buyers can see your shop is active, but it stops taking enquiries.',
      confirmText: 'Yes, mark sold',
      onConfirm: async () => {
        await api.markSold(id);
        toast('Marked as sold.', 'ok');
        renderMyAds(ctx);
      }
    });
  }));

  /* delete */
  qsa('[data-del]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.del, title = b.dataset.title;
    confirmDialog({
      title: 'Delete this ad?',
      text: `“${title}” will be removed permanently, along with its photos from search. This cannot be undone.`,
      confirmText: 'Delete permanently',
      danger: true,
      onConfirm: async () => {
        await api.deleteListing(id);
        toast('Ad deleted.', 'ok');
        renderMyAds(ctx);
      }
    });
  }));
}

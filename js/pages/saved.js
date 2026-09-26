/* ==========================================================================
   WearBenin v2 — Saved (favourites) + Saved searches
   ========================================================================== */

import api from '../api.js';
import { icon } from '../icons.js';
import { esc, qs, qsa, fmtDate } from '../util.js';
import {
  crumbs, listingCard, skeletonCards, emptyState, errorState, toast, toastError,
  confirmDialog, openModal, setBusy, fieldHTML, fieldValue, authWall
} from '../ui.js';
import { setTitle } from '../router.js';
import { session, requireAuth, loadFavorites, toggleFavorite } from '../session.js';

/* ------------------------------------------------------------------ favourites */
export async function renderSaved(ctx) {
  setTitle('Saved listings');
  const main = qs('#main');
  main.innerHTML = '';
  if (!requireAuth('Sign in to see your saved listings.')) {
    main.innerHTML = authWall({
      title: 'Saved listings',
      sub: 'Everything you heart while browsing waits for you here, so you can shortlist before you message a vendor.',
      crumbPath: [{ label: 'Home', href: '#/' }, { label: 'Saved' }]
    });
    return;
  }
  main.innerHTML = `<div class="container">${crumbs([{ label: 'Home', href: '#/' }, { label: 'Saved' }])}
    <div class="page-head"><div><h1>Saved listings</h1><div class="page-sub">Loading your favourites…</div></div></div>
    ${skeletonCards(4)}</div>`;

  let data;
  try { data = await api.favorites(); }
  catch (e) { main.innerHTML = `<div class="container" style="padding-top:32px">${errorState(e, 'wb-fav-retry')}</div>`; qs('#wb-fav-retry').onclick = () => renderSaved(ctx); return; }

  const items = (data && (data.items || data)) || [];
  /* some backends return {listing_id} rows — normalise */
  const listings = items.map(x => (x && x.listing) ? x.listing : x).filter(Boolean);

  main.innerHTML = `<div class="container">
    ${crumbs([{ label: 'Home', href: '#/' }, { label: 'Saved' }])}
    <div class="page-head">
      <div><h1>Saved listings</h1>
        <div class="page-sub">${listings.length} item${listings.length === 1 ? '' : 's'} you have hearted. Saved items stay here until you remove them.</div></div>
      <a class="btn btn-ghost" href="#/saved-searches">${icon('bookmark')} Saved searches</a>
    </div>
    ${listings.length ? `<div class="grid-cards">${listings.map(l => listingCard({ ...l, is_favorite: true })).join('')}</div>`
      : emptyState({
        title: 'Nothing saved yet',
        text: 'Tap the heart on any listing and it will appear here — handy for shortlisting before you message a vendor.',
        actionText: 'Browse listings', actionHref: '#/search'
      })}
  </div>`;
}

/* ------------------------------------------------------------------ saved searches */
export async function renderSavedSearches(ctx) {
  setTitle('Saved searches');
  const main = qs('#main');
  main.innerHTML = '';
  if (!requireAuth('Sign in to save your searches.')) {
    main.innerHTML = authWall({
      title: 'Saved searches',
      sub: 'Store a search once — category, area, price ceiling — then re-run it with one tap.',
      crumbPath: [{ label: 'Home', href: '#/' }, { label: 'Saved', href: '#/saved' }, { label: 'Saved searches' }]
    });
    return;
  }
  main.innerHTML = `<div class="container">${crumbs([{ label: 'Home', href: '#/' }, { label: 'Saved' }, { label: 'Saved searches' }])}
    <div class="page-head"><div><h1>Saved searches</h1><div class="page-sub">Loading…</div></div></div>
    <div class="sk" style="height:200px;border-radius:18px"></div></div>`;

  let data;
  try { data = await api.savedSearches(); }
  catch (e) { main.innerHTML = `<div class="container" style="padding-top:32px">${errorState(e, 'wb-ss-retry')}</div>`; qs('#wb-ss-retry').onclick = () => renderSavedSearches(ctx); return; }

  const items = (data && (data.items || data)) || [];

  main.innerHTML = `<div class="container">
    ${crumbs([{ label: 'Home', href: '#/' }, { label: 'Saved' }, { label: 'Saved searches' }])}
    <div class="page-head">
      <div><h1>Saved searches</h1>
        <div class="page-sub">Store a search once, then re-run it with one tap — handy for “agbada under ₦50k in New Benin”.</div></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <a class="btn btn-ghost" href="#/saved">${icon('heart')} Saved listings</a>
        <button class="btn btn-primary" id="wb-new-search">${icon('plus')} Save a search</button>
      </div>
    </div>
    ${items.length ? `<div class="table-wrap"><table class="data">
      <thead><tr><th>Label</th><th>Query</th><th>Saved</th><th>Actions</th></tr></thead>
      <tbody>${items.map(s => `<tr>
        <td><b>${esc(s.label || 'Saved search')}</b></td>
        <td><code style="font-size:12.5px">${esc(typeof s.query === 'string' ? s.query : JSON.stringify(s.query))}</code></td>
        <td>${esc(fmtDate(s.created_at))}</td>
        <td><div class="td-actions">
          <a class="btn btn-soft btn-sm" href="${esc(hrefFor(s))}">${icon('search')} Run search</a>
          <button class="btn btn-danger btn-sm" data-del-ss="${esc(s.id)}">${icon('trash')} Remove</button>
        </div></td></tr>`).join('')}</tbody></table></div>`
      : emptyState({
        title: 'No saved searches yet',
        text: 'Save the filters you use most — for example a category, an area and a price ceiling — and come back to them any time.',
        actionText: 'Browse listings', actionHref: '#/search'
      })}
  </div>`;

  function hrefFor(s) {
    let q = s.query;
    if (typeof q === 'string') {
      try { q = JSON.parse(q); } catch { return '#/search?q=' + encodeURIComponent(q); }
    }
    const p = new URLSearchParams();
    Object.keys(q || {}).forEach(k => { if (q[k] !== '' && q[k] != null) p.set(k, q[k]); });
    return '#/search' + (p.toString() ? '?' + p.toString() : '');
  }

  qsa('[data-del-ss]').forEach(b => b.addEventListener('click', () => {
    confirmDialog({
      title: 'Remove this saved search?',
      text: 'You can always save it again from the search results page.',
      confirmText: 'Remove',
      danger: true,
      onConfirm: async () => { await api.removeSavedSearch(b.dataset.delSs); toast('Saved search removed.', 'ok'); renderSavedSearches(ctx); }
    });
  }));

  const nw = qs('#wb-new-search');
  if (nw) nw.addEventListener('click', () => {
    openModal({
      title: 'Save a search',
      body: `<p class="text-small text-muted" style="margin-bottom:16px">Give it a name you will recognise, then choose what to search for.</p>
        ${fieldHTML({ id: 'ss-label', label: 'Label', required: true, placeholder: 'Agbada under ₦60k' })}
        <div style="height:16px"></div>
        ${fieldHTML({ id: 'ss-q', label: 'Keywords', placeholder: 'agbada' })}
        <div style="height:16px"></div>
        <div class="form-grid">
          ${fieldHTML({ id: 'ss-min', label: 'Min price (₦)', type: 'number', placeholder: '0' })}
          ${fieldHTML({ id: 'ss-max', label: 'Max price (₦)', type: 'number', placeholder: '60000' })}
        </div>`,
      footer: `<button class="btn btn-ghost" data-close>Cancel</button>
               <button class="btn btn-primary" id="wb-ss-save">Save search</button>`,
      onMount(root, close) {
        root.querySelector('#wb-ss-save').addEventListener('click', async () => {
          const btn = root.querySelector('#wb-ss-save');
          const label = fieldValue(root, 'ss-label');
          if (!label) { toast('Give the search a label first.', 'err'); return; }
          const query = { q: fieldValue(root, 'ss-q'), min: fieldValue(root, 'ss-min'), max: fieldValue(root, 'ss-max'), sort: 'newest' };
          setBusy(btn, true);
          try {
            await api.addSavedSearch({ label, query });
            close();
            toast('Search saved.', 'ok');
            renderSavedSearches(ctx);
          } catch (e) { setBusy(btn, false); toastError(e); }
        });
      }
    });
  });
}

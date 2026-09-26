/* ==========================================================================
   WearBenin v2 — Category browse + Search results (shared component)
   Sidebar with live counts · sticky toolbar · filters/sort · mobile bottom sheet
   ========================================================================== */

import api from '../api.js';
import { icon } from '../icons.js';
import { esc, qs, qsa, debounce, buildQuery } from '../util.js';
import { listingCard, skeletonCards, crumbs, emptyState, errorState, toast } from '../ui.js';
import { setTitle, navigate, buildHref } from '../router.js';
import { getMeta } from '../shell.js';
import { session, toggleFavorite } from '../session.js';

/* -------- filter state ↔ query string -------- */
const FILTER_KEYS = ['q', 'category', 'subcategory', 'area', 'condition', 'min', 'max', 'negotiable', 'hot', 'verified', 'sort', 'page', 'mine'];

function filterState(query) {
  return {
    q: query.q || '',
    category: query.category || '',
    subcategory: query.subcategory || query.sub || '',
    area: query.area || '',
    condition: query.condition || '',
    min: query.min || '',
    max: query.max || '',
    negotiable: query.negotiable === '1' || query.negotiable === 'true',
    hot: query.hot === '1' || query.hot === 'true',
    verified: query.verified === '1' || query.verified === 'true',
    sort: query.sort || 'newest',
    page: Number(query.page) || 1
  };
}

function stateToQuery(s) {
  return {
    q: s.q || '', category: s.category || '', subcategory: s.subcategory || '',
    area: s.area || '', condition: s.condition || '', min: s.min || '', max: s.max || '',
    negotiable: s.negotiable ? 1 : '', hot: s.hot ? 1 : '', verified: s.verified ? 1 : '',
    sort: s.sort && s.sort !== 'newest' ? s.sort : '', page: s.page > 1 ? s.page : ''
  };
}

function apiParams(s, limit) {
  return {
    q: s.q, category: s.category, subcategory: s.subcategory, area: s.area,
    condition: s.condition, min: s.min, max: s.max,
    negotiable: s.negotiable, hot: s.hot, verified: s.verified,
    sort: s.sort, page: s.page, limit
  };
}

/* -------- sidebar -------- */
function sidebar(categories, state, basePath) {
  return `<aside class="browse-side" aria-label="Categories">
    <h3>Categories</h3>
    <a class="side-link ${!state.category ? 'active' : ''}" href="${esc(buildHref(basePath, { ...stateToQuery(state), category: '', subcategory: '', page: '' }))}">
      All categories
      <span class="side-count">${categories.reduce((n, c) => n + Number(c.count || 0), 0)}</span>
    </a>
    ${categories.map(c => {
      const active = state.category === c.id;
      return `<a class="side-link ${active ? 'active' : ''}" href="${esc(buildHref(basePath, { ...stateToQuery(state), category: c.id, subcategory: '', page: '' }))}">
        <span class="side-ico">${icon(c.iconKey || 'chevronRight')}</span> ${esc(c.name)}
        <span class="side-count">${Number(c.count || 0)}</span>
      </a>
      ${active && c.subs && c.subs.length ? `<div class="side-sub">
        ${c.subs.map(s => `<a href="${esc(buildHref(basePath, { ...stateToQuery(state), category: c.id, subcategory: s.id, page: '' }))}"
          style="${state.subcategory === s.id ? 'color:var(--brand);font-weight:700' : ''}">${esc(s.name)}</a>`).join('')}
      </div>` : ''}`;
    }).join('')}
    <div class="side-divider"></div>
    <div class="side-refine">
      <h3 style="padding:0 0 6px">Refine</h3>
      <div class="side-fields">${filterFields(state, null, null)}</div>
      ${filterToggles(state)}
      <div class="fb-actions" style="display:flex;gap:8px;margin-top:14px">
        <button class="btn btn-primary flex-1" id="wb-apply">Apply</button>
        <button class="btn btn-ghost" id="wb-clear">Clear</button>
      </div>
    </div>
  </aside>`;
}

/* -------- filter controls -------- */
function filterFields(state, facetAreas, facetConditions) {
  const areas = (facetAreas && facetAreas.length ? facetAreas : ((getMeta() && getMeta().areas) || []));
  const conds = (facetConditions && facetConditions.length ? facetConditions : [{ value: 'Brand New' }, { value: 'Fairly Used' }, { value: 'Refurbished' }]);
  return `
    <div class="field">
      <label for="f-area">Area</label>
      <select class="select" id="f-area" name="area">
        <option value="">All Benin City</option>
        ${areas.map(a => { const v = a.name || a.value || a; const c = a.count; return `<option value="${esc(v)}" ${state.area === v ? 'selected' : ''}>${esc(v)}${c !== undefined ? ` (${c})` : ''}</option>`; }).join('')}
      </select>
    </div>
    <div class="field">
      <label for="f-cond">Condition</label>
      <select class="select" id="f-cond" name="condition">
        <option value="">Any condition</option>
        ${conds.map(c => { const v = c.value || c.name; const n = c.count; return `<option value="${esc(v)}" ${state.condition === v ? 'selected' : ''}>${esc(v)}${n !== undefined ? ` (${n})` : ''}</option>`; }).join('')}
      </select>
    </div>
    <div class="field">
      <label for="f-min">Min price (₦)</label>
      <input class="input" id="f-min" name="min" type="number" min="0" step="500" value="${esc(state.min)}" placeholder="0">
    </div>
    <div class="field">
      <label for="f-max">Max price (₦)</label>
      <input class="input" id="f-max" name="max" type="number" min="0" step="500" value="${esc(state.max)}" placeholder="Any">
    </div>`;
}

function filterToggles(state) {
  return `<div class="stack-16" style="margin-top:4px">
    <label class="check"><input type="checkbox" id="f-negotiable" ${state.negotiable ? 'checked' : ''}>
      <span><b>Negotiable only</b><br><span class="text-micro text-muted">Vendors open to bargaining</span></span></label>
    <label class="check"><input type="checkbox" id="f-verified" ${state.verified ? 'checked' : ''}>
      <span><b>Verified vendors only</b><br><span class="text-micro text-muted">ID-checked sellers</span></span></label>
    <label class="check"><input type="checkbox" id="f-hot" ${state.hot ? 'checked' : ''}>
      <span><b>Hot deals</b><br><span class="text-micro text-muted">Most-viewed this week</span></span></label>
  </div>`;
}

function readFilters(root, state) {
  const g = id => root.querySelector('#' + id);
  return {
    ...state,
    area: g('f-area') ? g('f-area').value : state.area,
    condition: g('f-cond') ? g('f-cond').value : state.condition,
    min: g('f-min') ? g('f-min').value.trim() : state.min,
    max: g('f-max') ? g('f-max').value.trim() : state.max,
    negotiable: g('f-negotiable') ? g('f-negotiable').checked : state.negotiable,
    verified: g('f-verified') ? g('f-verified').checked : state.verified,
    hot: g('f-hot') ? g('f-hot').checked : state.hot,
    page: 1
  };
}

/* -------- the shared browse page -------- */
export async function renderBrowse(ctx, opts = {}) {
  const basePath = opts.basePath || '/search';
  const state = filterState(ctx.query);
  if (opts.category) state.category = opts.category;

  const meta = getMeta() || (await api.meta());
  const categories = (meta && meta.categories) || [];
  const cat = categories.find(c => c.id === state.category);
  const sub = cat && (cat.subs || []).find(s => s.id === state.subcategory);

  if (opts.isCategory && state.category && !cat) { /* unknown category → shows empty state below */ }

  const limit = 24;
  setTitle(sub ? sub.name : cat ? cat.name : state.q ? `Search: ${state.q}` : 'Browse listings');

  const main = qs('#main');

  const crumbItems = [{ label: 'Home', href: '#/' }];
  if (cat) { crumbItems.push({ label: 'Categories', href: '#/categories' }); crumbItems.push({ label: cat.name }); if (sub) crumbItems.push({ label: sub.name }); }
  else if (state.q) crumbItems.push({ label: `Search “${state.q}”` });
  else crumbItems.push({ label: 'All listings' });

  main.innerHTML = `<div class="container">
    ${crumbs(crumbItems)}
    <div class="page-head">
      <div>
        <h1>${esc(sub ? sub.name : cat ? cat.name : state.q ? `Results for “${state.q}”` : 'All listings')}</h1>
        <div class="page-sub">${cat ? `Browse ${cat.name.toLowerCase()} from verified vendors across Benin City.` : 'Everything listed on WearBenin right now.'}</div>
      </div>
    </div>

    <div class="browse">
      ${sidebar(categories, state, basePath)}
      <div>
        <div class="toolbar">
          <span class="toolbar-count" id="wb-count">Loading…</span>
          <span class="toolbar-spacer"></span>
          <button class="btn btn-ghost btn-sm filter-toggle" id="wb-open-filters">${icon('filter')} Filters</button>
          <div class="toolbar-sort">
            <label class="sr-only" for="wb-sort">Sort by</label>
            <select class="select" id="wb-sort">
              <option value="newest" ${state.sort === 'newest' ? 'selected' : ''}>Newest first</option>
              <option value="price_asc" ${state.sort === 'price_asc' ? 'selected' : ''}>Price: low to high</option>
              <option value="price_desc" ${state.sort === 'price_desc' ? 'selected' : ''}>Price: high to low</option>
              <option value="popular" ${state.sort === 'popular' ? 'selected' : ''}>Most viewed</option>
            </select>
          </div>
        </div>

        <div id="wb-results">${skeletonCards(8)}</div>
      </div>
    </div>
  </div>`;

  /* ---------- load & paint results ---------- */
  let data = null;
  try {
    data = await api.listings(apiParams(state, limit));
  } catch (e) {
    qs('#wb-results').innerHTML = errorState(e, 'wb-browse-retry');
    const r = qs('#wb-browse-retry');
    if (r) r.onclick = () => renderBrowse(ctx, opts);
    return;
  }

  const items = (data && data.items) || [];
  const total = Number(data && data.total) || items.length;
  const pages = Number(data && data.pages) || 1;

  qs('#wb-count').innerHTML = `<b>${total.toLocaleString('en-NG')}</b> ${total === 1 ? 'ad' : 'ads'} found`;
  const resEl = qs('#wb-results');

  if (!items.length) {
    resEl.innerHTML = emptyState({
      art: state.q ? 'search' : 'empty',
      title: state.q ? `No results for “${state.q}”` : 'Nothing here yet',
      text: state.q
        ? 'Try a shorter phrase, a different area, or clear the filters. New listings land every day.'
        : 'No vendor has published here yet. Try another category or area — or be the first.',
      actionText: 'Browse all listings',
      actionHref: '#/search',
      secondaryText: 'Clear filters',
      secondaryHref: buildHref(basePath, state.category ? { category: state.category } : {})
    });
  } else {
    const imgPrefetch = items.slice(0, 4).length;
    resEl.innerHTML = `<div class="grid-cards">${items.map(l => listingCard(l)).join('')}</div>
      ${paginationBar(state, pages, basePath)}`;
  }

  /* ---------- interactions ---------- */
  const applyNow = (patch) => {
    const next = { ...state, ...patch };
    navigate(basePath + buildQuery(stateToQuery(next)));
  };

  const sortSel = qs('#wb-sort');
  if (sortSel) sortSel.addEventListener('change', () => applyNow({ sort: sortSel.value, page: 1 }));

  const applyBtn = qs('#wb-apply');
  if (applyBtn) applyBtn.addEventListener('click', () => {
    const next = readFilters(document, state);
    navigate(basePath + buildQuery(stateToQuery(next)));
  });
  const clearBtn = qs('#wb-clear');
  if (clearBtn) clearBtn.addEventListener('click', () => {
    navigate(basePath + buildQuery(stateToQuery({
      ...state, area: '', condition: '', min: '', max: '', negotiable: false, verified: false, hot: false, page: 1
    })));
  });

  const fb = qs('#wb-filter-bar');
  if (fb) fb.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') applyBtn.click(); });

  /* mobile filter bottom sheet */
  const openBtn = qs('#wb-open-filters');
  if (openBtn) openBtn.addEventListener('click', async () => {
    const { openSheet, closeSheet } = await import('../ui.js');
    openSheet({
      title: 'Filter listings',
      body: `${filterFields(state, data && data.facets && data.facets.areas, data && data.facets && data.facets.conditions)}
        ${filterToggles(state)}
        <div style="height:8px"></div>`,
      footer: `<button class="btn btn-ghost" id="wb-sheet-clear">Clear all</button>
               <button class="btn btn-primary" id="wb-sheet-apply">Show ${total.toLocaleString('en-NG')} ads</button>`,
      onMount(root) {
        root.querySelector('#wb-sheet-apply').onclick = () => { closeSheet(); navigate(basePath + buildQuery(stateToQuery(readFilters(root, state)))); };
        root.querySelector('#wb-sheet-clear').onclick = () => { closeSheet(); navigate(basePath + buildQuery({ category: state.category, subcategory: state.subcategory, q: state.q })); };
      }
    });
  });

  /* active-filter chips */
  const chips = [];
  if (state.area) chips.push(['Area: ' + state.area, { area: '' }]);
  if (state.condition) chips.push([state.condition, { condition: '' }]);
  if (state.min) chips.push(['From ₦' + state.min, { min: '' }]);
  if (state.max) chips.push(['Up to ₦' + state.max, { max: '' }]);
  if (state.negotiable) chips.push(['Negotiable', { negotiable: '' }]);
  if (state.verified) chips.push(['Verified vendors', { verified: '' }]);
  if (state.hot) chips.push(['Hot deals', { hot: '' }]);
  if (state.subcategory && !sub) chips.push(['Subcategory: ' + state.subcategory, { subcategory: '' }]);
  if (chips.length) {
    const bar = document.createElement('div');
    bar.className = 'chip-row';
    bar.style.marginBottom = '24px';
    bar.innerHTML = chips.map(([label, patch]) =>
      `<a class="chip active" href="${esc(buildHref(basePath, stateToQuery({ ...state, ...patch, page: 1 })))}">${esc(label)} ${icon('close')}</a>`).join('');
    resEl.parentNode.insertBefore(bar, resEl);
  }
}

function paginationBar(state, pages, basePath) {
  if (pages <= 1) return '';
  const mk = n => buildHref(basePath, stateToQuery({ ...state, page: n }));
  const out = [];
  const nums = new Set([1, pages, state.page, state.page - 1, state.page + 1]);
  const sorted = Array.from(nums).filter(n => n >= 1 && n <= pages).sort((a, b) => a - b);
  out.push(state.page > 1
    ? `<a class="page-btn" href="${esc(mk(state.page - 1))}" aria-label="Previous page">${icon('chevronLeft')}</a>`
    : `<span class="page-btn" style="opacity:.4">${icon('chevronLeft')}</span>`);
  let prev = 0;
  sorted.forEach(n => {
    if (prev && n - prev > 1) out.push('<span class="page-btn" style="border:0;pointer-events:none">…</span>');
    out.push(`<a class="page-btn ${n === state.page ? 'active' : ''}" href="${esc(mk(n))}">${n}</a>`);
    prev = n;
  });
  out.push(state.page < pages
    ? `<a class="page-btn" href="${esc(mk(state.page + 1))}" aria-label="Next page">${icon('chevronRight')}</a>`
    : `<span class="page-btn" style="opacity:.4">${icon('chevronRight')}</span>`);
  return `<nav class="pagination" aria-label="Pagination">${out.join('')}</nav>`;
}

export function renderCategory(ctx) {
  return renderBrowse(ctx, { isCategory: true, category: ctx.params.cat, basePath: '/category/' + ctx.params.cat });
}

export function renderSearch(ctx) {
  return renderBrowse(ctx, { basePath: '/search' });
}

/* ---------- all-categories index ---------- */
export async function renderCategories(ctx) {
  setTitle('All categories');
  const meta = getMeta() || (await api.meta());
  const cats = (meta && meta.categories) || [];
  const main = qs('#main');

  let pool = { items: [] };
  try { pool = await api.listings({ sort: 'popular', limit: 40 }); } catch { /* images optional */ }

  main.innerHTML = `<div class="container">
    ${crumbs([{ label: 'Home', href: '#/' }, { label: 'Categories' }])}
    <div class="page-head">
      <div><h1>All categories</h1><div class="page-sub">${cats.length} departments · ${cats.reduce((n, c) => n + Number(c.count || 0), 0).toLocaleString('en-NG')} live ads across Benin City</div></div>
    </div>
    <div class="grid-cards" style="gap:24px">
      ${cats.map(c => {
        const l = (pool.items || []).find(x => x.category === c.id);
        const img = l && (Array.isArray(l.images) ? l.images[0] : (typeof l.images === 'string' ? JSON.parse(l.images || '[]')[0] : ''));
        return `<a class="cat-tile" style="aspect-ratio:4/3" href="#/category/${esc(c.id)}">
          ${img ? `<img src="${esc(img)}" alt="${esc(c.name)}" loading="lazy">` : '<div style="width:100%;height:100%;background:linear-gradient(135deg,#2A2F3A,#111318)"></div>'}
          <span class="cat-tile-grad"></span>
          <span class="cat-tile-text"><b>${esc(c.name)}</b>
          <span>${Number(c.count || 0)} ads · ${(c.subs || []).length} subcategories</span></span></a>`;
      }).join('')}
    </div>
  </div>`;
}

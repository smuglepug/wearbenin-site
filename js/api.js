/* ==========================================================================
   WearBenin v2 — API client  (spec §1 frozen REST contract)
   Single place that talks to the backend. Every page reads data through here.
   Base URL comes from WB_CONFIG.apiBase (js/config.js) unless overridden with
   localStorage['wb.apiBase'].
   ========================================================================== */

import FALLBACK from './fallback.js';
import { normaliseImages, listingImage } from './util.js';

export { normaliseImages, listingImage };

const TOKEN_KEY = 'wb.token';

export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code || 'error';
    this.details = details;
  }
}

function cfg() { return window.WB_CONFIG || {}; }

export function getApiBase() {
  let base = localStorage.getItem('wb.apiBase') || cfg().apiBase || 'http://localhost:4000/api';
  base = base.replace(/\/+$/, '');
  if (cfg().preferSameOrigin !== false && /^https?:/i.test(base)) {
    try {
      const api = new URL(base);
      if (api.host === location.host && location.protocol.startsWith('http')) {
        base = api.pathname.replace(/\/+$/, '') || '/api';
      }
    } catch { /* keep absolute */ }
  }
  return base;
}

export function setApiBase(v) {
  if (!v) localStorage.removeItem('wb.apiBase');
  else localStorage.setItem('wb.apiBase', String(v).replace(/\/+$/, ''));
  state.online = null;
}

export function getUploadBase() {
  const b = cfg().uploadBase;
  if (b && cfg().preferSameOrigin !== false) {
    try {
      const u = new URL(b);
      if (u.host === location.host && location.protocol.startsWith('http')) return location.origin;
    } catch { /* ignore */ }
  }
  return b || '';
}

/* ---------------- token / session ---------------- */
export const auth = {
  get token() { return localStorage.getItem(TOKEN_KEY) || null; },
  set token(v) {
    if (v) localStorage.setItem(TOKEN_KEY, v);
    else localStorage.removeItem(TOKEN_KEY);
  },
  get isLoggedIn() { return !!localStorage.getItem(TOKEN_KEY); }
};

/* ---------------- state ---------------- */
const listeners = new Set();
export const state = {
  online: null,      // null = unknown, true/false after health check
  usingFallback: false,
  lastError: null,
  user: null,
  unread: 0
};

function emit() { listeners.forEach(fn => { try { fn(state); } catch (e) { console.error(e); } }); }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function setOffline(v, fallback) {
  const changed = state.online !== v || state.usingFallback !== fallback;
  state.online = v;
  state.usingFallback = !!fallback;
  if (changed) emit();
}

/* ---------------- core request ---------------- */
async function request(path, opts = {}) {
  const {
    method = 'GET', body, form, auth: needAuth = false, headers = {}, timeout = 12000,
    retries = 0, signal
  } = opts;

  const url = path.startsWith('http') ? path : getApiBase() + path;
  const h = Object.assign({ Accept: 'application/json' }, headers);
  const token = auth.token;
  if (token && needAuth !== 'none') h.Authorization = 'Bearer ' + token;

  let payload;
  if (form) {
    payload = form; // FormData: let the browser set the boundary
  } else if (body !== undefined) {
    h['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort('timeout'), timeout);
  if (signal) signal.addEventListener('abort', () => ctrl.abort(), { once: true });

  let res;
  try {
    res = await fetch(url, { method, headers: h, body: payload, signal: ctrl.signal, credentials: 'omit' });
    setOffline(true, false);
  } catch (err) {
    clearTimeout(timer);
    if (retries > 0 && method === 'GET') {
      await new Promise(r => setTimeout(r, 400));
      return request(path, Object.assign({}, opts, { retries: retries - 1 }));
    }
    setOffline(false, false);
    const e = new ApiError(
      err && err.name === 'AbortError' ? 'The WearBenin API took too long to respond.' : 'Cannot reach the WearBenin API.',
      0, 'network_error', String(err && err.message || err)
    );
    state.lastError = e;
    throw e;
  }
  clearTimeout(timer);

  if (res.status === 204) return null;

  const ctype = res.headers.get('content-type') || '';
  let data = null;
  if (ctype.includes('application/json')) {
    try { data = await res.json(); } catch { data = null; }
  } else {
    const txt = await res.text();
    data = txt ? { raw: txt } : null;
  }

  if (!res.ok) {
    const errObj = (data && data.error) || {};
    throw new ApiError(
      errObj.message || `Request failed (${res.status})`,
      res.status, errObj.code || 'http_' + res.status, errObj.details
    );
  }
  return data;
}

const get = (p, o) => request(p, Object.assign({ retries: 1 }, o));
const post = (p, body, o) => request(p, Object.assign({ method: 'POST', body }, o));
const patch = (p, body, o) => request(p, Object.assign({ method: 'PATCH', body }, o));
const del = (p, o) => request(p, Object.assign({ method: 'DELETE' }, o));

/* ---------------- health ---------------- */
let healthPromise = null;
export function checkHealth(force = false) {
  if (healthPromise && !force) return healthPromise;
  healthPromise = request('/health', { timeout: 6000 })
    .then(d => { setOffline(true, false); return d; })
    .catch(() => { setOffline(false, false); return null; })
    .finally(() => { setTimeout(() => { healthPromise = null; }, 3000); });
  return healthPromise;
}

export function isOffline() { return state.online === false; }

/* offline fallback shim — only when the API is definitively unreachable */
function fb(fn) {
  if (state.online !== false) return null;
  return fn();
}

/* ==========================================================================
   API surface — mirrors §1 exactly
   ========================================================================== */
/* One in-flight /meta request shared by everyone. Boot fetches it for the
   chrome and the home route reads it for category tiles; without this the
   route fired a second identical request before the first resolved. */
let metaPromise = null;

export const api = {
  /* ---- meta ---- */
  meta(force = false) {
    if (metaPromise && !force) return metaPromise;
    metaPromise = (async () => {
      try { return await get('/meta'); }
      catch (e) {
        metaPromise = null;
        const f = fb(() => FALLBACK.meta);
        if (f) return f;
        throw e;
      }
    })();
    return metaPromise;
  },

  /* ---- auth ---- */
  register(body) { return post('/auth/register', body); },
  login(body) { return post('/auth/login', body); },
  supabaseExchange(accessToken) { return post('/auth/supabase', { access_token: accessToken }); },
  openShop(body) { return post('/me/vendor', body, { auth: true }); },
  me() { return get('/auth/me', { auth: true }); },
  updateMe(body) { return patch('/me', body, { auth: true }); },
  oauth(provider) { return get('/auth/oauth/' + encodeURIComponent(provider), { auth: 'none' }); },

  /* ---- listings ---- */
  async listings(params = {}) {
    const q = new URLSearchParams();
    Object.keys(params).forEach(k => {
      const v = params[k];
      if (v === undefined || v === null || v === '' || v === false) return;
      q.set(k, v === true ? '1' : String(v));
    });
    const qs = q.toString();
    try { return await get('/listings' + (qs ? '?' + qs : '')); }
    catch (e) {
      const f = fb(() => fallbackListingPage(params));
      if (f) return f;
      throw e;
    }
  },

  async listing(slug) {
    try { return await get('/listings/' + encodeURIComponent(slug)); }
    catch (e) {
      const f = fb(() => {
        const l = FALLBACK.listings.find(x => x.slug === slug);
        if (!l) return null;
        return Object.assign({}, l, { vendor: FALLBACK.vendors[0], similar: FALLBACK.listings.filter(x => x.id !== l.id).slice(0, 4), __fallback: true });
      });
      if (f) return f;
      if (e.status === 404) return null;
      throw e;
    }
  },

  createListing(body) { return post('/listings', body, { auth: true }); },
  updateListing(id, body) { return patch('/listings/' + id, body, { auth: true }); },
  deleteListing(id) { return del('/listings/' + id, { auth: true }); },
  markSold(id) { return post('/listings/' + id + '/sold', {}, { auth: true }); },
  viewListing(id) { return post('/listings/' + id + '/view', {}, { auth: 'none' }).catch(() => null); },

  /* ---- vendors ---- */
  async vendors(params = {}) {
    const q = new URLSearchParams();
    Object.keys(params).forEach(k => {
      const v = params[k];
      if (v === undefined || v === null || v === '' || v === false) return;
      q.set(k, v === true ? '1' : String(v));
    });
    const qs = q.toString();
    try { return await get('/vendors' + (qs ? '?' + qs : '')); }
    catch (e) {
      const f = fb(() => ({ items: FALLBACK.vendors, total: FALLBACK.vendors.length, page: 1, pages: 1 }));
      if (f) return f;
      throw e;
    }
  },

  async vendor(slug) {
    try { return await get('/vendors/' + encodeURIComponent(slug)); }
    catch (e) {
      const f = fb(() => {
        const v = FALLBACK.vendors.find(x => x.slug === slug);
        if (!v) return null;
        return Object.assign({}, v, { listings: FALLBACK.listings.slice(0, 4), reviewSummary: { count: v.rating_count, avg: v.rating_avg }, reviews: [], __fallback: true });
      });
      if (f) return f;
      if (e.status === 404) return null;
      throw e;
    }
  },

  updateVendorMe(body) { return patch('/vendors/me', body, { auth: true }); },
  vendorReviews(slug) { return get('/vendors/' + encodeURIComponent(slug) + '/reviews'); },
  addReview(slug, body) { return post('/vendors/' + encodeURIComponent(slug) + '/reviews', body, { auth: true }); },

  /* ---- my ads (vendor listings incl. inactive) ---- */
  async myListings(params = {}) {
    return api.listings(Object.assign({ mine: 1 }, params));
  },

  /* ---- favourites ---- */
  favorites() { return get('/me/favorites', { auth: true }); },
  addFavorite(listingId) { return post('/me/favorites', { listingId }, { auth: true }); },
  removeFavorite(listingId) { return del('/me/favorites/' + listingId, { auth: true }); },

  /* ---- saved searches ---- */
  savedSearches() { return get('/me/saved-searches', { auth: true }); },
  addSavedSearch(body) { return post('/me/saved-searches', body, { auth: true }); },
  removeSavedSearch(id) { return del('/me/saved-searches/' + id, { auth: true }); },

  /* ---- referrals ---- */
  referral() { return get('/me/referral', { auth: true }); },
  submitReferralProof(body) { return post('/me/referral/proof', body, { auth: true }); },
  referralProgram() { return get('/referral/program'); },
  transparency() { return get('/transparency'); },

  /* ---- uploads ---- */
  upload(files) {
    const form = new FormData();
    Array.from(files).forEach(f => form.append('images', f, f.name));
    return request('/uploads', { method: 'POST', form, auth: true, timeout: 60000 });
  },

  /* ---- messaging ---- */
  startThread(body) { return post('/messages', body, { auth: true }); },
  threads() { return get('/me/threads', { auth: true }); },
  thread(id) { return get('/threads/' + id, { auth: true }); },
  sendMessage(id, body) { return post('/threads/' + id + '/messages', { body }, { auth: true }); },

  /* ---- reports ---- */
  report(body) { return post('/reports', body, { auth: auth.isLoggedIn ? true : 'none' }); },

  /* ---- admin ---- */
  adminStats(token) { return get('/admin/stats', { headers: { 'x-admin-token': token } }); },
  adminReports(token) { return get('/admin/reports', { headers: { 'x-admin-token': token } }); },
  adminRemoveListing(token, id) { return post('/admin/listings/' + id + '/remove', {}, { headers: { 'x-admin-token': token } }); },
  adminVerifyVendor(token, id, verify = true) {
    return post('/admin/vendors/' + id + '/verify', { verified: verify }, { headers: { 'x-admin-token': token } });
  }
};

/* ---- fallback listing page (offline only) ---- */
function fallbackListingPage(params) {
  let items = FALLBACK.listings.slice();
  if (params.category) items = items.filter(l => l.category === params.category);
  if (params.subcategory) items = items.filter(l => l.subcategory === params.subcategory);
  if (params.area) items = items.filter(l => l.area === params.area);
  if (params.condition) items = items.filter(l => l.condition === params.condition);
  if (params.q) {
    const q = String(params.q).toLowerCase();
    items = items.filter(l => (l.title + ' ' + l.category).toLowerCase().includes(q));
  }
  if (params.min) items = items.filter(l => l.price >= Number(params.min));
  if (params.max) items = items.filter(l => l.price <= Number(params.max));
  if (params.sort === 'price_asc') items.sort((a, b) => a.price - b.price);
  else if (params.sort === 'price_desc') items.sort((a, b) => b.price - a.price);
  else if (params.sort === 'popular') items.sort((a, b) => b.views - a.views);
  const limit = Number(params.limit) || 24;
  const page = Number(params.page) || 1;
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    total: items.length,
    page,
    pages: Math.max(1, Math.ceil(items.length / limit)),
    facets: {
      areas: FALLBACK.meta.areas,
      conditions: [{ value: 'Brand New', count: 7 }, { value: 'Fairly Used', count: 1 }],
      priceRange: { min: 9500, max: 68000 }
    },
    __fallback: true
  };
}

/* ---- tiny data helpers live in util.js and are re-exported above ---- */

export default api;

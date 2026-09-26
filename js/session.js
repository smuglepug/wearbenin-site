/* ==========================================================================
   WearBenin v2 — session state (JWT in localStorage, refresh via /auth/me)
   ========================================================================== */

import api, { auth } from './api.js';
import { supabase, supabaseConfigured } from './supabase.js';
import { toast, toastError } from './ui.js';

export const session = {
  user: null,
  vendor: null,
  favorites: new Set(),
  unread: 0,
  loaded: false,
  loading: false
};

const subs = new Set();
export function subscribeSession(fn) { subs.add(fn); return () => subs.delete(fn); }
function emit() { subs.forEach(fn => { try { fn(session); } catch (e) { console.error(e); } }); }

export function isLoggedIn() { return !!auth.token; }
export function isVendor() { return !!(session.user && session.user.role === 'vendor'); }
export function isAdmin() { return !!(session.user && session.user.role === 'admin'); }

/** Refresh the signed-in user from /auth/me (also loads vendor profile + favourites). */
export async function refreshUser(force = false) {
  if (!auth.token) {
    session.user = null; session.vendor = null; session.favorites = new Set(); session.unread = 0;
    session.loaded = true; emit();
    return null;
  }
  if (session.loading) return session.user;
  session.loading = true;
  try {
    const data = await api.me();
    /* API may return {user, vendor} or the user object directly */
    const user = data && data.user ? data.user : data;
    session.user = user || null;
    session.vendor = (data && data.vendor) || (user && user.vendor) || null;
    session.loaded = true;
    emit();
    await Promise.all([loadFavorites(true), loadUnread(true)]);
    return session.user;
  } catch (e) {
    if (e.status === 401 || e.status === 403) {
      auth.token = null;
      session.user = null; session.vendor = null;
      session.favorites = new Set(); session.unread = 0;
      session.loaded = true; emit();
      return null;
    }
    /* network failure: keep the cached token, don't boot the buyer out */
    if (e.code === 'network_error') {
      let cached = null;
      try { cached = JSON.parse(localStorage.getItem('wb.user') || 'null'); } catch { cached = null; }
      if (cached && !session.user) { session.user = cached; session.loaded = true; emit(); }
      return session.user;
    }
    console.warn('[WearBenin] /auth/me failed', e);
    return null;
  } finally {
    session.loading = false;
  }
}

export async function login(email, password) {
  let res;
  if (supabaseConfigured) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw { status: 401, message: error.message };
    res = await api.supabaseExchange(data.session.access_token);
  } else {
    res = await api.login({ email, password });
  }
  auth.token = res.token;
  localStorage.setItem('wb.user', JSON.stringify(res.user || {}));
  session.user = res.user || null;
  session.loaded = true;
  emit();
  await refreshUser(true);
  return res;
}

export async function register(payload) {
  let res;
  if (supabaseConfigured) {
    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: { data: { name: payload.name, role: payload.role, phone: payload.phone || '' } }
    });
    if (error) {
      /* Surface what Supabase actually said. Mapping every failure to 409 made
         rate-limits, weak passwords and bad addresses all read as "that email
         already exists", which is both wrong and unfixable for the user. */
      const msg = String(error.message || '').trim();
      const status = /already registered|already exists|user already/i.test(msg) ? 409
        : /rate limit|too many|security purposes/i.test(msg) ? 429
          : /password|email|valid/i.test(msg) ? 422
            : 400;
      throw { status, message: msg || 'Could not create your account. Please try again.' };
    }
    if (!data.session) {
      throw { status: 400, message: 'Check your email to confirm your account, then sign in.' };
    }
    res = await api.supabaseExchange(data.session.access_token);
  } else {
    res = await api.register(payload);
  }
  auth.token = res.token;
  localStorage.setItem('wb.user', JSON.stringify(res.user || {}));
  session.user = res.user || null;
  session.loaded = true;
  emit();
  await refreshUser(true);
  return res;
}

/** If a Supabase session exists (OAuth redirect return, phone OTP, or persisted),
    exchange it for a local WearBenin session. Safe to call on every boot. */
export async function handleSupabaseSession() {
  if (!supabaseConfigured) return null;
  if (auth.token) return session.user;
  let data;
  try { data = await supabase.auth.getSession(); } catch (e) { return null; }
  if (!data.session) return null;
  try {
    const res = await api.supabaseExchange(data.session.access_token);
    auth.token = res.token;
    localStorage.setItem('wb.user', JSON.stringify(res.user || {}));
    session.user = res.user || null;
    session.loaded = true;
    emit();
    await refreshUser(true);
    return session.user;
  } catch (e) {
    console.warn('[WearBenin] supabase session exchange failed', e);
    return null;
  }
}

export function logout(silent = false) {
  if (supabaseConfigured) supabase.auth.signOut().catch(() => {});
  auth.token = null;
  localStorage.removeItem('wb.user');
  session.user = null; session.vendor = null;
  session.favorites = new Set(); session.unread = 0; session.loaded = true;
  emit();
  if (!silent) toast('You have been signed out.', 'ok');
}

export async function loadFavorites(force = false) {
  if (!auth.token) { session.favorites = new Set(); emit(); return session.favorites; }
  if (session.favorites.size && !force) return session.favorites;
  try {
    const data = await api.favorites();
    const items = (data && (data.items || data)) || [];
    session.favorites = new Set(items.map(x => Number(x.id || x.listing_id || x)));
    emit();
  } catch (e) { if (e.status !== 401) console.warn('[WearBenin] favorites', e); }
  return session.favorites;
}

export async function loadUnread(force = false) {
  if (!auth.token) { session.unread = 0; emit(); return 0; }
  if (session.unread && !force) return session.unread;
  try {
    const data = await api.threads();
    const items = (data && (data.items || data)) || [];
    session.unread = items.reduce((n, t) => n + (Number(t.unread || t.unread_count) || 0), 0);
    emit();
  } catch (e) { if (e.status !== 401) console.warn('[WearBenin] threads', e); }
  return session.unread;
}

export function isFavorite(id) { return session.favorites.has(Number(id)); }

export async function toggleFavorite(id, slug) {
  if (!auth.token) {
    toast('Sign in to save listings to your favourites.', 'err', { href: '#/login', hrefText: 'Sign in' });
    return false;
  }
  const num = Number(id);
  const wasFav = session.favorites.has(num);
  if (wasFav) session.favorites.delete(num); else session.favorites.add(num);
  emit();
  try {
    if (wasFav) await api.removeFavorite(num);
    else await api.addFavorite(num);
    toast(wasFav ? 'Removed from saved' : 'Saved to your favourites', wasFav ? '' : 'ok');
    return !wasFav;
  } catch (e) {
    if (wasFav) session.favorites.add(num); else session.favorites.delete(num);
    emit();
    toastError(e);
    return wasFav;
  }
}

/** Guard an action behind auth. Returns true when the user may proceed. */
export function requireAuth(message = 'Please sign in to continue.') {
  if (auth.token) return true;
  toast(message, 'err', { href: '#/login?next=' + encodeURIComponent(location.hash.slice(1) || '/'), hrefText: 'Sign in' });
  return false;
}

/** Load the current user once at boot (cheap when there is no token). */
export async function bootSession() {
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem('wb.user') || 'null'); } catch { cached = null; }
  if (cached && auth.token) { session.user = cached; emit(); }
  await refreshUser(true);
  return session.user;
}

/* ==========================================================================
   WearBenin v2 — small shared helpers
   ========================================================================== */

export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Escape untrusted text for safe HTML interpolation. */
export function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escape for use inside a URL query component of an href we build. */
export function urlq(s) {
  return encodeURIComponent(String(s ?? ''));
}

/** ₦ price formatting, Nigerian convention. */
export function money(n) {
  const v = Number(n);
  if (!isFinite(v)) return '₦—';
  return '₦' + v.toLocaleString('en-NG', { maximumFractionDigits: 0 });
}

export function shortMoney(n) {
  const v = Number(n);
  if (!isFinite(v)) return '₦—';
  if (v >= 1e9) return '₦' + (v / 1e9).toFixed(1).replace(/\.0$/, '') + 'b';
  if (v >= 1e6) return '₦' + (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'm';
  if (v >= 1e3) return '₦' + Math.round(v / 1e3) + 'k';
  return '₦' + v;
}

export function timeAgo(dateish) {
  if (!dateish) return '';
  let d;
  if (typeof dateish === 'number') {
    d = new Date(dateish < 1e12 ? dateish * 1000 : dateish);
  } else {
    d = new Date(String(dateish).replace(' ', 'T').replace(/Z?$/, 'Z'));
    if (isNaN(d)) d = new Date(dateish);
  }
  if (isNaN(d)) return '';
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return m + ' min ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
  const days = Math.floor(h / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return days + ' days ago';
  if (days < 30) return Math.floor(days / 7) + (Math.floor(days / 7) === 1 ? ' week ago' : ' weeks ago');
  if (days < 365) return Math.floor(days / 30) + (Math.floor(days / 30) === 1 ? ' month ago' : ' months ago');
  return Math.floor(days / 365) + 'y ago';
}

export function fmtDate(dateish) {
  if (!dateish) return '';
  const d = new Date(String(dateish).replace(' ', 'T').replace(/Z?$/, 'Z'));
  if (isNaN(d)) return String(dateish);
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtDateTime(dateish) {
  if (!dateish) return '';
  const d = new Date(String(dateish).replace(' ', 'T').replace(/Z?$/, 'Z'));
  if (isNaN(d)) return String(dateish);
  return d.toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function initials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0] || '')
    .join('')
    .toUpperCase();
}

export function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 70);
}

export function debounce(fn, ms = 300) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}

export function parseQuery(hashQuery) {
  const out = {};
  const s = (hashQuery || '').replace(/^\?/, '');
  if (!s) return out;
  for (const part of s.split('&')) {
    if (!part) continue;
    const i = part.indexOf('=');
    const k = i === -1 ? part : part.slice(0, i);
    const v = i === -1 ? '' : part.slice(i + 1);
    try { out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' ')); }
    catch { out[k] = v; }
  }
  return out;
}

export function buildQuery(obj) {
  const p = new URLSearchParams();
  Object.keys(obj).forEach(k => {
    const v = obj[k];
    if (v === undefined || v === null || v === '' || v === false) return;
    p.set(k, String(v));
  });
  const s = p.toString();
  return s ? '?' + s : '';
}


/** Responsive srcset so phones download ~half the bytes.
    ONLY url shapes whose width parameter is honoured are rewritten.
    Wikimedia's /NNNpx- thumbs exist only at pre-generated widths (verified:
    320/480/640/800px return HTTP 400 while 500/960px return 200), and Flickr
    has a similar fixed-size problem, so guessing a width there produced 400s
    that ORB-blocked the image and fell back to a placeholder on 65% of cards.
    Those two hosts now keep their original URL and get no srcset. */
export function srcsetFor(u) {
  if (!u) return '';
  if (!/images\.pexels\.com/i.test(u) && !/[?&]w=\d+/.test(u)) return '';
  const set = (w) => /([?&]w=)\d+/.test(u)
    ? u.replace(/([?&]w=)\d+/, `$1${w}`)
    : u + (u.includes('?') ? '&' : '?') + 'w=' + w;
  return [320, 480, 640].map(w => `${set(w)} ${w}w`).join(', ');
}

/** Absolute URL for an upload/image path returned by the API. */
export function imgUrl(u) {
  if (!u) return '';
  if (/^(https?:)?\/\//i.test(u) || u.startsWith('data:')) return u;
  const base = (window.WB_CONFIG && window.WB_CONFIG.uploadBase) || '';
  return base.replace(/\/$/, '') + (u.startsWith('/') ? u : '/' + u);
}

/** Listings may carry images as an array, a JSON string, or a comma list. */
export function normaliseImages(raw) {
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const p = JSON.parse(raw);
      if (Array.isArray(p)) return p.filter(Boolean);
    } catch { /* not JSON — fall through */ }
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

/** First image for a listing row. */
export function listingImage(l) {
  if (!l) return '';
  const imgs = normaliseImages(l.images);
  return imgs[0] || l.image || '';
}

/** Deterministic pastel-ish gradient for avatar fallbacks. */
export function gradFor(seed) {
  const s = String(seed || 'x');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return `linear-gradient(135deg,hsl(${h} 62% 52%),hsl(${(h + 38) % 360} 68% 42%))`;
}

export function titleCase(s) {
  return String(s || '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function clampText(s, n) {
  const t = String(s || '');
  return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t;
}

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function on(root, evt, sel, fn) {
  root.addEventListener(evt, e => {
    const t = e.target.closest(sel);
    if (t && root.contains(t)) fn(e, t);
  });
}

/** Run cb once the element is in the viewport (progressive image reveal). */
export function inView(els, cb, opts = { rootMargin: '200px' }) {
  if (!('IntersectionObserver' in window)) { els.forEach(cb); return; }
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { cb(en.target); io.unobserve(en.target); } });
  }, opts);
  els.forEach(e => io.observe(e));
}

export const sleep = ms => new Promise(r => setTimeout(r, ms));

export function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      resolve();
    } catch (e) { reject(e); }
  });
}

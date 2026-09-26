/* ==========================================================================
   WearBenin v2 — hash router
   Routes look like:  #/  ·  #/category/womens-fashion?sort=price_asc
                      #/listing/<slug>  ·  #/vendor/<slug>  ·  #/inbox/<id>
   (documented in docs/EVIDENCE-frontend.md: hash routing keeps the SPA a
   static, no-build artifact that also works when opened from a plain
   static server, while the server's /l/:slug route still serves OG shells.)
   ========================================================================== */

const routes = [];
let notFoundFn = null;
let current = null;
const navigateHandlers = [];

export function route(pattern, handler) {
  const keys = [];
  const rx = new RegExp('^' + pattern
    .replace(/\/+$/, '')
    .replace(/[.+*?^$(){}|[\]\\]/g, '\\$&')
    .replace(/:([A-Za-z0-9_]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })
    .replace(/\/$/, '') + '/?$');
  routes.push({ rx, keys, handler, pattern });
}

export function setNotFound(fn) { notFoundFn = fn; }
export function onRouteChange(fn) { if (typeof fn === 'function') navigateHandlers.push(fn); }

export function parseHash(hash = location.hash) {
  let h = String(hash || '').replace(/^#/, '');
  if (!h) h = '/';
  if (!h.startsWith('/')) h = '/' + h;
  const qi = h.indexOf('?');
  const path = qi === -1 ? h : h.slice(0, qi);
  const search = qi === -1 ? '' : h.slice(qi + 1);
  const query = {};
  new URLSearchParams(search).forEach((v, k) => { query[k] = v; });
  return { path: path.replace(/\/+$/, '') || '/', query, search };
}

export function navigate(path, { replace = false, keepScroll = false } = {}) {
  const target = '#' + (path.startsWith('/') ? path : '/' + path);
  if (replace) history.replaceState(null, '', target);
  else if (location.hash !== target) location.hash = target;
  else render();
  if (!keepScroll) window.scrollTo({ top: 0, behavior: 'auto' });
}

export function currentRoute() { return current; }

export function buildHref(path, query) {
  const q = new URLSearchParams();
  Object.keys(query || {}).forEach(k => {
    const v = query[k];
    if (v === undefined || v === null || v === '' || v === false) return;
    q.set(k, v === true ? '1' : String(v));
  });
  const s = q.toString();
  return '#' + path + (s ? '?' + s : '');
}

export async function render() {
  const { path, query } = parseHash();
  const prev = current;
  current = { path, query };

  /* find matching route */
  let matched = null, params = {};
  for (const r of routes) {
    const m = r.rx.exec(path);
    if (m) {
      matched = r;
      r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      break;
    }
  }

  /* The previous page must never survive a route change: clear #main before
     the handler runs, so even a handler that returns early (signed-out guard,
     not-found, thrown error) cannot leave the old page mounted under the new
     URL. */
  const host = document.getElementById('main');
  if (host) host.innerHTML = `<div class="container"><div class="route-loading" aria-hidden="true">
    <div class="sk sk-line w40" style="height:26px"></div>
    <div style="height:20px"></div>
    <div class="sk" style="height:180px;border-radius:18px"></div>
  </div></div>`;

  /* focus + lang of the main region is handled by each page */
  try {
    if (matched) await matched.handler({ params, query, path, prev });
    else if (notFoundFn) await notFoundFn({ params: {}, query, path, prev });
  } catch (err) {
    console.error('[WearBenin] route error', err);
    const main = document.getElementById('main');
    if (main) {
      main.innerHTML = `<div class="container"><div class="state-box" style="margin-top:48px">
        <h3>Page failed to load</h3><p>${String((err && err.message) || err).replace(/[<&]/g, '')}</p>
        <div class="state-actions"><a class="btn btn-primary" href="#/">Back to home</a></div></div></div>`;
    }
  }
  navigateHandlers.forEach(fn => { try { fn(current, prev); } catch (e) { console.error('[WearBenin] nav handler', e); } });
}

let started = false;
export function start() {
  if (started) return;
  started = true;
  window.addEventListener('hashchange', () => {
    render();
    window.scrollTo({ top: 0, behavior: 'auto' });
  });
  if (!location.hash) history.replaceState(null, '', '#/');
  render();
}

/* Update the document title per page. */
export function setTitle(t) {
  document.title = t ? `${t} · WearBenin` : "WearBenin — Benin City's fashion marketplace";
}

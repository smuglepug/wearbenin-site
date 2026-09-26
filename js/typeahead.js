/* ==========================================================================
   WearBenin v2 — search typeahead
   Jiji-class instant suggestions on every search bar (header + hero band).
   Delegated on document so it survives the header being re-rendered, and
   debounced so typing never queues a request per keystroke.
   ========================================================================== */

import api from './api.js';
import { icon } from './icons.js';
import { esc, money } from './util.js';
import { navigate } from './router.js';

const DEBOUNCE = 180;
const MIN_CHARS = 2;
const LIMIT = 6;

let panel = null;
let host = null;
let items = [];
let active = -1;
let timer = null;
let seq = 0;

function close() {
  if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
  panel = null; host = null; items = []; active = -1;
}

function place(shell) {
  if (!panel) {
    panel = document.createElement('div');
    panel.className = 'ta-panel';
    panel.setAttribute('role', 'listbox');
  }
  if (panel.parentNode !== shell) shell.appendChild(panel);
  host = shell;
}

function paint(term, list, total) {
  if (!panel) return;
  const rows = list.map((l, i) => `
    <button type="button" class="ta-row ${i === active ? 'on' : ''}" role="option" aria-selected="${i === active}" data-ta-i="${i}">
      <span class="ta-ico">${icon('search')}</span>
      <span class="ta-text"><b>${esc(l.title)}</b><span>${esc(l.categoryName || l.category || '')}${l.area ? ' · ' + esc(l.area) : ''}</span></span>
      <span class="ta-price">${money(l.price)}</span>
    </button>`).join('');
  const all = `<button type="button" class="ta-all" data-ta-all>${icon('search')} See all ${total || list.length} results for “${esc(term)}”</button>`;
  panel.innerHTML = rows ? rows + all : `<div class="ta-empty">No matches for “${esc(term)}” yet — try “ankara”, “gele” or “sneakers”.</div>`;
}

async function suggest(term, shell) {
  const mine = ++seq;
  try {
    const res = await api.listings({ q: term, limit: LIMIT, page: 1 });
    if (mine !== seq) return;                     // a newer keystroke won
    const list = (res && res.items) || [];
    const total = (res && res.total) || list.length;
    if (!list.length) { close(); return; }
    place(shell);
    items = list; active = -1;
    paint(term, list, total);
  } catch { close(); }
}

function go(term) { close(); navigate('/search?q=' + encodeURIComponent(term)); }

export function initTypeahead() {
  document.addEventListener('input', (e) => {
    const input = e.target;
    if (!input || input.name !== 'q') return;
    const shell = input.closest('.search-shell');
    if (!shell) return;
    const term = input.value.trim();
    clearTimeout(timer);
    if (term.length < MIN_CHARS) { close(); return; }
    timer = setTimeout(() => suggest(term, shell), DEBOUNCE);
  });

  document.addEventListener('keydown', (e) => {
    if (!panel || !items.length) return;
    const input = e.target;
    if (!input || input.name !== 'q') return;
    if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(items.length - 1, active + 1); paint(input.value.trim(), items, items.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(-1, active - 1); paint(input.value.trim(), items, items.length); }
    else if (e.key === 'Enter') {
      if (active >= 0 && items[active]) { e.preventDefault(); const l = items[active]; close(); navigate('/listing/' + (l.slug || l.id)); }
      else close();                                // let the form submit normally
    } else if (e.key === 'Escape') { close(); }
  });

  document.addEventListener('click', (e) => {
    const row = e.target.closest?.('[data-ta-i]');
    if (row && panel) {
      const l = items[Number(row.dataset.taI)];
      if (l) { close(); navigate('/listing/' + (l.slug || l.id)); }
      return;
    }
    if (e.target.closest?.('[data-ta-all]')) {
      const input = host && host.querySelector('input[name=q]');
      if (input) go(input.value.trim());
      return;
    }
    if (panel && !e.target.closest?.('.search-shell')) close();
  });

  /* a fresh render (header re-paint, route change) invalidates the panel */
  window.addEventListener('hashchange', close);
}
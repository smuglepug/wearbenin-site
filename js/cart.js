import { icon } from './icons.js';

/* ==========================================================================
   WearBenin — Cart store
   A real, local cart: item snapshots persisted to localStorage so the header
   badge, the cart page, and a reload all agree. Checkout is WhatsApp
   pay-on-delivery (no online wallet), so each line carries the vendor phone.
   ========================================================================== */

const KEY = 'wb_cart_v1';
let items = load();
const subs = new Set();

function load() {
  try { const raw = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(raw) ? raw : []; }
  catch (e) { return []; }
}
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* private mode */ }
  subs.forEach(fn => { try { fn(getCart()); } catch (e) {} });
}
function firstImg(images) {
  const imgs = Array.isArray(images) ? images : [];
  return imgs[0] || '';
}

export function getCart() {
  return items.map(i => ({ ...i }));
}
export function cartCount() {
  return items.reduce((s, i) => s + (Number(i.qty) || 0), 0);
}
export function cartTotal() {
  return items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.price) || 0), 0);
}
export function cartHas(id) {
  return items.some(i => i.id === String(id));
}
export function cartQty(id) {
  const it = items.find(i => i.id === String(id));
  return it ? Number(it.qty) : 0;
}

export function addToCart(listing, vendor) {
  /* Cart items are keyed by SLUG: cards only carry the slug, so a stable
     key avoids the id-vs-slug mismatch that silently broke add/remove. */
  const id = String(listing.slug || listing.id);
  const it = items.find(i => i.id === id);
  if (it) it.qty += 1;
  else items.push({
    id,
    slug: listing.slug || '',
    title: listing.title || 'Item',
    price: Number(listing.price) || 0,
    image: firstImg(listing.images),
    area: listing.area || 'Benin City',
    vendor: vendor?.name || listing.vendor_name || 'Vendor',
    vendorSlug: vendor?.slug || listing.vendor_slug || '',
    phone: vendor?.phone || listing.vendor_phone || '',
    qty: 1
  });
  persist();
  return cartCount();
}

export function setQty(id, qty) {
  const it = items.find(i => i.id === String(id));
  if (!it) return;
  qty = Math.max(0, Math.floor(Number(qty) || 0));
  it.qty = qty;
  if (it.qty <= 0) items = items.filter(i => i.id !== it.id);
  persist();
}

export function removeFromCart(id) {
  items = items.filter(i => i.id !== String(id));
  persist();
}

export function clearCart() {
  items = [];
  persist();
}

export function onCart(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

/* ===================== cart DRAWER + card add-to-cart wiring ===================== */

function parsePrice(text) {
  if (!text) return 0;
  const m = String(text).replace(/[^0-9]/g, '');
  return parseInt(m, 10) || 0;
}

/* compact line for the slide-in drawer */
function cdRow(it) {
  const slug = it.slug || it.id;
  return `<div class="cd-item" data-id="${esc(stripCs(it.id))}">
    <a class="cd-thumb" href="#/listing/${esc(slug)}">${it.image ? `<img src="${esc(it.image)}" alt="">` : `<span class="cd-noimg">${icon('image')}</span>`}</a>
    <div class="cd-info">
      <a class="cd-title" href="#/listing/${esc(slug)}">${esc(it.title)}</a>
      <div class="cd-price">${money((Number(it.price)||0)*(Number(it.qty)||1))} <span class="cd-un">/ ${money(it.price)} ea</span></div>
      <div class="cd-tools">
        <div class="cart-stepper">
          <button type="button" data-step="-1" aria-label="Decrease">${icon('minus')}</button>
          <span data-qty>${Number(it.qty)||1}</span>
          <button type="button" data-step="1" aria-label="Increase">${icon('plus')}</button>
        </div>
        <button type="button" class="cd-remove" data-remove aria-label="Remove">${icon('trash')}</button>
        ${it.phone ? `<a class="cd-buy" href="${waLink(it)}" target="_blank" rel="noopener noreferrer">${icon('whatsapp')} Buy</a>` : ''}
      </div>
    </div>
  </div>`;
function waLink(it) {
  const phone = String(it.phone || '').replace(/\D/g, '');
  if (!phone) return '#\x23';
  const msg = "Hello! I'd like to buy from WearBenin:\n\u2022 " + it.qty + ' x ' + it.title + ' \u2014 ' + money(it.price);
  return 'https://wa.me/234' + phone.replace(/^0?234/, '').replace(/^0/, '') + '?text=' + encodeURIComponent(msg);
}
}
function stripCs(id) { return String(id || '').replace(/[<>&"']/g, ''); }
function esc(s) { return String(s == null ? '' : s).replace(/[<>&"']/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;' }[c])); }
function money(n) { return '\u20A6' + Number(n || 0).toLocaleString('en-NG'); }

function groupPhone(items) {
  const phones = [...new Set(items.map(i => String(i.phone || '').replace(/\D/g, '')))].filter(Boolean);
  return phones.length === 1 ? phones[0] : null;
}

export function renderCartDrawer() {
  const root = document.getElementById('wb-cartdrawer');
  if (!root) return;
  const items = getCart();
  const head = root.querySelector('.cd-head');
  const body = root.querySelector('.cd-body');
  const foot = root.querySelector('.cd-foot');
  const cnt = head && head.querySelector('.cd-count'); if (cnt) cnt.textContent = cartCount();
  if (!items.length) {
    body.innerHTML = `<div class="cd-empty">${icon('cart')}<b>Your cart is empty</b><span>Add items from any listing to hold them here.</span>
      <a class="btn btn-primary btn-block" href="#/search" data-close-cart-nav>Browse &amp; add items</a></div>`;
    foot.innerHTML = '';
    return;
  }
  body.innerHTML = items.map(cdRow).join('');
  const total = cartTotal();
  const onePhone = groupPhone(items);
  const wa = onePhone ? `https://wa.me/234${onePhone.replace(/^0?234/, '').replace(/^0/, '')}?text=${encodeURIComponent('Hello! I\'d like to buy from WearBenin:\n' + items.map(i => `\u2022 ${i.qty} x ${i.title} — ${money(i.price)}`).join('\n'))}` : '';
  foot.innerHTML = `<div class="cd-sum"><span>Subtotal</span><b>${money(total)}</b></div>
    <p class="cd-note">${onePhone ? 'Pay this vendor on delivery.' : 'Items from more than one vendor — use each item\'s Buy button to message and pay on delivery.'}</p>
    ${onePhone ? `<a class="btn btn-wa btn-lg btn-block" href="${wa}" target="_blank" rel="noopener noreferrer">${icon('whatsapp')} Checkout on WhatsApp</a>` : ''}
    <a class="btn btn-ghost btn-block" href="#/cart" data-close-cart-nav>View full cart</a>
    <button class="cd-clear" data-clear-cart>${icon('trash')} Clear cart</button>`;
  wireDrawerBody(body, foot);
}

function wireDrawerBody(body) {
  body.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => {
    const row = b.closest('.cd-item');
    setQty(row.dataset.id, (Number(row.querySelector('[data-qty]').textContent) || 1) + Number(b.dataset.step));
    renderCartDrawer();
  }));
  body.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => {
    removeFromCart(b.closest('.cd-item').dataset.id);
    renderCartDrawer();
  }));
}

export function openCart() {
  const root = document.getElementById('wb-cartdrawer');
  if (!root) return;
  root.classList.add('open');
  renderCartDrawer();
  root.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}
export function closeCart() {
  const root = document.getElementById('wb-cartdrawer');
  if (!root) return;
  root.classList.remove('open');
  root.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}
export function wireCartDrawer() {
  const root = document.getElementById('wb-cartdrawer');
  if (!root || root.dataset.wired) return;
  root.dataset.wired = '1';
  root.addEventListener('click', e => {
    if (e.target.closest('[data-close-cart]') || e.target.closest('[data-close-cart-nav]')) { closeCart(); return; }
    if (e.target.closest('[data-clear-cart]')) {
      if (getCart().length && confirm('Clear your cart?')) { clearCart(); renderCartDrawer(); }
      return;
    }
  });
  root.querySelector('.cd-scrim').addEventListener('click', closeCart);
}

/* delegated add-to-cart on listing cards (grids everywhere) */
export function wireCartCards() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-cart-add]');
    if (!btn) return;
    e.preventDefault(); e.stopPropagation();
    const card = btn.closest('.card');
    const slug = btn.dataset.cartAdd;
    const id = btn.dataset.cartId || slug;
    const img = card && card.querySelector('.card-media img');
    const listing = {
      id, slug,
      title: (card && card.querySelector('.card-title') ? card.querySelector('.card-title').textContent : 'Item').trim(),
      price: Number(btn.dataset.price) || parsePrice(card && card.querySelector('.card-price')),
      images: img ? [img.currentSrc || img.src] : [],
      area: card && card.querySelector('.card-meta span') ? card.querySelector('.card-meta span').textContent.trim() : 'Benin City'
    };
    if (cartHas(slug)) { removeFromCart(slug); import('./ui.js').then(m => m.toast('Removed from cart.')).catch(() => {}); }
    else { addToCart(listing, {}); import('./ui.js').then(m => m.toast('Added to cart.', 'ok')).catch(() => {}); }
    btn.classList.toggle('on', !cartHas(slug));
  });
}

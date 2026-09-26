/* ==========================================================================
   WearBenin — Cart page (real cart from the local store)
   Qty steppers, remove, per-vendor WhatsApp checkout (pay-on-delivery).
   ========================================================================== */

import { icon } from '../icons.js';
import { esc, qs, money } from '../util.js';
import { crumbs, emptyState, listingCard } from '../ui.js';
import { setTitle } from '../router.js';
import { getCart, cartTotal, cartCount, setQty, removeFromCart, clearCart, onCart } from '../cart.js';

function waLink(item) {
  const phone = String(item.phone || '').replace(/\D/g, '');
  if (!phone) return '';
  const msg = `Hello! I'd like to buy from WearBenin:\n• ${esc(`_${item.title}_`)} — ${money(item.price)}\n  Qty: ${item.qty} | ${item.area || 'Benin City'}\n\nIs it available?`;
  return `https://wa.me/234${phone.replace(/^0?234/, '').replace(/^0/, '')}?text=${encodeURIComponent(msg)}`;
}

function cartRow(it, i) {
  return `<div class="cart-item" data-id="${esc(it.id)}">
    <a class="cart-thumb" href="#/listing/${esc(it.slug || '')}">
      ${it.image ? `<img src="${esc(it.image)}" alt="${esc(it.title)}">` : `<span class="cart-thumb-empty">${icon('image')}</span>`}
    </a>
    <div class="cart-main">
      <a class="cart-title" href="#/listing/${esc(it.slug || '')}">${esc(it.title)}</a>
      <div class="cart-meta">${esc(it.vendor || 'Vendor')} · ${esc(it.area || 'Benin City')}</div>
      <div class="cart-line-price">${money((Number(it.price) || 0) * (Number(it.qty) || 1))} <span class="cart-unit">/ ${money(it.price)} ea</span></div>
      <div class="cart-tools">
        <div class="cart-stepper" aria-label="Quantity">
          <button type="button" data-step="-1" aria-label="Decrease quantity">${icon('minus')}</button>
          <span data-qty>${Number(it.qty) || 1}</span>
          <button type="button" data-step="1" aria-label="Increase quantity">${icon('plus')}</button>
        </div>
        <button type="button" class="cart-remove" data-remove aria-label="Remove item">${icon('trash')} Remove</button>
      </div>
    </div>
    <div class="cart-checkout">
      ${waLink(it) ? `<a class="btn btn-wa btn-sm" href="${waLink(it)}" target="_blank" rel="noopener noreferrer">${icon('whatsapp')} Buy now</a>` : `<a class="btn btn-primary btn-sm" href="#/contact">${icon('chat')} Ask vendor</a>`}
    </div>
  </div>`;
}

export async function renderCart(ctx) {
  setTitle('Cart');
  const main = qs('#main');
  const items = getCart();

  if (!items.length) {
    main.innerHTML = `<div class="container">${crumbs([{ label: 'Home', href: '#/' }, { label: 'Cart' }])}
      <div class="page-head"><div><h1>Your cart</h1></div></div>
      ${emptyState({
        title: 'Your cart is empty',
        text: 'Tap “Add to cart” on any listing to hold it here. Checkout is pay-on-delivery — you message the vendor on WhatsApp and pay when you receive the item in Benin City.',
        actionText: 'Browse listings', actionHref: '#/search'
      })}</div>`;
    return;
  }

  const total = cartTotal();
  main.innerHTML = `<div class="container">
    ${crumbs([{ label: 'Home', href: '#/' }, { label: 'Cart' }])}
    <div class="page-head">
      <div><h1>Your cart</h1>
        <div class="page-sub">${items.reduce((s, i) => s + (Number(i.qty) || 1), 0)} item${items.reduce((s, i) => s + (Number(i.qty) || 1), 0) === 1 ? '' : 's'} from ${items.length} listing${items.length === 1 ? '' : 's'} — ${esc(money(total))} subtotal.</div></div>
      <button class="btn btn-ghost" data-clear>${icon('trash')} Clear cart</button>
    </div>

    <div class="cart-list">${items.map(cartRow).join('')}</div>

    <div class="cart-note">${icon('shield')} <span><b>Pay on delivery.</b> WearBenin has no online wallet — you message each vendor on WhatsApp, agree a price, and pay when the item arrives or you collect it in Benin City. Keep the chat as your receipt.</span></div>
  </div>`;

  main.querySelector('[data-clear]').addEventListener('click', () => {
    if ((document.querySelectorAll('.cart-item').length || 0) && confirm('Remove everything from your cart?')) clearCart();
  });
  main.querySelectorAll('[data-step]').forEach(btn => btn.addEventListener('click', () => {
    const row = btn.closest('.cart-item');
    const cur = Number(row.querySelector('[data-qty]').textContent) || 1;
    setQty(row.dataset.id, cur + Number(btn.dataset.step));
    rerenderCartItems(main);
  }));
  main.querySelectorAll('[data-remove]').forEach(btn => btn.addEventListener('click', () => {
    removeFromCart(btn.closest('.cart-item').dataset.id);
    rerenderCartItems(main);
  }));
}

function rerenderCartItems(main) {
  const items = getCart();
  if (!items.length) { renderCart(); return; }
  const total = cartTotal();
  main.querySelector('.cart-list').innerHTML = items.map(cartRow).join('');
  const head = main.querySelector('.page-head .page-sub');
  if (head) head.textContent = `${items.reduce((s, i) => s + (Number(i.qty) || 1), 0)} item${items.reduce((s, i) => s + (Number(i.qty) || 1), 0) === 1 ? '' : 's'} from ${items.length} listing${items.length === 1 ? '' : 's'} — ${money(total)} subtotal.`;
  // re-bind actions
  main.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => {
    const row = b.closest('.cart-item');
    setQty(row.dataset.id, (Number(row.querySelector('[data-qty]').textContent) || 1) + Number(b.dataset.step));
    rerenderCartItems(main);
  }));
  main.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => {
    removeFromCart(b.closest('.cart-item').dataset.id);
    rerenderCartItems(main);
  }));
}
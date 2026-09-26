/* ==========================================================================
   WearBenin v2 — Vendor onboarding
   A guided first-listing flow for someone who has never sold here:
     1 Welcome  ->  2 Your shop  ->  3 Your first item  ->  4 You're live
   Works signed-out: the shop and item are kept as local drafts and replayed
   after sign-in, so a vendor never re-types what they already entered.
   ========================================================================== */

import api from '../api.js';
import { icon } from '../icons.js';
import { esc, qs, qsa, money, imgUrl } from '../util.js';
import { crumbs, toast, toastError, setBusy, fieldHTML, fieldValue } from '../ui.js';
import { setTitle, navigate } from '../router.js';
import { session, refreshUser } from '../session.js';
import { getMeta } from '../shell.js';

const SHOP_KEY = 'wb.onboard.shop';
const ITEM_KEY = 'wb.onboard.item';
const CONDITIONS = ['Brand New', 'Like New', 'Fairly Used', 'Refurbished'];

const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
const clearDrafts = () => { try { localStorage.removeItem(SHOP_KEY); localStorage.removeItem(ITEM_KEY); } catch {} };

export async function renderOnboarding(ctx) {
  setTitle('Start selling on WearBenin');
  const main = qs('#main');
  main.innerHTML = '<div class="container"><div class="route-loading" aria-hidden="true"><div class="sk sk-line w40" style="height:26px"></div><div style="height:20px"></div><div class="sk" style="height:220px;border-radius:14px"></div></div></div>';

  const meta = getMeta() || (await api.meta());
  const categories = (meta && meta.categories) || [];
  const areas = (meta && meta.areas) || [];
  const hasShop = Boolean(session.vendor || (session.user && session.user.role === 'vendor'));

  const state = {
    step: hasShop ? 3 : 1,
    shop: read(SHOP_KEY) || { name: session.user ? (session.user.name || '') : '', area: '', phone: session.user?.phone || '', bio: '' },
    item: read(ITEM_KEY) || { title: '', price: '', category: categories[0]?.id || '', condition: 'Brand New', description: '', images: [] },
    busy: false,
  };
  if (session.vendor) state.shop.name = state.shop.name || session.vendor.name || '';

  const steps = ['Welcome', 'Your shop', 'First item', 'Live'];

  /* ------------------------------------------------------------------ render */
  function paint() {
    const s = state.step;
    main.innerHTML = `<div class="container">
      ${crumbs([{ label: 'Home', href: '#/' }, { label: 'Start selling' }])}
      <ol class="ob-steps">${steps.map((t, i) => `
        <li class="${i + 1 === s ? 'on' : ''} ${i + 1 < s ? 'done' : ''}">
          <span>${i + 1 < s ? icon('check') : i + 1}</span>${esc(t)}</li>`).join('')}</ol>
      <div class="form-card ob-card">${s === 1 ? stepWelcome() : s === 2 ? stepShop() : s === 3 ? stepItem() : stepDone()}</div>
    </div>`;
    wire();
  }

  function stepWelcome() {
    return `<h1>Turn your clothes into cash in Benin City</h1>
      <p class="page-sub">Listing is free while WearBenin is in launch. Buyers find you by area and message you on WhatsApp — you keep the whole price.</p>
      <ul class="ob-perks">
        <li>${icon('tag')}<div><b>Post in about 2 minutes</b><span>Photos, price and your area. No commission at launch.</span></div></li>
        <li>${icon('inbox')}<div><b>Enquiries land in your inbox</b><span>And straight to your WhatsApp, so you can close the sale in chat.</span></div></li>
        <li>${icon('pin')}<div><b>Buyers search by area</b><span>GRA, Uselu, Oba Market, Ekiosa — people nearby see you first.</span></div></li>
        <li>${icon('share')}<div><b>Refer a vendor, earn ₦500</b><span>When another vendor joins and proves they trade.</span></div></li>
      </ul>
      <div class="ob-actions"><button class="btn btn-primary btn-lg" id="ob-next">Start selling ${icon('chevronRight')}</button>
        <a class="btn btn-ghost btn-lg" href="#/how-it-works">How it works</a></div>`;
  }

  function stepShop() {
    return `<h1>Name your shop</h1>
      <p class="page-sub">This is what buyers see. You can change it any time.</p>
      <div class="form-grid">
        ${fieldHTML({ id: 'ob-name', label: 'Shop name', required: true, value: state.shop.name, placeholder: 'e.g. Mama Vero&rsquo;s Ankara' })}
        ${fieldHTML({ id: 'ob-area', label: 'Where you sell from', type: 'select', required: true, value: state.shop.area,
          opts: (areas.length ? areas.map(a => a.name || a.value) : ['New Benin', 'Oba Market', 'Ekiosa', 'Uselu', 'Ring Road', 'GRA', 'Ugbowo']).map(a => ({ value: a, label: a })) })}
        ${fieldHTML({ id: 'ob-phone', label: 'WhatsApp number', required: true, value: state.shop.phone, placeholder: '0803 000 0000', hint: 'Buyers tap this to message you. It is never shown to bots.' })}
      </div>
      <div class="span-2" style="margin-top:18px">
        ${fieldHTML({ id: 'ob-bio', label: 'What do you sell? (optional)', value: state.shop.bio, placeholder: 'Ankara, lace and ready-to-wear for women.' })}
      </div>
      <div class="ob-actions">
        <button class="btn btn-ghost" id="ob-back">${icon('chevronLeft')} Back</button>
        <button class="btn btn-primary btn-lg" id="ob-next">Next: your first item ${icon('chevronRight')}</button>
      </div>`;
  }

  function stepItem() {
    const tiles = state.item.images.map((u, i) => `<div class="upload-tile">
        <img src="${esc(imgUrl(u))}" alt="Photo ${i + 1}">
        ${i === 0 ? '<span class="u-badge">Cover</span>' : ''}
        <button class="u-del" data-ob-del="${i}" aria-label="Remove photo ${i + 1}">${icon('close')}</button></div>`).join('');
    return `<h1>Add your first item</h1>
      <p class="page-sub">One photo and a price is enough. You can add more items straight after.</p>
      <div class="form-grid">
        ${fieldHTML({ id: 'ob-title', label: 'What are you selling?', required: true, value: state.item.title, placeholder: 'e.g. Ankara two-piece set, size 12' })}
        ${fieldHTML({ id: 'ob-price', label: 'Price (₦)', type: 'number', required: true, value: state.item.price, placeholder: '25000' })}
        ${fieldHTML({ id: 'ob-cat', label: 'Category', type: 'select', required: true, value: state.item.category,
          opts: categories.map(c => ({ value: c.id, label: c.name })) })}
        ${fieldHTML({ id: 'ob-cond', label: 'Condition', type: 'select', value: state.item.condition,
          opts: CONDITIONS.map(c => ({ value: c, label: c })) })}
      </div>
      <div class="span-2" style="margin-top:18px">
        <span class="field-label">Photos ${state.item.images.length ? `(${state.item.images.length}/6)` : ''}</span>
        <div class="dropzone" id="ob-drop" tabindex="0" role="button" aria-label="Add photos">
          ${icon('camera')}<b>Tap to add photos</b><span>JPG, PNG or WebP &middot; up to 6 MB each &middot; the first is the cover</span>
        </div>
        <input type="file" id="ob-files" accept="image/png,image/jpeg,image/webp" multiple hidden>
        <div class="upload-grid" id="ob-grid">${tiles}</div>
      </div>
      <div class="ob-actions">
        <button class="btn btn-ghost" id="ob-back">${icon('chevronLeft')} Back</button>
        <button class="btn btn-primary btn-lg" id="ob-publish">${icon('check')} Publish my first ad</button>
      </div>`;
  }

  function stepDone() {
    const slug = state.publishedSlug || '';
    return `<div class="ob-done">
      <span class="ob-tick">${icon('check')}</span>
      <h1>Your shop is live 🎉</h1>
      <p class="page-sub">${esc(state.shop.name || 'Your shop')} is now on WearBenin. Buyers in ${esc(state.shop.area || 'Benin City')} can find your first ad.</p>
      <div class="ob-actions">
        ${slug ? `<a class="btn btn-primary btn-lg" href="#/listing/${esc(slug)}">View my ad</a>` : ''}
        <a class="btn btn-lg" href="#/sell">Add another item</a>
        <a class="btn btn-ghost btn-lg" href="#/referral">${icon('share')} Refer a vendor &middot; earn ₦500</a>
      </div></div>`;
  }

  /* ------------------------------------------------------------------ wiring */
  function wire() {
    const next = qs('#ob-next');
    if (next) next.addEventListener('click', () => {
      if (state.step === 2) { if (!captureShop()) return; }
      state.step = Math.min(4, state.step + 1);
      paint(); window.scrollTo({ top: 0, behavior: 'auto' });
    });

    const back = qs('#ob-back');
    if (back) back.addEventListener('click', () => { state.step = Math.max(1, state.step - 1); paint(); window.scrollTo({ top: 0, behavior: 'auto' }); });

    /* ---- uploads ---- */
    const drop = qs('#ob-drop');
    const files = qs('#ob-files');
    if (drop && files) {
      const addFiles = async (list) => {
        const room = 6 - state.item.images.length;
        const picked = Array.from(list).filter(f => /^image\//.test(f.type || '')).slice(0, room);
        if (!picked.length) { toast(room ? 'Choose JPG, PNG or WebP photos.' : 'You can add up to 6 photos.', 'err'); return; }
        const grid = qs('#ob-grid');
        const holders = picked.map(f => { const d = document.createElement('div'); d.className = 'upload-tile busy'; d.innerHTML = `<img src="${URL.createObjectURL(f)}" alt="uploading"><span class="u-badge">Uploading…</span>`; grid.appendChild(d); return d; });
        try {
          const res = await api.upload(picked);
          const urls = (res && (res.urls || res.files)) || [];
          if (!urls.length) throw new Error('The upload returned no URLs.');
          state.item.images = state.item.images.concat(urls).slice(0, 6);
          write(ITEM_KEY, state.item);
        } catch (e) { toastError(e.status === 413 ? { message: 'One of those photos is larger than 6 MB.' } : e); }
        finally { holders.forEach(h => h.remove()); paint(); }
      };
      drop.addEventListener('click', () => files.click());
      drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); files.click(); } });
      files.addEventListener('change', () => { addFiles(files.files); files.value = ''; });
    }
    qsa('[data-ob-del]').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      state.item.images.splice(Number(b.dataset.obDel), 1);
      write(ITEM_KEY, state.item); paint();
    }));

    /* ---- publish ---- */
    const pub = qs('#ob-publish');
    if (pub) pub.addEventListener('click', publish);
  }

  function captureShop() {
    const name = fieldValue(qs('.form-card'), 'ob-name').trim();
    const area = fieldValue(qs('.form-card'), 'ob-area');
    const phone = fieldValue(qs('.form-card'), 'ob-phone').trim();
    const bio = fieldValue(qs('.form-card'), 'ob-bio').trim();
    if (name.length < 2) { toast('Give your shop a name.', 'err'); return false; }
    if (!area) { toast('Choose where you sell from.', 'err'); return false; }
    if (phone.replace(/\D/g, '').length < 10) { toast('Enter a reachable WhatsApp number.', 'err'); return false; }
    state.shop = { name, area, phone, bio };
    write(SHOP_KEY, state.shop);
    return true;
  }

  function captureItem() {
    const f = qs('.form-card');
    state.item.title = fieldValue(f, 'ob-title').trim();
    state.item.price = fieldValue(f, 'ob-price').trim();
    state.item.category = fieldValue(f, 'ob-cat');
    state.item.condition = fieldValue(f, 'ob-cond');
    state.item.description = state.item.description || `${state.item.title} — available now in ${state.shop.area || 'Benin City'}. Message me on WhatsApp for details, sizes and delivery.`;
    write(ITEM_KEY, state.item);
  }

  async function publish() {
    captureItem();
    if (state.item.title.length < 3) { toast('Describe the item in a few words.', 'err'); return; }
    if (!(Number(state.item.price) >= 100)) { toast('Set a price of at least ₦100.', 'err'); return; }
    if (!state.item.images.length) { toast('Add at least one photo.', 'err'); return; }

    /* Signed out: keep everything, sign in, and come straight back here. */
    if (!session.user) {
      toast('Almost there — sign in to publish your shop.', 'info');
      navigate('/register?role=vendor&next=' + encodeURIComponent('/onboarding'));
      return;
    }

    const btn = qs('#ob-publish');
    setBusy(btn, true, 'Publishing…');
    try {
      /* A buyer account has no vendor row yet — open the shop first. */
      if (!(session.vendor || session.user.role === 'vendor')) {
        await api.openShop({ name: state.shop.name, area: state.shop.area, phone: state.shop.phone, bio: state.shop.bio });
        await refreshUser();
      }
      const res = await api.createListing({
        title: state.item.title,
        description: state.item.description,
        category: state.item.category,
        condition: state.item.condition,
        price: Number(state.item.price),
        area: state.shop.area,
        images: state.item.images,
        negotiable: true,
        delivery: true,
      });
      state.publishedSlug = res?.listing?.slug || res?.slug || '';
      clearDrafts();
      toast('Your shop is live!', 'ok');
      state.step = 4;
      paint();
      window.scrollTo({ top: 0, behavior: 'auto' });
    } catch (e) {
      setBusy(btn, false);
      toastError(e);
    }
  }

  paint();
}
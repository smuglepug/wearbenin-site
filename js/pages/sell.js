/* ==========================================================================
   WearBenin v2 — Post / Edit an ad (multi-step, real uploads to /api/uploads)
   Step 1 details → Step 2 photos → Step 3 pricing & location → Step 4 publish
   ========================================================================== */

import api, { normaliseImages } from '../api.js';
import { icon } from '../icons.js';
import { esc, qs, qsa, money, imgUrl, fmtDate } from '../util.js';
import {
  crumbs, toast, toastError, setBusy, fieldHTML, fieldValue, emptyState, errorState, openModal, authWall
} from '../ui.js';
import { setTitle, navigate } from '../router.js';
import { session, requireAuth, refreshUser } from '../session.js';
import { getMeta } from '../shell.js';

const STEPS = ['Details', 'Photos', 'Pricing & location', 'Publish'];

const CONDITIONS = ['Brand New', 'Like New', 'Fairly Used', 'Refurbished'];

function subcategories(categories, catId) {
  const c = categories.find(x => x.id === catId);
  return (c && c.subs) || [];
}

export async function renderSell(ctx) {
  const editId = ctx.query.edit ? Number(ctx.query.edit) : null;
  setTitle(editId ? 'Edit your ad' : 'Post a free ad');
  const main = qs('#main');
  main.innerHTML = '';
  /* Editing an existing ad always needs the owner; a NEW ad does not. Guests
     build the whole listing first and only meet the sign-in wall at publish
     (the Facebook Marketplace model) - a vendor who has already uploaded six
     photos has a reason to finish, a vendor staring at a login form does not. */
  if (editId && !requireAuth('Sign in to edit your ad.')) {
    main.innerHTML = authWall({
      title: 'Edit your ad',
      sub: 'Sign in to edit the ads on your shop.',
      crumbPath: [{ label: 'Home', href: '#/' }, { label: 'Edit ad' }],
    });
    return;
  }

  const meta = getMeta() || (await api.meta());
  const categories = (meta && meta.categories) || [];
  const areas = (meta && meta.areas) || [];
  main.innerHTML = `<div class="container"><div class="form-card" style="max-width:920px;margin-top:32px">
    <div class="sk sk-line w40" style="height:26px"></div><div style="height:20px"></div>
    ${Array.from({ length: 6 }).map(() => '<div class="sk sk-line w95" style="height:46px;margin-bottom:14px"></div>').join('')}
  </div></div>`;

  /* ---------- working state ---------- */
  const state = {
    step: 1,
    editId,
    id: editId,
    title: '', description: '', category: categories[0] ? categories[0].id : '', subcategory: '',
    condition: 'Brand New', price: '', negotiable: true, area: areas[0] ? areas[0].name : '',
    sizes: '', colors: '', stock: '', delivery: true, images: [], video: ''
  };

  /* Restore whatever the guest had built before the sign-in wall interrupted them. */
  if (!editId) {
    try {
      const rawDraft = localStorage.getItem('wb.draft');
      if (rawDraft) Object.assign(state, JSON.parse(rawDraft));
    } catch { /* an unreadable draft must never block the form */ }
  }

  /* ---------- edit: preload ---------- */
  let existing = null;
  if (editId) {
    try {
      const res = await api.listings({ mine: 1, limit: 200 });
      const items = (res && res.items) || [];
      existing = items.find(x => Number(x.id) === editId);
      if (!existing) {
        try { existing = await api.listing(ctx.query.slug || String(editId)); } catch { existing = null; }
      }
      if (existing) {
        Object.assign(state, {
          title: existing.title || '', description: existing.description || '',
          category: existing.category || state.category, subcategory: existing.subcategory || '',
          condition: existing.condition || 'Brand New', price: existing.price ?? '',
          negotiable: !!existing.negotiable, area: existing.area || state.area,
          sizes: existing.sizes || '', colors: existing.colors || '', stock: existing.stock ?? '',
          delivery: !!existing.delivery, images: normaliseImages(existing.images).slice(), video: existing.video || '',
          id: existing.id, editId: existing.id
        });
      }
    } catch (e) { toast('Could not load that ad for editing.', 'err'); }
  }

  /* ---------- render ---------- */
  function stepper() {
    return `<div class="stepper">${STEPS.map((label, i) => {
      const n = i + 1;
      const cls = state.step === n ? 'active' : state.step > n ? 'done' : '';
      return `<div class="step-item ${cls}">
        <span class="step-bullet">${state.step > n ? icon('check') : n}</span>
        <span class="step-label">${esc(label)}</span>
        ${n < STEPS.length ? '<span class="step-line"></span>' : ''}
      </div>`;
    }).join('')}</div>`;
  }

  function stepDetails() {
    const subs = subcategories(categories, state.category);
    return `
      ${fieldHTML({
        id: 'f-title', label: 'Ad title', required: true, value: state.title, span2: true,
        placeholder: 'e.g. Ankara flare dress, size M — brand new',
        hint: 'Say what it is, the size and the condition. Good titles get 3× more views.'
      })}
      <div class="form-grid">
        ${fieldHTML({
          id: 'f-category', label: 'Category', type: 'select', required: true, value: state.category,
          opts: categories.map(c => ({ value: c.id, label: c.name }))
        })}
        ${fieldHTML({
          id: 'f-subcategory', label: 'Subcategory', type: 'select', value: state.subcategory,
          opts: [{ value: '', label: subs.length ? 'Choose a subcategory…' : 'Select a category first' }]
            .concat(subs.map(s => ({ value: s.id, label: s.name })))
        })}
        ${fieldHTML({
          id: 'f-condition', label: 'Condition', type: 'select', required: true, value: state.condition,
          opts: CONDITIONS.map(c => ({ value: c, label: c }))
        })}
        ${fieldHTML({ id: 'f-sizes', label: 'Available sizes', value: state.sizes, placeholder: 'S, M, L, XL or 41, 42, 43' })}
        ${fieldHTML({ id: 'f-colors', label: 'Colours', value: state.colors, placeholder: 'Gold, black, wine' })}
        ${fieldHTML({ id: 'f-stock', label: 'Quantity in stock', type: 'number', value: state.stock, placeholder: '1' })}
      </div>
      ${fieldHTML({
        id: 'f-description', label: 'Description', type: 'textarea', required: true, value: state.description, span2: true,
        rows: 7, placeholder: 'Fabric, fit, measurements, what is included, any flaws… Buyers in Benin City ask about fabric weight and exact measurements — put them here.'
      })}`;
  }

  function stepPhotos() {
    return `
      <div class="field span-2">
        <span class="field-label">Photos ${state.images.length ? `(${state.images.length}/6)` : ''}</span>
        <div class="dropzone" id="wb-dropzone" tabindex="0" role="button" aria-label="Upload photos">
          ${icon('camera')}
          <b>Tap to add photos, or drag them here</b>
          <span>JPG, PNG or WebP · up to 5 MB each · maximum 6 photos · first photo is the cover</span>
        </div>
        <input type="file" id="wb-files" accept="image/png,image/jpeg,image/webp" multiple hidden>
        <div class="upload-grid" id="wb-upload-grid">
          ${state.images.map((u, i) => uploadTile(u, i)).join('')}
        </div>
        <span class="hint">Uploads go straight to the WearBenin API (<code>/api/uploads</code>) and are stored on the server — nothing is kept in your browser.</span>
      </div>
      <div class="span-2" style="margin-top:22px">
        <span class="field-label">Product video ${state.video ? '(1/1)' : '(optional, but sellers who add one get more chats)'}</span>
        <div class="dropzone" id="wb-vdropzone" tabindex="0" role="button" aria-label="Upload a product video">
          ${icon('camera')}
          <b>Tap to add a short video</b>
          <span>MP4, MOV or WebM &middot; up to 25 MB &middot; 15&ndash;30 seconds works best</span>
        </div>
        <input type="file" id="wb-vfile" accept="video/mp4,video/webm,video/quicktime" hidden>
        <div class="upload-grid" id="wb-vgrid">
          ${state.video ? `<div class="upload-tile"><video src="${esc(imgUrl(state.video))}" muted playsinline preload="metadata"></video><span class="u-badge">Video</span><button class="u-del" data-del-video aria-label="Remove video">${icon('close')}</button></div>` : ''}
        </div>
      </div>
      <div class="span-2" style="margin-top:22px">
        ${fieldHTML({ id: 'f-imageurl', label: 'Or paste an image URL', placeholder: 'https://… (helpful if your photo is already hosted)' })}
        <button class="btn btn-ghost btn-sm" id="wb-add-url" style="margin-top:10px">${icon('plus')} Add URL</button>
      </div>`;
  }

  function uploadTile(u, i) {
    return `<div class="upload-tile" data-img="${i}">
      <img src="${esc(imgUrl(u))}" alt="Photo ${i + 1}">
      ${i === 0 ? '<span class="u-badge">Cover</span>' : ''}
      <button class="u-del" data-del-img="${i}" aria-label="Remove photo ${i + 1}">${icon('close')}</button>
    </div>`;
  }

  function stepPricing() {
    return `<div class="form-grid">
      ${fieldHTML({ id: 'f-price', label: 'Price (₦)', type: 'number', required: true, value: state.price, placeholder: '25000', hint: 'Prices are in Nigerian Naira. Buyers expect a firm, honest number.' })}
      ${fieldHTML({
        id: 'f-area', label: 'Area in Benin City', type: 'select', required: true, value: state.area,
        opts: (areas.length ? areas.map(a => a.name || a.value) : ['New Benin', 'Oba Market', 'Ekiosa', 'Uselu', 'Ring Road', 'GRA', 'Aduwawa'])
          .map(a => ({ value: a, label: a }))
      })}
    </div>
    <div class="stack-16" style="margin-top:22px">
      <label class="check"><input type="checkbox" id="f-negotiable" ${state.negotiable ? 'checked' : ''}>
        <span><b>Price is negotiable</b><br><span class="text-micro text-muted">Buyers will see a green “Negotiable” badge.</span></span></label>
      <label class="check"><input type="checkbox" id="f-delivery" ${state.delivery ? 'checked' : ''}>
        <span><b>I can arrange delivery</b><br><span class="text-micro text-muted">Within Benin City, at a cost you agree in chat.</span></span></label>
    </div>
    <div class="safety-panel" style="margin-top:26px">
      <h4>${icon('shield')} Before you publish</h4>
      <ul>
        <li>${icon('check')} WearBenin is free to list on — no commission at launch.</li>
        <li>${icon('check')} Only list items you own. Counterfeits and prohibited goods are removed and accounts suspended.</li>
        <li>${icon('check')} Meet buyers in public. Our <a href="#/safety" style="color:inherit;text-decoration:underline">safety centre</a> has a checklist.</li>
      </ul>
    </div>`;
  }

  function stepPublish() {
    const cat = categories.find(c => c.id === state.category);
    const subs = subcategories(categories, state.category);
    const sub = subs.find(s => s.id === state.subcategory);
    return `
      <p class="text-small text-muted" style="margin-bottom:18px">Check everything below, then publish. You can edit or mark the ad sold at any time from My Ads.</p>
      <div style="display:grid;grid-template-columns:200px 1fr;gap:24px;align-items:start">
        <div style="aspect-ratio:4/5;border-radius:14px;overflow:hidden;background:var(--line-2);border:1px solid var(--line-2)">
          ${state.images[0] ? `<img src="${esc(imgUrl(state.images[0]))}" alt="cover" style="width:100%;height:100%;object-fit:cover">` : `<div class="img-fallback" style="height:100%">${icon('image')}</div>`}
        </div>
        <div>
          <div class="card-price" style="font-size:24px">${money(state.price || 0)}</div>
          <h3 style="font-size:18px;margin:8px 0 14px">${esc(state.title || '(no title yet)')}</h3>
          <div class="review-line"><span>Category</span><span>${esc(cat ? cat.name : '—')}${sub ? ' › ' + esc(sub.name) : ''}</span></div>
          <div class="review-line"><span>Condition</span><span>${esc(state.condition)}</span></div>
          <div class="review-line"><span>Area</span><span>${esc(state.area)}</span></div>
          <div class="review-line"><span>Negotiable</span><span>${state.negotiable ? 'Yes' : 'Fixed price'}</span></div>
          <div class="review-line"><span>Delivery</span><span>${state.delivery ? 'Offered' : 'Meet in person'}</span></div>
          <div class="review-line"><span>Photos</span><span>${state.images.length}</span></div>
          <div class="review-line"><span>Sizes</span><span>${esc(state.sizes || '—')}</span></div>
        </div>
      </div>
      <div style="margin-top:24px">${fieldHTML({ id: 'f-desc-review', label: 'Description', type: 'textarea', rows: 5, value: state.description, span2: true })}</div>`;
  }

  function currentStepHTML() {
    if (state.step === 1) return stepDetails();
    if (state.step === 2) return stepPhotos();
    if (state.step === 3) return stepPricing();
    return stepPublish();
  }

  function paint() {
    main.innerHTML = `<div class="container">
      ${crumbs([{ label: 'Home', href: '#/' }, { label: editId ? 'Edit ad' : 'Post an ad' }])}
      <div class="page-head">
        <div><h1>${editId ? 'Edit your ad' : 'Post a free ad'}</h1>
          <div class="page-sub">${editId ? 'Changes go live immediately.' : 'Three short steps. Free to list — buyers message you on WhatsApp.'}</div></div>
        <a class="btn btn-ghost" href="#/my-ads">${icon('tag')} My ads</a>
      </div>
      ${stepper()}
      <div class="form-card">
        <form id="wb-sell-form">${currentStepHTML()}
          <div class="form-actions">
            <button class="btn btn-ghost" type="button" id="wb-prev" ${state.step === 1 ? 'disabled style="visibility:hidden"' : ''}>${icon('arrowLeft')} Back</button>
            <div style="display:flex;gap:12px;flex-wrap:wrap">
              <button class="btn btn-ghost" type="button" id="wb-save-draft">Save draft</button>
              ${state.step < 4
                ? `<button class="btn btn-primary btn-lg" type="button" id="wb-next">Continue ${icon('arrowRight')}</button>`
                : `<button class="btn btn-primary btn-lg" type="button" id="wb-publish">${icon('check')} ${editId ? 'Save changes' : 'Publish my ad'}</button>`}
            </div>
          </div>
        </form>
      </div>
    </div>`;

    wire();
  }

  /* ---------- read/write fields ---------- */
  function capture() {
    const f = qs('#wb-sell-form');
    if (!f) return;
    const val = (id) => { const e = f.querySelector('#' + id); return e ? e.value.trim() : undefined; };
    const chk = (id) => { const e = f.querySelector('#' + id); return e ? e.checked : undefined; };
    if (state.step === 1) {
      state.title = val('f-title') ?? state.title;
      state.category = val('f-category') ?? state.category;
      state.subcategory = val('f-subcategory') ?? '';
      state.condition = val('f-condition') ?? state.condition;
      state.sizes = val('f-sizes') ?? state.sizes;
      state.colors = val('f-colors') ?? state.colors;
      state.stock = val('f-stock') ?? state.stock;
      state.description = val('f-description') ?? state.description;
    } else if (state.step === 3) {
      state.price = val('f-price') ?? state.price;
      state.area = val('f-area') ?? state.area;
      state.negotiable = chk('f-negotiable') ?? state.negotiable;
      state.delivery = chk('f-delivery') ?? state.delivery;
    } else if (state.step === 4) {
      const d = val('f-desc-review');
      if (d !== undefined) state.description = d;
    }
  }

  function validate(step) {
    const problems = [];
    if (step === 1) {
      if (!state.title || state.title.length < 8) problems.push('Write a descriptive title (at least 8 characters).');
      if (!state.category) problems.push('Choose a category.');
      if (!state.description || state.description.length < 30) problems.push('Add a description of at least 30 characters — buyers need fabric, fit and measurements.');
    }
    if (step === 2) {
      if (!state.images.length) problems.push('Add at least one photo. Listings with photos get far more replies.');
    }
    if (step === 3) {
      if (!state.price || Number(state.price) <= 0) problems.push('Enter a price in Naira.');
      if (!state.area) problems.push('Choose the area in Benin City.');
    }
    return problems;
  }

  function showProblems(problems) {
    const box = qs('#wb-sell-form');
    let el = qs('#wb-form-problems');
    if (!el) {
      el = document.createElement('div');
      el.id = 'wb-form-problems';
      el.style.margin = '20px 0 0';
      box.insertBefore(el, box.querySelector('.form-actions'));
    }
    el.innerHTML = problems.length
      ? `<div class="inline-error">${icon('alert')}<div>${problems.map(p => `<div>${esc(p)}</div>`).join('')}</div></div>`
      : '';
  }

  /* ---------- wiring ---------- */
  function wire() {
    const f = qs('#wb-sell-form');
    if (!f) return;

    const catSel = f.querySelector('#f-category');
    if (catSel) catSel.addEventListener('change', () => {
      capture();
      state.subcategory = '';
      paint();
    });

    const prev = f.querySelector('#wb-prev');
    if (prev) prev.addEventListener('click', () => { capture(); state.step = Math.max(1, state.step - 1); paint(); });

    const next = f.querySelector('#wb-next');
    if (next) next.addEventListener('click', () => {
      capture();
      const problems = validate(state.step);
      if (problems.length) { showProblems(problems); window.scrollTo({ top: 180, behavior: 'smooth' }); return; }
      showProblems([]);
      state.step = Math.min(4, state.step + 1);
      paint();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    const draft = f.querySelector('#wb-save-draft');
    if (draft) draft.addEventListener('click', () => {
      capture();
      try { localStorage.setItem('wb.draft', JSON.stringify(state)); toast('Draft saved on this device.', 'ok'); }
      catch { toast('Could not save the draft.', 'err'); }
    });

    const pub = f.querySelector('#wb-publish');
    if (pub) pub.addEventListener('click', async () => {
      capture();
      const problems = validate(1).concat(state.images.length ? [] : ['Add at least one photo.']);
      if (problems.length) { showProblems(problems); return; }
      if (!editId && !session.user) {
        try { localStorage.setItem('wb.draft', JSON.stringify(state)); } catch { /* private mode */ }
        toast('Your ad is saved on this device — sign in to publish it.', 'info');
        navigate('/login?next=' + encodeURIComponent('/sell'));
        return;
      }
      setBusy(pub, true, editId ? 'Saving…' : 'Publishing…');
      const body = {
        title: state.title, description: state.description, category: state.category,
        subcategory: state.subcategory || null, condition: state.condition,
        price: Number(state.price), negotiable: !!state.negotiable, area: state.area,
        sizes: state.sizes || null, colors: state.colors || null,
        stock: state.stock === '' ? null : Number(state.stock),
        delivery: !!state.delivery, images: state.images, video: state.video || null
      };
      try {
        let res;
        if (editId) res = await api.updateListing(editId, body);
        else res = await api.createListing(body);
        localStorage.removeItem('wb.draft');
        toast(editId ? 'Ad updated.' : 'Your ad is live!', 'ok');
        const slug = (res && (res.slug || (res.listing && res.listing.slug))) || null;
        navigate(slug ? '/listing/' + slug : '/my-ads');
      } catch (e) {
        setBusy(pub, false);
        if (e.status === 403) {
          openModal({
            title: 'A vendor account is required',
            body: `<div class="inline-error">${icon('alert')}<span>${esc(e.message || 'Only vendor accounts can publish listings.')}</span></div>
              <p class="text-small text-muted" style="margin-top:14px">Your account is registered as a buyer. Ask the WearBenin team to enable vendor access for your account (vendor access is granted from the admin panel in this build).</p>`,
            footer: `<a class="btn btn-ghost" href="#/contact">Contact support</a><button class="btn btn-primary" data-close>OK</button>`
          });
        } else toastError(e);
      }
    });

    /* -------- step 2: uploads -------- */
    if (state.step === 2) {
      const dz = f.querySelector('#wb-dropzone');
      const fileInput = f.querySelector('#wb-files');
      const grid = f.querySelector('#wb-upload-grid');

      const addFiles = async (files) => {
        const list = Array.from(files).slice(0, 6 - state.images.length);
        if (!list.length) { toast('You can add up to 6 photos.', 'err'); return; }
        const placeholders = [];
        list.forEach((file, i) => {
          const idx = state.images.length + i;
          const tile = document.createElement('div');
          tile.className = 'upload-tile busy';
          tile.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="uploading"><span class="u-badge">Uploading…</span>`;
          grid.appendChild(tile);
          placeholders.push(tile);
        });
        try {
          const res = await api.upload(list);
          const urls = (res && (res.urls || res.files)) || [];
          if (!urls.length) throw new Error('The upload returned no URLs.');
          state.images = state.images.concat(urls).slice(0, 6);
        } catch (e) {
          toastError(e.status === 413 ? { message: 'One of those photos is larger than 5 MB.' } : e);
        } finally {
          placeholders.forEach(p => p.remove());
          paint();
        }
      };

      if (dz) {
        dz.addEventListener('click', () => fileInput.click());
        dz.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
        ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('drag'); }));
        ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('drag'); }));
        dz.addEventListener('drop', e => { if (e.dataTransfer.files) addFiles(e.dataTransfer.files); });
      }
      if (fileInput) fileInput.addEventListener('change', () => { addFiles(fileInput.files); fileInput.value = ''; });

      /* -------- optional product video -------- */
      const vdz = f.querySelector('#wb-vdropzone');
      const vInput = f.querySelector('#wb-vfile');
      const addVideo = async (file) => {
        if (!file) return;
        if (!/^video\//.test(file.type || '')) { toast('That file is not a video.', 'err'); return; }
        if (file.size > 25 * 1024 * 1024) { toast('Video must be under 25 MB.', 'err'); return; }
        const grid = f.querySelector('#wb-vgrid');
        if (grid) grid.innerHTML = `<div class="upload-tile busy"><video src="${URL.createObjectURL(file)}" muted playsinline></video><span class="u-badge">Uploading&hellip;</span></div>`;
        try {
          const res = await api.upload([file]);
          const url = (res && ((res.videos && res.videos[0]) || (res.urls && res.urls[0]) || (res.files && res.files[0] && res.files[0].url))) || '';
          if (!url) throw new Error('The upload returned no URL.');
          state.video = url;
        } catch (e) { toastError(e.status === 413 ? { message: 'That video is larger than 25 MB.' } : e); }
        paint();
      };
      if (vdz) {
        vdz.addEventListener('click', () => vInput.click());
        vdz.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); vInput.click(); } });
      }
      if (vInput) vInput.addEventListener('change', () => { addVideo(vInput.files[0]); vInput.value = ''; });
      const delV = f.querySelector('[data-del-video]');
      if (delV) delV.addEventListener('click', e => { e.stopPropagation(); state.video = ''; paint(); });


      qsa('[data-del-img]', grid).forEach(b => b.addEventListener('click', e => {
        e.stopPropagation();
        state.images.splice(Number(b.dataset.delImg), 1);
        paint();
      }));

      const addUrl = f.querySelector('#wb-add-url');
      if (addUrl) addUrl.addEventListener('click', () => {
        const el = f.querySelector('#f-imageurl');
        const url = el.value.trim();
        if (!/^https?:\/\//i.test(url)) { toast('Enter a full image URL starting with http.', 'err'); return; }
        if (state.images.length >= 6) { toast('Maximum 6 photos.', 'err'); return; }
        state.images.push(url); paint();
      });
    }
  }

  paint();
}

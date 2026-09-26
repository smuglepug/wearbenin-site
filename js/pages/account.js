/* ==========================================================================
   WearBenin v2 — Account settings (PATCH /api/me)
   ========================================================================== */

import api from '../api.js';
import { icon } from '../icons.js';
import { esc, qs, fmtDate } from '../util.js';
import { crumbs, errorState, toast, toastError, setBusy, fieldHTML, fieldValue, avatarTag, emptyState, authWall } from '../ui.js';
import { setTitle, navigate } from '../router.js';
import { session, requireAuth, refreshUser, logout } from '../session.js';
import { getMeta } from '../shell.js';

export async function renderAccount(ctx) {
  setTitle('Account settings');
  const main = qs('#main');
  main.innerHTML = '';
  if (!requireAuth('Sign in to manage your account.')) {
    main.innerHTML = authWall({
      title: 'Account settings',
      sub: 'Your name, phone, area and avatar — plus your shop and data controls.',
      crumbPath: [{ label: 'Home', href: '#/' }, { label: 'Account' }]
    });
    return;
  }
  main.innerHTML = `<div class="container">${crumbs([{ label: 'Home', href: '#/' }, { label: 'Account' }])}
    <div class="page-head"><div><h1>Account settings</h1><div class="page-sub">Loading your profile…</div></div></div>
    <div class="sk" style="height:340px;border-radius:18px"></div></div>`;

  let me = session.user;
  try { me = await refreshUser(true) || session.user; } catch (e) { /* fall back to cache */ }
  if (!me) {
    main.innerHTML = `<div class="container" style="padding-top:32px">${errorState({ message: 'We could not load your profile.' }, 'wb-acc-retry')}</div>`;
    qs('#wb-acc-retry').onclick = () => renderAccount(ctx);
    return;
  }

  const meta = getMeta() || (await api.meta().catch(() => null));
  const areas = (meta && meta.areas) || [];
  const vendor = session.vendor;

  main.innerHTML = `<div class="container">
    ${crumbs([{ label: 'Home', href: '#/' }, { label: 'Account' }])}
    <div class="page-head">
      <div><h1>Account settings</h1>
        <div class="page-sub">Update your details, manage your shop and control your data.</div></div>
      <div class="row" style="display:flex;gap:10px;flex-wrap:wrap">
        <a class="btn btn-ghost" href="#/my-ads">${icon('tag')} My ads</a>
        <a class="btn btn-ghost" href="#/inbox">${icon('inbox')} Inbox</a>
        <button class="btn btn-danger" id="wb-logout">${icon('arrowRight')} Sign out</button>
      </div>
    </div>

    <div class="dash">
      <nav class="dash-nav" aria-label="Account">
        <a class="side-link active" href="#/account">${icon('user')} Profile</a>
        <a class="side-link" href="#/saved">${icon('heart')} Saved listings</a>
        <a class="side-link" href="#/saved-searches">${icon('bookmark')} Saved searches</a>
        <a class="side-link" href="#/referral">${icon('share')} Refer a vendor &middot; earn ₦500</a>
        ${vendor && vendor.slug ? `<a class="side-link" href="#/vendor/${esc(vendor.slug)}">${icon('building')} My public shop</a>` : ''}
        <a class="side-link" href="#/legal/data-deletion.html">${icon('lock')} Delete my account</a>
      </nav>

      <div class="stack-24">
        <div class="form-card" style="max-width:none">
          <div style="display:flex;gap:18px;align-items:center;margin-bottom:26px;flex-wrap:wrap">
            ${avatarTag(me.avatar, me.name, 'lg')}
            <div style="min-width:0">
              <h3 style="font-size:var(--fs-h3)">${esc(me.name || 'WearBenin user')}</h3>
              <div class="text-small text-muted">${esc(me.email || '')}</div>
              <div class="row" style="display:flex;gap:8px;margin-top:8px">
                <span class="pill pill-brand">${esc((me.role || 'buyer').toUpperCase())}</span>
                ${vendor && vendor.verified ? `<span class="pill pill-verified">${icon('verified')} Verified vendor</span>` : ''}
                ${me.created_at ? `<span class="pill pill-grey">Member since ${esc(fmtDate(me.created_at))}</span>` : ''}
              </div>
            </div>
          </div>

          <form id="wb-account-form">
            <div class="form-grid">
              ${fieldHTML({ id: 'a-name', label: 'Full name', value: me.name || '', required: true })}
              ${fieldHTML({ id: 'a-phone', label: 'Phone / WhatsApp', type: 'tel', value: me.phone || '', placeholder: '0803 123 4567' })}
              ${fieldHTML({
                id: 'a-area', label: 'Your area', value: me.area || '',
                opts: [{ value: '', label: 'Choose your area…' }].concat(areas.map(a => ({ value: a.name || a.value || a, label: a.name || a.value || a }))),
                type: 'select'
              })}
              ${fieldHTML({ id: 'a-avatar', label: 'Avatar image URL', value: me.avatar || '', placeholder: 'https://…' })}
            </div>
            <div class="form-actions">
              <span class="text-micro text-muted">Email addresses cannot be changed here — see the <a href="#/contact" style="color:var(--brand)">contact page</a>.</span>
              <button class="btn btn-primary btn-lg" type="submit" id="wb-account-save">${icon('check')} Save changes</button>
            </div>
          </form>
        </div>

        ${vendor ? `<div class="form-card" style="max-width:none">
          <h3 style="font-size:var(--fs-h3);margin-bottom:8px">Your shop</h3>
          <p class="text-small text-muted" style="margin-bottom:18px">Manage your shop profile and social handles in the vendor dashboard.</p>
          <div class="stat-grid" style="margin-bottom:20px">
            <div class="stat-card"><div class="label">Shop name</div><div class="value" style="font-size:18px">${esc(vendor.name || '')}</div></div>
            <div class="stat-card"><div class="label">Area</div><div class="value" style="font-size:18px">${esc(vendor.area || '—')}</div></div>
            <div class="stat-card"><div class="label">Rating</div><div class="value" style="font-size:18px">${vendor.rating_avg ? Number(vendor.rating_avg).toFixed(1) : '—'}</div></div>
            <div class="stat-card"><div class="label">Response</div><div class="value" style="font-size:18px">${vendor.response_minutes ? '~' + Number(vendor.response_minutes) + ' min' : '—'}</div></div>
          </div>
          <a class="btn btn-primary" href="#/dashboard?tab=profile">${icon('edit')} Edit shop profile</a>
        </div>` : ''}

        <div class="form-card" style="max-width:none">
          <h3 style="font-size:var(--fs-h3);margin-bottom:8px">Your data</h3>
          <p class="text-small text-muted" style="margin-bottom:16px">
            You can request a copy of everything we hold about you, correct it, or ask us to delete your account and data.
            We answer within 30 days under the Nigeria Data Protection Act 2023.
          </p>
          <div class="row" style="display:flex;gap:12px;flex-wrap:wrap">
            <a class="btn btn-ghost" href="#/legal/privacy.html">${icon('shield')} Privacy policy</a>
            <a class="btn btn-ghost" href="#/legal/data-deletion.html">${icon('trash')} Data deletion procedure</a>
            <a class="btn btn-ghost" href="#/contact">${icon('mail')} Contact us</a>
          </div>
        </div>
      </div>
    </div>
  </div>`;

  qs('#wb-account-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = qs('#wb-account-save');
    const body = {
      name: fieldValue(document, 'a-name').trim(),
      phone: fieldValue(document, 'a-phone'),
      area: fieldValue(document, 'a-area'),
      avatar: fieldValue(document, 'a-avatar')
    };
    if (!body.name) { toast('Your name cannot be empty.', 'err'); return; }
    setBusy(btn, true, 'Saving…');
    try {
      await api.updateMe(body);
      await refreshUser(true);
      toast('Profile updated.', 'ok');
      renderAccount(ctx);
    } catch (err) { setBusy(btn, false); toastError(err); }
  });

  qs('#wb-logout').addEventListener('click', () => { logout(); navigate('/'); });
}
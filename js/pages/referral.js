/* ==========================================================================
   WearBenin v2 — Refer a vendor (₦500 per qualified vendor referral)
   ========================================================================== */

import api from '../api.js';
import { icon } from '../icons.js';
import { esc, qs, money, fmtDate } from '../util.js';
import { crumbs, skeletonCards, errorState, toast, toastError, authWall } from '../ui.js';
import { setTitle } from '../router.js';
import { requireAuth } from '../session.js';

const STATUS_LABEL = {
  pending: 'Invited — waiting on proof',
  proof_submitted: 'Proof received — under review',
  qualified: 'Paid',
  rejected: 'Rejected',
};

export async function renderReferral(ctx) {
  setTitle('Refer a vendor — earn ₦500');
  const main = qs('#main');
  main.innerHTML = '';

  if (!requireAuth('Sign in to get your referral link and track your earnings.')) {
    main.innerHTML = authWall({
      title: 'Refer a vendor',
      sub: 'Bring another vendor to WearBenin and earn ₦500 when they join and show proof of trading.',
      crumbPath: [{ label: 'Home', href: '#/' }, { label: 'Refer a vendor' }],
    });
    return;
  }

  main.innerHTML = `<div class="container">
    ${crumbs([{ label: 'Home', href: '#/' }, { label: 'Refer a vendor' }])}
    <div class="page-head"><div><h1>Refer a vendor</h1><div class="page-sub">Loading your referral link…</div></div></div>
    ${skeletonCards(2)}
  </div>`;

  let data;
  try { data = await api.referral(); }
  catch (e) {
    main.innerHTML = `<div class="container" style="padding-top:32px">${errorState(e, 'wb-ref-retry')}</div>`;
    const b = qs('#wb-ref-retry'); if (b) b.onclick = () => renderReferral(ctx);
    return;
  }

  const p = data.program || {};
  const s = data.stats || {};
  const link = data.link || '';
  const slotPct = p.budget ? Math.min(100, Math.round((p.spent / p.budget) * 100)) : 0;
  const closed = !p.active;

  const rows = (data.referrals || []).map((r) => `<li class="ref-row">
      <div class="ref-who">${esc(r.referred_name || 'Invited vendor')}<span class="ref-when">${esc(fmtDate(r.created_at) || '')}</span></div>
      <span class="ref-status ${r.status === 'qualified' ? 'is-paid' : ''}">${esc(STATUS_LABEL[r.status] || r.status)}</span>
      <span class="ref-amount">${r.status === 'qualified' ? money(r.amount) : '—'}</span>
    </li>`).join('');

  const attached = data.attached;
  const proofBlock = (attached && attached.status !== 'qualified') ? `
    <section class="panel ref-proof">
      <h2>${icon('check')} Prove you trade, and your referrer gets paid</h2>
      <p class="text-muted">You were invited by <b>${esc(attached.referrer_name || 'a WearBenin vendor')}</b>.
        ${attached.is_vendor ? 'Add proof of trading — a link to your shop page, Instagram, or a market photo — and the ₦500 is released.' : 'Referrals only pay on <b>vendor accounts</b>. Switch to a vendor account, then add proof of trading.'}</p>
      <div class="form-grid">
        <label class="field"><span>Link to proof (shop page, Instagram, market photo…)</span>
          <input id="ref-proof-url" type="url" placeholder="https://instagram.com/yourshop" value="${esc(attached.proof_url || '')}"></label>
        <label class="field"><span>How and where do you trade?</span>
          <textarea id="ref-proof-note" rows="3" placeholder="I sell ankara and lace at Ekiosa market every Saturday.">${esc(attached.proof_note || '')}</textarea></label>
      </div>
      <button class="btn btn-primary" id="ref-proof-send">${icon('check')} Submit proof</button>
    </section>` : (attached && attached.status === 'qualified' ? `
    <section class="panel ref-proof"><h2>${icon('check')} Referral complete</h2>
      <p class="text-muted">Your proof was accepted and ₦${attached.amount} was credited to ${esc(attached.referrer_name || 'your referrer')}. Thank you.</p></section>` : '');

  main.innerHTML = `<div class="container">
    ${crumbs([{ label: 'Home', href: '#/' }, { label: 'Refer a vendor' }])}

    <section class="panel ref-hero">
      <div>
        <span class="ref-kicker">${icon('sparkle')} Vendor referral programme</span>
        <h1>Earn ₦${p.per_referral || 500} for every vendor you bring</h1>
        <p class="text-muted">Share your link. When the person you invite joins as a <b>vendor</b> and submits proof of trading, ₦${p.per_referral || 500} is credited to you.
          The programme ends when ₦${(p.budget || 30000).toLocaleString('en-NG')} has been paid out.</p>
      </div>
      <div class="ref-budget">
        <div class="ref-budget-top"><span>${money(p.spent || 0)} paid out</span><span>${esc(String(p.slots_left ?? 0))} slots left</span></div>
        <div class="ref-bar"><span style="width:${slotPct}%"></span></div>
        <div class="ref-budget-sub">of ₦${(p.budget || 30000).toLocaleString('en-NG')} total${closed ? ' · programme closed' : ''}</div>
      </div>
    </section>

    <section class="panel ref-share">
      <h2>Your referral link</h2>
      <div class="ref-code-row">
        <code id="ref-code">${esc(data.code || '')}</code>
        <button class="btn btn-ghost btn-sm" id="ref-copy">${icon('copy') || ''} Copy link</button>
        <a class="btn btn-primary btn-sm" id="ref-share" href="#" target="_blank" rel="noopener">${icon('whatsapp') || ''} Share on WhatsApp</a>
      </div>
      <div class="ref-stats">
        <div><b>${esc(String(s.invited || 0))}</b><span>Invited</span></div>
        <div><b>${esc(String(s.qualified || 0))}</b><span>Qualified</span></div>
        <div><b>${money(s.earned || 0)}</b><span>Earned</span></div>
      </div>
      <p class="ref-req">${esc(data.requirements || '')}</p>
    </section>

    ${proofBlock}

    <section class="panel">
      <h2>Your referrals</h2>
      ${rows ? `<ul class="ref-list">${rows}</ul>` : '<p class="text-muted">No referrals yet. Share your link to get started.</p>'}
    </section>
  </div>`;

  /* copy link */
  const copyBtn = qs('#ref-copy');
  if (copyBtn) copyBtn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(link); toast('Referral link copied.', 'ok'); }
    catch { toast('Copy failed — long-press the code to copy it.', 'err'); }
  });

  /* share link */
  const share = qs('#ref-share');
  if (share) share.href = `https://wa.me/?text=${encodeURIComponent(`Join me on WearBenin, Benin City's clothing marketplace. List your shop free and reach more buyers: ${link}`)}`;

  /* proof submission */
  const send = qs('#ref-proof-send');
  if (send) send.addEventListener('click', async () => {
    const proof_url = (qs('#ref-proof-url')?.value || '').trim();
    const note = (qs('#ref-proof-note')?.value || '').trim();
    if (!proof_url && !note) { toast('Add a link or describe how you trade.', 'err'); return; }
    send.disabled = true;
    try {
      const res = await api.submitReferralProof({ proof_url, note });
      toast(res.message || 'Proof submitted.', res.paid ? 'ok' : 'info');
      renderReferral(ctx);
    } catch (e) { toastError(e); send.disabled = false; }
  });
}
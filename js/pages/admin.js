/* ==========================================================================
   WearBenin v2 — Admin panel (x-admin-token, stats / reports / verify / remove)
   ========================================================================== */

import api from '../api.js';
import { icon } from '../icons.js';
import { esc, qs, qsa, timeAgo, fmtDate, money } from '../util.js';
import { crumbs, toast, toastError, confirmDialog, setBusy, statCard, emptyState, errorState } from '../ui.js';
import { setTitle } from '../router.js';

const TOKEN_KEY = 'wb.adminToken';
const TABS = [['overview', 'Overview'], ['reports', 'Report queue'], ['vendors', 'Verify vendors']];

export async function renderAdmin(ctx) {
  setTitle('Admin');
  const tab = TABS.some(t => t[0] === ctx.query.tab) ? ctx.query.tab : 'overview';
  const main = qs('#main');
  const token = localStorage.getItem(TOKEN_KEY) || '';

  main.innerHTML = `<div class="container">
    ${crumbs([{ label: 'Home', href: '#/' }, { label: 'Admin' }])}
    <div class="page-head">
      <div><h1>Admin panel</h1>
        <div class="page-sub">Moderation queue and platform health. Access requires the server&rsquo;s <code>ADMIN_TOKEN</code> (sent as the <code>x-admin-token</code> header).</div></div>
    </div>
    <div class="admin-gate">
      <div class="field">
        <label for="wb-admin-token">Admin token</label>
        <input class="input" id="wb-admin-token" type="password" value="${esc(token)}" placeholder="paste the ADMIN_TOKEN from server/.env" autocomplete="off">
        <span class="hint">Stored in your browser only — it is never sent anywhere except the WearBenin API.</span>
      </div>
      <button class="btn btn-primary btn-lg btn-block" id="wb-admin-go" style="margin-top:16px">${icon('lock')} Unlock admin</button>
      <p class="text-micro text-muted" style="margin-top:14px">Set <code>ADMIN_TOKEN</code> in <code>server/.env</code> (see <code>.env.example</code>) and restart the server.</p>
    </div>
    <div id="wb-admin-panel"></div>
  </div>`;

  const go = qs('#wb-admin-go');
  go.addEventListener('click', async () => {
    const t = qs('#wb-admin-token').value.trim();
    if (!t) { toast('Paste the admin token first.', 'err'); return; }
    setBusy(go, true, 'Checking…');
    try {
      await api.adminStats(t);
      localStorage.setItem(TOKEN_KEY, t);
      setBusy(go, false);
      toast('Admin access granted.', 'ok');
      loadAdmin(tab, t, ctx);
    } catch (e) {
      setBusy(go, false);
      localStorage.removeItem(TOKEN_KEY);
      const box = qs('#wb-admin-panel');
      box.innerHTML = `<div class="state-box" style="margin-top:32px">
        <h3>Access denied</h3>
        <p>${esc(e.status === 403 ? 'That token does not match the server’s ADMIN_TOKEN.' : e.message || 'Could not reach the admin API.')}</p></div>`;
    }
  });

  if (token) {
    try { await api.adminStats(token); loadAdmin(tab, token, ctx); }
    catch { localStorage.removeItem(TOKEN_KEY); }
  }
}

async function loadAdmin(tab, token, ctx) {
  const panel = qs('#wb-admin-panel');
  panel.innerHTML = `<div class="sk" style="height:260px;border-radius:18px;margin-top:32px"></div>`;

  let stats = null, reports = null, vendors = null;
  const [s, r, v] = await Promise.allSettled([
    api.adminStats(token),
    api.adminReports(token),
    api.vendors({ limit: 100 })
  ]);
  if (s.status === 'fulfilled') stats = s.value;
  if (r.status === 'fulfilled') reports = r.value;
  if (v.status === 'fulfilled') vendors = v.value;

  if (!stats) {
    panel.innerHTML = `<div style="margin-top:32px">${errorState({ message: 'The admin API rejected that token or is unreachable.' }, 'wb-admin-retry')}</div>`;
    const b = qs('#wb-admin-retry'); if (b) b.onclick = () => loadAdmin(tab, token, ctx);
    return;
  }

  const st = stats.stats || stats;
  const reportItems = (reports && (reports.items || reports)) || [];
  const vendorItems = (vendors && (vendors.items || vendors)) || [];
  const pending = reportItems.filter(x => String(x.status || 'pending') === 'pending');

  panel.innerHTML = `<div class="section-head" style="margin-top:44px">
      <div><h2>Moderation</h2><div class="section-sub">Signed in with an admin token · ${pending.length} report${pending.length === 1 ? '' : 's'} awaiting review</div></div>
      <div class="tab-row" style="border:0">
        ${TABS.map(([k, label]) => `<a class="tab ${tab === k ? 'active' : ''}" href="#/admin?tab=${k}">${esc(label)}</a>`).join('')}
      </div>
    </div>
    ${tab === 'overview' ? overviewPanel(st, reportItems, vendorItems) : ''}
    ${tab === 'reports' ? reportsPanel(reportItems, token, ctx) : ''}
    ${tab === 'vendors' ? vendorsPanel(vendorItems, token, ctx) : ''}`;

  if (tab === 'reports') wireReports(token, ctx);
  if (tab === 'vendors') wireVendors(token, ctx);
}

function num(v) { return Number(v || 0).toLocaleString('en-NG'); }

function overviewPanel(st, reports, vendors) {
  const byReason = {};
  reports.forEach(r => { byReason[r.reason || 'other'] = (byReason[r.reason || 'other'] || 0) + 1; });
  return `<div class="stack-24">
    <div class="stat-grid" style="margin-bottom:0">
      ${statCard('Listings', num(st.listings || st.total_listings))}
      ${statCard('Users', num(st.users || st.total_users))}
      ${statCard('Vendors', num(st.vendors || st.total_vendors) || String(vendors.length))}
      ${statCard('New today', num(st.new_today || st.newToday))}
    </div>
    <div class="stat-grid" style="margin-bottom:0">
      ${statCard('Open reports', num(st.open_reports ?? reports.filter(r => String(r.status || 'pending') === 'pending').length))}
      ${statCard('Verified vendors', num(st.verified_vendors ?? vendors.filter(v => v.verified).length))}
      ${statCard('Sold listings', num(st.sold_listings))}
      ${statCard('Total views', num(st.views || st.total_views))}
    </div>

    <div class="form-card" style="max-width:none">
      <h3 style="font-size:var(--fs-h3);margin-bottom:14px">Reports by reason</h3>
      ${Object.keys(byReason).length ? `<table class="spec-table"><tbody>
        ${Object.keys(byReason).map(k => `<tr><th>${esc(k.replace(/_/g, ' '))}</th><td>${byReason[k]}</td></tr>`).join('')}
      </tbody></table>` : '<p class="text-small text-muted">No reports have been filed yet.</p>'}
    </div>

    <div class="inline-error" style="background:#FFF7ED;border-color:#FED7AA;color:#7C2D12">${icon('info')}
      <span><b>Scope note:</b> the admin API in this build covers stats, the report queue, listing removal and vendor verification — exactly the four endpoints in the frozen spec. Anything else is handled from the database directly.</span></div>
  </div>`;
}

function reportsPanel(reports, token, ctx) {
  if (!reports.length) return emptyState({ title: 'Nothing to moderate', text: 'No reports have been filed against any listing or vendor. The queue is clear.', actionText: 'Back to overview', actionHref: '#/admin?tab=overview' });
  return `<div class="table-wrap"><table class="data">
    <thead><tr><th>Reported</th><th>Reason</th><th>Details</th><th>Filed</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${reports.map(r => `<tr>
      <td><b>${esc(r.listing_title || r.vendor_name || ('Listing #' + (r.listing_id || '—')))}</b>
        ${r.listing_slug ? `<div class="text-micro"><a href="#/listing/${esc(r.listing_slug)}" style="color:var(--brand)">view listing</a></div>` : ''}</td>
      <td><span class="pill pill-amber">${esc(String(r.reason || 'other').replace(/_/g, ' '))}</span></td>
      <td style="max-width:320px"><span class="text-small">${esc(r.details || '—')}</span></td>
      <td>${esc(timeAgo(r.created_at))}</td>
      <td>${String(r.status || 'pending') === 'pending' ? '<span class="pill pill-amber">Pending</span>' : `<span class="pill pill-grey">${esc(r.status)}</span>`}</td>
      <td><div class="td-actions">
        ${r.listing_id ? `<button class="btn btn-danger btn-sm" data-remove="${esc(r.listing_id)}" data-label="${esc(r.listing_title || ('#' + r.listing_id))}">${icon('ban')} Remove listing</button>` : ''}
        ${r.vendor_id ? `<button class="btn btn-ghost btn-sm" data-verify="${esc(r.vendor_id)}">${icon('verified')} Verify vendor</button>` : ''}
      </div></td>
    </tr>`).join('')}</tbody></table></div>`;
}

function vendorsPanel(vendors, token, ctx) {
  if (!vendors.length) return emptyState({ title: 'No vendors found', text: 'The vendor list came back empty.', actionText: 'Back to overview', actionHref: '#/admin?tab=overview' });
  return `<div class="table-wrap"><table class="data">
    <thead><tr><th>Shop</th><th>Area</th><th>Rating</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${vendors.map(v => `<tr>
      <td><b>${esc(v.name)}</b><div class="text-micro"><a href="#/vendor/${esc(v.slug)}" style="color:var(--brand)">view shop</a></div></td>
      <td>${esc(v.area || '—')}</td>
      <td>${v.rating_avg ? Number(v.rating_avg).toFixed(1) + ' / 5 (' + Number(v.rating_count || 0) + ')' : '—'}</td>
      <td>${v.verified ? '<span class="pill pill-verified">Verified</span>' : '<span class="pill pill-grey">Unverified</span>'}</td>
      <td><div class="td-actions">
        <button class="btn ${v.verified ? 'btn-ghost' : 'btn-soft'} btn-sm" data-verify="${esc(v.id)}" data-verified="${v.verified ? 1 : 0}">
          ${v.verified ? icon('ban') + ' Unverify' : icon('verified') + ' Verify'}</button>
      </div></td>
    </tr>`).join('')}</tbody></table></div>`;
}

function wireReports(token, ctx) {
  qsa('[data-remove]').forEach(b => b.addEventListener('click', () => {
    confirmDialog({
      title: 'Remove this listing?',
      text: `“${b.dataset.label}” will be taken down from WearBenin. Vendors are not emailed automatically in this build.`,
      confirmText: 'Remove listing',
      danger: true,
      onConfirm: async () => {
        await api.adminRemoveListing(token, b.dataset.remove);
        toast('Listing removed.', 'ok');
        loadAdmin('reports', token, ctx);
      }
    });
  }));
  qsa('[data-verify]').forEach(b => b.addEventListener('click', async () => {
    try {
      await api.adminVerifyVendor(token, b.dataset.verify, true);
      toast('Vendor verified.', 'ok');
      loadAdmin('reports', token, ctx);
    } catch (e) { toastError(e); }
  }));
}

function wireVendors(token, ctx) {
  qsa('[data-verify]').forEach(b => b.addEventListener('click', async () => {
    const id = b.dataset.verify;
    const nowVerified = b.dataset.verified === '1';
    try {
      await api.adminVerifyVendor(token, id, !nowVerified);
      toast(nowVerified ? 'Verification removed.' : 'Vendor verified.', 'ok');
      loadAdmin('vendors', token, ctx);
    } catch (e) { toastError(e); }
  }));
}
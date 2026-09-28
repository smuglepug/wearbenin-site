/* ==========================================================================
   Transparency page — public, verifiable numbers.

   This is the cheapest trust instrument a young marketplace has: a competitor
   cannot fake our own database's counts, and publishing how many ads we removed
   is something a dishonest marketplace simply cannot do. It also makes our own
   promises checkable ("ratings are real") instead of marketing copy.

   Layout/classes follow pages/static.js so it matches the rest of the site.
   ========================================================================== */

import api from '../api.js';
import { setTitle } from '../router.js';
import { crumbs, skeletonLines } from '../ui.js';

function stat(label, value, sub) {
  return `<div class="tp-stat">
    <div class="tp-stat-v">${value}</div>
    <div class="tp-stat-k">${label}</div>
    ${sub ? `<div class="tp-stat-s">${sub}</div>` : ''}
  </div>`;
}

export async function renderTransparency() {
  setTitle('Transparency — how WearBenin works');
  const main = document.getElementById('main');
  if (!main) return;

  main.innerHTML = `
    <div class="wrap">
      ${crumbs([{ href: '#/', label: 'Home' }, { label: 'Transparency' }])}
      <div class="tp-head">
        <h1>What WearBenin is doing — in numbers</h1>
        <p class="lede">We publish the figures that are easiest to hide. If something here looks wrong,
           report it and we will correct it.</p>
      </div>
      <div id="wb-tp">${skeletonLines(6)}</div>
    </div>`;

  let t;
  try {
    t = await api.transparency();
  } catch (e) {
    document.getElementById('wb-tp').innerHTML = `<div class="empty-state">
      <b>We could not load these numbers right now.</b>
      <span>Please try again in a moment.</span></div>`;
    return;
  }

  const l = t.listings;
  const g = t.integrity;
  const removedPct = l.total ? Math.round((l.removedByModeration / l.total) * 100) : 0;

  document.getElementById('wb-tp').innerHTML = `
    <section class="card tp-card">
      <h2>Right now</h2>
      <div class="tp-grid">
        ${stat('Live ads', l.active, `${l.total} ever posted`)}
        ${stat('Shops', t.vendors.total, `${t.vendors.verified} verified`)}
        ${stat('Accounts', t.accounts, 'all real signups')}
        ${stat('Ads sold', l.sold, 'marked sold by the vendor')}
      </div>
    </section>

    <section class="card tp-card">
      <h2>Reviews on this site</h2>
      <p class="text-muted text-small">
        Total written: <b>${t.reviews.total}</b>${t.reviews.total ? ` · average ${t.reviews.average}/5` : ''}.
        These are the only star ratings that exist.
      </p>
      <div class="tp-grid">
        ${stat('Ratings shown on shops', g.displayedRatings, 'summed across every shop')}
        ${stat('Real reviews behind them', g.realReviews, 'rows in our database')}
        ${stat('Match?', g.ratingsBackedByRealReviews ? 'Yes' : 'Recalculating',
          g.ratingsBackedByRealReviews ? 'nothing is invented' : 'a shop may be stale')}
      </div>
      <p class="tp-note ${g.ratingsBackedByRealReviews ? 'is-ok' : 'is-warn'}">
        ${g.ratingsBackedByRealReviews ? '✓' : '!'} ${g.note}
      </p>
    </section>

    <section class="card tp-card">
      <h2>Reports and moderation</h2>
      <p class="text-muted text-small">Anyone can report an ad, signed in or not, from any listing page.</p>
      <div class="tp-grid">
        ${stat('Reports received', t.reports.total, 'all time')}
        ${stat('Still open', t.reports.open, 'awaiting a decision')}
        ${stat('Resolved', t.reports.resolved, t.reports.medianResolutionHours !== null
          ? `median ${t.reports.medianResolutionHours}h` : 'no median yet')}
        ${stat('Ads taken down', l.removedByModeration, removedPct ? `${removedPct}% of all ads` : 'none yet')}
      </div>
    </section>

    <section class="card tp-card">
      <h2>What we do not do</h2>
      <ul class="tp-list">
        ${t.whatWeDoNotDo.map((x) => `<li>${x}</li>`).join('')}
      </ul>
    </section>

    <p class="text-small text-muted" style="margin:18px 0 6px">
      Figures generated ${new Date(t.generatedAt).toUTCString()} · no personal data is published here.
    </p>
    <p class="text-small">
      <a href="#/help">Help &amp; FAQ</a> ·
      <a href="#/legal/terms.html">Terms</a> ·
      <a href="#/legal/privacy.html">Privacy</a>
    </p>`;
}

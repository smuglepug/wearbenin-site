/* ==========================================================================
   WearBenin v2 — static content pages: About, How it works, Safety centre,
   Help/FAQ, Contact, Legal passthrough, 404
   ========================================================================== */

import { icon } from '../icons.js';
import { esc, qs, qsa } from '../util.js';
import { crumbs, emptyState } from '../ui.js';
import { setTitle, navigate } from '../router.js';
import { siteSocialRow, shareMarketplaceButton, siteSocialLinks } from '../social.js';
import { getMeta } from '../shell.js';

const CFG = () => window.WB_CONFIG || {};
const BRAND = () => CFG().brand || {};

function page(title, sub, inner) {
  return `<div class="container"><div class="prose-page">
    ${crumbs([{ label: 'Home', href: '#/' }, { label: title }])}
    <h1>${esc(title)}</h1>
    <p class="lede">${esc(sub)}</p>
    ${inner}
  </div></div>`;
}

/* ------------------------------------------------------------------ About */
export function renderAbout() {
  setTitle('About WearBenin');
  const meta = getMeta() || {};
  const stats = (meta && meta.stats) || {};
  qs('#main').innerHTML = page('About WearBenin',
    "We are building the fashion marketplace Benin City deserves — market prices, real vendors, and none of the guesswork.",
    `<div class="trust-strip" style="margin:32px 0 40px">
      <div class="trust-item"><div><b>${(stats.listings || 0).toLocaleString('en-NG')}</b><span>live listings</span></div></div>
      <div class="trust-item"><div><b>${(stats.vendors || 0).toLocaleString('en-NG')}</b><span>vendors across Edo State</span></div></div>
      <div class="trust-item"><div><b>${(stats.newToday || 0).toLocaleString('en-NG')}</b><span>posted today</span></div></div>
      <div class="trust-item"><div><b>₦0</b><span>commission at launch</span></div></div>
    </div>

    <h2>Why we exist</h2>
    <p>Fashion in Benin City moves through relationships — the tailor on Sapele Road who knows your measurements, the fabric stall in Ekiosa where the price depends on how well you can bargain. What it has never had is a place online where that market is legible: real photos, real prices in Naira, real areas, and a vendor you can message before you commit.</p>
    <p>WearBenin is that place. It borrows the parts of Jiji that work — a search-first header, categories with live counts, price-first cards, an area selector — and pairs them with the care of a fashion retailer instead of a classifieds utility. Bigger photographs. Real descriptions. Vendors who answer.</p>

    <h2>What we are not</h2>
    <ul>
      <li>We are not a shop. Every item is sold by an independent vendor, and you deal with them directly.</li>
      <li>We are not a payment processor. Nothing is charged to a card on WearBenin — you agree the price in chat and pay on handover.</li>
      <li>We are not a warehouse. Items are where the vendor is, usually a market stall or a home workshop.</li>
    </ul>

    <h2>How we make money</h2>
    <p>Listings are free while we are in launch. Later, promoted placements and a small optional commission on verified shops will be the only paid products — never a fee to browse, never a fee to message a vendor. The full schedule is published on our <a href="#/legal/fees.html">fees page</a>.</p>

    <h2>Where we are</h2>
    <p>WearBenin is built in Benin City, Edo State. Vendor coverage today spans Oba Market, Ekiosa, New Benin, Ring Road, Uselu, Sapele Road, GRA, Ugbowo, Ikpoba Hill, Aduwawa, Uzebu and Ogbe.</p>

    <h2>Talk to us</h2>
    <p>Questions, problems, or a vendor you think we should onboard? <a href="#/contact">Contact the team</a>, or join the WhatsApp community.</p>
    <div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap">${shareMarketplaceButton('btn btn-ghost')}</div>
    <div style="margin-top:20px">${siteSocialRow()}</div>`
  );
}

/* ------------------------------------------------------------------ How it works */
export function renderHowItWorks() {
  setTitle('How it works');
  qs('#main').innerHTML = page('How WearBenin works',
    'Three steps to buy, three steps to sell — and a clear explanation of what happens to your money.',
    `<div class="steps" style="margin:32px 0 44px">
      <div class="step"><div class="step-num">1</div><h3>Search or browse</h3>
        <p>Use the search bar, the category sidebar or the area chips. Filter by condition, price range, negotiable items and verified vendors. Every card shows the price first, then the title — because that is the order buyers actually think in.</p></div>
      <div class="step"><div class="step-num">2</div><h3>Chat on WhatsApp</h3>
        <p>Tap <b>Chat on WhatsApp</b> on any listing. The message opens already written with the item name and its price, so the vendor knows exactly what you want. Ask about size, fabric, measurements and delivery.</p></div>
      <div class="step"><div class="step-num">3</div><h3>Meet, inspect, pay</h3>
        <p>Agree a public meeting point, inspect the item in daylight, then pay in cash or by transfer on handover. WearBenin never holds your money and never asks for card details.</p></div>
    </div>

    <h2>For buyers</h2>
    <ul>
      <li><b>Save favourites.</b> The heart on any card stores the listing under <a href="#/saved">Saved</a> so you can shortlist before you message anyone.</li>
      <li><b>Save a search.</b> Store "agbada under ₦60k in New Benin" once and re-run it whenever you like.</li>
      <li><b>Check the vendor.</b> Verified shops carry a green tick. Every shop page shows rating, review count and typical reply time.</li>
      <li><b>Report anything suspicious.</b> The report button on every listing sends it to our trust &amp; safety queue.</li>
    </ul>

    <h2>For vendors</h2>
    <ul>
      <li><b>Post in three steps.</b> Details, photos, price and area. Photos upload straight to the platform — you do not need image hosting.</li>
      <li><b>Keep your shop in order.</b> The <a href="#/dashboard">dashboard</a> tracks views per ad and lets you edit, mark sold or delete in a click.</li>
      <li><b>Link your socials.</b> Add Instagram, TikTok, Facebook, X and WhatsApp and they appear as brand buttons on your shop and every listing.</li>
      <li><b>Reply fast.</b> Vendors who answer within the hour sell noticeably more. Your typical reply time is shown to buyers.</li>
    </ul>

    <h2>What happens to your money</h2>
    <p>Nothing, on-platform. WearBenin is an introduction service: we show the item, connect you with the vendor, and step out of the way. Payment happens directly between you and the vendor on handover. Read the <a href="#/legal/payments-delivery.html">payments &amp; delivery terms</a> and the <a href="#/legal/refunds-disputes.html">refunds &amp; disputes policy</a> for the detail, including how disputes escalate.</p>

    <h2>Safety in three lines</h2>
    <ul>
      <li>Meet in a busy public place — Ogbe Stadium, Ring Road, or inside a bank.</li>
      <li>Inspect before you pay. Never send a deposit for something you have not seen.</li>
      <li>If it feels wrong, walk away and report it. Read the full <a href="#/safety">safety centre</a>.</li>
    </ul>`
  );
}

/* ------------------------------------------------------------------ Safety centre */
export function renderSafety() {
  setTitle('Safety centre');
  qs('#main').innerHTML = page('Safety centre',
    'How to buy and sell on WearBenin without getting burned. Ten minutes here is worth more than any refund.',
    `<div class="safety-panel" style="margin:28px 0 40px">
      <h4>${icon('shield')} The five rules</h4>
      <ul>
        <li>${icon('check')} <b>Meet in public.</b> Ogbe Stadium, Ring Road, the front of a bank, a busy market stall. Never a private address on a first meeting.</li>
        <li>${icon('check')} <b>Inspect before you pay.</b> Check stitching, fabric, sizes and flaws in daylight.</li>
        <li>${icon('check')} <b>Never pay a deposit</b> for an item you have not seen, and never send airtime, gift cards or crypto.</li>
        <li>${icon('check')} <b>Keep the chat.</b> Your WhatsApp conversation with the vendor is your evidence if anything goes wrong.</li>
        <li>${icon('check')} <b>Report early.</b> The report button is on every listing — one report can protect the next buyer.</li>
      </ul>
    </div>

    <h2>Red flags</h2>
    <ul>
      <li>The vendor asks you to pay before viewing, or says "many people are asking" to rush you.</li>
      <li>The price is far below every other listing for the same item — especially for phones, brands and designer labels.</li>
      <li>The photos appear on other listings or look like catalogue images rather than a real stall.</li>
      <li>The vendor refuses a public meeting point, or insists on a "delivery agent" you have never heard of.</li>
      <li>They ask for your bank PIN, OTP, BVN or a screenshot of your banking app. No legitimate vendor ever needs these.</li>
    </ul>

    <h2>If something goes wrong</h2>
    <ul>
      <li>Stop the transaction immediately and do not send further money.</li>
      <li>Report the listing from its page, or email <a href="mailto:${esc(BRAND().support || '')}">${esc(BRAND().support || 'support@wearbenin.ng')}</a> with the listing link and screenshots.</li>
      <li>Escalate to the Nigeria Police Force cybercrime unit if money was taken — keep the chat, the account number and the time of transfer.</li>
      <li>Read the <a href="#/legal/refunds-disputes.html">refunds &amp; disputes policy</a> for the full escalation route, including mediation and the courts of Edo State.</li>
    </ul>

    <h2>Safe payment habits</h2>
    <ul>
      <li>Paying by transfer? Confirm the account name matches the vendor name on their WearBenin shop before you send anything.</li>
      <li>Paying cash? Count it in front of the vendor at handover, and get a receipt or WhatsApp confirmation.</li>
      <li>Buying a high-value item? Bring someone with you.</li>
    </ul>

    <h2>Vendors: staying safe too</h2>
    <ul>
      <li>Meet in public and bring someone if the item is expensive.</li>
      <li>Do not hand over goods before payment clears — instant transfers can be reversed, so confirm in your own banking app.</li>
      <li>Photograph high-value items with their serial or identifying marks before handover.</li>
    </ul>

    <p style="margin-top:32px">See also the <a href="#/legal/community-safety.html">community guidelines</a>, the <a href="#/legal/prohibited-items.html">prohibited items list</a>, and the <a href="#/help">help centre</a>.</p>`
  );
}

/* ------------------------------------------------------------------ Help / FAQ */
const FAQS = [
  ['Is WearBenin free to use?', 'Yes. Browsing and messaging vendors costs nothing, and posting listings is free during our launch period. There are no hidden charges. See the fees page for what may become paid later.'],
  ['How do I pay for something?', 'Directly to the vendor, on handover. WearBenin does not process payments yet, so there is no card entry anywhere on the site. Meet in public, inspect the item, then pay cash or transfer.'],
  ['How does the WhatsApp button work?', 'It opens WhatsApp with a message already written that includes the item name and its price, addressed to that vendor. You can edit it before sending. Your number is only shared with that vendor.'],
  ['Is the price negotiable?', 'Listings marked with a green "Negotiable" badge mean the vendor will consider an offer. Those without it are fixed price — you can still ask, but expect a firm answer.'],
  ['Can I sell without a shop?', 'Yes. Register with the "Sell / open a shop" option and you get a vendor account, a public shop page and a dashboard with your view counts.'],
  ['How do I edit or remove my ad?', 'Open My Ads from the header or your dashboard. Every listing has Edit, Mark sold and Delete actions. Deleting is permanent.'],
  ['What happens when I mark an item sold?', 'The listing keeps a "Sold" badge but stops taking enquiries, so buyers can see your shop is active and honest about stock.'],
  ['Someone is behaving suspiciously. What do I do?', 'Use the "Report this ad" button on the listing, or email support with screenshots. Read the safety centre for the red flags we see most often.'],
  ['How do I get a verified badge?', 'Verified vendors have had their identity and trading history checked by our team. Contact us from your shop account to start verification.'],
  ['Do you deliver?', 'Delivery is arranged directly with the vendor. Many vendors deliver within Benin City for a small fee — the listing tells you whether they offer it.'],
  ['How do I delete my account and data?', 'Email us and we will close your account and delete your personal data within 30 days. The data deletion page explains exactly what is removed, what we must keep for legal reasons, and how to ask for a copy of your data.'],
  ['I found a bug or the site is broken.', 'Please tell us — use the contact page with the page you were on and what you expected. Small details help a lot.']
];

export function renderHelp() {
  setTitle('Help & FAQ');
  qs('#main').innerHTML = page('Help & FAQ',
    'Straight answers about buying, selling, payments and safety on WearBenin.',
    `<div style="margin-top:28px">${FAQS.map(([q, a], i) => `<div class="faq-item" data-faq="${i}">
      <button class="faq-q" aria-expanded="false">${esc(q)} ${icon('chevronDown')}</button>
      <div class="faq-a" hidden>${esc(a)}</div>
    </div>`).join('')}</div>
    <div class="contact-grid" style="margin-top:40px">
      <div class="info-card"><h3>${icon('chat')} Still stuck?</h3>
        <p>Message the WearBenin team on WhatsApp — we answer within a working day, usually much faster.</p>
        <a class="btn btn-wa" style="margin-top:14px" href="https://wa.me/${esc(BRAND().whatsapp || '')}" target="_blank" rel="noopener noreferrer">${icon('whatsapp')} Chat with us</a></div>
      <div class="info-card"><h3>${icon('mail')} Email support</h3>
        <p>For account, safety and data requests, email us with your listing link and screenshots.</p>
        <a class="btn btn-ghost" style="margin-top:14px" href="mailto:${esc(BRAND().support || '')}">${esc(BRAND().support || 'support@wearbenin.ng')}</a></div>
    </div>`
  );

  qsa('[data-faq]').forEach(item => {
    const btn = item.querySelector('.faq-q');
    const ans = item.querySelector('.faq-a');
    btn.addEventListener('click', () => {
      const open = item.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
      ans.hidden = !open;
    });
  });
}

/* ------------------------------------------------------------------ Contact */
export function renderContact() {
  setTitle('Contact us');
  const b = BRAND();
  qs('#main').innerHTML = page('Contact WearBenin',
    'Questions, safety reports, vendor onboarding, press or data requests — here is how to reach a human.',
    `<div class="contact-grid" style="margin-top:28px">
      <div class="info-card"><h3>${icon('whatsapp')} WhatsApp</h3>
        <p>The fastest route. Business hours in West Africa Time, usually answered within a few hours.</p>
        <a class="btn btn-wa" style="margin-top:14px" href="https://wa.me/${esc(b.whatsapp || '')}" target="_blank" rel="noopener noreferrer">${esc(b.phone || 'Message us')}</a></div>

      <div class="info-card"><h3>${icon('mail')} Email</h3>
        <p>General enquiries, account help and press. Include your listing link where relevant.</p>
        <p style="margin-top:12px"><a href="mailto:${esc(b.email || '')}" style="color:var(--brand);font-weight:600">${esc(b.email || 'hello@wearbenin.ng')}</a></p></div>

      <div class="info-card"><h3>${icon('shield')} Trust &amp; safety</h3>
        <p>Report fraud, counterfeits or prohibited items. We review every report and remove listings that break the rules.</p>
        <p style="margin-top:12px"><a href="mailto:${esc(b.support || '')}" style="color:var(--brand);font-weight:600">${esc(b.support || 'support@wearbenin.ng')}</a></p>
        <a class="btn btn-ghost" style="margin-top:14px" href="#/safety">${icon('shield')} Open the safety centre</a></div>

      <div class="info-card"><h3>${icon('lock')} Data &amp; privacy (NDPA)</h3>
        <p>Request a copy of your data, correct it, or ask us to delete your account. We answer within 30 days.</p>
        <a class="btn btn-ghost" style="margin-top:14px" href="#/legal/data-deletion.html">${icon('trash')} Data deletion procedure</a></div>

      <div class="info-card"><h3>${icon('building')} Vendors</h3>
        <p>Want your shop listed, verified, or featured on the homepage? Tell us where you trade and what you sell.</p>
        <a class="btn btn-ghost" style="margin-top:14px" href="#/sell">${icon('plus')} Post your first ad</a></div>

      <div class="info-card"><h3>${icon('flag')} Legal &amp; IP</h3>
        <p>Copyright or trademark takedown requests, and legal notices, follow the procedure on our IP page.</p>
        <a class="btn btn-ghost" style="margin-top:14px" href="#/legal/ip-takedown.html">${icon('external2')} IP &amp; takedown policy</a></div>
    </div>

    <div style="margin-top:40px">
      <h2>Find us online</h2>
      ${siteSocialRow()}
      <div style="margin-top:20px">${shareMarketplaceButton('btn btn-ghost')}</div>
    </div>
    <p style="margin-top:36px" class="text-small text-muted">WearBenin · ${esc(b.city || 'Benin City, Edo State, Nigeria')} · A product of WearBenin Technologies.</p>`
  );
}

/* ------------------------------------------------------------------ Legal passthrough
   The 12 legal documents are self-contained HTML files served by the API server
   at /legal/*.html (spec §4). The SPA links to them by document name so the
   footer and drawer work from any route. */
export function renderLegal(ctx) {
  const file = String(ctx.params.file || '').replace(/[^a-z0-9.-]/gi, '');
  if (!/^[a-z0-9-]+\.html$/i.test(file)) { renderNotFound(); return; }
  const url = '/legal/' + file;

  setTitle('Legal');
  qs('#main').innerHTML = `<div class="container"><div class="prose-page">
    ${crumbs([{ label: 'Home', href: '#/' }, { label: 'Legal', href: '#/legal/terms.html' }, { label: file.replace('.html', '').replace(/-/g, ' ') }])}
    <h1>Opening legal document…</h1>
    <p class="lede">Loading <code>${esc(url)}</code>. If nothing happens, the document is served by the WearBenin API server, which must be running at the same origin.</p>
    <div class="state-actions" style="justify-content:flex-start">
      <a class="btn btn-primary" href="${esc(url)}">Open ${esc(file)}</a>
      <a class="btn btn-ghost" href="#/">Back to home</a>
    </div>
  </div></div>`;
  setTimeout(() => { window.location.href = url; }, 350);
}

/* ------------------------------------------------------------------ 404 */
export function renderNotFound() {
  setTitle('Page not found');
  qs('#main').innerHTML = `<div class="container"><div class="nf">
    <h1>404</h1>
    <p>We could not find that page. It may have moved, or the listing may have been taken down.</p>
    <div class="nf-actions">
      <a class="btn btn-primary btn-lg" href="#/">Back to home</a>
      <a class="btn btn-ghost btn-lg" href="#/search">Browse listings</a>
      <a class="btn btn-ghost btn-lg" href="#/help">Help centre</a>
    </div>
    <div style="margin-top:56px">${emptyState({ art: 'search', title: 'Popular right now', text: 'Jump straight into the categories buyers open most.', actionText: 'New in Benin City', actionHref: '#/search?sort=newest' })}</div>
  </div></div>`;
}

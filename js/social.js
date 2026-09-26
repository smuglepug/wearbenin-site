/* ==========================================================================
   WearBenin v2 — social features (spec §3)
   Real deep links, real share intents, real canvas-generated IG story card.
   ========================================================================== */

import { icon } from './icons.js';
import { money, esc, copyToClipboard, imgUrl, clampText } from './util.js';
import { toast, toastError, socialRow } from './ui.js';
export { socialRow };

const CFG = () => window.WB_CONFIG || {};
const BRAND = () => CFG().brand || {};

/* Public canonical URL for a listing — the server's /l/:slug OG shell so
   WhatsApp / Facebook / X previews render a real product card (spec §3). */
export function listingShareUrl(l) {
  const slug = (l && (l.slug || l.id)) || '';
  return location.origin.replace(/\/$/, '') + '/l/' + encodeURIComponent(slug);
}

export function vendorShareUrl(v) {
  return location.origin.replace(/\/$/, '') + '/#/vendor/' + encodeURIComponent(v && v.slug || '');
}

/* Vendor WhatsApp deep link with a prefilled message (title + price). */
export function waLink(number, listing) {
  const digits = String(number || '').replace(/\D/g, '');
  const to = digits ? digits.replace(/^0/, '234') : String(BRAND().whatsapp || '');
  let text;
  if (listing) {
    text = `Hello ${listing.vendor_name || listing.vendor?.name || ''}! I saw "${listing.title}" (${money(listing.price)}) on WearBenin. Is it still available?\n${listingShareUrl(listing)}`;
  } else {
    text = `Hello WearBenin! I have a question about a listing.`;
  }
  return `https://wa.me/${to}?text=${encodeURIComponent(text.trim())}`;
}

/* The per-listing share row (§3). */
export function shareRow(l, opts = {}) {
  const url = listingShareUrl(l);
  const text = `${l.title} — ${money(l.price)} on WearBenin, Benin City`;
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  return `<div class="share-row" data-share-url="${esc(url)}">
    <span class="share-label">Share</span>
    <a class="share-btn s-wa" href="https://wa.me/?text=${t}%20${u}" target="_blank" rel="noopener noreferrer" title="Share on WhatsApp" aria-label="Share on WhatsApp">${icon('whatsapp')}</a>
    <a class="share-btn s-fb" href="https://www.facebook.com/sharer/sharer.php?u=${u}" target="_blank" rel="noopener noreferrer" title="Share on Facebook" aria-label="Share on Facebook">${icon('facebook')}</a>
    <a class="share-btn s-x" href="https://twitter.com/intent/tweet?text=${t}&url=${u}" target="_blank" rel="noopener noreferrer" title="Share on X" aria-label="Share on X">${icon('x')}</a>
    <a class="share-btn s-tg" href="https://t.me/share/url?url=${u}&text=${t}" target="_blank" rel="noopener noreferrer" title="Share on Telegram" aria-label="Share on Telegram">${icon('telegram')}</a>
    <button class="share-btn s-copy" data-share="copy" title="Copy link" aria-label="Copy link">${icon('copy')}</button>
    ${navigator.share ? `<button class="share-btn s-native" data-share="native" title="Share…" aria-label="Share using your device">${icon('share')}</button>` : ''}
    <button class="share-btn s-ig" data-share="ig" title="Download a 1080×1920 Instagram story card">${icon('download')} <span>Download IG story card</span></button>
  </div>`;
}

/* ---------- canvas IG story card (1080 × 1920 PNG), real implementation ---------- */
function loadImage(src, useCors) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (useCors) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image-load-failed'));
    img.src = src;
  });
}

function wrapText(ctx, text, maxWidth, maxLines) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else line = test;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length + 2) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s+\S*$/, '') + '…';
  }
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBase(ctx, l, photo, extra) {
  const W = 1080, H = 1920;
  ctx.clearRect(0, 0, W, H);

  /* photo area */
  const photoH = 1150;
  if (photo) {
    /* cover-fit */
    const scale = Math.max(W / photo.width, photoH / photo.height);
    const dw = photo.width * scale, dh = photo.height * scale;
    ctx.drawImage(photo, (W - dw) / 2, (photoH - dh) / 2, dw, dh);
  } else {
    const g = ctx.createLinearGradient(0, 0, W, photoH);
    g.addColorStop(0, '#2A2F3A');
    g.addColorStop(1, '#111318');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, photoH);
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    ctx.font = '800 260px "Plus Jakarta Sans", Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('W', W / 2, photoH / 2 + 90);
  }

  /* bottom gradient into the panel */
  const gr = ctx.createLinearGradient(0, photoH - 520, 0, photoH + 40);
  gr.addColorStop(0, 'rgba(17,19,24,0)');
  gr.addColorStop(1, '#111318');
  ctx.fillStyle = gr;
  ctx.fillRect(0, photoH - 520, W, 560);

  /* lower panel */
  ctx.fillStyle = '#111318';
  ctx.fillRect(0, photoH, W, H - photoH);

  /* brand mark top-left over photo */
  ctx.save();
  const bx = 64, by = 64, bs = 104;
  const bg = ctx.createLinearGradient(bx, by, bx + bs, by + bs);
  bg.addColorStop(0, '#F48C06');
  bg.addColorStop(1, '#E85D04');
  ctx.fillStyle = bg;
  roundRect(ctx, bx, by, bs, bs, 28);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '800 62px "Plus Jakarta Sans", Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('W', bx + bs / 2, by + bs / 2 + 22);
  ctx.restore();

  /* kicker pill */
  ctx.save();
  ctx.font = '700 30px Inter, sans-serif';
  const kick = 'WEARBENIN · BENIN CITY';
  const kw = ctx.measureText(kick).width + 56;
  ctx.fillStyle = 'rgba(17,19,24,.62)';
  roundRect(ctx, 64, by + bs + 30, kw, 68, 34);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(kick, 64 + kw / 2, by + bs + 30 + 45);
  ctx.restore();

  /* listing copy — laid out as blocks with explicit gaps. The old code moved
     `y` by a hard-coded 78px after the NEGOTIABLE pill (pill is 56px tall) and
     then drew the title baseline on that same `y`, so the pill's bottom edge
     cut through the first line of the title. Each block now advances past its
     own height plus a real gap. */
  ctx.textAlign = 'left';
  let y = photoH + 96;

  ctx.fillStyle = '#F48C06';
  ctx.font = '800 84px "Plus Jakarta Sans", Inter, sans-serif';
  const price = money(l.price);
  ctx.fillText(price, 64, y);
  y += 74;                                   /* clear the price baseline */

  if (l.negotiable && (Number(l.negotiable) === 1 || l.negotiable === true)) {
    const pillH = 56;
    ctx.font = '700 30px Inter, sans-serif';
    const neg = ctx.measureText('NEGOTIABLE').width + 44;
    ctx.fillStyle = 'rgba(18,161,80,.18)';
    roundRect(ctx, 64, y, neg, pillH, 28); ctx.fill();
    ctx.fillStyle = '#4ADE80';
    ctx.fillText('NEGOTIABLE', 64 + 22, y + 38);
    y += pillH + 48;                         /* pill height + clear gap */
  }

  /* title: `y` is the top of the text block, so the first baseline sits one
     ascent below it (60px type ≈ 46px ascent). */
  ctx.fillStyle = '#fff';
  ctx.font = '800 60px "Plus Jakarta Sans", Inter, sans-serif';
  const titleLines = wrapText(ctx, l.title, W - 128, 2);
  const titleTop = y + 46;
  let ty = titleTop;
  titleLines.forEach(line => { ctx.fillText(line, 64, ty); ty += 74; });
  y = ty - 74 + 26;                          /* last baseline + breathing room */

  ctx.fillStyle = 'rgba(255,255,255,.66)';
  ctx.font = '500 34px Inter, sans-serif';
  const meta = [l.area, l.condition, l.vendor_name || (l.vendor && l.vendor.name)].filter(Boolean).join('  ·  ');
  ctx.fillText(clampText(meta, 62), 64, y);

  /* footer bar */
  const fy = H - 132;
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  roundRect(ctx, 48, fy, W - 96, 96, 28); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '700 36px "Plus Jakarta Sans", Inter, sans-serif';
  ctx.fillText('WearBenin.ng', 84, fy + 60);
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.font = '600 32px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('@wearbenin', W - 84, fy + 60);
  ctx.textAlign = 'left';

  if (extra) extra(ctx, W, H, photoH);
}

/**
 * Generate and download a 1080×1920 Instagram story card for a listing.
 * Real canvas drawing; degrades honestly if the photo cannot be rasterised
 * (cross-origin without CORS) — the card still downloads, just without photo.
 */
export async function downloadStoryCard(l) {
  toast('Building your Instagram story card…');
  const W = 1080, H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const raw = (Array.isArray(l.images) ? l.images[0] : null) || l.image || '';
  const src = imgUrl(raw);

  let photo = null;
  let tainted = false;
  if (src) {
    try { photo = await loadImage(src, true); }
    catch {
      try { photo = await loadImage(src, false); tainted = true; }
      catch { photo = null; }
    }
  }

  drawBase(ctx, l, photo);

  const finish = async () => {
    const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    if (!blob) throw new Error('Could not render the story card.');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wearbenin-story-${(l.slug || l.id || 'listing')}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast(`Story card downloaded (1080×1920 PNG)${photo ? '' : ' — photo omitted, image blocked cross-origin'}`, photo ? 'ok' : '');
  };

  try {
    await finish();
  } catch (e) {
    if (tainted) {
      /* canvas tainted → redraw the text-only card and try again */
      drawBase(ctx, l, null);
      await finish();
    } else {
      throw e;
    }
  }
}

/* ---------- delegated share behaviour, attached once ---------- */
export function wireShareDelegation(root) {
  root.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-share]');
    if (!btn) return;
    const row = btn.closest('[data-share-url]');
    const url = row ? row.dataset.shareUrl : location.href;
    const mode = btn.dataset.share;
    const listingRaw = row ? row.dataset.shareListing : '';
    if (mode === 'copy') {
      e.preventDefault();
      try { await copyToClipboard(url); toast('Link copied to your clipboard', 'ok'); }
      catch { toast('Could not copy — long-press the link instead', 'err'); }
    } else if (mode === 'native') {
      e.preventDefault();
      try {
        await navigator.share({
          title: row ? (row.dataset.shareTitle || 'WearBenin listing') : 'WearBenin',
          text: row ? (row.dataset.shareText || '') : '',
          url
        });
      } catch (err) { if (err && err.name !== 'AbortError') toast('Sharing was cancelled', ''); }
    } else if (mode === 'ig') {
      e.preventDefault();
      try {
        const l = listingRaw ? JSON.parse(listingRaw) : (window.__wbCurrentListing || {});
        await downloadStoryCard(l);
      } catch (err) { toastError(err); }
    }
  });
}

/* ---------- brand social presence (utility bar / footer) ---------- */
export function siteSocialLinks() {
  const b = BRAND();
  return [
    { key: 'whatsapp', url: b.whatsappChannel || `https://wa.me/${b.whatsapp}`, label: 'WhatsApp' },
    { key: 'instagram', url: b.instagram, label: 'Instagram' },
    { key: 'tiktok', url: b.tiktok, label: 'TikTok' },
    { key: 'facebook', url: b.facebook, label: 'Facebook' },
    { key: 'x', url: b.x, label: 'X' }
  ].filter(x => x.url);
}

export function siteSocialRow(opts = {}) {
  const cls = ['social-btn'];
  if (opts.size === 'sm') cls.push('sm');
  if (opts.onDark) cls.push('on-dark');
  return `<div class="social-row">${siteSocialLinks().map(l =>
    `<a class="${cls.join(' ')} brand-${l.key}" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer"
        title="WearBenin on ${esc(l.label)}" aria-label="WearBenin on ${esc(l.label)}">${icon(l.key)}</a>`).join('')}</div>`;
}

/* "Share this marketplace" — real share/native/copy behaviour */
export function shareMarketplaceButton(styleClass = 'btn btn-ghost btn-sm') {
  const url = location.origin;
  return `<button class="${styleClass}" data-share-site title="Share WearBenin with a friend">
    ${icon('share')} Share this marketplace</button>`;
}

export async function wireShareSite(root) {
  root.addEventListener('click', async e => {
    const b = e.target.closest('[data-share-site]');
    if (!b) return;
    const url = location.origin;
    const text = 'WearBenin — buy and sell fashion in Benin City, Edo State.';
    try {
      if (navigator.share) { await navigator.share({ title: 'WearBenin', text, url }); return; }
      await copyToClipboard(text + ' ' + url);
      toast('Link copied — share WearBenin with a friend', 'ok');
    } catch (err) { if (!err || err.name !== 'AbortError') toast('Could not share automatically', 'err'); }
  });
}

/* ==========================================================================
   WearBenin v2 — Inbox: thread list + message composer (real API)
   ========================================================================== */

import api from '../api.js';
import { icon } from '../icons.js';
import { esc, qs, qsa, timeAgo, fmtDateTime, imgUrl, initials, gradFor } from '../util.js';
import { crumbs, emptyState, errorState, toast, toastError, avatarTag, authWall } from '../ui.js';
import { setTitle, navigate } from '../router.js';
import { session, requireAuth, loadUnread } from '../session.js';
import { waLink } from '../social.js';

const pick = (o, keys, dflt = '') => { for (const k of keys) { if (o && o[k] !== undefined && o[k] !== null && o[k] !== '') return o[k]; } return dflt; };

function threadTitle(t) {
  return pick(t, ['other_name', 'vendor_name', 'buyer_name', 'counterparty_name', 'name'], 'WearBenin user');
}

export async function renderInbox(ctx) {
  setTitle('Inbox');
  const main = qs('#main');
  main.innerHTML = '';
  const openId = ctx.params.id ? Number(ctx.params.id) : null;
  if (!requireAuth('Sign in to see your messages.')) {
    main.innerHTML = authWall({
      title: 'Inbox',
      sub: 'Every conversation you start with a vendor — and every reply — lands here.',
      crumbPath: [{ label: 'Home', href: '#/' }, { label: 'Inbox' }]
    });
    return;
  }

  main.innerHTML = `<div class="container">${crumbs([{ label: 'Home', href: '#/' }, { label: 'Inbox' }])}
    <div class="page-head"><div><h1>Inbox</h1><div class="page-sub">Your conversations with vendors and buyers</div></div></div>
    <div class="sk" style="height:420px;border-radius:18px"></div></div>`;

  let data;
  try { data = await api.threads(); }
  catch (e) { main.innerHTML = `<div class="container" style="padding-top:32px">${errorState(e, 'wb-inbox-retry')}</div>`; qs('#wb-inbox-retry').onclick = () => renderInbox(ctx); return; }

  const threads = (data && (data.items || data)) || [];

  main.innerHTML = `<div class="container">
    ${crumbs([{ label: 'Home', href: '#/' }, { label: 'Inbox' }])}
    <div class="page-head">
      <div><h1>Inbox</h1>
        <div class="page-sub">${threads.length} conversation${threads.length === 1 ? '' : 's'}${session.unread ? ` · ${session.unread} unread` : ''}</div></div>
      <a class="btn btn-ghost" href="#/saved">${icon('heart')} Saved listings</a>
    </div>
    ${threads.length ? `<div class="inbox ${openId ? 'has-thread' : ''}" id="wb-inbox">
      <div class="thread-list" id="wb-thread-list">
        ${threads.map(t => {
          const id = pick(t, ['id', 'thread_id']);
          const unread = Number(pick(t, ['unread', 'unread_count'], 0));
          const img = pick(t, ['listing_image', 'image']);
          const active = openId === Number(id);
          return `<a class="thread-item ${active ? 'active' : ''}" href="#/inbox/${esc(id)}" data-thread="${esc(id)}">
            ${img ? `<img class="avatar" style="border-radius:12px;object-fit:cover" src="${esc(imgUrl(img))}" alt="">`
                  : `<span class="avatar" style="border-radius:12px;background:${gradFor(threadTitle(t))};color:#fff">${esc(initials(threadTitle(t)))}</span>`}
            <div class="t-body">
              <div class="t-name"><span>${esc(threadTitle(t))}</span>
                <time>${esc(timeAgo(pick(t, ['last_message_at', 'updated_at', 'created_at'])))}</time></div>
              <div class="t-sub clamp-1">${esc(pick(t, ['listing_title', 'title'], 'Listing enquiry'))}</div>
              <div class="t-last clamp-1">${esc(pick(t, ['last_message', 'last_message_body', 'preview'], 'No messages yet'))}</div>
            </div>
            ${unread ? `<span class="t-unread">${unread}</span>` : ''}
          </a>`;
        }).join('')}
      </div>
      <div class="chat-panel" id="wb-chat">${openId
        ? '<div style="flex:1;display:grid;place-items:center;color:var(--muted)">Loading conversation…</div>'
        : `<div style="flex:1;display:grid;place-items:center;text-align:center;padding:32px;color:var(--muted)">
             ${icon('inbox')}<p style="margin-top:14px;max-width:280px">Pick a conversation on the left to read the messages and reply.</p>
           </div>`}</div>
    </div>`
      : emptyState({
        title: 'No messages yet',
        text: 'When you message a vendor from a listing, the conversation appears here — along with every vendor who replies to you.',
        actionText: 'Find something to ask about', actionHref: '#/search'
      })}
  </div>`;

  if (openId) await paintChat(openId, ctx, threads);
}

async function paintChat(id, ctx, threads) {
  const panel = qs('#wb-chat');
  if (!panel) return;
  const t = threads.find(x => Number(pick(x, ['id', 'thread_id'])) === id) || {};
  let data;
  try { data = await api.thread(id); }
  catch (e) { panel.innerHTML = `<div style="padding:20px">${errorState(e, 'wb-chat-retry')}</div>`; const b = qs('#wb-chat-retry'); if (b) b.onclick = () => paintChat(id, ctx, threads); return; }

  const thread = (data && (data.thread || data)) || {};
  const messages = (data && (data.messages || (data.thread && data.thread.messages))) || (Array.isArray(data) ? data : []) || [];
  const me = session.user || {};
  const name = threadTitle(t);
  const listingId = pick(thread, ['listing_id'], pick(t, ['listing_id']));
  const listingSlug = pick(thread, ['listing_slug'], pick(t, ['listing_slug']));
  const listingTitle = pick(thread, ['listing_title'], pick(t, ['listing_title'], 'Listing'));
  const listingPrice = pick(thread, ['listing_price'], pick(t, ['listing_price']));
  const vendorWa = pick(thread, ['vendor_whatsapp', 'whatsapp'], '');

  panel.innerHTML = `
    <div class="chat-head">
      <a class="icon-btn sm" href="#/inbox" aria-label="Back to conversations" style="display:none" id="wb-chat-back">${icon('arrowLeft')}</a>
      ${avatarTag(pick(thread, ['other_avatar', 'vendor_logo', 'avatar'], t.avatar), name)}
      <div style="min-width:0;flex:1">
        <div style="font-weight:700;font-size:15px">${esc(name)}</div>
        <div class="text-micro text-muted clamp-1">About: <a href="#/listing/${encodeURIComponent(listingSlug || listingId || '')}" style="color:var(--brand);font-weight:600">${esc(listingTitle)}</a></div>
      </div>
      ${vendorWa && String(vendorWa).replace(/\D/g, '') !== String((me.phone || '')).replace(/\D/g, '')
        ? `<a class="btn btn-wa btn-sm" href="${esc(waLink(vendorWa, { title: listingTitle, price: listingPrice, slug: listingSlug }))}" target="_blank" rel="noopener noreferrer">${icon('whatsapp')} WhatsApp</a>` : ''}
    </div>
    <div class="chat-body" id="wb-chat-body">
      ${messages.length ? messages.map(m => {
        const mine = Number(pick(m, ['sender_id', 'user_id'])) === Number(me.id);
        return `<div class="bubble ${mine ? 'me' : 'them'}">${esc(pick(m, ['body', 'message', 'text'], ''))}
          <time>${esc(fmtDateTime(pick(m, ['created_at', 'sent_at'])))}</time></div>`;
      }).join('') : '<div style="margin:auto;color:var(--muted);text-align:center">No messages in this conversation yet. Say hello</div>'}
    </div>
    <form class="chat-compose" id="wb-compose">
      <textarea id="wb-msg" placeholder="Write a message… (ask about size, fabric, delivery)" aria-label="Message" rows="1"></textarea>
      <button class="btn btn-primary" type="submit" id="wb-send">${icon('arrowRight')} <span class="hide-mobile">Send</span></button>
    </form>`;

  const body = qs('#wb-chat-body');
  if (body) body.scrollTop = body.scrollHeight;

  const back = qs('#wb-chat-back');
  if (back && window.matchMedia('(max-width:900px)').matches) back.style.display = '';

  const form = qs('#wb-compose');
  const ta = qs('#wb-msg');
  if (ta) {
    ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(130, ta.scrollHeight) + 'px'; });
    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
    });
  }
  if (form) form.addEventListener('submit', async e => {
    e.preventDefault();
    const text = ta.value.trim();
    if (!text) return;
    const btn = qs('#wb-send');
    btn.classList.add('is-loading'); btn.disabled = true; ta.disabled = true;
    try {
      const res = await api.sendMessage(id, text);
      const msg = (res && (res.message || res)) || { body: text, created_at: new Date().toISOString(), sender_id: me.id };
      const mine = !msg.sender_id || Number(msg.sender_id) === Number(me.id);
      const node = document.createElement('div');
      node.className = 'bubble ' + (mine ? 'me' : 'them');
      node.innerHTML = `${esc(msg.body || text)}<time>${esc(fmtDateTime(msg.created_at || new Date().toISOString()))}</time>`;
      const empty = body.querySelector('div[style*="margin:auto"]');
      if (empty) empty.remove();
      body.appendChild(node);
      body.scrollTop = body.scrollHeight;
      ta.value = ''; ta.style.height = 'auto';
    } catch (err) { toastError(err); }
    btn.classList.remove('is-loading'); btn.disabled = false; ta.disabled = false; ta.focus();
  });

  await loadUnread(true);
}

/* Called by the listing page / vendor page "Message" buttons. */
export async function startConversation(listingId, body) {
  if (!requireAuth('Sign in to message vendors.')) return null;
  try {
    const res = await api.startThread({ listingId, body });
    const id = res && (res.id || res.thread_id || (res.thread && res.thread.id));
    toast('Message sent to the vendor.', 'ok');
    if (id) navigate('/inbox/' + id);
    else navigate('/inbox');
    return res;
  } catch (e) { toastError(e); return null; }
}

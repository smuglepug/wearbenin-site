/* ==========================================================================
   WearBenin v2 — Login / Register (real JWT auth against /api/auth/*)
   Social login buttons call GET /api/auth/oauth/:provider which returns 501
   with setup instructions — deliberately NOT faked (spec §3).
   ========================================================================== */

import api from '../api.js';
import { icon, BRAND_PATHS } from '../icons.js';
import { esc, qs, normaliseImages } from '../util.js';
import { toast, toastError, setBusy, fieldHTML, fieldValue, openModal } from '../ui.js';
import { setTitle, navigate } from '../router.js';
import { session, login, register, isLoggedIn, refreshUser, handleSupabaseSession } from '../session.js';
import { supabase, supabaseConfigured } from '../supabase.js';

const CFG = () => window.WB_CONFIG || {};

const OAUTH = [
  ['google', 'Google'],
  ['facebook', 'Facebook'],
  ['apple', 'Apple']
];
function oauthList() {
  const prov = (CFG().supabase && CFG().supabase.providers) || {};
  return OAUTH.filter(([p]) => prov[p] !== false);
}
function phoneEnabled() {
  const prov = (CFG().supabase && CFG().supabase.providers) || {};
  return prov.phone === true;
}

function artPanel() {
  return `<div class="auth-art">
    <div style="position:absolute;inset:0;background:linear-gradient(135deg,#2A2F3A,#111318)"></div>
    <div class="auth-art-text">
      <h2>Benin City&rsquo;s fashion marketplace</h2>
      <p>Ankara, agbada, sneakers and gele from vendors in Oba Market, Ekiosa and Ring Road — with WhatsApp chat before you pay.</p>
      <ul>
        <li>${icon('checkCircle')} 50+ live listings from verified vendors</li>
        <li>${icon('checkCircle')} Save favourites and get back to them later</li>
        <li>${icon('checkCircle')} Message vendors without sharing your number first</li>
        <li>${icon('checkCircle')} Post your own ads in three steps</li>
      </ul>
    </div>
  </div>`;
}

function oauthRow() {
  return `<div class="oauth-row">
    ${oauthList().map(([p, label]) => `<button class="oauth-btn" data-oauth="${p}">
      <span style="width:18px;height:18px;display:inline-flex">${p === 'google'
        ? `<svg viewBox="0 0 24 24" aria-hidden="true">${['#4285F4', '#34A853', '#FBBC05', '#EA4335'].map((c, i) => '').join('')}
             <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8Z"/>
             <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.1-4 1.1a7 7 0 0 1-6.6-4.8h-4v3.1A12 12 0 0 0 12 24Z"/>
             <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7h-4a12 12 0 0 0 0 10.8l4-3.1Z"/>
             <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.5-3.5A12 12 0 0 0 1.4 6.7l4 3.1A7 7 0 0 1 12 4.8Z"/>
           </svg>`
        : icon(p)}</span>${label}</button>`).join('')}
  </div>`;
}

async function tryOauth(provider) {
  if (supabaseConfigured) {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin + window.location.pathname }
      });
      if (error) toastError(error);
    } catch (e) { toastError(e); }
    return;
  }
  try {
    const res = await api.oauth(provider);
    openModal({
      title: `${provider[0].toUpperCase() + provider.slice(1)} sign-in is not configured`,
      body: `<div class="inline-error" style="background:#FFF7ED;border-color:#FED7AA;color:#7C2D12">${icon('info')}
        <span><b>This is a scaffold, not a working OAuth flow.</b> The API returned HTTP 501 with the setup instructions below.</span></div>
        <pre style="white-space:pre-wrap;font-size:12.5px;background:var(--line-2);padding:14px;border-radius:12px;margin-top:14px;overflow:auto">${esc(JSON.stringify(res, null, 2))}</pre>
        <p class="text-small text-muted" style="margin-top:12px">See <code>docs/SOCIAL.md</code> for exactly where to put real client IDs, secrets and callback URLs.</p>`,
      footer: `<a class="btn btn-ghost" href="#/help">Help &amp; FAQ</a><button class="btn btn-primary" data-close>Got it</button>`
    });
  } catch (e) {
    if (e.status === 501) {
      openModal({
        title: `${provider} sign-in is not configured`,
        body: `<div class="inline-error" style="background:#FFF7ED;border-color:#FED7AA;color:#7C2D12">${icon('info')}
          <span><b>Scaffold only.</b> The API answered 501 — real OAuth is documented but not enabled.</span></div>
          <p class="text-small" style="margin-top:14px">${esc(e.message)}</p>
          ${e.details ? `<pre style="white-space:pre-wrap;font-size:12.5px;background:var(--line-2);padding:14px;border-radius:12px;margin-top:12px;overflow:auto">${esc(typeof e.details === 'string' ? e.details : JSON.stringify(e.details, null, 2))}</pre>` : ''}`,
        footer: `<button class="btn btn-primary" data-close>Got it</button>`
      });
    } else toastError(e);
  }
}

/* ------------------------------------------------------------------ login */
export function renderLogin(ctx) {
  setTitle('Sign in');
  const next = ctx.query.next || '';
  const main = qs('#main');
  const d = (CFG().demo || {});

  main.innerHTML = `<div class="auth-wrap">
    ${artPanel()}
    <div class="auth-form-wrap"><div class="auth-form">
      <h1>Welcome back</h1>
      <p class="auth-sub">Sign in to save listings, message vendors and manage your ads.</p>
      <form id="wb-login-form" novalidate>
        ${fieldHTML({ id: 'email', label: 'Email address', type: 'email', required: true, placeholder: 'you@email.com' })}
        ${fieldHTML({ id: 'password', label: 'Password', type: 'password', required: true, placeholder: '••••••••' })}
        <div id="wb-login-error"></div>
        <button class="btn btn-primary btn-lg btn-block" type="submit" id="wb-login-btn">Sign in</button>
      </form>
      <div class="auth-divider">or continue with</div>
      ${oauthRow()}
      ${phoneEnabled() ? `<div class="auth-divider">or sign in with your phone</div>
      <div id="wb-phone-box">
        <div class="field"><label for="phone">Phone / WhatsApp number</label>
          <input class="input" id="phone" type="tel" inputmode="tel" placeholder="+234 803 123 4567" autocomplete="tel"></div>
        <button class="btn btn-ghost btn-block" type="button" id="wb-phone-send">Send code</button>
        <div id="wb-otp-box" hidden style="margin-top:12px">
          <div class="field"><label for="otp">Verification code</label>
            <input class="input" id="otp" type="text" inputmode="numeric" placeholder="6-digit code" autocomplete="one-time-code"></div>
          <button class="btn btn-primary btn-block" type="button" id="wb-phone-verify">Verify &amp; sign in</button>
        </div>
        <div id="wb-phone-error"></div>
      </div>` : ''}
      <p class="text-small text-muted" style="margin-top:24px;text-align:center">
        New to WearBenin? <a href="#/register${next ? '?next=' + encodeURIComponent(next) : ''}" style="color:var(--brand);font-weight:700">Create an account</a>
      </p>
      ${d.vendor && !supabaseConfigured ? `<div class="demo-note">
        <b>Demo accounts (seeded):</b><br>
        Buyer — <code>${esc(d.buyer.email)}</code> / <code>${esc(d.buyer.password)}</code><br>
        Vendor — <code>${esc(d.vendor.email)}</code> / <code>${esc(d.vendor.password)}</code>
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" data-demo="buyer">Fill buyer</button>
          <button class="btn btn-ghost btn-sm" data-demo="vendor">Fill vendor</button>
        </div></div>` : ''}
    </div></div>
  </div>`;

  const form = qs('#wb-login-form');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = qs('#wb-login-btn');
    const email = fieldValue(form, 'email');
    const password = form.querySelector('#password').value;
    qs('#wb-login-error').innerHTML = '';
    if (!email || !password) { qs('#wb-login-error').innerHTML = `<div class="field-error" style="margin-bottom:14px">Enter your email and password.</div>`; return; }
    setBusy(btn, true, 'Signing in…');
    try {
      await login(email, password);
      toast('Signed in — welcome back!', 'ok');
      navigate(next || '/');
    } catch (err) {
      setBusy(btn, false);
      const msg = err.status === 401 || err.status === 400
        ? 'Those details do not match an account. Check your email and password.'
        : err.message;
      qs('#wb-login-error').innerHTML = `<div class="inline-error" style="margin-bottom:16px">${icon('alert')}<span>${esc(msg)}</span></div>`;
    }
  });

  main.querySelectorAll('[data-demo]').forEach(b => b.addEventListener('click', () => {
    const which = b.dataset.demo;
    const creds = d[which] || d.buyer;
    form.querySelector('#email').value = creds.email;
    form.querySelector('#password').value = creds.password;
  }));

  main.querySelectorAll('[data-oauth]').forEach(b => b.addEventListener('click', () => tryOauth(b.dataset.oauth)));

  /* phone OTP sign-in (Supabase) */
  const phoneSend = qs('#wb-phone-send');
  if (phoneSend) phoneSend.addEventListener('click', async () => {
    const phone = qs('#phone').value.trim();
    const errBox = qs('#wb-phone-error');
    errBox.innerHTML = '';
    if (!supabaseConfigured) { errBox.innerHTML = `<div class="inline-error" style="margin-bottom:12px">${icon('alert')}<span>Phone sign-in needs Supabase configured with a phone provider.</span></div>`; return; }
    if (!phone) { errBox.innerHTML = `<div class="inline-error" style="margin-bottom:12px">${icon('alert')}<span>Enter your phone number.</span></div>`; return; }
    setBusy(phoneSend, true, 'Sending…');
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone, options: { channel: 'sms' } });
      setBusy(phoneSend, false);
      if (error) throw error;
      qs('#wb-otp-box').hidden = false;
      toast('Code sent to your phone.', 'ok');
    } catch (e) { setBusy(phoneSend, false); errBox.innerHTML = `<div class="inline-error" style="margin-bottom:12px">${icon('alert')}<span>${esc(e.message || 'Could not send the code.')}</span></div>`; }
  });
  const phoneVerify = qs('#wb-phone-verify');
  if (phoneVerify) phoneVerify.addEventListener('click', async () => {
    const phone = qs('#phone').value.trim();
    const token = qs('#otp').value.trim();
    const errBox = qs('#wb-phone-error');
    errBox.innerHTML = '';
    if (!token) { errBox.innerHTML = `<div class="inline-error" style="margin-bottom:12px">${icon('alert')}<span>Enter the code you received.</span></div>`; return; }
    setBusy(phoneVerify, true, 'Verifying…');
    try {
      const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
      if (error) throw error;
      if (!data.session) throw new Error('No session returned. Try again.');
      await handleSupabaseSession();
      toast('Signed in — welcome back!', 'ok');
      navigate(next || '/');
    } catch (e) { setBusy(phoneVerify, false); errBox.innerHTML = `<div class="inline-error" style="margin-bottom:12px">${icon('alert')}<span>${esc(e.message || 'Verification failed.')}</span></div>`; }
  });
}

/* ------------------------------------------------------------------ register */
export function renderRegister(ctx) {
  setTitle('Create your account');
  const next = ctx.query.next || '';
  const main = qs('#main');

  main.innerHTML = `<div class="auth-wrap">
    ${artPanel()}
    <div class="auth-form-wrap"><div class="auth-form">
      <h1>Create your account</h1>
      <p class="auth-sub">It takes under a minute. Vendors get a shop page and dashboard.</p>
      <form id="wb-reg-form" novalidate>
        ${fieldHTML({ id: 'name', label: 'Full name', required: true, placeholder: 'Osas Igbinedion' })}
        ${fieldHTML({ id: 'email', label: 'Email address', type: 'email', required: true, placeholder: 'you@email.com' })}
        ${fieldHTML({ id: 'phone', label: 'Phone / WhatsApp', type: 'tel', placeholder: '0803 123 4567', hint: 'Used so vendors can reach you about enquiries.' })}
        ${fieldHTML({ id: 'password', label: 'Password', type: 'password', required: true, placeholder: 'At least 8 characters', hint: 'Use at least 8 characters with a number or symbol.' })}
        <div class="field">
          <span class="field-label">I want to…</span>
          <div class="radio-cards">
            <label class="radio-card on" data-role-card>
              <input type="radio" name="role" value="buyer" checked>
              <span>${icon('bag')} Buy fashion</span>
            </label>
            <label class="radio-card" data-role-card>
              <input type="radio" name="role" value="vendor">
              <span>${icon('building')} Sell / open a shop</span>
            </label>
          </div>
        </div>
        <label class="check"><input type="checkbox" id="agree" required>
          <span>I agree to the <a href="#/legal/terms.html" style="color:var(--brand)">Terms of Service</a>,
          <a href="#/legal/privacy.html" style="color:var(--brand)">Privacy Policy</a> and
          <a href="#/legal/community-safety.html" style="color:var(--brand)">Community Guidelines</a>.</span></label>
        <div id="wb-reg-error"></div>
        <button class="btn btn-primary btn-lg btn-block" type="submit" id="wb-reg-btn">Create account</button>
      </form>
      <div class="auth-divider">or sign up with</div>
      ${oauthRow()}
      <p class="text-small text-muted" style="margin-top:24px;text-align:center">
        Already have an account? <a href="#/login${next ? '?next=' + encodeURIComponent(next) : ''}" style="color:var(--brand);font-weight:700">Sign in</a>
      </p>
    </div></div>
  </div>`;

  const form = qs('#wb-reg-form');
  main.querySelectorAll('[data-role-card]').forEach(card => {
    const input = card.querySelector('input');
    input.addEventListener('change', () => {
      main.querySelectorAll('[data-role-card]').forEach(c => c.classList.toggle('on', c.querySelector('input').checked));
    });
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = qs('#wb-reg-btn');
    const errBox = qs('#wb-reg-error');
    errBox.innerHTML = '';
    const name = fieldValue(form, 'name');
    const email = fieldValue(form, 'email');
    const phone = fieldValue(form, 'phone');
    const password = form.querySelector('#password').value;
    const role = form.querySelector('input[name=role]:checked').value;
    const agree = form.querySelector('#agree').checked;

    const problems = [];
    if (!name || name.length < 2) problems.push('Enter your full name.');
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) problems.push('Enter a valid email address.');
    if (!password || password.length < 8) problems.push('Your password must be at least 8 characters.');
    if (!agree) problems.push('Please accept the terms to continue.');
    if (problems.length) { errBox.innerHTML = `<div class="inline-error" style="margin-bottom:16px">${icon('alert')}<span>${esc(problems.join(' '))}</span></div>`; return; }

    const ref = (new URLSearchParams((location.hash.split('?')[1] || ''))).get('ref') || '';
    setBusy(btn, true, 'Creating your account…');
    try {
      await register({ name, email, password, phone, role, ref });
      toast('Account created — welcome to WearBenin!', 'ok');
      navigate(next || (role === 'vendor' ? '/dashboard' : '/'));
    } catch (err) {
      setBusy(btn, false);
      const msg = err.status === 409 ? 'An account with that email already exists. Try signing in instead.' : err.message;
      errBox.innerHTML = `<div class="inline-error" style="margin-bottom:16px">${icon('alert')}<span>${esc(msg)}</span></div>`;
    }
  });

  main.querySelectorAll('[data-oauth]').forEach(b => b.addEventListener('click', () => tryOauth(b.dataset.oauth)));
}

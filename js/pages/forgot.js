/* ==========================================================================
   Password recovery — the difference between "works for a demo" and "works for
   a person who forgot their password".

   Without this, a real user who forgets their password is locked out of their
   account permanently, and the listing they paid to make is stuck behind a wall.
   Supabase sends the reset email and owns the token; we never handle it.

   #/forgot-password  →  Supabase emails a link  →  #/reset-password
   ========================================================================== */

import { supabase, supabaseConfigured } from '../supabase.js';
import { toast, toastOk } from '../ui.js';
import { esc } from '../util.js';

const SENT_KEY = 'wb:reset-sent';

const BRAND = `
  <div class="auth-side">
    <div class="auth-brand"><span class="auth-logo">W</span><b>WearBenin</b></div>
    <h2>Locked out?</h2>
    <p>It happens to everyone. Give us the email on your account and we will send a link to set a new password.</p>
    <ul class="auth-perks">
      <li>${checkIcon()} Your ads and messages stay exactly where they are</li>
      <li>${checkIcon()} You keep your shop, your reviews and your referral code</li>
      <li>${checkIcon()} The link works once and expires in one hour</li>
    </ul>
  </div>`;

function checkIcon() {
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;
}

function mailIcon() {
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></svg>`;
}

function inlineError(msg) {
  const box = document.getElementById('wb-auth-err');
  if (box) box.textContent = msg;
  else toast(msg);
}

/* ---------------------------------------------------- request a reset link */
export async function renderForgotPassword() {
  const main = document.getElementById('main');
  if (!main) return;

  let sentTo = '';
  try { sentTo = localStorage.getItem(SENT_KEY) || ''; } catch (e) { /* private mode */ }

  main.innerHTML = `
    <div class="auth-wrap">
      ${BRAND}
      <div class="auth-form">
        <h1>Reset your password</h1>
        <p class="text-muted">Enter your email and we will send a reset link.</p>
        <form id="wb-forgot" novalidate>
          <div class="field">
            <label for="fp-email">Email address</label>
            <input id="fp-email" name="email" type="email" required autocomplete="email"
                   placeholder="you@email.com" value="${esc(sentTo)}">
          </div>
          <div class="field" id="wb-auth-err" role="alert"></div>
          <button type="submit" class="btn btn-primary btn-lg btn-block" id="wb-forgot-btn">Send reset link</button>
        </form>
        <p class="auth-alt">Remembered it? <a href="#/login">Back to sign in</a></p>
      </div>
    </div>`;

  document.getElementById('wb-forgot').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('fp-email').value.trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      inlineError('Enter a valid email address.');
      return;
    }
    const btn = document.getElementById('wb-forgot-btn');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
      if (!supabaseConfigured) throw new Error('Password recovery is not configured yet. Please contact us.');
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // Supabase redirects here with the recovery token in the hash.
        redirectTo: window.location.origin + window.location.pathname + '#/reset-password',
      });
      if (error) throw error;
      try { localStorage.setItem(SENT_KEY, email); } catch (e) { /* private mode */ }
      main.innerHTML = `
        <div class="auth-wrap">
          ${BRAND}
          <div class="auth-form">
            <h1>Check your email</h1>
            <p class="text-muted">If an account exists for <b>${esc(email)}</b>, a reset link is on its way.
               It is valid for one hour.</p>
            <div class="inline-note">
              ${mailIcon()}
              <span><b>Nothing arrived?</b> Check spam, then try again — we can only send to the address on the account.
              If you signed up with Google or Facebook, use that button instead; those accounts have no password.</span>
            </div>
            <a class="btn btn-ghost btn-block" href="#/login">Back to sign in</a>
          </div>
        </div>`;
    } catch (err) {
      inlineError((err && err.message) || 'We could not send that link. Try again in a moment.');
    } finally {
      const b = document.getElementById('wb-forgot-btn');
      if (b) { b.disabled = false; b.textContent = 'Send reset link'; }
    }
  });
}

/* ------------------------------------------------------------ set a new one */
export async function renderResetPassword() {
  const main = document.getElementById('main');
  if (!main) return;

  // Supabase sets a session on the recovery link, so a live session proves it.
  let hasSession = false;
  try {
    const { data } = await supabase.auth.getSession();
    hasSession = !!(data && data.session);
  } catch (e) { hasSession = false; }

  if (!hasSession) {
    main.innerHTML = `
      <div class="auth-wrap">
        ${BRAND}
        <div class="auth-form">
          <h1>This link is not valid</h1>
          <p class="text-muted">Password reset links expire after an hour and can only be used once.
             Request a fresh one and it will arrive in a few minutes.</p>
          <a class="btn btn-primary btn-block" href="#/forgot-password">Send me a new link</a>
          <p class="auth-alt"><a href="#/login">Back to sign in</a></p>
        </div>
      </div>`;
    return;
  }

  main.innerHTML = `
    <div class="auth-wrap">
      ${BRAND}
      <div class="auth-form">
        <h1>Choose a new password</h1>
        <p class="text-muted">At least 8 characters. Something you have not used here before.</p>
        <form id="wb-reset" novalidate>
          <div class="field">
            <label for="rp-pass">New password</label>
            <input id="rp-pass" name="password" type="password" required minlength="8" autocomplete="new-password"
                   placeholder="At least 8 characters">
          </div>
          <div class="field">
            <label for="rp-confirm">Confirm password</label>
            <input id="rp-confirm" name="confirm" type="password" required minlength="8" autocomplete="new-password"
                   placeholder="Type it again">
          </div>
          <div class="field" id="wb-auth-err" role="alert"></div>
          <button type="submit" class="btn btn-primary btn-lg btn-block" id="wb-reset-btn">Save new password</button>
        </form>
      </div>
    </div>`;

  document.getElementById('wb-reset').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pass = document.getElementById('rp-pass').value;
    const confirm = document.getElementById('rp-confirm').value;
    if (pass.length < 8) { inlineError('Use at least 8 characters.'); return; }
    if (pass !== confirm) { inlineError('Both passwords must match.'); return; }

    const btn = document.getElementById('wb-reset-btn');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    try {
      const { error } = await supabase.auth.updateUser({ password: pass });
      if (error) throw error;
      try { localStorage.removeItem(SENT_KEY); } catch (e) { /* private mode */ }
      toastOk('Password updated. You are signed in.');
      window.location.hash = '#/dashboard';
    } catch (err) {
      inlineError((err && err.message) || 'That link has expired. Request a new one.');
    } finally {
      const b = document.getElementById('wb-reset-btn');
      if (b) { b.disabled = false; b.textContent = 'Save new password'; }
    }
  });
}

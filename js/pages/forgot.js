/* ==========================================================================
   Password recovery — the difference between "works for a demo" and "works for
   a person who forgot their password".

   Without this, a real user who forgets their password is locked out of their
   account permanently, and the listing they paid to make is stuck behind a wall.
   Supabase sends the reset email and owns the token; we never handle it.

   #/forgot-password  →  Supabase emails a link  →  #/reset-password

   Layout deliberately mirrors pages/auth.js (auth-art + auth-form-wrap) so the
   three auth screens are indistinguishable as a set.
   ========================================================================== */

import { supabase, supabaseConfigured } from '../supabase.js';
import { toast } from '../ui.js';
import { icon } from '../icons.js';
import { esc } from '../util.js';

const SENT_KEY = 'wb:reset-sent';

function artPanel() {
  return `<div class="auth-art">
    <div style="position:absolute;inset:0;background:linear-gradient(135deg,#2A2F3A,#111318)"></div>
    <div class="auth-art-text">
      <h2>Locked out?</h2>
      <p>It happens to everyone. Give us the email on your account and we will send you a link to set a new password.</p>
      <ul>
        <li>${icon('checkCircle')} Your ads and messages stay exactly where they are</li>
        <li>${icon('checkCircle')} You keep your shop, your reviews and your referral code</li>
        <li>${icon('checkCircle')} The link works once and expires in one hour</li>
      </ul>
    </div>
  </div>`;
}

function inlineError(msg) {
  const box = document.getElementById('wb-auth-err');
  if (box) box.textContent = msg;
  else toast(msg);
}

function setBusy(btn, busy, label) {
  if (!btn) return;
  btn.disabled = busy;
  btn.textContent = busy ? label : 'Send reset link';
}

/* ---------------------------------------------------- request a reset link */
export async function renderForgotPassword() {
  const main = document.getElementById('main');
  if (!main) return;

  let sentTo = '';
  try { sentTo = localStorage.getItem(SENT_KEY) || ''; } catch (e) { /* private mode */ }

  main.innerHTML = `<div class="auth-wrap">
    ${artPanel()}
    <div class="auth-form-wrap"><div class="auth-form">
      <h1>Reset your password</h1>
      <p class="auth-sub">Enter your email and we will send you a reset link.</p>
      <form id="wb-forgot" novalidate>
        <div class="field">
          <label for="fp-email">Email address</label>
          <input id="fp-email" name="email" type="email" required autocomplete="email"
                 placeholder="you@email.com" value="${esc(sentTo)}">
        </div>
        <div class="field" id="wb-auth-err" role="alert"></div>
        <button type="submit" class="btn btn-primary btn-lg btn-block" id="wb-forgot-btn">Send reset link</button>
      </form>
      <p class="text-small text-muted" style="margin-top:20px;text-align:center">
        Remembered it? <a href="#/login" style="color:var(--brand);font-weight:700">Back to sign in</a>
      </p>
    </div></div>
  </div>`;

  document.getElementById('wb-forgot').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('fp-email').value.trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      inlineError('Enter a valid email address.');
      return;
    }
    const btn = document.getElementById('wb-forgot-btn');
    setBusy(btn, true, 'Sending…');
    try {
      if (!supabaseConfigured) throw new Error('Password recovery is not available yet. Please contact us.');
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // Supabase redirects back here with the recovery session in the hash.
        redirectTo: window.location.origin + window.location.pathname + '#/reset-password',
      });
      if (error) throw error;
      try { localStorage.setItem(SENT_KEY, email); } catch (e) { /* private mode */ }
      main.innerHTML = `<div class="auth-wrap">
        ${artPanel()}
        <div class="auth-form-wrap"><div class="auth-form">
          <h1>Check your email</h1>
          <p class="auth-sub">If an account exists for <b>${esc(email)}</b>, a reset link is on its way. It is valid for one hour.</p>
          <div>
            <p class="text-small text-muted" style="margin-bottom:18px">
              <b>Nothing arrived?</b> Check your spam folder, then try again — we can only send to the address on the account.
              If you signed up with Google or Facebook, use that button instead; those accounts have no password.
            </p>
            <a class="btn btn-ghost btn-block" href="#/login">Back to sign in</a>
          </div>
        </div></div>
      </div>`;
    } catch (err) {
      inlineError((err && err.message) || 'We could not send that link. Try again in a moment.');
    } finally {
      setBusy(document.getElementById('wb-forgot-btn'), false);
    }
  });
}

/* ------------------------------------------------------------ set a new one */
export async function renderResetPassword() {
  const main = document.getElementById('main');
  if (!main) return;

  // Supabase establishes a session from the recovery link, so a live session
  // is the proof that the link is valid and unexpired.
  let hasSession = false;
  try {
    const { data } = await supabase.auth.getSession();
    hasSession = !!(data && data.session);
  } catch (e) { hasSession = false; }

  if (!hasSession) {
    main.innerHTML = `<div class="auth-wrap">
      ${artPanel()}
      <div class="auth-form-wrap"><div class="auth-form">
        <h1>This link is not valid</h1>
        <p class="auth-sub">Password reset links expire after an hour and can only be used once.
           Request a fresh one and it will arrive in a few minutes.</p>
        <a class="btn btn-primary btn-block" href="#/forgot-password">Send me a new link</a>
        <p class="text-small text-muted" style="margin-top:20px;text-align:center">
          <a href="#/login" style="color:var(--brand);font-weight:700">Back to sign in</a>
        </p>
      </div></div>
    </div>`;
    return;
  }

  main.innerHTML = `<div class="auth-wrap">
    ${artPanel()}
    <div class="auth-form-wrap"><div class="auth-form">
      <h1>Choose a new password</h1>
      <p class="auth-sub">At least 8 characters. Something you have not used here before.</p>
      <form id="wb-reset" novalidate>
        <div class="field">
          <label for="rp-pass">New password</label>
          <input id="rp-pass" name="password" type="password" required minlength="8"
                 autocomplete="new-password" placeholder="At least 8 characters">
        </div>
        <div class="field">
          <label for="rp-confirm">Confirm password</label>
          <input id="rp-confirm" name="confirm" type="password" required minlength="8"
                 autocomplete="new-password" placeholder="Type it again">
        </div>
        <div class="field" id="wb-auth-err" role="alert"></div>
        <button type="submit" class="btn btn-primary btn-lg btn-block" id="wb-reset-btn">Save new password</button>
      </form>
    </div></div>
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
      toast('Password updated. You are signed in.', 'ok');
      window.location.hash = '#/dashboard';
    } catch (err) {
      inlineError((err && err.message) || 'That link has expired. Request a new one.');
    } finally {
      const b = document.getElementById('wb-reset-btn');
      if (b) { b.disabled = false; b.textContent = 'Save new password'; }
    }
  });
}

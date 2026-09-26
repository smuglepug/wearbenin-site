/* ==========================================================================
   WearBenin — Supabase client (free tier, hosted sign-in)
   The anon key is publishable. The secret key never ships to the browser.
   ========================================================================== */
const CFG = () => window.WB_CONFIG || {};
const sb = CFG().supabase || {};

export const supabaseConfigured = !!(sb.url && sb.anonKey && window.supabase);

export const supabase = supabaseConfigured
  ? window.supabase.createClient(sb.url, sb.anonKey, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

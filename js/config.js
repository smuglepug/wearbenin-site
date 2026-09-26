/* ==========================================================================
   WearBenin v2 — runtime config (classic script, loaded before the ES module)
   Change WB_CONFIG.apiBase to point the SPA at any other WearBenin API.
   ========================================================================== */
window.WB_CONFIG = {
  /* Base URL of the WearBenin REST API (spec §1). Override here or at runtime with
     localStorage.setItem('wb.apiBase', 'https://api.example.com/api')            */
  apiBase: 'https://wearbenin-backend.onrender.com/api',

  /* Absolute origin used when the API is served from the same host as the SPA.
     When the page is opened over http(s) and the port matches, apiBase is
     rewritten to a same-origin relative path so it works behind any proxy.    */
  preferSameOrigin: true,

  /* Where uploaded images and listing photos are served from. */
  uploadBase: 'https://wearbenin-backend.onrender.com',

  /* Supabase (free tier) — hosted sign-in. anonKey is publishable; the secret key
     lives only in server/.env and never reaches the browser. */
  supabase: {
    url: 'https://pdqirjfqtfjwvsooztoo.supabase.co',
    anonKey: 'sb_publishable_Lm5BaruOAng7mvJfd40nOA_EKx8TgX-',
    providers: { google: true, facebook: true, apple: false, phone: false }
  },

  brand: {
    name: 'WearBenin',
    tagline: "Shop Benin City's fashion, market prices.",
    city: 'Benin City, Edo State, Nigeria',
    whatsapp: '2349136887631',
    instagram: 'https://www.instagram.com/wearbenin',
    tiktok: 'https://www.tiktok.com/@wearbenin',
    facebook: 'https://www.facebook.com/wearbenin',
    x: 'https://x.com/wearbenin',
    whatsappChannel: 'https://whatsapp.com/channel/wearbenin',
    email: 'hello@wearbenin.ng',
    support: 'support@wearbenin.ng',
    phone: '+234 913 688 7631'
  },

  /* demo credentials shown on the login screen (seeded by the backend) */
  demo: {
    buyer: { email: 'buyer1@wearbenin.ng', password: 'Password123!' },
    vendor: { email: 'mamavero@wearbenin.ng', password: 'Password123!' }
  }
};

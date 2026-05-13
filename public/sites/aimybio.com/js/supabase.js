// Supabase client — replaces firebase.js
// Exposes window.sb, window.Auth, window.BioAPI, window.EmailSignup

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const SUPABASE_URL = 'https://xltunldffphrlqstujyg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_782UPQj1VBMKigepsdMZdA_Lxhm6UBH';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

window.sb = sb;

// ── Auth helpers ────────────────────────────────────────────────────────────
window.Auth = {
  user: null,
  profile: null,

  signInGoogle: async () => {
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/dashboard.html' },
    });
    if (error) alert(error.message);
  },

  signInEmail: async (email, password) => {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { alert(error.message); return null; }
    window.location.href = 'dashboard.html';
  },

  signUpEmail: async (email, password) => {
    const { data, error } = await sb.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin + '/dashboard.html' },
    });
    if (error) { alert(error.message); return null; }
    if (data?.user && !data?.session) {
      alert('Check your email to confirm your account, then sign in.');
    } else {
      window.location.href = 'dashboard.html';
    }
  },

  signOut: async () => {
    await sb.auth.signOut();
    window.location.href = 'index.html';
  },

  loadProfile: async () => {
    if (!window.Auth.user) return null;
    const { data } = await sb
      .from('profiles')
      .select('id, email, full_name, plan, plan_status, bio_credits, stripe_customer_id')
      .eq('id', window.Auth.user.id)
      .maybeSingle();
    window.Auth.profile = data || null;
    return data;
  },
};

// ── Bio API (calls edge functions) ──────────────────────────────────────────
async function authFetch(fnPath, { method = 'GET', body } = {}) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) throw new Error('Not logged in');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnPath}`, {
    method,
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
  return json;
}

window.BioAPI = {
  startSession: (opts = {}) =>
    authFetch('bio-session', { method: 'POST', body: { industry: opts.industry, plan: opts.plan } }),
  updateSession: (id, fields) =>
    authFetch(`bio-session/${id}`, { method: 'PATCH', body: fields }),
  getSession: (id) =>
    authFetch(`bio-session/${id}`, { method: 'GET' }),
  listSessions: () =>
    authFetch('bio-session', { method: 'GET' }),
  generate: (sessionId, tone = 'professional') =>
    authFetch('bio-generate', { method: 'POST', body: { session_id: sessionId, tone } }),
  checkout: (plan) =>
    authFetch('stripe-checkout', { method: 'POST', body: { plan } }),
};

// ── Email signup (public, no auth) ──────────────────────────────────────────
window.EmailSignup = {
  submit: async (email) => {
    const { error } = await sb
      .from('email_signups')
      .insert({ email, source: 'aimybio.com' });
    if (error) throw error;

    // Fire-and-forget welcome email via rapid-responder. Failures here do not
    // block the signup \u2014 the row is already stored.
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/rapid-responder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ record: { email, domain: 'aimybio.com' } }),
      });
    } catch (_) { /* non-fatal */ }
  },
};

// ── Auth state observer ─────────────────────────────────────────────────────
sb.auth.onAuthStateChange(async (event, session) => {
  window.Auth.user = session?.user || null;
  if (session?.user) {
    await window.Auth.loadProfile();
  } else {
    window.Auth.profile = null;
  }
  window.dispatchEvent(new CustomEvent('auth-change', { detail: window.Auth.user }));
  if (window.updateAuthUI) window.updateAuthUI(window.Auth.user, window.Auth.profile);
});

// Fire initial load
sb.auth.getSession().then(async ({ data: { session } }) => {
  window.Auth.user = session?.user || null;
  if (session?.user) await window.Auth.loadProfile();
  window.dispatchEvent(new CustomEvent('auth-change', { detail: window.Auth.user }));
  if (window.updateAuthUI) window.updateAuthUI(window.Auth.user, window.Auth.profile);
});

// Supabase edge function: stripe-checkout
// Creates a Stripe Checkout Session for a logged-in user.
//
// Deploy via Supabase CLI:
//   supabase functions deploy stripe-checkout --no-verify-jwt
// Or via the Supabase dashboard:
//   Edge Functions → New Function → paste this code → Deploy.
//
// Required secrets (already set):
//   STRIPE_SECRET_KEY
//   STRIPE_PRICE_PRO, STRIPE_PRICE_LIFETIME, STRIPE_PRICE_TEAM, STRIPE_PRICE_AGENCY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ok = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const err = (msg: string, status = 400) =>
  new Response(JSON.stringify({ error: true, message: msg }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const PLAN_CONFIG: Record<string, { priceEnv: string; mode: 'subscription' | 'payment' }> = {
  pro:      { priceEnv: 'STRIPE_PRICE_PRO',      mode: 'subscription' },
  lifetime: { priceEnv: 'STRIPE_PRICE_LIFETIME', mode: 'payment' },
  team:     { priceEnv: 'STRIPE_PRICE_TEAM',     mode: 'subscription' },
  agency:   { priceEnv: 'STRIPE_PRICE_AGENCY',   mode: 'subscription' },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return err('Method not allowed', 405);

  // Auth
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return err('Unauthorized', 401);
  const token = authHeader.replace('Bearer ', '');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return err('Unauthorized', 401);

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) return err('Stripe not configured', 500);

  try {
    const body = await req.json();
    const plan: string = body.plan;
    const cfg = PLAN_CONFIG[plan];
    if (!cfg) return err(`Unknown plan: ${plan}`);

    const priceId = Deno.env.get(cfg.priceEnv);
    if (!priceId) return err(`${cfg.priceEnv} not set in secrets`, 500);

    const origin = req.headers.get('origin') || 'https://aimybio.com';

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .maybeSingle();

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-04-10' });

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? profile?.email ?? undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: cfg.mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard.html?checkout=success`,
      cancel_url:  `${origin}/pricing.html?checkout=cancel`,
      allow_promotion_codes: true,
      metadata: { user_id: user.id, price_id: priceId, plan },
      ...(cfg.mode === 'subscription'
        ? { subscription_data: { metadata: { user_id: user.id, plan } } }
        : {}),
    });

    return ok({ url: session.url });

  } catch (e) {
    console.error('stripe-checkout error:', e);
    return err((e as Error).message || 'Checkout failed', 500);
  }
});

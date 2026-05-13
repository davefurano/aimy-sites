# AI My Bio

Live at [aimybio.com](https://aimybio.com). Part of the AI My Service network.

## What it does

Answers five questions about a person, then uses Claude (Anthropic) to write six bio formats in parallel:

- **LinkedIn About** — up to 2,000 chars, first person, keyword-rich
- **Speaker Introduction** — 60-second third-person intro for conferences
- **Website About Page** — 300–500 words, warm and conversational
- **Twitter / X Bio** — 160 characters, punchy
- **Email Signature** — one-line tagline under 100 chars
- **Press Kit Bio** — 180–220 words, media-ready

Every output is scored 0–100 on clarity, credibility, memorability, keyword use, and call-to-action, with one specific piece of feedback.

## Stack

- Static HTML + vanilla JS (no build step)
- [Supabase](https://supabase.com) for auth, Postgres, and edge functions (`xltunldffphrlqstujyg`)
- [Anthropic Claude](https://anthropic.com) via edge function `bio-generate`
- [Stripe](https://stripe.com) Checkout via edge functions `stripe-checkout` and `stripe-webhook`
- [Resend](https://resend.com) for transactional email via edge function `rapid-responder`

## Files

```
index.html          Home
login.html          Email + Google auth
pricing.html        5 plans, Stripe Checkout
dashboard.html      Bio sessions list, new bio flow, results
settings.html       Account + plan info
help.html           FAQ
privacy.html        Privacy policy
terms.html          Terms of service
css/styles.css      All styling
js/site-config.js   Marketing copy, plans, formats
js/layout.js        Sidebar + top bar injection
js/supabase.js      Auth + API client (ES module)
js/app.js           Page router + all views
supabase/functions/stripe-checkout/index.ts  Backup of deployed edge function
```

## Edge functions deployed to Supabase

| Function | Purpose |
|---|---|
| `bio-session` | Create / update / fetch bio questionnaire sessions |
| `bio-generate` | Call Claude to write 6 bios from a session |
| `stripe-checkout` | Create Stripe Checkout Session for a plan |
| `stripe-webhook` | Handle subscription events from Stripe |
| `rapid-responder` | Send welcome email via Resend when someone signs up |

## Secrets required in Supabase

- `ANTHROPIC_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_LIFETIME`
- `STRIPE_PRICE_TEAM`
- `STRIPE_PRICE_AGENCY`

## Deploy

Auto-deploys to Netlify on push to `main`.

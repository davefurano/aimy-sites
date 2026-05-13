# aimy-sites

One repo, one Vercel project, 98 custom domains. Each domain serves content
from its own folder. Two domains (`aimyservice.com`, `downloadlounge.com`)
serve dynamic directory pages rendered from the Supabase `public.domains`
table at build time.

## Layout

```
src/
  data/domains.ts              Supabase loader, build-time fetch of directory data
  pages/_directories/[host]/   Astro template for aimyservice.com & downloadlounge.com
public/
  sites/<domain>/              Static drop-in content for each non-directory domain
scripts/
  import-from-ftp.mjs          One-shot pull from FTP into public/sites/
  build-vercel-config.mjs      Generates vercel.json (run as part of `npm run build`)
  verify-dns.mjs               Reports DNS / folder / Vercel alignment
.github/workflows/
  sanity.yml                   Weekly sanity check (replaces nightly-sync)
```

## Routing model

`vercel.json` (generated, not committed) contains one rewrite per domain:

```
Host = aimyservice.com         → /_directories/aimyservice.com/
Host = downloadlounge.com      → /_directories/downloadlounge.com/
Host = aibiogenius.com         → /sites/aibiogenius.com/
Host = aimyresume.app          → /sites/aimyresume.app/
… (one row per domain in public/sites/, with a sibling `www.<domain>` rule)
```

So all 98 domains are pointed at this one Vercel project; Vercel routes by
`Host` header to the matching folder. To add a new domain: add a folder
under `public/sites/<domain>/`, rebuild (rewrites regenerate), add the
custom domain in the Vercel UI, point DNS.

## One-session migration runbook

### Prereqs

- `gh` authenticated as `davefurano` with `repo` and `workflow` scopes
- Node 20+ locally
- Porkbun + Supabase + FTP creds available (see `.env.example`)
- A Vercel account on a plan that allows 100+ custom domains per project
  (check the Pro plan limits before starting — flag if you're not sure)

### Step 1 — Bootstrap repo locally

```bash
cd ~  # or wherever you keep repos
cp -R "<path to aimy-sites folder from outputs>" ./aimy-sites
cd aimy-sites
cp .env.example .env
# Fill in .env with real values

npm install
```

### Step 2 — Pull every site folder off both FTPs

```bash
# Dry-run first to see the list
npm run import:ftp -- --dry-run

# Real import — about 30s–2min depending on site sizes
npm run import:ftp
```

Sites land in `public/sites/<domain>/`. Inspect with `git status` and
`git diff --stat`. Hand-review a few before committing.

### Step 3 — Build locally and smoke-test

```bash
npm run build
npm run preview
# Visit http://localhost:4321/sites/aibiogenius.com/ and
# http://localhost:4321/_directories/aimyservice.com/ to sanity-check
```

### Step 4 — Create GitHub repo and push

```bash
gh repo create davefurano/aimy-sites --public --source=. --remote=origin --push
```

### Step 5 — Connect Vercel

```bash
npm install -g vercel        # if not already
vercel login
vercel link                  # creates Vercel project, links this folder
vercel env add SUPABASE_URL          # paste value when prompted
vercel env add SUPABASE_ANON_KEY     # paste value when prompted
vercel --prod                # first deploy
```

Then in the Vercel dashboard:
- **Settings → Environment Variables** — confirm `SUPABASE_URL` and
  `SUPABASE_ANON_KEY` are set for Production.
- **Settings → Domains** — add all 98 custom domains. You can paste them
  one per line; Vercel queues DNS verification.

### Step 6 — Migrate DNS in batches

Start with one low-stakes domain to verify the end-to-end pipe:

1. In the Vercel dashboard, copy the recommended DNS target for the test
   domain (usually `cname.vercel-dns.com` for `www`, plus an A record at
   the apex).
2. In Porkbun, swap the records on that domain.
3. Wait 5–10 minutes; visit `https://<domain>/`. Confirm content loads and
   the TLS cert auto-provisioned.
4. Repeat for the next 9 domains. Spot-check.
5. Once you're confident, batch the rest.

To automate Porkbun DNS updates, see Porkbun's
[DNS API](https://porkbun.com/api/json/v3/documentation) and `lib/porkbun.mjs`
in the old `aimy` repo.

### Step 7 — Archive the FTPs

Once every domain is on Vercel and confirmed (`npm run verify:dns` shows
`yes` in the `vercel` column for all rows), you can retire the FTP hosting
plans. Keep snapshots of the FTP contents somewhere offline first.

### Step 8 — Decommission the old sync

Delete or archive the `davefurano/aimy` repo's `tools/agents/` and
`.github/workflows/nightly-sync.yml`. The `sanity.yml` in this repo
replaces it.

## Editing workflow (post-migration)

- Static site change → edit `public/sites/<domain>/index.html` → commit → Vercel auto-deploys.
- Add a new domain → `mkdir public/sites/<domain>/`, drop in HTML, commit. Add the domain in Vercel UI. Point DNS.
- Directory page change → edit a row in Supabase `public.domains`. Either wait for the next deploy or trigger a redeploy:

  ```bash
  vercel --prod
  ```

  Or wire a Supabase webhook → Vercel deploy hook for instant updates.

## Sanity checks

```bash
# Local: does the repo agree with Porkbun?
npm run verify:dns

# Weekly: same check in CI, emails you if anything drifts
# (.github/workflows/sanity.yml runs this every Sunday at 00:00 UTC)
```

## Files NOT to commit

`vercel.json` is regenerated on every build from `public/sites/` — it's
gitignored. The same is true for `.vercel/`, `dist/`, and `node_modules/`.

#!/usr/bin/env node
// Generates vercel.json with per-domain Host-based rewrites.
//
//   - Two "directory" hosts (aimyservice.com, downloadlounge.com) →
//     /directories/<host>/  (dynamic page built from Supabase)
//   - Everything else listed in public/sites/<domain>/ →
//     /sites/<domain>/        (static drop-in)
//
// Run as part of `npm run build` (see package.json).

import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIRECTORY_HOSTS = new Set(['aimyservice.com', 'downloadlounge.com']);

const sitesDir = join(process.cwd(), 'public', 'sites');
let staticDomains = [];
try {
  staticDomains = readdirSync(sitesDir).filter((name) => {
    try { return statSync(join(sitesDir, name)).isDirectory(); } catch { return false; }
  });
} catch {
  // public/sites/ doesn't exist yet — that's fine for the first build.
}

const rewrites = [];

// Directory hosts first (so they win if they happen to also exist as a static site folder).
for (const host of DIRECTORY_HOSTS) {
  rewrites.push({
    source: '/(.*)',
    has: [{ type: 'host', value: host }],
    destination: `/directories/${host}/$1`,
  });
  rewrites.push({
    source: '/(.*)',
    has: [{ type: 'host', value: `www.${host}` }],
    destination: `/directories/${host}/$1`,
  });
}

// Static per-domain sites.
for (const domain of staticDomains) {
  if (DIRECTORY_HOSTS.has(domain)) continue;
  rewrites.push({
    source: '/(.*)',
    has: [{ type: 'host', value: domain }],
    destination: `/sites/${domain}/$1`,
  });
  rewrites.push({
    source: '/(.*)',
    has: [{ type: 'host', value: `www.${domain}` }],
    destination: `/sites/${domain}/$1`,
  });
}

const config = {
  $schema: 'https://openapi.vercel.sh/vercel.json',
  cleanUrls: true,
  trailingSlash: true,
  rewrites,
};

writeFileSync('vercel.json', JSON.stringify(config, null, 2) + '\n');
console.log(`[build-vercel-config] wrote vercel.json with ${rewrites.length} rewrites for ` +
            `${staticDomains.length} static domains + ${DIRECTORY_HOSTS.size} directory hosts.`);

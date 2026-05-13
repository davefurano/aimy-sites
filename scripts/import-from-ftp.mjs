#!/usr/bin/env node
// One-shot import: pulls every site folder from both FTPs into public/sites/<domain>/.
//
// Canonical-aware: for each folder, looks up domains.server in Supabase and
// only imports if this FTP is the canonical source. Cross-FTP duplicates are
// resolved automatically by skipping the non-canonical copy.
//
// Flags:
//   --dry-run         Plan but don't write any files.
//   --only=a,b,c      Restrict to a comma-separated list of domains.
//   --no-canonical    Disable the Supabase canonical filter (imports every folder).
//
// Examples:
//   npm run import:ftp -- --dry-run
//   npm run import:ftp
//   npm run import:ftp -- --only=avatarhousebands.com
//   npm run import:ftp -- --no-canonical    # raw import, DL wins duplicates

import { Client } from 'basic-ftp';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const SERVERS = {
  aimyservice: {
    host: 'ftp.aimyservice.com',
    user: 'davefurano@aimyservice.com',
    selfDomain: 'aimyservice.com',
    canonicalLabel: 'AIMyService',
  },
  downloadlounge: {
    host: 'ftp.downloadlounge.com',
    user: 'davefurano@downloadlounge.com',
    selfDomain: 'downloadlounge.com',
    canonicalLabel: 'DownloadLounge',
  },
};

const SYSTEM_DIRS = new Set([
  '.', '..', 'Image_Assets', 'assets', 'css', 'js', '_notes', 'cgi-bin',
]);

// Folder ↔ domain — must match lib/ftp.mjs in the old aimy sync repo.
const TLDS = ['com', 'app', 'org', 'dev', 'work', 'show', 'band', 'co', 'net', 'info', 'io', 'me'];
const TLD_SORTED = [...TLDS].sort((a, b) => b.length - a.length);
function folderToDomain(folder) {
  for (const t of TLD_SORTED) {
    if (folder.endsWith(t)) {
      const stem = folder.slice(0, -t.length);
      if (stem.length > 0) return `${stem}.${t}`;
    }
  }
  return folder;
}

// ---------- Args ----------
const ARGS = new Set(process.argv.slice(2));
const DRY_RUN = ARGS.has('--dry-run');
const NO_CANONICAL = ARGS.has('--no-canonical');
const ONLY = (() => {
  const flag = process.argv.find((a) => a.startsWith('--only='));
  return flag ? new Set(flag.slice('--only='.length).split(',')) : null;
})();

// ---------- Env ----------
const password = process.env.FTP_PASSWORD;
if (!password) throw new Error('FTP_PASSWORD not set. See .env.example.');

// ---------- Canonical map from Supabase ----------
async function loadCanonical() {
  if (NO_CANONICAL) {
    console.log('[import] --no-canonical: importing every folder without Supabase filter');
    return null;
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.log('[import] SUPABASE_URL/SUPABASE_ANON_KEY not set; importing without canonical filter');
    return null;
  }
  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from('domains')
    .select('domain, server, is_active');
  if (error) {
    console.warn(`[import] Supabase query failed (${error.message}); proceeding without filter`);
    return null;
  }
  const map = new Map();
  for (const row of data || []) {
    if (row.server) map.set(row.domain, row.server);
  }
  console.log(`[import] loaded canonical map for ${map.size} domains`);
  return map;
}

// ---------- Import one server ----------
async function importServer(key, canonical) {
  const cfg = SERVERS[key];
  console.log(`\n[import] connecting to ${cfg.host} ...`);
  const client = new Client(30_000);
  client.ftp.verbose = false;
  await client.access({ host: cfg.host, user: cfg.user, password, secure: false });

  try {
    const items = await client.list('/');
    const folders = items
      .filter((i) => i.isDirectory && !i.name.startsWith('_archive') && !SYSTEM_DIRS.has(i.name))
      .map((i) => i.name);

    console.log(`[import] ${cfg.host}: ${folders.length} folders`);

    let imported = 0, skipped = 0;
    for (const folder of folders) {
      const domain = folderToDomain(folder);
      if (ONLY && !ONLY.has(domain)) continue;

      // Canonical filter
      if (canonical && canonical.has(domain)) {
        const expected = canonical.get(domain);
        if (expected !== cfg.canonicalLabel) {
          console.log(`  - SKIP ${folder} (canonical = ${expected}, this FTP = ${cfg.canonicalLabel})`);
          skipped++;
          continue;
        }
      }

      const localPath = join(process.cwd(), 'public', 'sites', domain);
      console.log(`  - ${folder} → public/sites/${domain}/${DRY_RUN ? ' (dry-run)' : ''}`);
      if (DRY_RUN) { imported++; continue; }

      await rm(localPath, { recursive: true, force: true });
      await mkdir(localPath, { recursive: true });
      try {
        await client.downloadToDir(localPath, `/${folder}`);
        imported++;
      } catch (err) {
        console.error(`    ! failed: ${err.message}`);
      }
    }
    console.log(`[import] ${key}: ${imported} imported, ${skipped} skipped`);
  } finally {
    client.close();
  }
}

// ---------- Main ----------
(async () => {
  console.log(`[import] starting${DRY_RUN ? ' (DRY RUN)' : ''}${ONLY ? ` (only: ${[...ONLY].join(', ')})` : ''}`);
  const canonical = await loadCanonical();
  for (const key of Object.keys(SERVERS)) {
    await importServer(key, canonical);
  }
  console.log('\n[import] done. Review with: git status, git diff public/sites/');
})().catch((err) => {
  console.error('[import] fatal:', err);
  process.exit(1);
});

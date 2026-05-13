#!/usr/bin/env node
// One-shot import: pulls every site folder from both FTPs into public/sites/<domain>/.
//
// Canonical-aware: for each folder, looks up domains.server in Supabase and
// only imports if this FTP is the canonical source. Cross-FTP duplicates are
// resolved automatically by skipping the non-canonical copy.
//
// Robust: opens a fresh FTP connection per folder, retries on transient
// transfer errors (passive-mode data socket timeouts), and throttles between
// folders to avoid rate-limiting on the FTP host.
//
// Flags:
//   --dry-run          Plan but don't write any files.
//   --only=a,b,c       Restrict to a comma-separated list of domains.
//   --no-canonical     Disable the Supabase canonical filter.
//   --missing-only     Skip any domain whose public/sites/<domain>/ already has files.
//
// Examples:
//   npm run import:ftp -- --dry-run
//   npm run import:ftp
//   npm run import:ftp -- --missing-only          # fill in just the empties
//   npm run import:ftp -- --only=aibiogenius.com

import { Client } from 'basic-ftp';
import { mkdir, rm, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
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

// Retry tuning. Three attempts: 1s, 3s, 7s backoff. Plus 250ms between folders.
const RETRY_DELAYS_MS = [1000, 3000, 7000];
const INTER_FOLDER_DELAY_MS = 250;
const FTP_TIMEOUT_MS = 60_000;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ---------- Args ----------
const ARGS = new Set(process.argv.slice(2));
const DRY_RUN      = ARGS.has('--dry-run');
const NO_CANONICAL = ARGS.has('--no-canonical');
const MISSING_ONLY = ARGS.has('--missing-only');
const ONLY = (() => {
  const flag = process.argv.find((a) => a.startsWith('--only='));
  return flag ? new Set(flag.slice('--only='.length).split(',')) : null;
})();

// ---------- Env ----------
const password = process.env.FTP_PASSWORD;
if (!password) throw new Error('FTP_PASSWORD not set. See .env.example.');

// ---------- Fresh FTP client per call ----------
async function openClient(key) {
  const cfg = SERVERS[key];
  const client = new Client(FTP_TIMEOUT_MS);
  client.ftp.verbose = false;
  await client.access({ host: cfg.host, user: cfg.user, password, secure: false });
  return client;
}

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

async function hasFiles(localPath) {
  if (!existsSync(localPath)) return false;
  const entries = await readdir(localPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile()) return true;
    if (entry.isDirectory()) {
      const sub = await hasFiles(join(localPath, entry.name));
      if (sub) return true;
    }
  }
  return false;
}

// ---------- List folders (single connection) ----------
async function listServerFolders(key) {
  const client = await openClient(key);
  try {
    const items = await client.list('/');
    return items
      .filter((i) => i.isDirectory && !i.name.startsWith('_archive') && !SYSTEM_DIRS.has(i.name))
      .map((i) => i.name);
  } finally {
    client.close();
  }
}

// ---------- Download with retries (fresh connection each attempt) ----------
async function downloadWithRetry(key, folder, localPath) {
  let lastErr;
  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length + 1; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_DELAYS_MS[attempt - 1];
      console.log(`    retry ${attempt} in ${delay}ms ...`);
      await sleep(delay);
      await rm(localPath, { recursive: true, force: true });
      await mkdir(localPath, { recursive: true });
    }
    const client = await openClient(key);
    try {
      await client.downloadToDir(localPath, `/${folder}`);
      return;
    } catch (err) {
      lastErr = err;
      console.error(`    ! attempt ${attempt + 1} failed: ${err.message}`);
    } finally {
      client.close();
    }
  }
  throw lastErr;
}

// ---------- Process one server ----------
async function importServer(key, canonical) {
  const cfg = SERVERS[key];
  console.log(`\n[import] listing ${cfg.host} ...`);
  const folders = await listServerFolders(key);
  console.log(`[import] ${cfg.host}: ${folders.length} folders`);

  let imported = 0, skipped = 0, alreadyHas = 0, failed = 0;
  const failures = [];
  for (const folder of folders) {
    const domain = folderToDomain(folder);
    if (ONLY && !ONLY.has(domain)) continue;

    if (canonical && canonical.has(domain)) {
      const expected = canonical.get(domain);
      if (expected !== cfg.canonicalLabel) {
        console.log(`  - SKIP ${folder} (canonical = ${expected})`);
        skipped++;
        continue;
      }
    }

    const localPath = join(process.cwd(), 'public', 'sites', domain);

    if (MISSING_ONLY && (await hasFiles(localPath))) {
      console.log(`  - SKIP ${folder} (already has files; --missing-only)`);
      alreadyHas++;
      continue;
    }

    console.log(`  - ${folder} → public/sites/${domain}/${DRY_RUN ? ' (dry-run)' : ''}`);
    if (DRY_RUN) { imported++; continue; }

    await rm(localPath, { recursive: true, force: true });
    await mkdir(localPath, { recursive: true });
    try {
      await downloadWithRetry(key, folder, localPath);
      imported++;
    } catch (err) {
      console.error(`    ! gave up after retries: ${err.message}`);
      failed++;
      failures.push(domain);
    }
    await sleep(INTER_FOLDER_DELAY_MS);
  }
  console.log(`[import] ${key}: ${imported} imported, ${skipped} skipped (canonical), ` +
              `${alreadyHas} already had files, ${failed} failed`);
  if (failures.length) {
    console.log(`[import] ${key} permanent failures:\n  ${failures.join('\n  ')}`);
    console.log(`[import] retry just these later with:\n  npm run import:ftp -- --only=${failures.join(',')}`);
  }
}

// ---------- Main ----------
(async () => {
  console.log(`[import] starting` +
              `${DRY_RUN ? ' (DRY RUN)' : ''}` +
              `${MISSING_ONLY ? ' (--missing-only)' : ''}` +
              `${ONLY ? ` (only: ${[...ONLY].join(', ')})` : ''}`);
  const canonical = await loadCanonical();
  for (const key of Object.keys(SERVERS)) {
    await importServer(key, canonical);
  }
  console.log('\n[import] done. Review with: git status, git diff public/sites/');
})().catch((err) => {
  console.error('[import] fatal:', err);
  process.exit(1);
});

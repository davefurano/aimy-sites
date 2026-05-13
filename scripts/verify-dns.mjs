#!/usr/bin/env node
// Cross-checks Porkbun's domain list against public/sites/ folders and the
// DNS state for each domain (does it point at Vercel yet?).
//
// Output: a printable table of (domain, has_folder, dns_target, status).
// Exit 0 always; this is a status report, not a gate.

import { readdirSync, existsSync } from 'node:fs';
import { resolve as dnsResolve } from 'node:dns/promises';

const apikey = process.env.PORKBUN_API_KEY;
const secretapikey = process.env.PORKBUN_SECRET_KEY;
if (!apikey || !secretapikey) throw new Error('PORKBUN_API_KEY/PORKBUN_SECRET_KEY not set');

const BASE = 'https://api.porkbun.com/api/json/v3';

async function listAllDomains() {
  const res = await fetch(`${BASE}/domain/listAll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apikey, secretapikey }),
  });
  const data = await res.json();
  if (data.status !== 'SUCCESS') throw new Error(data.message || 'Porkbun listAll failed');
  return (data.domains || []).map((d) => d.domain);
}

async function dnsTarget(domain) {
  // Try CNAME first (preferred for Vercel apex via Porkbun ALIAS, or www).
  try {
    const cname = await dnsResolve(domain, 'CNAME');
    return { type: 'CNAME', value: cname[0] };
  } catch {}
  try {
    const a = await dnsResolve(domain, 'A');
    return { type: 'A', value: a[0] };
  } catch {}
  return { type: 'NONE', value: '' };
}

const VERCEL_HINTS = ['cname.vercel-dns.com', 'vercel-dns', '76.76.21'];
function looksLikeVercel({ type, value }) {
  if (!value) return false;
  return VERCEL_HINTS.some((h) => value.includes(h));
}

(async () => {
  const domains = await listAllDomains();
  console.log(`Porkbun: ${domains.length} domains`);

  const sitesDir = 'public/sites';
  const folders = new Set(
    existsSync(sitesDir) ? readdirSync(sitesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name) : []
  );

  const rows = [];
  for (const domain of domains.sort()) {
    const hasFolder = folders.has(domain);
    const target = await dnsTarget(domain);
    const onVercel = looksLikeVercel(target);
    rows.push({ domain, hasFolder, target: `${target.type} ${target.value}`, onVercel });
  }

  const w = (s, n) => String(s).padEnd(n);
  console.log('\n' + w('domain', 32) + w('folder', 8) + w('vercel', 8) + 'dns');
  console.log('-'.repeat(80));
  for (const r of rows) {
    console.log(w(r.domain, 32) + w(r.hasFolder ? 'yes' : 'NO', 8) + w(r.onVercel ? 'yes' : 'no', 8) + r.target);
  }

  const summary = {
    total: rows.length,
    missing_folder: rows.filter((r) => !r.hasFolder).length,
    not_on_vercel: rows.filter((r) => !r.onVercel).length,
    on_vercel: rows.filter((r) => r.onVercel).length,
  };
  console.log('\nSummary:', summary);
})();

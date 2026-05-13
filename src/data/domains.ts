// Build-time loader for the directory data.
// Reads public.domains from Supabase using the anon key (RLS allows SELECT
// to everyone — see "Anyone can view domains" policy).

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set at build time.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface DirectoryEntry {
  id: string;
  domain: string;
  name: string;
  tagline: string | null;
  description: string | null;
  category: string | null;
  server: string | null;
  color: string | null;
  icon: string | null;
  is_active: boolean;
}

let cache: DirectoryEntry[] | null = null;

export async function getAllDomains(): Promise<DirectoryEntry[]> {
  if (cache) return cache;
  const { data, error } = await supabase
    .from('domains')
    .select('id, domain, name, tagline, description, category, server, color, icon, is_active')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  cache = data || [];
  return cache;
}

/** Return directory entries that should appear on a given "host" domain's directory page. */
export async function getDomainsForServer(serverDomain: string): Promise<DirectoryEntry[]> {
  const all = await getAllDomains();
  // Map host -> server label used in the domains table.
  const map: Record<string, string> = {
    'aimyservice.com': 'AIMyService',
    'downloadlounge.com': 'DownloadLounge',
  };
  const serverLabel = map[serverDomain];
  if (!serverLabel) return [];
  return all.filter((d) => d.server === serverLabel && d.domain !== serverDomain);
}

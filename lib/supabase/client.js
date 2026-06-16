'use client';
import { createBrowserClient } from '@supabase/ssr';

// Publishable key is safe to embed in client code — RLS is the actual security boundary.
// .env values override these fallbacks when present (e.g. for staging projects).
const FALLBACK_URL = 'https://opicdwopttlahwambyvx.supabase.co';
const FALLBACK_PUBLISHABLE_KEY = 'sb_publishable_dESxDjADYgiawrNW7ButgQ_APFHhY_V';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || FALLBACK_PUBLISHABLE_KEY;

let supabase;

export function createClient() {
  if (typeof window === 'undefined') {
    return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
  }
  if (!supabase) {
    supabase = createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return supabase;
}

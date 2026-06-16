'use client';
import { createBrowserClient } from '@supabase/ssr';

let supabase;

export function createClient() {
  if (typeof window === 'undefined') {
    // SSR/build-time guard: return a stub that throws if accidentally used server-side
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    );
  }
  if (!supabase) {
    supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    );
  }
  return supabase;
}

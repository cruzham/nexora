"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Browser-side Supabase client for use inside Client Components
 *  (e.g. the login/signup forms). */
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

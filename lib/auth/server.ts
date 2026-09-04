import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Server-side Supabase client. Use this inside Server Components,
 * Route Handlers, and Server Actions -- never in client components.
 *
 * This reads/writes the auth session via cookies, so RLS policies
 * (see /lib/db) see the correct authenticated user on every query.
 */
export function createServerSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component -- middleware will refresh
            // the session, so this can be safely ignored.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // See note above.
          }
        },
      },
    }
  );
}

/** Throws if there's no authenticated user. Use at the top of protected
 *  Server Components / Route Handlers instead of re-checking ad hoc. */
export async function requireUser() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  return user;
}

/** Service-role client -- bypasses RLS. Server-only, never sent to the
 *  client bundle. Use sparingly (e.g. admin/background jobs), and never
 *  in a code path that echoes another user's data back to a request. */
export function createServiceRoleClient() {
  const { createClient } = require("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

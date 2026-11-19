import { createClient } from '@supabase/supabase-js'
import { createServerClient as createSsrClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'

// Service-role client: bypasses RLS. Server-side only, never import from client components.
// (The `server-only` package isn't installed; this file imports next/headers, which already
// fails the build if a client component pulls it in.)
export function createAdminClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export type AdminClient = ReturnType<typeof createAdminClient>

// Cookie-based client acting as the logged-in user (RLS applies). Anon key only.
export async function createServerClient() {
  const store = await cookies()
  return createSsrClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        // Server Components can't set cookies; middleware refreshes the session instead.
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)) } catch {}
      },
    },
  })
}

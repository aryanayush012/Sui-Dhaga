'use client'
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createBrowserSupabase } from '@/lib/supabase/browser'
import type { Database } from '@/lib/database.types'

export type Session = {
  member: { id: string; name: string; role: 'owner' | 'employee' }
  shop: { id: string; name: string; address: string | null; logo_url: string | null; language: string }
  supabase: SupabaseClient<Database>
}
const Ctx = createContext<Session | null>(null)

export function SessionProvider({ value, children }: { value: Omit<Session, 'supabase'>; children: ReactNode }) {
  const supabase = useMemo(createBrowserSupabase, [])
  const v = useMemo(() => ({ ...value, supabase }), [value, supabase])
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>
}

export function useSession(): Session {
  const c = useContext(Ctx)
  if (!c) throw new Error('useSession outside SessionProvider')
  return c
}

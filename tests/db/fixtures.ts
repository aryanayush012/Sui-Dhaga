import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/server'
import { createShop } from '@/lib/admin/shops'
import { createEmployee } from '@/lib/admin/members'
import { mobileToEmail } from '@/lib/mobile'
import type { Database } from '@/lib/database.types'

export const OWNER_PASSWORD = 'secret1'
export const EMPLOYEE_PIN = '123456'

export const admin = () => createAdminClient()

export const randomMobile = () =>
  String(6 + Math.floor(Math.random() * 4)) + String(Math.floor(Math.random() * 1e9)).padStart(9, '0')

export const anonClient = (): SupabaseClient<Database> =>
  createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

export async function signIn(mobile: string, password: string) {
  const client = anonClient()
  const { error } = await client.auth.signInWithPassword({ email: mobileToEmail(mobile), password })
  if (error) throw new Error(error.code ?? error.message)
  return client
}

export async function newShop() {
  const mobile = randomMobile()
  const { shopId, ownerId } = await createShop(admin(), {
    name: 'Test Shop', ownerName: 'Owner', mobile, password: OWNER_PASSWORD,
  })
  return { shopId, owner: { id: ownerId, mobile, client: await signIn(mobile, OWNER_PASSWORD) } }
}

export async function newEmployee(shopId: string) {
  const mobile = randomMobile()
  const { id } = await createEmployee(admin(), { shopId, name: 'Karigar', mobile, pin: EMPLOYEE_PIN })
  return { id, mobile, client: await signIn(mobile, EMPLOYEE_PIN) }
}

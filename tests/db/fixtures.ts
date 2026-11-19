import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/server'
import { createShop } from '@/lib/admin/shops'
import { createEmployee } from '@/lib/admin/members'
import { mobileToEmail } from '@/lib/mobile'
import type { Database } from '@/lib/database.types'
import type { BoardOrder, NewOrderInput } from '@/lib/types'

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

type Client = SupabaseClient<Database>

// Throws Error(<rpc error message>) so tests can `.rejects.toThrow('<code>')`.
export async function rpcOk<T = unknown>(client: Client, fn: string, args?: object): Promise<T> {
  const { data, error } = await client.rpc(fn as never, args as never)
  if (error) throw new Error(error.message)
  return data as T
}

export function newOrder(ownerClient: Client, overrides: Partial<NewOrderInput> = {}) {
  const due = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10)
  return rpcOk<{ id: string; slip_no: number; tracking_token: string }>(ownerClient, 'create_order', {
    p: { customer_name: 'Ramesh', customer_mobile: randomMobile(), due_date: due, garments: [{ type: 'pant', qty: 1 }], ...overrides },
  })
}

export async function stageId(shop: { shopId: string }, name: string) {
  const { data, error } = await admin().from('stages').select('id').eq('shop_id', shop.shopId).eq('name', name).single()
  if (error) throw new Error(error.message)
  return data.id
}

export async function board(client: Client, orderId: string) {
  const { data, error } = await client.from('board_orders').select('*').eq('id', orderId).single()
  if (error) throw new Error(error.message)
  return data as unknown as BoardOrder
}

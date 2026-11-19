import type { SupabaseClient } from '@supabase/supabase-js'
import type { AdminClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'
import { mobileToEmail, normalizeMobile } from '@/lib/mobile'

/** Creates the auth user for a mobile; returns its id and the normalized mobile. */
export async function createAuthUser(admin: AdminClient, mobile: string, password: string) {
  const m = normalizeMobile(mobile)
  if (!m) throw new Error('invalid_mobile')
  const { data, error } = await admin.auth.admin.createUser({ email: mobileToEmail(m), password, email_confirm: true })
  if (error) throw new Error(error.code === 'email_exists' ? 'mobile_taken' : error.message)
  return { id: data.user.id, mobile: m }
}

export async function createEmployee(
  admin: AdminClient,
  { shopId, name, mobile, pin }: { shopId: string; name: string; mobile: string; pin: string },
): Promise<{ id: string }> {
  if (!/^\d{6}$/.test(pin) || !name.trim()) throw new Error('invalid_input')
  const { id, mobile: m } = await createAuthUser(admin, mobile, pin)
  const { error } = await admin.from('members').insert({ id, shop_id: shopId, name: name.trim(), mobile: m, role: 'employee' })
  if (error) {
    await admin.auth.admin.deleteUser(id)
    throw new Error(error.code === '23505' ? 'mobile_taken' : error.message)
  }
  return { id }
}

export async function resetPassword(admin: AdminClient, { mobile, password }: { mobile: string; password: string }) {
  const m = normalizeMobile(mobile)
  if (!m) throw new Error('invalid_mobile')
  if (password.length < 6) throw new Error('invalid_input')
  const { data, error } = await admin.from('members').select('id').eq('mobile', m).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('not_found')
  const { error: e } = await admin.auth.admin.updateUserById(data.id, { password })
  if (e) throw new Error(e.message)
}

type Result = { ok: true } | { ok: false; error: string }
const KNOWN = ['invalid_input', 'invalid_mobile', 'mobile_taken', 'not_owner', 'forbidden']
const fail = (e: unknown): Result => ({ ok: false, error: e instanceof Error && KNOWN.includes(e.message) ? e.message : 'failed' })

/** Verifies the caller (cookie/user client) is an active owner; returns their shop id.
 *  If shopId is given it must be the caller's own, else 'forbidden'. */
export async function assertOwnerOf(client: SupabaseClient<Database>, shopId?: string): Promise<string> {
  const { data: u } = await client.auth.getUser()
  if (!u.user) throw new Error('not_owner')
  const { data } = await client.from('members').select('shop_id, role, is_active').eq('id', u.user.id).maybeSingle()
  if (!data || data.role !== 'owner' || !data.is_active) throw new Error('not_owner')
  if (shopId && shopId !== data.shop_id) throw new Error('forbidden')
  return data.shop_id
}

export async function addEmployeeCore(
  caller: SupabaseClient<Database>, admin: AdminClient, input: { name: string; mobile: string; pin: string },
): Promise<Result> {
  try {
    const shopId = await assertOwnerOf(caller)
    await createEmployee(admin, { shopId, ...input })
    return { ok: true }
  } catch (e) { return fail(e) }
}

export async function resetEmployeePinCore(
  caller: SupabaseClient<Database>, admin: AdminClient, memberId: string, pin: string,
): Promise<Result> {
  try {
    const shopId = await assertOwnerOf(caller)
    if (!/^\d{6}$/.test(pin)) throw new Error('invalid_input')
    const { data } = await admin.from('members').select('shop_id, role').eq('id', memberId).maybeSingle()
    if (!data || data.shop_id !== shopId || data.role !== 'employee') throw new Error('forbidden')
    const { error } = await admin.auth.admin.updateUserById(memberId, { password: pin })
    if (error) throw new Error(error.message)
    return { ok: true }
  } catch (e) { return fail(e) }
}

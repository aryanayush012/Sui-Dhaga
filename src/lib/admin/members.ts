import type { AdminClient } from '@/lib/supabase/server'
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

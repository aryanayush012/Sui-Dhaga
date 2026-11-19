import type { AdminClient } from '@/lib/supabase/server'
import { createAuthUser } from '@/lib/admin/members'

export async function createShop(
  admin: AdminClient,
  { name, ownerName, mobile, password }: { name: string; ownerName: string; mobile: string; password: string },
): Promise<{ shopId: string; ownerId: string }> {
  if (password.length < 6) throw new Error('invalid_input')
  const { id: ownerId, mobile: m } = await createAuthUser(admin, mobile, password)
  const { data: shopId, error } = await admin.rpc('admin_create_shop', {
    p_name: name, p_owner_id: ownerId, p_owner_name: ownerName, p_mobile: m,
  })
  if (error) {
    await admin.auth.admin.deleteUser(ownerId)
    throw new Error(error.code === '23505' ? 'mobile_taken' : error.message)
  }
  return { shopId, ownerId }
}

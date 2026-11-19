'use server'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'
import { addEmployeeCore, resetEmployeePinCore } from '@/lib/admin/members'

export async function addEmployee(input: { name: string; mobile: string; pin: string }) {
  return addEmployeeCore(await createServerClient(), createAdminClient(), input)
}

export async function resetEmployeePin(memberId: string, pin: string) {
  return resetEmployeePinCore(await createServerClient(), createAdminClient(), memberId, pin)
}

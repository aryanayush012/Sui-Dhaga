import { expect, it } from 'vitest'
import { admin, newShop, newEmployee, randomMobile, signIn } from './fixtures'
import { addEmployeeCore, resetEmployeePinCore, assertOwnerOf } from '@/lib/admin/members'

it('owner adds employee who can then log in', async () => {
  const a = await newShop(); const m = randomMobile()
  expect(await addEmployeeCore(a.owner.client, admin(), { name: 'Suresh', mobile: m, pin: '654321' })).toEqual({ ok: true })
  await expect(signIn(m, '654321')).resolves.toBeTruthy()
  const { data } = await admin().from('members').select('shop_id,role').eq('mobile', m).single()
  expect(data).toEqual({ shop_id: a.shopId, role: 'employee' })
})

it('employee cannot add employees', async () => {
  const a = await newShop(); const e = await newEmployee(a.shopId)
  expect(await addEmployeeCore(e.client, admin(), { name: 'X', mobile: randomMobile(), pin: '111111' }))
    .toEqual({ ok: false, error: 'not_owner' })
})

it('rejects 4-digit pin and duplicate mobile', async () => {
  const a = await newShop()
  expect(await addEmployeeCore(a.owner.client, admin(), { name: 'X', mobile: randomMobile(), pin: '1234' }))
    .toEqual({ ok: false, error: 'invalid_input' })
  expect(await addEmployeeCore(a.owner.client, admin(), { name: 'X', mobile: a.owner.mobile, pin: '123456' }))
    .toEqual({ ok: false, error: 'mobile_taken' })
})

it('assertOwnerOf rejects another shop', async () => {
  const a = await newShop(); const b = await newShop()
  await expect(assertOwnerOf(a.owner.client, a.shopId)).resolves.toBe(a.shopId)
  await expect(assertOwnerOf(a.owner.client, b.shopId)).rejects.toThrow('forbidden')
})

it('owner resets own employee PIN; cross-shop, bad pin, owner target refused', async () => {
  const a = await newShop(); const b = await newShop()
  const e = await newEmployee(a.shopId); const other = await newEmployee(b.shopId)
  expect(await resetEmployeePinCore(a.owner.client, admin(), e.id, '246810')).toEqual({ ok: true })
  await expect(signIn(e.mobile, '246810')).resolves.toBeTruthy()
  expect(await resetEmployeePinCore(a.owner.client, admin(), other.id, '246810')).toEqual({ ok: false, error: 'forbidden' })
  await expect(signIn(other.mobile, '246810')).rejects.toThrow()
  expect(await resetEmployeePinCore(a.owner.client, admin(), e.id, '12345')).toEqual({ ok: false, error: 'invalid_input' })
  expect(await resetEmployeePinCore(a.owner.client, admin(), a.owner.id, '246810')).toEqual({ ok: false, error: 'forbidden' })
  await expect(signIn(a.owner.mobile, '246810')).rejects.toThrow()
  expect(await resetEmployeePinCore(e.client, admin(), e.id, '246810')).toEqual({ ok: false, error: 'not_owner' })
})

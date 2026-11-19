import { expect, it } from 'vitest'
import { admin, newShop, signIn } from './fixtures'
import { createEmployee, resetPassword } from '@/lib/admin/members'

it('resetPassword changes the login password; createEmployee validates the PIN', async () => {
  const a = await newShop()
  await resetPassword(admin(), { mobile: `+91 ${a.owner.mobile}`, password: 'newpass1' })
  await expect(signIn(a.owner.mobile, 'newpass1')).resolves.toBeTruthy()
  await expect(resetPassword(admin(), { mobile: '6000000000', password: 'newpass1' })).rejects.toThrow('not_found')
  await expect(createEmployee(admin(), { shopId: a.shopId, name: 'X', mobile: '9000000001', pin: '12345' }))
    .rejects.toThrow('invalid_input')
})

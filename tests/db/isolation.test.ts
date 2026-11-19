import { beforeAll, describe, expect, it } from 'vitest'
import { admin, anonClient, newEmployee, newShop } from './fixtures'
import { createEmployee } from '@/lib/admin/members'

type Shop = Awaited<ReturnType<typeof newShop>>

// ponytail: shops shared across tests to stay under hosted Auth sign-in rate limits
let a: Shop, b: Shop
beforeAll(async () => {
  a = await newShop()
  b = await newShop()
})

describe('isolation', () => {
  it('owner of shop A cannot read shop B rows', async () => {
    const { data } = await a.owner.client.from('stages').select('shop_id')
    expect(data!.every(r => r.shop_id === a.shopId)).toBe(true)
    expect(data).toHaveLength(4)
    const { data: shops } = await a.owner.client.from('shops').select('id')
    expect(shops!.map(s => s.id)).toEqual([a.shopId])
    const { data: members } = await a.owner.client.from('members').select('shop_id')
    expect(members!.every(m => m.shop_id === a.shopId)).toBe(true)
  })

  it('seeds stages in order', async () => {
    const { data } = await a.owner.client.from('stages').select('name').order('position')
    expect(data!.map(s => s.name)).toEqual(['Cutting', 'Stitching', 'Ironing', 'Ready'])
  })

  it('owners read their own orders and payments only', async () => {
    const db = admin()
    const { data: stage } = await db.from('stages').select('id').eq('shop_id', b.shopId).eq('position', 1).single()
    const { data: order, error } = await db.from('orders').insert({
      shop_id: b.shopId, slip_no: 1, customer_name: 'C', customer_mobile: '9876543210',
      due_date: '2026-12-01', stage_id: stage!.id, tracking_token: crypto.randomUUID(), created_by: b.owner.id,
    }).select('id').single()
    expect(error).toBeNull()
    await db.from('payments').insert({ shop_id: b.shopId, order_id: order!.id, amount: 100, method: 'cash', recorded_by: b.owner.id })

    const { data: bOrders } = await b.owner.client.from('orders').select('id')
    expect(bOrders!.map(o => o.id)).toEqual([order!.id])
    const { data: aOrders } = await a.owner.client.from('orders').select('id')
    expect(aOrders).toEqual([])
    const { data: aPayments } = await a.owner.client.from('payments').select('id')
    expect(aPayments).toEqual([])
  })

  it('employee cannot read orders table directly', async () => {
    const e = await newEmployee(b.shopId)
    const { data } = await e.client.from('orders').select('id')
    expect(data).toEqual([])
    const { error } = await e.client.rpc('set_member_active', { p_member_id: b.owner.id, p_active: false })
    expect(error?.message).toBe('not_owner')
  })

  it('authenticated users cannot insert directly', async () => {
    const { error } = await a.owner.client.from('stages').insert({ shop_id: a.shopId, name: 'X', position: 9 })
    expect(error).not.toBeNull()
    const { error: e2 } = await a.owner.client.rpc('admin_create_shop', {
      p_name: 'X', p_owner_id: a.owner.id, p_owner_name: 'X', p_mobile: '9999999999',
    })
    expect(e2).not.toBeNull()
  })

  it('owner updates only their own shop details', async () => {
    const { error } = await a.owner.client.from('shops').update({ name: 'Renamed' }).eq('id', a.shopId)
    expect(error).toBeNull()
    const { data } = await admin().from('shops').select('name').eq('id', a.shopId).single()
    expect(data!.name).toBe('Renamed')

    const { error: counter } = await a.owner.client.from('shops').update({ slip_counter: 99 }).eq('id', a.shopId)
    expect(counter).not.toBeNull()

    await a.owner.client.from('shops').update({ name: 'Hacked' }).eq('id', b.shopId)
    const { data: bShop } = await admin().from('shops').select('name').eq('id', b.shopId).single()
    expect(bShop!.name).toBe('Test Shop')
  })

  it('anon sees nothing', async () => {
    const { data } = await anonClient().from('stages').select('id')
    expect(data ?? []).toEqual([])
  })

  it('inactive member sees nothing', async () => {
    const e = await newEmployee(a.shopId)
    const { error } = await a.owner.client.rpc('set_member_active', { p_member_id: e.id, p_active: false })
    expect(error).toBeNull()
    const { data } = await e.client.from('stages').select('id')
    expect(data).toEqual([])
  })

  it('owner cannot deactivate a member of another shop, or themselves', async () => {
    const e = await newEmployee(b.shopId)
    const { error } = await a.owner.client.rpc('set_member_active', { p_member_id: e.id, p_active: false })
    expect(error?.message).toBe('forbidden')
    const { error: self } = await a.owner.client.rpc('set_member_active', { p_member_id: a.owner.id, p_active: false })
    expect(self?.message).toBe('forbidden')
  })

  it('mobile can belong to only one account', async () => {
    await expect(createEmployee(admin(), { shopId: a.shopId, name: 'X', mobile: a.owner.mobile, pin: '123456' }))
      .rejects.toThrow('mobile_taken')
    await expect(createEmployee(admin(), { shopId: a.shopId, name: 'X', mobile: '12345', pin: '123456' }))
      .rejects.toThrow('invalid_mobile')
  })
})

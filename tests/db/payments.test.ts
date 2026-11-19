import { describe, expect, it } from 'vitest'
import { admin, board, newEmployee, newOrder, newShop, rpcOk } from './fixtures'

const pay = (c: Awaited<ReturnType<typeof newShop>>['owner']['client'], id: string, amount: number, note: string | null = null) =>
  rpcOk(c, 'add_payment', { p_order_id: id, p_amount: amount, p_method: 'cash', p_note: note })

describe('payments', () => {
  it('advance before total, then total, then balance', async () => {
    const a = await newShop(); const o = await newOrder(a.owner.client, { advance: { amount: 200, method: 'cash' } })
    await rpcOk(a.owner.client, 'set_total', { p_order_id: o.id, p_total: 500 })
    await rpcOk(a.owner.client, 'add_payment', { p_order_id: o.id, p_amount: 100, p_method: 'upi', p_note: null })
    const row = await board(a.owner.client, o.id)
    expect([row.total_amount, row.paid_amount]).toEqual([500, 300])
  })
  it('cannot pay more than total', async () => {
    const a = await newShop(); const o = await newOrder(a.owner.client, { total_amount: 500 })
    await expect(pay(a.owner.client, o.id, 600)).rejects.toThrow('exceeds_total')
  })
  it('cannot lower total below paid', async () => {
    const a = await newShop(); const o = await newOrder(a.owner.client, { total_amount: 500, advance: { amount: 300, method: 'cash' } })
    await expect(rpcOk(a.owner.client, 'set_total', { p_order_id: o.id, p_total: 200 })).rejects.toThrow('below_paid')
  })
  it('rejects zero amount and bad method', async () => {
    const a = await newShop(); const o = await newOrder(a.owner.client)
    await expect(pay(a.owner.client, o.id, 0)).rejects.toThrow('invalid_input')
    await expect(rpcOk(a.owner.client, 'add_payment', { p_order_id: o.id, p_amount: 5, p_method: 'card', p_note: null }))
      .rejects.toThrow('invalid_input')
  })
  it('negative entry needs a note and cannot go below zero', async () => {
    const a = await newShop(); const o = await newOrder(a.owner.client, { advance: { amount: 200, method: 'cash' } })
    await expect(pay(a.owner.client, o.id, -50)).rejects.toThrow('note_required')
    await expect(pay(a.owner.client, o.id, -300, 'refund')).rejects.toThrow('negative_balance')
    await pay(a.owner.client, o.id, -50, 'mistake')
    expect((await board(a.owner.client, o.id)).paid_amount).toBe(150)
  })
  it('payments cannot be updated or deleted directly', async () => {
    const a = await newShop(); const o = await newOrder(a.owner.client, { advance: { amount: 200, method: 'cash' } })
    await a.owner.client.from('payments').update({ amount: 1 }).eq('order_id', o.id)
    await a.owner.client.from('payments').delete().eq('order_id', o.id)
    const { data } = await a.owner.client.from('payments').select('amount').eq('order_id', o.id)
    expect(data!.map(p => p.amount)).toEqual([200])
  })
  it('employee cannot add payment or set total', async () => {
    const a = await newShop(); const o = await newOrder(a.owner.client); const e = await newEmployee(a.shopId)
    await expect(pay(e.client, o.id, 10)).rejects.toThrow('not_owner')
    await expect(rpcOk(e.client, 'set_total', { p_order_id: o.id, p_total: 10 })).rejects.toThrow('not_owner')
  })
  it('allows refund on cancelled order and logs events', async () => {
    const a = await newShop(); const o = await newOrder(a.owner.client, { advance: { amount: 100, method: 'cash' } })
    await rpcOk(a.owner.client, 'set_special_state', { p_order_id: o.id, p_state: 'cancelled' })
    await pay(a.owner.client, o.id, -100, 'cancelled refund')
    await rpcOk(a.owner.client, 'set_total', { p_order_id: o.id, p_total: 50 })
    const { data } = await admin().from('order_events').select('action, from_value, to_value').eq('order_id', o.id).in('action', ['total'])
    expect(data).toEqual([{ action: 'total', from_value: null, to_value: '50' }])
  })
})

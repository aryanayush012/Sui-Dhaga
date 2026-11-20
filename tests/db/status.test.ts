import { beforeAll, describe, expect, it } from 'vitest'
import { admin, board, newEmployee, newOrder, newShop, rpcOk, stageId } from './fixtures'

type Shop = Awaited<ReturnType<typeof newShop>>

// ponytail: shops shared across tests to stay under hosted Auth sign-in rate limits
let a: Shop, b: Shop, e: Awaited<ReturnType<typeof newEmployee>>
beforeAll(async () => {
  a = await newShop()
  b = await newShop()
  e = await newEmployee(a.shopId)
})

const events = async (orderId: string) =>
  (await admin().from('order_events').select('action,from_value,to_value').eq('order_id', orderId).order('created_at')).data!

const payments = async (orderId: string) =>
  (await admin().from('payments').select('amount,method,note').eq('order_id', orderId).order('created_at')).data!

describe('statuses', () => {
  it('new shop has 5 stages starting with Unstarted', async () => {
    const { data } = await a.owner.client.from('stages').select('name').order('position')
    expect(data!.map(s => s.name)).toEqual(['Unstarted', 'Cutting', 'Stitching', 'Ironing', 'Ready'])
  })

  it('new order starts in Unstarted', async () => {
    const o = await newOrder(a.owner.client)
    expect((await board(a.owner.client, o.id)).stage_name).toBe('Unstarted')
  })

  it('on_hold is no longer accepted', async () => {
    const o = await newOrder(a.owner.client)
    const { error } = await a.owner.client.rpc('set_special_state', { p_order_id: o.id, p_state: 'on_hold' })
    expect(error).not.toBeNull()
  })

  it('owner: stage → delivered → reopen into Ready writes the expected events', async () => {
    const o = await newOrder(a.owner.client)
    const ready = await stageId(a, 'Ready')
    await rpcOk(a.owner.client, 'set_status', { p_order_id: o.id, p_target: 'delivered' })
    expect((await board(a.owner.client, o.id)).special_state).toBe('delivered')
    await rpcOk(a.owner.client, 'set_status', { p_order_id: o.id, p_target: ready })
    const r = await board(a.owner.client, o.id)
    expect([r.special_state, r.stage_name, r.comm_kind, r.communicated]).toEqual([null, 'Ready', 'ready', false])
    const ev = await events(o.id)
    expect(ev.map(x => x.action)).toEqual(['created', 'special_state', 'special_state', 'stage'])
    expect(ev.slice(1).map(x => [x.from_value, x.to_value]))
      .toEqual([[null, 'delivered'], ['delivered', null], [await stageId(a, 'Unstarted'), ready]])
  })

  it('same-stage target and unchanged end state are no-ops', async () => {
    const o = await newOrder(a.owner.client)
    await rpcOk(a.owner.client, 'set_status', { p_order_id: o.id, p_target: await stageId(a, 'Unstarted') })
    await rpcOk(a.owner.client, 'set_status', { p_order_id: o.id, p_target: 'cancelled' })
    await rpcOk(a.owner.client, 'set_status', { p_order_id: o.id, p_target: 'cancelled' })
    expect((await events(o.id)).map(x => x.action)).toEqual(['created', 'special_state'])
  })

  it('owner reopens closed order into its current stage with only a special_state event', async () => {
    const o = await newOrder(a.owner.client)
    await rpcOk(a.owner.client, 'set_status', { p_order_id: o.id, p_target: 'cancelled' })
    await rpcOk(a.owner.client, 'set_status', { p_order_id: o.id, p_target: await stageId(a, 'Unstarted') })
    expect((await board(a.owner.client, o.id)).special_state).toBeNull()
    expect((await events(o.id)).map(x => x.action)).toEqual(['created', 'special_state', 'special_state'])
  })

  it('employee: stage moves allowed, end states refused, closed orders refused', async () => {
    const o = await newOrder(a.owner.client)
    const cutting = await stageId(a, 'Cutting')
    await rpcOk(e.client, 'set_status', { p_order_id: o.id, p_target: cutting })
    expect((await board(a.owner.client, o.id)).stage_name).toBe('Cutting')
    await expect(rpcOk(e.client, 'set_status', { p_order_id: o.id, p_target: 'delivered' })).rejects.toThrow('not_owner')
    await expect(rpcOk(e.client, 'set_status', { p_order_id: o.id, p_target: 'cancelled' })).rejects.toThrow('not_owner')
    const theirs = await newOrder(a.owner.client, { assignee_id: (await newEmployee(a.shopId)).id })
    await expect(rpcOk(e.client, 'set_status', { p_order_id: theirs.id, p_target: cutting })).rejects.toThrow('forbidden')
  })

  it('employee cannot reopen closed order', async () => {
    const o = await newOrder(a.owner.client)
    await rpcOk(a.owner.client, 'set_status', { p_order_id: o.id, p_target: 'cancelled' })
    await expect(rpcOk(e.client, 'set_status', { p_order_id: o.id, p_target: await stageId(a, 'Cutting') }))
      .rejects.toThrow('order_closed')
    expect((await board(a.owner.client, o.id)).special_state).toBe('cancelled')
  })

  it('set_status rejects another shop stage and garbage', async () => {
    const o = await newOrder(a.owner.client)
    for (const t of [await stageId(b, 'Cutting'), 'on_hold', 'garbage', ''])
      await expect(rpcOk(a.owner.client, 'set_status', { p_order_id: o.id, p_target: t }), t).rejects.toThrow('invalid_input')
    await expect(rpcOk(b.owner.client, 'set_status', { p_order_id: o.id, p_target: 'cancelled' })).rejects.toThrow('not_found')
    await expect(rpcOk(b.owner.client, 'set_status', { p_order_id: o.id, p_target: await stageId(b, 'Cutting') }))
      .rejects.toThrow('not_found')
    const r = await board(a.owner.client, o.id)
    expect([r.special_state, r.stage_name]).toEqual([null, 'Unstarted'])
  })
})

describe('set_paid', () => {
  it('set_paid records a delta and logs paid from/to', async () => {
    const o = await newOrder(a.owner.client, { total_amount: 800, advance: { amount: 300, method: 'cash' } })
    await rpcOk(a.owner.client, 'set_paid', { p_order_id: o.id, p_paid: 500 })
    expect((await board(a.owner.client, o.id)).paid_amount).toBe(500)
    await rpcOk(a.owner.client, 'set_paid', { p_order_id: o.id, p_paid: 0 })
    expect((await board(a.owner.client, o.id)).paid_amount).toBe(0)
    const { data: ev } = await a.owner.client.from('order_events').select('from_value,to_value').eq('order_id', o.id).eq('action', 'paid').order('created_at')
    expect(ev).toEqual([{ from_value: '300', to_value: '500' }, { from_value: '500', to_value: '0' }])
    expect((await payments(o.id)).slice(1)).toEqual([
      { amount: 200, method: 'other', note: 'Paid ₹300 → ₹500' },
      { amount: -500, method: 'other', note: 'Paid ₹500 → ₹0' },
    ])
  })

  it('set_paid limits', async () => {
    const o = await newOrder(a.owner.client, { total_amount: 800 })
    await expect(rpcOk(a.owner.client, 'set_paid', { p_order_id: o.id, p_paid: 900 })).rejects.toThrow('exceeds_total')
    await expect(rpcOk(a.owner.client, 'set_paid', { p_order_id: o.id, p_paid: -1 })).rejects.toThrow('invalid_input')
    await expect(rpcOk(a.owner.client, 'set_paid', { p_order_id: o.id, p_paid: null })).rejects.toThrow('invalid_input')
    await rpcOk(a.owner.client, 'set_paid', { p_order_id: o.id, p_paid: 800 })
    await rpcOk(a.owner.client, 'set_paid', { p_order_id: o.id, p_paid: 800 })
    expect(await payments(o.id)).toHaveLength(1)
    const free = await newOrder(a.owner.client)
    await rpcOk(a.owner.client, 'set_paid', { p_order_id: free.id, p_paid: 5000 })
    expect((await board(a.owner.client, free.id)).paid_amount).toBe(5000)
    await expect(rpcOk(e.client, 'set_paid', { p_order_id: o.id, p_paid: 100 })).rejects.toThrow('not_owner')
    await expect(rpcOk(b.owner.client, 'set_paid', { p_order_id: o.id, p_paid: 100 })).rejects.toThrow('not_found')
  })
})

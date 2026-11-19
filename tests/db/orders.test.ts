import { beforeAll, describe, expect, it } from 'vitest'
import { admin, anonClient, board, newEmployee, newOrder, newShop, rpcOk, stageId } from './fixtures'

type Shop = Awaited<ReturnType<typeof newShop>>
type Employee = Awaited<ReturnType<typeof newEmployee>>

// ponytail: one shared shop + employee where a test doesn't need a fresh slip counter
let s: Shop, e1: Employee
beforeAll(async () => {
  s = await newShop()
  e1 = await newEmployee(s.shopId)
})

const events = async (orderId: string) => {
  const { data } = await s.owner.client.from('order_events').select('action, from_value, to_value')
    .eq('order_id', orderId).order('created_at')
  return data!
}

describe('create_order', () => {
  it('creates order in first stage with slip 1 then 2', async () => {
    const a = await newShop()
    const o1 = await newOrder(a.owner.client); const o2 = await newOrder(a.owner.client)
    expect([o1.slip_no, o2.slip_no]).toEqual([1, 2])
    const data = await board(a.owner.client, o1.id)
    expect(data.stage_name).toBe('Cutting')
    expect(data.garment_summary).toBe('1 pant')
    expect(data.is_ready).toBe(false)
    expect(data.paid_amount).toBe(0)
    expect(data.comm_kind).toBeNull(); expect(data.communicated).toBe(false)
    expect(o1.tracking_token).toMatch(/^[A-Za-z0-9_-]{32}$/)
    expect(data.tracking_token).toBe(o1.tracking_token)
  })

  it('concurrent creates get distinct slip numbers', async () => {
    const orders = await Promise.all(Array.from({ length: 10 }, () => newOrder(s.owner.client)))
    expect(new Set(orders.map(o => o.slip_no)).size).toBe(10)
  })

  it('slip numbers are per shop', async () => {
    await newOrder(s.owner.client)
    const b = await newShop()
    expect((await newOrder(b.owner.client)).slip_no).toBe(1)
  })

  it('rejects bad mobile, missing fields and empty garments', async () => {
    await expect(newOrder(s.owner.client, { customer_mobile: '12345' })).rejects.toThrow('invalid_mobile')
    await expect(newOrder(s.owner.client, { garments: [] })).rejects.toThrow('invalid_input')
    await expect(newOrder(s.owner.client, { customer_name: '  ' })).rejects.toThrow('invalid_input')
    await expect(newOrder(s.owner.client, { garments: [{ type: 'hat' as never, qty: 1 }] })).rejects.toThrow('invalid_input')
  })

  it('employee cannot create orders', async () => {
    await expect(newOrder(e1.client)).rejects.toThrow('not_owner')
  })

  it('records the advance as a payment, capped by the total', async () => {
    await expect(newOrder(s.owner.client, { total_amount: 500, advance: { amount: 600, method: 'cash' } }))
      .rejects.toThrow('exceeds_total')
    const o = await newOrder(s.owner.client, {
      total_amount: 500, advance: { amount: 200, method: 'upi' },
      garments: [{ type: 'shirt', qty: 1 }, { type: 'pant', qty: 2 }],
    })
    const row = await board(s.owner.client, o.id)
    expect(row.paid_amount).toBe(200)
    expect(row.total_amount).toBe(500)
    expect(row.garment_summary).toBe('2 pant, 1 shirt')
    expect((await events(o.id)).map(e => e.action)).toEqual(['created', 'payment'])
    // advance allowed before a total is set
    const o2 = await newOrder(s.owner.client, { advance: { amount: 100, method: 'cash' } })
    expect((await board(s.owner.client, o2.id)).paid_amount).toBe(100)
  })

  it('assignee must be an active member of the same shop', async () => {
    const other = await newShop()
    await expect(newOrder(s.owner.client, { assignee_id: other.owner.id })).rejects.toThrow('invalid_input')
    const o = await newOrder(s.owner.client, { assignee_id: e1.id })
    expect((await board(s.owner.client, o.id)).assignee_name).toBe('Karigar')
  })
})

describe('board_orders', () => {
  it('employee sees board without mobile or token', async () => {
    const o = await newOrder(s.owner.client)
    const data = await board(e1.client, o.id)
    expect(data.customer_mobile).toBeNull(); expect(data.tracking_token).toBeNull()
    expect(data.customer_name).toBe('Ramesh')
  })

  it('owner sees mobile', async () => {
    const o = await newOrder(s.owner.client, { customer_mobile: '9123456780' })
    expect((await board(s.owner.client, o.id)).customer_mobile).toBe('9123456780')
  })

  it('board_orders never shows another shop', async () => {
    const a = await newShop(); await newOrder(s.owner.client)
    const { data } = await a.owner.client.from('board_orders').select('id')
    expect(data).toEqual([])
  })

  it('anon cannot read board_orders', async () => {
    const { data, error } = await anonClient().from('board_orders').select('id')
    expect(error).not.toBeNull()
    expect(data).toBeNull()
  })
})

describe('order mutations', () => {
  it('employee moves unassigned or own orders, not others', async () => {
    const e2 = await newEmployee(s.shopId)
    const stitching = await stageId(s, 'Stitching')
    const free = await newOrder(s.owner.client)
    const mine = await newOrder(s.owner.client, { assignee_id: e1.id })
    const theirs = await newOrder(s.owner.client, { assignee_id: e2.id })
    expect((await e1.client.rpc('move_order', { p_order_id: free.id, p_stage_id: stitching })).error).toBeNull()
    expect((await e1.client.rpc('move_order', { p_order_id: mine.id, p_stage_id: stitching })).error).toBeNull()
    expect((await e1.client.rpc('move_order', { p_order_id: theirs.id, p_stage_id: stitching })).error?.message).toBe('forbidden')
    expect((await board(s.owner.client, mine.id)).stage_name).toBe('Stitching')
    expect((await board(s.owner.client, theirs.id)).stage_name).toBe('Cutting')
    // same rule for rack
    expect((await e1.client.rpc('set_rack', { p_order_id: theirs.id, p_rack: 'B3' })).error?.message).toBe('forbidden')
    await rpcOk(e1.client, 'set_rack', { p_order_id: mine.id, p_rack: ' B3 ' })
    expect((await board(s.owner.client, mine.id)).rack).toBe('B3')
    await rpcOk(e1.client, 'set_rack', { p_order_id: mine.id, p_rack: '   ' })
    expect((await board(s.owner.client, mine.id)).rack).toBeNull()
  })

  it('moving to the last stage marks the order ready', async () => {
    const o = await newOrder(s.owner.client)
    await rpcOk(s.owner.client, 'move_order', { p_order_id: o.id, p_stage_id: await stageId(s, 'Ready') })
    expect((await board(s.owner.client, o.id)).is_ready).toBe(true)
  })

  it('cannot move a cancelled order; resume allows it', async () => {
    const o = await newOrder(s.owner.client)
    const stitching = await stageId(s, 'Stitching')
    await rpcOk(s.owner.client, 'set_special_state', { p_order_id: o.id, p_state: 'cancelled' })
    expect((await board(s.owner.client, o.id)).special_state).toBe('cancelled')
    await expect(rpcOk(s.owner.client, 'move_order', { p_order_id: o.id, p_stage_id: stitching })).rejects.toThrow('order_closed')
    await rpcOk(s.owner.client, 'set_special_state', { p_order_id: o.id, p_state: null })
    await rpcOk(s.owner.client, 'move_order', { p_order_id: o.id, p_stage_id: stitching })
    const row = await board(s.owner.client, o.id)
    expect(row.special_state).toBeNull(); expect(row.stage_name).toBe('Stitching')
    await expect(rpcOk(s.owner.client, 'set_special_state', { p_order_id: o.id, p_state: 'lost' })).rejects.toThrow('invalid_input')
  })

  it('employee cannot change due date, assign, or use other owner-only RPCs', async () => {
    const o = await newOrder(s.owner.client)
    const calls: [string, object][] = [
      ['change_due_date', { p_order_id: o.id, p_due: '2027-01-01' }],
      ['assign_order', { p_order_id: o.id, p_member_id: e1.id }],
      ['set_special_state', { p_order_id: o.id, p_state: 'on_hold' }],
      ['update_order_info', { p_order_id: o.id, p_name: 'X', p_mobile: '9000000000', p_notes: null }],
      ['save_garment', { p_order_id: o.id, p: { type: 'shirt', qty: 1 } }],
    ]
    for (const [fn, args] of calls) await expect(rpcOk(e1.client, fn, args)).rejects.toThrow('not_owner')
  })

  it('every mutation writes an order_event and bumps updated_at', async () => {
    const o = await newOrder(s.owner.client)
    const before = (await board(s.owner.client, o.id)).updated_at
    await rpcOk(s.owner.client, 'move_order', { p_order_id: o.id, p_stage_id: await stageId(s, 'Stitching') })
    await rpcOk(s.owner.client, 'set_rack', { p_order_id: o.id, p_rack: 'A1' })
    await rpcOk(s.owner.client, 'change_due_date', { p_order_id: o.id, p_due: '2027-01-01' })
    expect((await events(o.id)).map(e => e.action)).toEqual(['created', 'stage', 'rack', 'due_date'])
    const row = await board(s.owner.client, o.id)
    expect(row.due_date).toBe('2027-01-01')
    expect(row.updated_at > before).toBe(true)
  })

  it('assign_order accepts own active members or null only', async () => {
    const o = await newOrder(s.owner.client)
    await rpcOk(s.owner.client, 'assign_order', { p_order_id: o.id, p_member_id: e1.id })
    expect((await board(s.owner.client, o.id)).assignee_id).toBe(e1.id)
    await rpcOk(s.owner.client, 'assign_order', { p_order_id: o.id, p_member_id: null })
    expect((await board(s.owner.client, o.id)).assignee_id).toBeNull()
    const other = await newShop()
    await expect(rpcOk(s.owner.client, 'assign_order', { p_order_id: o.id, p_member_id: other.owner.id }))
      .rejects.toThrow('invalid_input')
  })

  it('update_order_info never logs the mobile number', async () => {
    const o = await newOrder(s.owner.client)
    await expect(rpcOk(s.owner.client, 'update_order_info', { p_order_id: o.id, p_name: 'Suresh', p_mobile: '123', p_notes: null }))
      .rejects.toThrow('invalid_mobile')
    await rpcOk(s.owner.client, 'update_order_info', { p_order_id: o.id, p_name: 'Suresh', p_mobile: '9988776655', p_notes: 'urgent' })
    const row = await board(s.owner.client, o.id)
    expect([row.customer_name, row.customer_mobile]).toEqual(['Suresh', '9988776655'])
    const { data } = await e1.client.from('order_events').select('*').eq('order_id', o.id)
    expect(JSON.stringify(data)).not.toContain('9988776655')
    expect(data!.find(e => e.action === 'info')?.to_value).toBe('name,mobile,notes')
  })

  it('saves garments and cannot delete the last one', async () => {
    const o = await newOrder(s.owner.client)
    const { data: [g] } = await s.owner.client.from('garments').select('id').eq('order_id', o.id) as { data: { id: string }[] }
    await expect(rpcOk(s.owner.client, 'delete_garment', { p_garment_id: g.id })).rejects.toThrow('invalid_input')
    await rpcOk(s.owner.client, 'save_garment', { p_order_id: o.id, p: { id: g.id, type: 'pant', qty: 3, measurements: { waist: '32' } } })
    const added = await rpcOk<string>(s.owner.client, 'save_garment', { p_order_id: o.id, p: { type: 'shirt', qty: 1 } })
    expect((await board(s.owner.client, o.id)).garment_summary).toBe('3 pant, 1 shirt')
    await rpcOk(s.owner.client, 'delete_garment', { p_garment_id: added })
    expect((await board(s.owner.client, o.id)).garment_summary).toBe('3 pant')
    expect((await events(o.id)).map(e => e.action)).toEqual(['created', 'garment', 'garment', 'garment'])
  })

  it('inactive member gets not_member', async () => {
    const e = await newEmployee(s.shopId)
    const o = await newOrder(s.owner.client)
    await rpcOk(s.owner.client, 'set_member_active', { p_member_id: e.id, p_active: false })
    await expect(rpcOk(e.client, 'set_rack', { p_order_id: o.id, p_rack: 'X' })).rejects.toThrow('not_member')
  })
})

describe('cross-shop attacks', () => {
  let x: Shop, mine: { id: string }, theirs: { id: string }, theirGarment: string
  beforeAll(async () => {
    x = await newShop()
    mine = await newOrder(s.owner.client)
    theirs = await newOrder(x.owner.client)
    const { data } = await admin().from('garments').select('id').eq('order_id', theirs.id).single()
    theirGarment = data!.id
  })

  it('every RPC on another shop\'s order is not_found', async () => {
    const xStage = await stageId(x, 'Stitching')
    const calls: [string, object][] = [
      ['move_order', { p_order_id: theirs.id, p_stage_id: xStage }],
      ['set_rack', { p_order_id: theirs.id, p_rack: 'Z' }],
      ['assign_order', { p_order_id: theirs.id, p_member_id: null }],
      ['change_due_date', { p_order_id: theirs.id, p_due: '2027-01-01' }],
      ['set_special_state', { p_order_id: theirs.id, p_state: 'cancelled' }],
      ['update_order_info', { p_order_id: theirs.id, p_name: 'X', p_mobile: '9000000000', p_notes: null }],
      ['save_garment', { p_order_id: theirs.id, p: { type: 'shirt', qty: 1 } }],
      ['save_garment', { p_order_id: mine.id, p: { id: theirGarment, type: 'shirt', qty: 1 } }],
      ['delete_garment', { p_garment_id: theirGarment }],
    ]
    for (const [fn, args] of calls) await expect(rpcOk(s.owner.client, fn, args), fn).rejects.toThrow('not_found')
    const row = await board(x.owner.client, theirs.id)
    expect([row.stage_name, row.rack, row.special_state, row.customer_name, row.garment_summary])
      .toEqual(['Cutting', null, null, 'Ramesh', '1 pant'])
  })

  it('cannot move own order into another shop\'s stage', async () => {
    await expect(rpcOk(s.owner.client, 'move_order', { p_order_id: mine.id, p_stage_id: await stageId(x, 'Ready') }))
      .rejects.toThrow('invalid_input')
  })
})

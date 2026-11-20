import { describe, expect, it } from 'vitest'
import { admin, anonClient, board, newEmployee, newOrder, newShop, rpcOk, stageId } from './fixtures'

type Client = Awaited<ReturnType<typeof newShop>>['owner']['client']
const send = (c: Client, id: string, kind: string) => rpcOk(c, 'record_whatsapp_send', { p_order_id: id, p_kind: kind })
const move = (c: Client, id: string, stage: string) => rpcOk(c, 'move_order', { p_order_id: id, p_stage_id: stage })

describe('whatsapp sends + status communicated', () => {
  it('created → communicated after send', async () => {
    const a = await newShop(); const o = await newOrder(a.owner.client)
    expect((await board(a.owner.client, o.id)).communicated).toBe(false)
    await send(a.owner.client, o.id, 'created')
    const r = await board(a.owner.client, o.id)
    expect([r.comm_kind, r.communicated]).toEqual(['created', true])
    const { data: ev } = await a.owner.client.from('order_events').select('action, to_value').eq('order_id', o.id).eq('action', 'whatsapp')
    expect(ev).toEqual([{ action: 'whatsapp', to_value: 'created' }])
  })
  it('date change needs a new message', async () => {
    const a = await newShop(); const o = await newOrder(a.owner.client)
    await send(a.owner.client, o.id, 'created')
    await rpcOk(a.owner.client, 'change_due_date', { p_order_id: o.id, p_due: '2030-01-01' })
    let r = await board(a.owner.client, o.id)
    expect([r.comm_kind, r.communicated]).toEqual(['date_changed', false])
    await send(a.owner.client, o.id, 'date_changed')
    r = await board(a.owner.client, o.id)
    expect([r.comm_kind, r.communicated]).toEqual(['date_changed', true])
  })
  it('re-entering ready resets communicated', async () => {
    const a = await newShop(); const o = await newOrder(a.owner.client)
    const ready = await stageId(a, 'Ready'); const ironing = await stageId(a, 'Ironing')
    await move(a.owner.client, o.id, ready)
    expect([(await board(a.owner.client, o.id)).comm_kind, (await board(a.owner.client, o.id)).communicated]).toEqual(['ready', false])
    await send(a.owner.client, o.id, 'ready')
    let r = await board(a.owner.client, o.id)
    expect([r.comm_kind, r.communicated]).toEqual(['ready', true])
    await move(a.owner.client, o.id, ironing)
    expect((await board(a.owner.client, o.id)).comm_kind).not.toBe('ready')
    await move(a.owner.client, o.id, ready)
    r = await board(a.owner.client, o.id)
    expect([r.comm_kind, r.communicated]).toEqual(['ready', false])
  })
  it('delivered has no comm_kind', async () => {
    const a = await newShop(); const o = await newOrder(a.owner.client)
    await rpcOk(a.owner.client, 'set_special_state', { p_order_id: o.id, p_state: 'delivered' })
    const r = await board(a.owner.client, o.id)
    expect([r.comm_kind, r.communicated]).toEqual([null, false])
  })
  it('only the owner records sends; bad kind rejected; send row stored', async () => {
    const a = await newShop(); const e = await newEmployee(a.shopId); const o = await newOrder(a.owner.client)
    await expect(send(e.client, o.id, 'created')).rejects.toThrow('not_owner')
    await expect(send(a.owner.client, o.id, 'hello')).rejects.toThrow('invalid_input')
    await send(a.owner.client, o.id, 'created')
    const { data } = await admin().from('whatsapp_sends').select('kind, opened_by').eq('order_id', o.id)
    expect(data).toEqual([{ kind: 'created', opened_by: a.owner.id }])
  })
  it('owner of another shop cannot record a send', async () => {
    const a = await newShop(); const b = await newShop(); const o = await newOrder(a.owner.client)
    await expect(send(b.owner.client, o.id, 'created')).rejects.toThrow('not_found')
  })
})

describe('public tracking', () => {
  it('anon gets only safe fields', async () => {
    const a = await newShop(); const o = await newOrder(a.owner.client, { rack: 'B3', notes: 'secret', total_amount: 500,
      advance: { amount: 200, method: 'cash' }, garments: [{ type: 'pant', qty: 2, measurements: { waist: '32' } }] })
    const { data, error } = await anonClient().rpc('get_tracking', { p_token: o.tracking_token })
    expect(error).toBeNull()
    const t = data as Record<string, unknown>
    expect(Object.keys(t).sort()).toEqual(['due_date', 'garment_summary', 'is_ready', 'paid_amount',
      'shop_name', 'slip_no', 'special_state', 'stage_name', 'stage_names', 'total_amount'])
    expect(t).toMatchObject({ shop_name: 'Test Shop', slip_no: o.slip_no, garment_summary: '2 pant', stage_name: 'Unstarted',
      stage_names: ['Unstarted', 'Cutting', 'Stitching', 'Ironing', 'Ready'], is_ready: false, special_state: null,
      total_amount: 500, paid_amount: 200 })
    const json = JSON.stringify(t)
    for (const leak of ['B3', 'secret', 'waist', 'Ramesh']) expect(json).not.toContain(leak)
  })
  it('is_ready reflects the ready stage', async () => {
    const a = await newShop(); const o = await newOrder(a.owner.client)
    await move(a.owner.client, o.id, await stageId(a, 'Ready'))
    const { data } = await anonClient().rpc('get_tracking', { p_token: o.tracking_token })
    expect(data).toMatchObject({ stage_name: 'Ready', is_ready: true })
  })
  it('unknown or disabled token returns null', async () => {
    const a = await newShop(); const o = await newOrder(a.owner.client)
    expect((await anonClient().rpc('get_tracking', { p_token: 'nope' })).data).toBeNull()
    await rpcOk(a.owner.client, 'set_tracking_enabled', { p_order_id: o.id, p_enabled: false })
    expect((await anonClient().rpc('get_tracking', { p_token: o.tracking_token })).data).toBeNull()
    expect((await board(a.owner.client, o.id)).tracking_enabled).toBe(false)
    await rpcOk(a.owner.client, 'set_tracking_enabled', { p_order_id: o.id, p_enabled: true })
    expect((await anonClient().rpc('get_tracking', { p_token: o.tracking_token })).data).not.toBeNull()
  })
  it('only the owner toggles tracking', async () => {
    const a = await newShop(); const e = await newEmployee(a.shopId); const o = await newOrder(a.owner.client)
    await expect(rpcOk(e.client, 'set_tracking_enabled', { p_order_id: o.id, p_enabled: false })).rejects.toThrow('not_owner')
    await expect(rpcOk(a.owner.client, 'set_tracking_enabled', { p_order_id: o.id, p_enabled: null })).rejects.toThrow('invalid_input')
  })
  it('anon cannot read board_orders or call owner RPCs', async () => {
    const a = await newShop(); const o = await newOrder(a.owner.client)
    const { data, error } = await anonClient().from('board_orders').select('id').eq('id', o.id)
    expect(error !== null || data?.length === 0).toBe(true)
    await expect(rpcOk(anonClient(), 'record_whatsapp_send', { p_order_id: o.id, p_kind: 'created' })).rejects.toThrow()
    await expect(rpcOk(anonClient(), 'set_tracking_enabled', { p_order_id: o.id, p_enabled: false })).rejects.toThrow()
  })
})

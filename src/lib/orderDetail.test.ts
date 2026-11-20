import { describe, it, expect } from 'vitest'
import { translate } from './i18n'
import { eventText, parseAmount, parseTotal, actorName, waData, dueAutoOpen } from './orderDetail'
import type { BoardOrder } from './types'

const t = (k: Parameters<typeof translate>[1], v?: Record<string, string | number>) => translate('en', k, v)
const L = { t, stage: (id: string | null) => `S:${id}`, member: (id: string | null) => (id ? `M:${id}` : 'Nobody') }
const ev = (action: string, from_value: string | null, to_value: string | null) =>
  ({ id: '1', action, from_value, to_value, actor_id: 'a' as string | null, created_at: '' })

describe('eventText', () => {
  it('maps stage ids to names', () => expect(eventText(ev('stage', 'a', 'b'), L)).toContain('S:a → S:b'))
  it('info lists translated field names, not values', () =>
    expect(eventText(ev('info', null, 'name,mobile'), L)).toBe('Edited: Customer name, Mobile number'))
  it('special state null is reopened', () => expect(eventText(ev('special_state', 'delivered', null), L)).toBe(t('ev.reopened')))
  it('paid event and rejected wording', () => {
    expect(eventText(ev('paid', '300', '500'), L)).toBe(t('ev.paid', { from: '₹300', to: '₹500' }))
    expect(eventText(ev('special_state', null, 'cancelled'), L)).toBe(t('ev.rejected'))
    expect(eventText(ev('special_state', null, 'delivered'), L)).toBe(t('ev.delivered'))
  })
  it('null actor is System', () => {
    const m = (id: string | null) => `M:${id}`
    expect(actorName(null, m, t)).toBe(t('order.system'))
    expect(actorName('x', m, t)).toBe('M:x')
  })
  it('negative payment', () => expect(eventText(ev('payment', null, '-200'), L)).toContain('-₹200'))
})

describe('parseAmount', () => {
  it('digits only, zero ok', () => {
    expect(parseAmount('0')).toEqual({ ok: true, value: 0 })
    expect(parseAmount(' 250 ')).toEqual({ ok: true, value: 250 })
    for (const a of ['', 'abc', '1.5', '-5']) expect(parseAmount(a).ok).toBe(false)
  })
})

describe('parseTotal', () => {
  it('accepts zero, rejects junk', () => {
    expect(parseTotal('0').ok).toBe(true)
    expect(parseTotal('').ok).toBe(false)
  })
})

describe('waData / dueAutoOpen', () => {
  const o = { slip_no: 7, customer_name: 'Ravi', garment_summary: '1 pant', due_date: '2026-11-25', paid_amount: 300,
    total_amount: 800, tracking_token: 'tok', customer_mobile: '9876543210', special_state: null } as BoardOrder
  it('builds message data with balance and tracking link', () => {
    expect(waData(o, 'Shop', 'https://x')).toMatchObject({ slipNo: 7, paid: 300, balance: 500, dueDate: '2026-11-25', trackingUrl: 'https://x/t/tok' })
    expect(waData({ ...o, total_amount: null }, 'Shop', 'https://x', '2026-12-01')).toMatchObject({ balance: null, dueDate: '2026-12-01' })
  })
  it('opens only for a changed date on an open order with a mobile', () => {
    expect(dueAutoOpen(o, '2026-11-26')).toBe(true)
    expect(dueAutoOpen(o, '2026-11-25')).toBe(false)
    expect(dueAutoOpen(o, '')).toBe(false)
    expect(dueAutoOpen({ ...o, special_state: 'delivered' }, '2026-11-26')).toBe(false)
    expect(dueAutoOpen({ ...o, customer_mobile: null }, '2026-11-26')).toBe(false)
  })
})

import { describe, it, expect } from 'vitest'
import { translate } from './i18n'
import { eventText, parsePayment, parseTotal } from './orderDetail'

const t = (k: Parameters<typeof translate>[1], v?: Record<string, string | number>) => translate('en', k, v)
const L = { t, stage: (id: string | null) => `S:${id}`, member: (id: string | null) => (id ? `M:${id}` : 'Nobody') }
const ev = (action: string, from_value: string | null, to_value: string | null) =>
  ({ id: '1', action, from_value, to_value, actor_id: 'a', created_at: '' })

describe('eventText', () => {
  it('maps stage ids to names', () => expect(eventText(ev('stage', 'a', 'b'), L)).toContain('S:a → S:b'))
  it('info lists translated field names, not values', () =>
    expect(eventText(ev('info', null, 'name,mobile'), L)).toBe('Edited: Customer name, Mobile number'))
  it('special state null is resume', () => expect(eventText(ev('special_state', 'on_hold', null), L)).toBe('Resumed'))
  it('negative payment', () => expect(eventText(ev('payment', null, '-200'), L)).toContain('-₹200'))
})

describe('parsePayment', () => {
  it('rejects empty, zero, non-digits', () => {
    for (const a of ['', '0', 'abc', '1.5', '-5']) expect(parsePayment(a, false, '').ok).toBe(false)
  })
  it('negative needs a note', () => {
    expect(parsePayment('100', true, ' ')).toEqual({ ok: false, error: 'note_required' })
    expect(parsePayment('100', true, 'refund')).toEqual({ ok: true, value: { amount: -100, note: 'refund' } })
  })
  it('positive', () => expect(parsePayment('250', false, '')).toEqual({ ok: true, value: { amount: 250, note: null } }))
})

describe('parseTotal', () => {
  it('accepts zero, rejects junk', () => {
    expect(parseTotal('0').ok).toBe(true)
    expect(parseTotal('').ok).toBe(false)
  })
})

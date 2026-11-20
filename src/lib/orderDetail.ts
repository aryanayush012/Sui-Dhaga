import type { Key } from './i18n'
import type { BoardOrder } from './types'
import { paymentSummary } from './money'

export type EventRow = { id: string; action: string; from_value: string | null; to_value: string | null; actor_id: string | null; created_at: string }
type T = (k: Key, v?: Record<string, string | number>) => string
type Lookups = { t: T; stage: (id: string | null) => string; member: (id: string | null) => string }

const rupees = (s: string | null) => (s === null ? '—' : `₹${s}`)

// R5: info events carry field names (name,mobile,notes), never values.
const INFO_FIELDS: Record<string, Key> = { name: 'order.name', mobile: 'order.mobile', notes: 'order.notes' }

export function eventText(e: EventRow, { t, stage, member }: Lookups): string {
  const f = e.from_value, v = e.to_value
  switch (e.action) {
    case 'created': return t('ev.created', { n: v ?? '' })
    case 'stage': return t('ev.stage', { from: stage(f), to: stage(v) })
    case 'special_state':
      // Legacy v1 events: to 'on_hold' = put on hold; from 'on_hold' to null = resumed.
      return t(v === 'cancelled' ? 'ev.rejected' : v === 'delivered' ? 'ev.delivered' : v === 'on_hold' ? 'ev.on_hold' : f === 'on_hold' && v === null ? 'ev.resumed' : 'ev.reopened')
    case 'rack': return t('ev.rack', { from: f || '—', to: v || '—' })
    case 'assignee': return t('ev.assignee', { from: member(f), to: member(v) })
    case 'due_date': return t('ev.due_date', { from: f ?? '—', to: v ?? '—' })
    case 'total': return t('ev.total', { from: rupees(f), to: rupees(v) })
    case 'paid': return t('ev.paid', { from: rupees(f), to: rupees(v) })
    case 'payment': return t('ev.payment', { amount: rupees(v).replace('₹-', '-₹') })
    case 'info': {
      const names = (v ?? '').split(',').filter(Boolean).map((k) => (INFO_FIELDS[k] ? t(INFO_FIELDS[k]) : k))
      return t('ev.info', { fields: names.join(', ') })
    }
    case 'garment':
      return v ? t('ev.garment_saved', { type: t(`garment.${v}` as Key) }) : t('ev.garment_removed', { type: f ? t(`garment.${f}` as Key) : '' })
    case 'tracking': return t(v === 'true' ? 'ev.tracking_on' : 'ev.tracking_off')
    case 'whatsapp': return t('ev.whatsapp', { kind: v ? t(`wa.${v}` as Key) : '' })
    default: return e.action
  }
}

type Parsed<T> = { ok: true; value: T } | { ok: false; error: 'invalid_input' | 'note_required' }

// Null actor = system event (e.g. auto-created order).
export const actorName = (id: string | null, member: (id: string | null) => string, t: T) => (id === null ? t('order.system') : member(id))

export function parseTotal(s: string): Parsed<number> {
  if (!/^\d+$/.test(s.trim())) return { ok: false, error: 'invalid_input' }
  const n = parseInt(s, 10)
  return Number.isSafeInteger(n) ? { ok: true, value: n } : { ok: false, error: 'invalid_input' }
}

export const parseAmount = parseTotal // digits only, >= 0 (Paid field)

// whatsappMessage data for a board row; dueDate overrides for a date being saved.
export function waData(o: BoardOrder, shopName: string, origin: string, dueDate = o.due_date) {
  return {
    shopName, slipNo: o.slip_no, customerName: o.customer_name, garmentSummary: o.garment_summary, dueDate,
    paid: o.paid_amount, balance: paymentSummary(o.total_amount, o.paid_amount).balance,
    trackingUrl: o.tracking_token ? `${origin}/t/${o.tracking_token}` : '',
  }
}

// Auto-open WhatsApp on a due-date save only for a real change on an open, not-Ready order with a mobile.
export const dueAutoOpen = (o: Pick<BoardOrder, 'customer_mobile' | 'special_state' | 'due_date' | 'is_ready'>, due: string) =>
  !!o.customer_mobile && o.special_state === null && !o.is_ready && due !== '' && due !== o.due_date

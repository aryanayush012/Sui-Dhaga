import type { Key } from './i18n'

export type EventRow = { id: string; action: string; from_value: string | null; to_value: string | null; actor_id: string; created_at: string }
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
      return v === 'on_hold' || v === 'cancelled' || v === 'delivered' ? t(`ev.${v}` as Key) : t('ev.resumed')
    case 'rack': return t('ev.rack', { from: f || '—', to: v || '—' })
    case 'assignee': return t('ev.assignee', { from: member(f), to: member(v) })
    case 'due_date': return t('ev.due_date', { from: f ?? '—', to: v ?? '—' })
    case 'total': return t('ev.total', { from: rupees(f), to: rupees(v) })
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

// Amount is digits only (numeric keypads have no minus); refunds use the `negative` flag.
export function parsePayment(amount: string, negative: boolean, note: string): Parsed<{ amount: number; note: string | null }> {
  if (!/^\d+$/.test(amount.trim())) return { ok: false, error: 'invalid_input' }
  const n = parseInt(amount, 10)
  if (!Number.isSafeInteger(n) || n === 0) return { ok: false, error: 'invalid_input' }
  const nt = note.trim()
  if (negative && !nt) return { ok: false, error: 'note_required' }
  return { ok: true, value: { amount: negative ? -n : n, note: nt || null } }
}

export function parseTotal(s: string): Parsed<number> {
  if (!/^\d+$/.test(s.trim())) return { ok: false, error: 'invalid_input' }
  const n = parseInt(s, 10)
  return Number.isSafeInteger(n) ? { ok: true, value: n } : { ok: false, error: 'invalid_input' }
}

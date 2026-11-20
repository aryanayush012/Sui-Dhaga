import type { GarmentInput, GarmentType, NewOrderInput } from './types'
import { uid } from './uid'

export type Row = GarmentInput & { key: string } // key is client-only: React key + patch target

export const addDays = (s: string, n: number) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

// Chip tap: add qty 1, or increment the existing row of that type.
export function addChip(rows: Row[], type: GarmentType, key = uid()): Row[] {
  const at = rows.findIndex((r) => r.type === type)
  return at < 0
    ? [...rows, { key, type, qty: 1, measurements: {} }]
    : rows.map((r, i) => (i === at ? { ...r, qty: r.qty + 1 } : r))
}

// Never discards uploaded photos: they move to the new first row, or to one `other` row if none remain.
export function removeChip(rows: Row[], type: GarmentType): Row[] {
  const gone = rows.filter((r) => r.type === type)
  const left = rows.filter((r) => r.type !== type)
  const cloth = gone.find((r) => r.cloth_photo_path)?.cloth_photo_path
  const slip = gone.find((r) => r.measurement_photo_path)?.measurement_photo_path
  if (!cloth && !slip) return left
  if (left.length === 0) return [{ key: gone[0].key, type: "other", qty: 1, measurements: {}, cloth_photo_path: cloth, measurement_photo_path: slip }]
  const [first, ...rest] = left
  return [{ ...first, cloth_photo_path: first.cloth_photo_path ?? cloth, measurement_photo_path: first.measurement_photo_path ?? slip }, ...rest]
}

// Photo buttons attach to the first garment, or create one `other` garment.
export function attachPhoto(rows: Row[], field: 'cloth_photo_path' | 'measurement_photo_path', path: string | null, key = uid()): Row[] {
  if (rows.length === 0) return path ? [{ key, type: 'other', qty: 1, measurements: {}, [field]: path }] : rows
  return rows.map((r, i) => (i === 0 ? { ...r, [field]: path } : r))
}

// Same format as board_orders.garment_summary: qty summed per type, ordered by type.
export function garmentSummary(gs: GarmentInput[]) {
  const m = new Map<string, number>()
  gs.forEach((g) => m.set(g.type, (m.get(g.type) ?? 0) + g.qty))
  return [...m].sort(([a], [b]) => (a < b ? -1 : 1)).map(([ty, q]) => `${q} ${ty}`).join(', ')
}

type Form = { name: string; mobile: string; due: string; rack: string; assignee: string; total: number | null; advance: number | null; notes: string; garments: Row[] }

// Strips client-only keys and empty measurements; advance is always cash.
export function buildPayload(f: Form): NewOrderInput {
  return {
    customer_name: f.name.trim(), customer_mobile: f.mobile, due_date: f.due,
    rack: f.rack.trim() || null, assignee_id: f.assignee || null, total_amount: f.total, notes: f.notes.trim() || null,
    garments: f.garments.map((g) => ({
      type: g.type, qty: g.qty, cloth_photo_path: g.cloth_photo_path, measurement_photo_path: g.measurement_photo_path,
      instructions: g.instructions,
      measurements: Object.fromEntries(Object.entries(g.measurements ?? {}).filter(([, v]) => v.trim() !== '')),
    })),
    advance: f.advance ? { amount: f.advance, method: 'cash' } : null,
  }
}

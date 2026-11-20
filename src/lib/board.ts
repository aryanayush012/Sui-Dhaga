import type { BoardOrder } from './types'
import { normalizeMobile } from './mobile'

export type Stage = { id: string; name: string; position: number }
export type SearchFilter = { col: 'slip_no' | 'customer_mobile' | 'customer_name'; op: 'eq' | 'ilike'; value: string | number }

// Escape LIKE wildcards. Values go through .ilike()/.eq() (never a raw .or string), so commas/parens are safe.
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => '\\' + c)

export function searchFilter(raw: string, isOwner: boolean): SearchFilter | null {
  const q = raw.trim()
  if (!q) return null
  const d = q.replace(/[\s+-]/g, '') // "+91 98765-43210" -> digits
  if (/^\d+$/.test(d)) {
    if (d.length <= 6) return { col: 'slip_no', op: 'eq', value: Number(d) }
    if (isOwner) return { col: 'customer_mobile', op: 'ilike', value: `%${normalizeMobile(d) ?? d}%` }
  }
  return { col: 'customer_name', op: 'ilike', value: `%${escapeLike(q)}%` }
}

type Filterable<T> = { or(f: string): T; eq(col: string, v: unknown): T; ilike(col: string, v: string): T }
// Board shows open orders; a search also finds delivered/cancelled ones (later payment, refund, undo).
export function applyBoardFilter<T extends Filterable<T>>(q: T, f: SearchFilter | null): T {
  if (!f) return q.or('special_state.is.null')
  return f.op === 'eq' ? q.eq(f.col, f.value) : q.ilike(f.col, String(f.value))
}

// Same rule client-side, for filtering the offline cache.
export function matchesSearch(o: BoardOrder, f: SearchFilter): boolean {
  if (f.col === 'slip_no') return o.slip_no === f.value
  const v = String(f.value).slice(1, -1).replace(/\\(.)/g, '$1').toLowerCase()
  return (f.col === 'customer_mobile' ? o.customer_mobile ?? '' : o.customer_name).toLowerCase().includes(v)
}

export type Cache = { rows: BoardOrder[]; stages: Stage[]; savedAt: number }
const PREFIX = 'board-cache:'
const key = (userId: string) => PREFIX + userId
// Must equal CACHE in public/sw.js (a static file; board.test.ts checks they match).
export const SW_CACHE = 'sui-dhaga-v1'

// Logout on a shared phone: drop every cached board (customer mobiles) and the SW's cached `/` shell.
export async function clearDeviceData() {
  try { Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k)) } catch {}
  if ('caches' in window) await caches.delete(SW_CACHE).catch(() => {})
}

export function saveCache(userId: string, c: Cache) {
  try { localStorage.setItem(key(userId), JSON.stringify(c)) } catch {}
}
export function loadCache(userId: string): Cache | null {
  try {
    const c = JSON.parse(localStorage.getItem(key(userId)) ?? 'null')
    return c && Array.isArray(c.rows) && Array.isArray(c.stages) ? c : null
  } catch { return null }
}

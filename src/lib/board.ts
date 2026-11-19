import type { BoardOrder } from './types'

export type Stage = { id: string; name: string; position: number }
export type SearchFilter = { col: 'slip_no' | 'customer_mobile' | 'customer_name'; op: 'eq' | 'ilike'; value: string | number }

// Escape LIKE wildcards. Values go through .ilike()/.eq() (never a raw .or string), so commas/parens are safe.
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => '\\' + c)

export function searchFilter(raw: string, isOwner: boolean): SearchFilter | null {
  const q = raw.trim()
  if (!q) return null
  if (/^\d+$/.test(q)) {
    if (q.length <= 6) return { col: 'slip_no', op: 'eq', value: Number(q) }
    if (isOwner) return { col: 'customer_mobile', op: 'ilike', value: `%${q}%` }
  }
  return { col: 'customer_name', op: 'ilike', value: `%${escapeLike(q)}%` }
}

// Same rule client-side, for filtering the offline cache.
export function matchesSearch(o: BoardOrder, f: SearchFilter): boolean {
  if (f.col === 'slip_no') return o.slip_no === f.value
  const v = String(f.value).slice(1, -1).replace(/\\(.)/g, '$1').toLowerCase()
  return (f.col === 'customer_mobile' ? o.customer_mobile ?? '' : o.customer_name).toLowerCase().includes(v)
}

export const nextStage = (stages: Stage[], o: Pick<BoardOrder, 'stage_position'>): Stage | null =>
  stages.find((s) => s.position > o.stage_position) ?? null

export type Cache = { rows: BoardOrder[]; stages: Stage[]; savedAt: number }
const key = (userId: string) => `board-cache:${userId}`

export function saveCache(userId: string, c: Cache) {
  try { localStorage.setItem(key(userId), JSON.stringify(c)) } catch {}
}
export function loadCache(userId: string): Cache | null {
  try {
    const c = JSON.parse(localStorage.getItem(key(userId)) ?? 'null')
    return c && Array.isArray(c.rows) && Array.isArray(c.stages) ? c : null
  } catch { return null }
}

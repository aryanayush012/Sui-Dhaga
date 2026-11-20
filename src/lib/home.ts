import type { BoardOrder } from './types'

export type View = 'board' | 'list'
const KEY = 'home-view'

export function readView(): View {
  try { return localStorage.getItem(KEY) === 'list' ? 'list' : 'board' } catch { return 'board' }
}
export function writeView(v: View) {
  try { localStorage.setItem(KEY, v) } catch { /* private mode: preference just isn't remembered */ }
}

export const sortByDue = (rows: BoardOrder[]) =>
  [...rows].sort((a, b) => a.due_date.localeCompare(b.due_date) || a.slip_no - b.slip_no)

// ?created=<slip>&wa=<wa.me url>. Only https://wa.me links are honoured.
export function parseCreated(p: URLSearchParams): { slip: string; wa: string | null } | null {
  const slip = p.get('created')
  if (!slip || !/^\d{1,9}$/.test(slip)) return null
  const wa = p.get('wa')
  return { slip, wa: wa && wa.startsWith('https://wa.me/') ? wa : null }
}

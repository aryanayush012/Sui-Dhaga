import type { BoardOrder } from './types'

export function todayIST(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now)
}

const dayNum = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / 86400000
}

export function deadlineChip(
  o: Pick<BoardOrder, 'due_date' | 'is_ready' | 'special_state'>, today: string,
): 'approaching' | 'at_risk' | 'overdue' | null {
  if (o.is_ready || o.special_state === 'delivered' || o.special_state === 'cancelled') return null
  const days = dayNum(o.due_date) - dayNum(today)
  if (days < 0) return 'overdue'
  if (days === 0) return 'at_risk'
  return days <= 2 ? 'approaching' : null
}

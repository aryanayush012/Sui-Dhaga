'use client'
import { useT, type Key } from '@/lib/i18n'

const STYLE: Record<'approaching' | 'at_risk' | 'overdue', [Key, string]> = {
  approaching: ['chip.approaching', 'bg-amber-100 text-amber-900'],
  at_risk: ['chip.at_risk', 'bg-orange-200 text-orange-900'],
  overdue: ['chip.overdue', 'bg-red-100 text-red-800'],
}

export function DeadlineChip({ kind }: { kind: 'approaching' | 'at_risk' | 'overdue' | null }) {
  const { t } = useT()
  if (!kind) return null
  const [k, cls] = STYLE[kind]
  return <span className={`rounded-full px-2 py-0.5 text-sm font-semibold ${cls}`}>{t(k)}</span>
}

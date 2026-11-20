'use client'
import Link from 'next/link'
import { useT, type Key } from '@/lib/i18n'
import type { BoardOrder } from '@/lib/types'
import type { Stage } from '@/lib/board'
import { currentStatus, statusLabelKey, statusTone } from '@/lib/status'
import { Lozenge } from './Lozenge'
import { OrderChips } from './OrderCard'

export function ListRow({ o, today, isOwner, stages }: { o: BoardOrder; today: string; isOwner: boolean; stages: Stage[] }) {
  const { t } = useT()
  const first = Math.min(...stages.map((s) => s.position))
  const label = statusLabelKey(currentStatus(o), stages)
  return (
    <Link href={`/orders/${o.id}`} className="flex min-h-11 items-center justify-between gap-2 border-b border-[#DFE1E6] bg-white px-3 py-2.5">
      <span className="min-w-0 space-y-1">
        <span className="block truncate text-sm text-[#172B4D]"><b>{o.customer_name}</b> · {o.garment_summary}</span>
        <OrderChips o={o} today={today} isOwner={isOwner} />
      </span>
      <Lozenge tone={statusTone(o, first)}>{(t(label as Key) as string | undefined) ?? label}</Lozenge>
    </Link>
  )
}

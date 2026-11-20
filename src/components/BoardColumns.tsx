'use client'
import { useT, stageLabel } from '@/lib/i18n'
import type { BoardOrder } from '@/lib/types'
import type { Stage } from '@/lib/board'
import { boardColumns } from '@/lib/status'
import { OrderCard } from './OrderCard'

export function BoardColumns({ rows, stages, today, isOwner }: { rows: BoardOrder[]; stages: Stage[]; today: string; isOwner: boolean }) {
  const { t } = useT()
  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
      {boardColumns(rows, stages).map(({ stage, rows: col }) => (
        <section key={stage.id} className="w-[80vw] max-w-sm shrink-0 snap-center space-y-2 rounded-md bg-[#F4F5F7] p-2">
          <h2 className="px-1 text-xs font-bold uppercase text-[#5E6C84]">{stageLabel(stage.name, t)} · {col.length}</h2>
          {col.map((o) => <OrderCard key={o.id} o={o} today={today} isOwner={isOwner} />)}
        </section>
      ))}
    </div>
  )
}

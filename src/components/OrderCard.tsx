'use client'
import Link from 'next/link'
import { useT } from '@/lib/i18n'
import { deadlineChip } from '@/lib/deadline'
import { paymentSummary } from '@/lib/money'
import type { BoardOrder } from '@/lib/types'
import { DeadlineChip } from './DeadlineChip'

export function OrderCard({ o, today, canMove, onMove }: {
  o: BoardOrder; today: string; canMove: boolean; onMove: () => void
}) {
  const { t } = useT()
  const { balance } = paymentSummary(o.total_amount, o.paid_amount)
  const money = balance === null ? t('board.paid_only', { n: o.paid_amount }) : t('board.balance_due', { n: balance })
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <Link href={`/orders/${o.id}`} className="block">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="text-3xl font-bold">#{o.slip_no}</span>
            <span className="ml-2 font-semibold">{o.customer_name}</span>
          </div>
          <div className="shrink-0 rounded-lg bg-accent px-3 py-1 text-xl font-bold text-white" aria-label={t('board.rack')}>
            {o.rack || '—'}
          </div>
        </div>
        <p className="text-muted">{o.garment_summary}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-base">
          <span>{t('board.due', { date: o.due_date })}</span>
          <DeadlineChip kind={deadlineChip(o, today)} />
          {o.special_state === 'on_hold' && <span className="rounded-full bg-gray-200 px-2 py-0.5 text-sm font-semibold">{t('board.hold')}</span>}
          {(o.special_state === 'delivered' || o.special_state === 'cancelled') && (
            <span className={`rounded-full px-2 py-0.5 text-sm font-semibold ${o.special_state === 'delivered' ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'}`}>
              {t(o.special_state === 'delivered' ? 'od.state_delivered' : 'od.state_cancelled')}
            </span>
          )}
          {o.assignee_name && <span className="text-muted">{o.assignee_name}</span>}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-base">
          <span className="font-semibold">{money}</span>
          {o.communicated && o.comm_kind && <span className="text-accent">✓ {t('board.communicated')}</span>}
        </div>
      </Link>
      {canMove && (
        <button onClick={onMove} className="mt-2 min-h-11 w-full rounded-lg border border-accent font-bold text-accent">
          {t('board.move')}
        </button>
      )}
    </div>
  )
}

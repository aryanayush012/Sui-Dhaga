'use client'
import Link from 'next/link'
import { useT } from '@/lib/i18n'
import { deadlineChip } from '@/lib/deadline'
import type { BoardOrder } from '@/lib/types'
import { DeadlineChip } from './DeadlineChip'
import { Avatar } from './Avatar'

export function OrderChips({ o, today, isOwner }: { o: BoardOrder; today: string; isOwner: boolean }) {
  const { t } = useT()
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="font-semibold text-[#42526E]">#{o.slip_no}</span>
      {o.rack && <span aria-label={t('board.rack')} className="rounded bg-[#EAE6FF] px-1.5 py-0.5 font-semibold text-[#403294]">{o.rack}</span>}
      <DeadlineChip kind={deadlineChip(o, today)} />
      {isOwner && o.comm_kind !== null && !o.communicated && (
        <span role="img" aria-label={t('board.wa_pending')} title={t('board.wa_pending')} className="size-2.5 rounded-full bg-[#00875A]" />
      )}
    </span>
  )
}

export function OrderCard({ o, today, isOwner }: { o: BoardOrder; today: string; isOwner: boolean }) {
  return (
    <Link href={`/orders/${o.id}`} className="flex min-h-11 items-start justify-between gap-2 rounded bg-white p-3 shadow-[0_1px_1px_rgba(9,30,66,.25)]">
      <span className="min-w-0 space-y-1.5">
        <span className="block truncate text-sm text-[#172B4D]"><b>{o.customer_name}</b> · {o.garment_summary}</span>
        <OrderChips o={o} today={today} isOwner={isOwner} />
      </span>
      <Avatar name={o.assignee_name} />
    </Link>
  )
}

'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useT, type Key } from '@/lib/i18n'
import { en } from '@/lib/i18n/en'
import { deadlineChip } from '@/lib/deadline'
import { paymentSummary } from '@/lib/money'
import { currentStatus, statusLabelKey, targetTone, type StatusTarget } from '@/lib/status'
import { errorKey } from '@/lib/ui'
import { useOrderActions } from '@/lib/useOrderActions'
import type { Stage } from '@/lib/board'
import type { BoardOrder } from '@/lib/types'
import { DeadlineChip } from './DeadlineChip'
import { Avatar } from './Avatar'
import { StatusMenu } from './StatusMenu'
import { WhatsAppButton } from './WhatsAppButton'

export function OrderChips({ o, today }: { o: BoardOrder; today: string }) {
  const { t } = useT()
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="font-semibold text-[#42526E]">#{o.slip_no}</span>
      {o.rack
        ? <span className="rounded bg-[#EAE6FF] px-1.5 py-0.5 font-semibold text-[#403294]">{t('board.rack')} {o.rack}</span>
        : <span className="rounded bg-[#FFF0B3] px-1.5 py-0.5 font-semibold text-[#7A5200]">{t('card.no_rack')}</span>}
      <DeadlineChip kind={deadlineChip(o, today)} />
    </span>
  )
}

type Props = { o: BoardOrder; today: string; isOwner: boolean; stages: Stage[]; onChanged: () => unknown; row?: boolean }

// Board card (or flat list row): open the ticket from the text; act from the WhatsApp icon and status dropdown.
export function OrderCard({ o, today, isOwner, stages, onChanged, row }: Props) {
  const { t } = useT()
  const router = useRouter()
  const act = useOrderActions(o, stages, onChanged, { onNeedsRack: () => router.push(`/orders/${o.id}?rack=1`) })
  const label = (s: StatusTarget) => { const k = statusLabelKey(s, stages); return (t(k as Key) as string | undefined) ?? k }
  const { balance } = paymentSummary(o.total_amount, o.paid_amount)
  return (
    <div data-testid="order-card" className={row ? 'space-y-1 border-b border-[#DFE1E6] bg-white px-3 py-2' : 'space-y-1.5 rounded bg-white p-3 shadow-[0_1px_1px_rgba(9,30,66,.25)]'}>
      <div className="flex items-start gap-2">
        <Link href={`/orders/${o.id}`} className="block min-h-11 min-w-0 flex-1 space-y-1.5">
          <span className="block truncate text-sm text-[#172B4D]"><b>{o.customer_name}</b> · {o.garment_summary}</span>
          <OrderChips o={o} today={today} />
        </Link>
        {isOwner && o.comm_kind !== null && act.waHref && <WhatsAppButton href={act.waHref} sent={o.communicated} onClick={act.sendWhatsApp} />}
        <Avatar name={o.assignee_name} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <StatusMenu options={act.options} current={currentStatus(o)} labelOf={label} toneOf={(s) => targetTone(s, stages)}
          disabled={act.menuDisabled} onPick={act.pick} />
        {isOwner && balance ? <span className="text-sm font-semibold text-[#BF2600]">{t('board.balance_due', { n: balance })}</span> : null}
      </div>
      {act.err && <p role="alert" className="text-xs text-[#BF2600]">{t(errorKey(act.err, en) as Key)}</p>}
    </div>
  )
}

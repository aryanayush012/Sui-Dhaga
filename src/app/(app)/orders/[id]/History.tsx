'use client'
import { useT, stageLabel } from '@/lib/i18n'
import { actorName, eventText, type EventRow } from '@/lib/orderDetail'
import type { Stage } from '@/lib/board'

type Member = { id: string; name: string }

// Events arrive newest first (query order).
export function History({ events, stages, members }: { events: EventRow[]; stages: Stage[]; members: Member[] }) {
  const { t } = useT()
  const stage = (id: string | null) => { const s = stages.find((x) => x.id === id); return s ? stageLabel(s.name, t) : '—' }
  const member = (id: string | null) => members.find((x) => x.id === id)?.name ?? t('order.nobody')
  return (
    <ul className="space-y-2">
      {events.map((e) => (
        <li key={e.id} className="border-b border-[#EBECF0] pb-2 text-sm">
          <p className="text-[#172B4D]">{eventText(e, { t, stage, member })}</p>
          <p className="text-xs text-[#5E6C84]">{actorName(e.actor_id, member, t)} · {new Date(e.created_at).toLocaleString()}</p>
        </li>
      ))}
    </ul>
  )
}

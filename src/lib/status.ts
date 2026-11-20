import type { BoardOrder } from './types'
import type { Tone } from './ui'
import type { Stage } from './board'
import { stageKey, type Key } from './i18n/translate'

export type StatusTarget = { kind: 'stage'; stageId: string } | { kind: 'delivered' } | { kind: 'cancelled' }
type Role = 'owner' | 'employee'

export function statusOptions(stages: Stage[], role: Role): StatusTarget[] {
  const st = [...stages].sort((a, b) => a.position - b.position).map((s): StatusTarget => ({ kind: 'stage', stageId: s.id }))
  return role === 'owner' ? [...st, { kind: 'delivered' }, { kind: 'cancelled' }] : st
}

export const currentStatus = (o: Pick<BoardOrder, 'stage_id' | 'special_state'>): StatusTarget =>
  o.special_state ? { kind: o.special_state } : { kind: 'stage', stageId: o.stage_id }

export function statusLabelKey(target: StatusTarget, stages: Stage[]): Key | string {
  if (target.kind === 'delivered') return 'status.delivered'
  if (target.kind === 'cancelled') return 'status.rejected'
  const name = stages.find((s) => s.id === target.stageId)?.name ?? ''
  return stageKey(name) ?? name
}

export function statusTone(o: Pick<BoardOrder, 'stage_position' | 'is_ready' | 'special_state'>, firstPosition: number) {
  if (o.special_state === 'delivered') return 'delivered'
  if (o.special_state === 'cancelled') return 'rejected'
  if (o.is_ready) return 'ready'
  return o.stage_position <= firstPosition ? 'todo' : 'progress'
}

export function statusEffects(target: StatusTarget, o: Pick<BoardOrder, 'special_state' | 'is_ready' | 'rack'>, role: Role, readyStageId: string) {
  const alreadyReadyOpen = o.is_ready && o.special_state === null
  const toReady = target.kind === 'stage' && target.stageId === readyStageId
  return {
    // v1 rule: moving to Ready needs a rack (caller shows a message and stops).
    needsRack: toReady && !o.rack?.trim(),
    confirm: target.kind === 'delivered' ? 'delivered' as const : target.kind === 'cancelled' ? 'rejected' as const : null,
    openWhatsApp: role === 'owner' && toReady && !alreadyReadyOpen ? 'ready' as const : null,
  }
}

export function boardColumns(rows: BoardOrder[], stages: Stage[]) {
  const open = rows.filter((r) => r.special_state === null)
  return [...stages].sort((a, b) => a.position - b.position).map((stage) => ({
    stage,
    rows: open.filter((r) => r.stage_id === stage.id).sort((a, b) => a.due_date.localeCompare(b.due_date)),
  }))
}

// RPC arg for set_status: stage id as text, or the end state.
export const statusParam = (t: StatusTarget) => (t.kind === 'stage' ? t.stageId : t.kind)

const byPos = (stages: Stage[]) => [...stages].sort((a, b) => a.position - b.position)
export const readyStageId = (stages: Stage[]) => byPos(stages).at(-1)?.id ?? ''

// Tone for a menu option (no order row): same colours as statusTone.
export function targetTone(t: StatusTarget, stages: Stage[]): Tone {
  if (t.kind !== 'stage') return t.kind === 'delivered' ? 'delivered' : 'rejected'
  const s = byPos(stages)
  return t.stageId === s.at(-1)?.id ? 'ready' : t.stageId === s[0]?.id ? 'todo' : 'progress'
}

// Karigars change status only on their own or unassigned orders, never on closed ones. The owner always can.
export const statusMenuDisabled = (role: Role, o: Pick<BoardOrder, 'assignee_id' | 'special_state'>, memberId: string) =>
  role !== 'owner' && (o.special_state !== null || (o.assignee_id !== null && o.assignee_id !== memberId))

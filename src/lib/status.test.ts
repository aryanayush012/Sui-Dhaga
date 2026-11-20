import { describe, it, expect } from 'vitest'
import { statusOptions, currentStatus, statusLabelKey, statusTone, statusEffects, boardColumns, statusParam, readyStageId, targetTone } from './status'
import type { BoardOrder } from './types'

const S = ['Unstarted', 'Cutting', 'Stitching', 'Ironing', 'Ready'].map((name, i) => ({ id: `s${i + 1}`, name, position: i + 1 }))
const row = (id: string, stage_id: string, due_date: string, special_state: BoardOrder['special_state'] = null) =>
  ({ id, stage_id, due_date, special_state }) as BoardOrder

describe('status', () => {
  it('owner sees stages plus end states; employee only stages', () => {
    expect(statusOptions(S, 'owner').map(x => x.kind === 'stage' ? x.stageId : x.kind)).toEqual(['s1', 's2', 's3', 's4', 's5', 'delivered', 'cancelled'])
    expect(statusOptions(S, 'employee')).toHaveLength(5)
  })
  it('owner picking Ready opens WhatsApp; employee does not; already-ready does not', () => {
    const open = { special_state: null, is_ready: false }
    expect(statusEffects({ kind: 'stage', stageId: 's5' }, open, 'owner', 's5').openWhatsApp).toBe('ready')
    expect(statusEffects({ kind: 'stage', stageId: 's5' }, open, 'employee', 's5').openWhatsApp).toBeNull()
    expect(statusEffects({ kind: 'stage', stageId: 's5' }, { special_state: null, is_ready: true }, 'owner', 's5').openWhatsApp).toBeNull()
    expect(statusEffects({ kind: 'stage', stageId: 's5' }, { special_state: 'delivered', is_ready: true }, 'owner', 's5').openWhatsApp).toBe('ready')
  })
  it('end states ask for confirmation', () => {
    const open = { special_state: null, is_ready: false }
    expect(statusEffects({ kind: 'cancelled' }, open, 'owner', 's5').confirm).toBe('rejected')
    expect(statusEffects({ kind: 'delivered' }, open, 'owner', 's5').confirm).toBe('delivered')
    expect(statusEffects({ kind: 'stage', stageId: 's2' }, open, 'owner', 's5').confirm).toBeNull()
  })
  it('boardColumns excludes closed orders and sorts by due date', () => {
    const cols = boardColumns([row('a', 's2', '2026-11-25'), row('b', 's2', '2026-11-22'), row('c', 's2', '2026-11-20', 'cancelled')], S)
    expect(cols).toHaveLength(5)
    expect(cols[1].rows.map(r => r.id)).toEqual(['b', 'a'])
  })
  it('status tone', () => {
    const o = (stage_position: number, is_ready = false, special_state: BoardOrder['special_state'] = null) => ({ stage_position, is_ready, special_state })
    expect(statusTone(o(1), 1)).toBe('todo')
    expect(statusTone(o(2), 1)).toBe('progress')
    expect(statusTone(o(5, true), 1)).toBe('ready')
    expect(statusTone(o(5, true, 'delivered'), 1)).toBe('delivered')
    expect(statusTone(o(2, false, 'cancelled'), 1)).toBe('rejected')
  })
  it('currentStatus and labels', () => {
    expect(currentStatus({ stage_id: 's2', special_state: null })).toEqual({ kind: 'stage', stageId: 's2' })
    expect(currentStatus({ stage_id: 's2', special_state: 'cancelled' })).toEqual({ kind: 'cancelled' })
    expect(statusLabelKey({ kind: 'stage', stageId: 's1' }, S)).toBe('status.unstarted')
    expect(statusLabelKey({ kind: 'stage', stageId: 's2' }, S)).toBe('stage.cutting')
    expect(statusLabelKey({ kind: 'cancelled' }, S)).toBe('status.rejected')
    expect(statusLabelKey({ kind: 'delivered' }, S)).toBe('status.delivered')
  })
  it('targets: rpc param, ready stage, option tone', () => {
    expect(statusParam({ kind: 'stage', stageId: 's3' })).toBe('s3')
    expect(statusParam({ kind: 'cancelled' })).toBe('cancelled')
    expect(readyStageId([...S].reverse())).toBe('s5')
    expect(['s1', 's3', 's5'].map((id) => targetTone({ kind: 'stage', stageId: id }, S))).toEqual(['todo', 'progress', 'ready'])
    expect(targetTone({ kind: 'delivered' }, S)).toBe('delivered')
    expect(targetTone({ kind: 'cancelled' }, S)).toBe('rejected')
  })
})

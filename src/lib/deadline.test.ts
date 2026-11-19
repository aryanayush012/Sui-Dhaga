import { describe, it, expect } from 'vitest'
import { deadlineChip, todayIST } from './deadline'

const o = (due: string, extra = {}) => ({ due_date: due, is_ready: false, special_state: null, ...extra })

describe('deadline', () => {
  it.each([['2026-11-25', null], ['2026-11-23', 'approaching'], ['2026-11-22', 'approaching'],
    ['2026-11-21', 'at_risk'], ['2026-11-20', 'overdue']])('due %s → %s', (due, chip) =>
    expect(deadlineChip(o(due), '2026-11-21')).toBe(chip))
  it('no chip when ready/delivered/cancelled; chip when on hold', () => {
    expect(deadlineChip(o('2026-11-20', { is_ready: true }), '2026-11-21')).toBeNull()
    expect(deadlineChip(o('2026-11-20', { special_state: 'delivered' }), '2026-11-21')).toBeNull()
    expect(deadlineChip(o('2026-11-20', { special_state: 'cancelled' }), '2026-11-21')).toBeNull()
    expect(deadlineChip(o('2026-11-20', { special_state: 'on_hold' }), '2026-11-21')).toBe('overdue')
  })
  it('uses IST date near midnight', () =>
    expect(todayIST(new Date('2026-11-21T18:00:00Z'))).toBe('2026-11-21'))
  it('rolls to next day after IST midnight', () =>
    expect(todayIST(new Date('2026-11-21T18:31:00Z'))).toBe('2026-11-22'))
})

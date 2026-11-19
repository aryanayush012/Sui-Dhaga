import { describe, it, expect, beforeEach } from 'vitest'
import { searchFilter, escapeLike, nextStage, matchesSearch, saveCache, loadCache } from './board'
import type { BoardOrder } from './types'

const stages = [{ id: 'a', name: 'Cutting', position: 1 }, { id: 'b', name: 'Ready', position: 2 }]
describe('board', () => {
  it('search routing', () => {
    expect(searchFilter(' 12 ', false)).toEqual({ col: 'slip_no', op: 'eq', value: 12 })
    expect(searchFilter('9517777186', true)?.col).toBe('customer_mobile')
    expect(searchFilter('9517777186', false)?.col).toBe('customer_name')
    expect(searchFilter('A, B (x)_%', true)?.value).toBe('%A, B (x)\\_\\%%')
    expect(searchFilter('  ', true)).toBeNull()
    expect(escapeLike('50%')).toBe('50\\%')
  })
  it('client-side match', () => {
    const o = { slip_no: 3, customer_name: 'Ram_Lal', customer_mobile: null } as BoardOrder
    expect(matchesSearch(o, searchFilter('3', true)!)).toBe(true)
    expect(matchesSearch(o, searchFilter('m_l', true)!)).toBe(true)
    expect(matchesSearch(o, searchFilter('mal', true)!)).toBe(false)
  })
  it('nextStage', () => {
    expect(nextStage(stages, { stage_position: 1 })?.id).toBe('b')
    expect(nextStage(stages, { stage_position: 2 })).toBeNull()
  })
  describe('cache', () => {
    const store: Record<string, string> = {}
    beforeEach(() => {
      Object.keys(store).forEach((k) => delete store[k])
      Object.assign(globalThis, { localStorage: { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v } } })
    })
    it('is per user', () => {
      saveCache('u1', { rows: [], stages, savedAt: 1 })
      expect(loadCache('u1')?.savedAt).toBe(1)
      expect(loadCache('u2')).toBeNull()
    })
  })
})

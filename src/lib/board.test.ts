import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { searchFilter, escapeLike, nextStage, matchesSearch, saveCache, loadCache, applyBoardFilter, clearDeviceData, SW_CACHE } from './board'
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
  it('formatted mobiles (owner)', () => {
    const mob = { col: 'customer_mobile', op: 'ilike', value: '%9876543210%' }
    expect(searchFilter('+91 98765 43210', true)).toEqual(mob)
    expect(searchFilter('98765 43210', true)).toEqual(mob)
    expect(searchFilter('098765-43210', true)).toEqual(mob)
    expect(searchFilter('98765 43', true)).toEqual({ col: 'customer_mobile', op: 'ilike', value: '%9876543%' })
    expect(searchFilter('1 2', true)).toEqual({ col: 'slip_no', op: 'eq', value: 12 })
    expect(searchFilter('98765 43210', false)?.col).toBe('customer_name')
  })
  it('board filter: open orders only, unless searching', () => {
    const calls: string[] = []
    const q = { or: (s: string) => (calls.push(`or ${s}`), q), eq: (c: string, v: unknown) => (calls.push(`eq ${c} ${v}`), q),
      ilike: (c: string, v: string) => (calls.push(`ilike ${c} ${v}`), q) }
    applyBoardFilter(q, null)
    expect(calls).toEqual(['or special_state.is.null,special_state.eq.on_hold'])
    calls.length = 0
    applyBoardFilter(q, searchFilter('12', true))
    expect(calls).toEqual(['eq slip_no 12']) // no special_state filter: delivered/cancelled are findable
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
      const localStorage = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v },
        removeItem: (k: string) => { delete store[k] } }
      // Object.keys(localStorage) lists stored keys in browsers; mimic via a proxy.
      Object.assign(globalThis, { localStorage: new Proxy(localStorage, { ownKeys: () => Object.keys(store),
        getOwnPropertyDescriptor: (_, k) => ({ enumerable: true, configurable: true, value: store[k as string] }) }) })
    })
    it('is per user', () => {
      saveCache('u1', { rows: [], stages, savedAt: 1 })
      expect(loadCache('u1')?.savedAt).toBe(1)
      expect(loadCache('u2')).toBeNull()
    })
    it('clearDeviceData drops every board cache and the SW cache', async () => {
      const deleted: string[] = []
      Object.assign(globalThis, { window: { caches: {} }, caches: { delete: async (n: string) => (deleted.push(n), true) } })
      saveCache('u1', { rows: [], stages, savedAt: 1 }); saveCache('u2', { rows: [], stages, savedAt: 1 })
      store.lang = 'hi'
      await clearDeviceData()
      expect(Object.keys(store)).toEqual(['lang'])
      expect(deleted).toEqual([SW_CACHE])
    })
    it('SW_CACHE matches public/sw.js', () => {
      expect(readFileSync('public/sw.js', 'utf8')).toContain(`const CACHE = '${SW_CACHE}'`)
    })
  })
})

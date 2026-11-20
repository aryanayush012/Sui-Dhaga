import { describe, it, expect } from 'vitest'
import { parseCreated, sortByDue } from './home'
import type { BoardOrder } from './types'

describe('home', () => {
  it('parses created banner params', () => {
    expect(parseCreated(new URLSearchParams('created=42'))).toEqual({ slip: '42', wa: null })
    expect(parseCreated(new URLSearchParams('created=42&wa=' + encodeURIComponent('https://wa.me/91999?text=hi')))?.wa).toBe('https://wa.me/91999?text=hi')
    expect(parseCreated(new URLSearchParams('created=42&wa=javascript:alert(1)'))?.wa).toBeNull()
    expect(parseCreated(new URLSearchParams('created=42&wa=' + encodeURIComponent('whatsapp://send?phone=91999&text=hi')))?.wa).toBe('whatsapp://send?phone=91999&text=hi')
    expect(parseCreated(new URLSearchParams('created=<b>'))).toBeNull()
    expect(parseCreated(new URLSearchParams(''))).toBeNull()
  })
  it('sorts by due date then slip', () => {
    const r = (slip_no: number, due_date: string) => ({ slip_no, due_date }) as BoardOrder
    expect(sortByDue([r(3, '2026-02-01'), r(2, '2026-01-01'), r(1, '2026-02-01')]).map((x) => x.slip_no)).toEqual([2, 1, 3])
  })
})

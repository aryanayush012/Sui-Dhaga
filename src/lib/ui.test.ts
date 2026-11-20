import { describe, it, expect } from 'vitest'
import { avatarStyle, errorKey, menuPlacement } from './ui'

describe('ui helpers', () => {
  it('avatar is stable and uses the uppercased first letter', () => {
    expect(avatarStyle('ravi')).toEqual(avatarStyle('ravi'))
    expect(avatarStyle(' ravi').initial).toBe('R')
    expect(avatarStyle('सीमा').initial).toBe('स')
  })
  it('errorKey falls back to generic', () => {
    const known = { 'error.invalid_mobile': 'x', 'error.generic': 'y' }
    expect(errorKey('invalid_mobile', known)).toBe('error.invalid_mobile')
    expect(errorKey('weird', known)).toBe('error.generic')
  })
})

describe('menuPlacement', () => {
  const rect = (top: number, left = 20, h = 44, w = 120) => ({ top, bottom: top + h, left, right: left + w })
  it('opens down with room, capped to the space below', () => {
    expect(menuPlacement(rect(100), 360, 560, 7)).toEqual({ left: 20, top: 148, maxHeight: 560 - 148 - 8 })
  })
  it('short phone, trigger mid-screen: opens toward the bigger side and caps height (Delivered/Rejected reachable)', () => {
    const p = menuPlacement(rect(250), 360, 560, 7) // 7 options ≈ 324px; 266px below, 250px above → down, capped
    expect(p.top).toBe(298)
    expect(p.maxHeight).toBe(560 - 298 - 8)
  })
  it('opens up when there is more room above', () => {
    expect(menuPlacement(rect(450), 360, 560, 7)).toEqual({ left: 20, bottom: 560 - 450 + 4, maxHeight: 450 - 8 })
  })
  it('right-aligns triggers on the right half', () => {
    expect(menuPlacement(rect(100, 220), 360, 560, 3)).toMatchObject({ right: 360 - 340 })
  })
})

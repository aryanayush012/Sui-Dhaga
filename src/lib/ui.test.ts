import { describe, it, expect } from 'vitest'
import { avatarStyle, errorKey } from './ui'

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

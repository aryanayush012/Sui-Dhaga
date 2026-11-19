import { describe, it, expect } from 'vitest'
import { normalizeMobile, mobileToEmail } from './mobile'

describe('normalizeMobile', () => {
  it.each([
    ['9876543210', '9876543210'],
    ['+91 98765 43210', '9876543210'],
    ['098765-43210', '9876543210'],
    [' 91 9876543210 ', '9876543210'],
  ])('accepts %s', (input, out) => expect(normalizeMobile(input)).toBe(out))
  it.each(['987654321', '5876543210', '98765432101', 'abc', ''])(
    'rejects %s', (input) => expect(normalizeMobile(input)).toBeNull())
})
it('mobileToEmail', () =>
  expect(mobileToEmail('9876543210')).toBe('9876543210@users.suidhaga.app'))

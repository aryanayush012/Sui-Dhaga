import { afterEach, expect, it, vi } from 'vitest'
import { uid } from './uid'

afterEach(() => vi.unstubAllGlobals())
it('uses randomUUID when available', () => expect(uid()).toMatch(/^[0-9a-f-]{36}$/))
it('falls back without randomUUID (insecure context)', () => {
  vi.stubGlobal('crypto', {})
  const a = uid(), b = uid()
  expect(a).toMatch(/^[0-9a-z]{10,}$/)
  expect(a).not.toBe(b)
})

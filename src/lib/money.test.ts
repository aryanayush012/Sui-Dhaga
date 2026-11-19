import { it, expect } from 'vitest'
import { paymentSummary } from './money'

it.each([[null, 200, null, null], [500, 0, 'unpaid', 500], [500, 200, 'partial', 300], [500, 500, 'paid', 0]])(
  'total %s paid %s', (t, p, s, b) => expect(paymentSummary(t, p)).toEqual({ status: s, balance: b }))

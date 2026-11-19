import { describe, it, expect } from 'vitest'
import { whatsappMessage, whatsappLink } from './whatsapp'

const d = { shopName: 'Raj Tailors', slipNo: 142, customerName: 'Ramesh',
  garmentSummary: '2 pant', dueDate: '2026-11-22', balance: 300, trackingUrl: 'https://x/t/abc' }

describe('whatsapp', () => {
  it('ready message includes balance', () =>
    expect(whatsappMessage('ready', 'en', d)).toBe(
      'Raj Tailors: your order #142 is ready for collection. Balance due: ₹300. Track: https://x/t/abc'))
  it('ready message omits balance when zero/null', () => {
    expect(whatsappMessage('ready', 'en', { ...d, balance: 0 })).toBe(
      'Raj Tailors: your order #142 is ready for collection. Track: https://x/t/abc')
    expect(whatsappMessage('ready', 'en', { ...d, balance: null })).not.toContain('Balance')
  })
  it('created message', () =>
    expect(whatsappMessage('created', 'en', d)).toBe(
      'Namaste Ramesh! Raj Tailors: your order #142 (2 pant) is booked. Expected on 22 Nov. Track: https://x/t/abc'))
  it('date_changed message', () =>
    expect(whatsappMessage('date_changed', 'en', d)).toBe(
      'Raj Tailors: order #142 will now be ready on 22 Nov. Sorry for the delay. Track: https://x/t/abc'))
  it.each(['created', 'date_changed', 'ready'] as const)('hi %s has slip no and url', (k) => {
    const m = whatsappMessage(k, 'hi', d)
    expect(m).toContain('142')
    expect(m).toContain('https://x/t/abc')
  })
  it('link encodes text', () =>
    expect(whatsappLink('9876543210', 'a b&c')).toBe('https://wa.me/919876543210?text=a%20b%26c'))
})

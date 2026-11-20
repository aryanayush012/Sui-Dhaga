import { describe, it, expect } from 'vitest'
import { whatsappMessage, whatsappLink } from './whatsapp'

const d = { shopName: 'Raj Tailors', slipNo: 142, customerName: 'Ramesh', garmentSummary: '2 pant',
  dueDate: '2026-11-22', paid: 200, balance: 300, trackingUrl: 'https://x/t/abc' }

describe('whatsapp', () => {
  it('ready message has money line', () =>
    expect(whatsappMessage('ready', 'en', d)).toBe(
      'Raj Tailors: your order #142 is ready for collection. Paid ₹200, remaining ₹300. Track: https://x/t/abc'))
  it('created message carries paid and remaining', () => {
    expect(whatsappMessage('created', 'en', { shopName: 'Raj Tailors', slipNo: 146, customerName: 'Ramesh', garmentSummary: '2 pant',
      dueDate: '2026-11-27', paid: 300, balance: 500, trackingUrl: 'https://x/t/abc' }))
      .toBe('Namaste Ramesh! Raj Tailors: your order #146 (2 pant) is booked. Expected on 27 Nov. Paid ₹300, remaining ₹500. Track: https://x/t/abc')
  })
  it('hi money line', () => expect(whatsappMessage('ready', 'hi', d)).toContain(' जमा ₹200, बाकी ₹300।'))
  it('no total but an advance', () => {
    const m = whatsappMessage('ready', 'en', { ...d, balance: null })
    expect(m).toContain(' Paid ₹200.')
    expect(m).not.toContain('remaining')
    expect(whatsappMessage('ready', 'hi', { ...d, balance: null })).toContain(' जमा ₹200।')
  })
  it('no total, nothing paid: no money line', () =>
    expect(whatsappMessage('ready', 'en', { ...d, balance: null, paid: 0 })).toBe(
      'Raj Tailors: your order #142 is ready for collection. Track: https://x/t/abc'))
  it('date_changed message', () =>
    expect(whatsappMessage('date_changed', 'en', d)).toBe(
      'Raj Tailors: order #142 will now be ready on 22 Nov. Sorry for the delay. Paid ₹200, remaining ₹300. Track: https://x/t/abc'))
  it.each(['created', 'date_changed', 'ready'] as const)('hi %s has slip no and url', (k) => {
    const m = whatsappMessage(k, 'hi', d)
    expect(m).toContain('142')
    expect(m).toContain('https://x/t/abc')
  })
  it('link encodes text', () =>
    expect(whatsappLink('9876543210', 'a b&c')).toBe('https://wa.me/919876543210?text=a%20b%26c'))
})

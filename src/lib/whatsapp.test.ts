import { describe, it, expect, vi } from 'vitest'
import { whatsappMessage, whatsappLink, appLink, isPhone, openWhatsApp } from './whatsapp'

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

describe('opening WhatsApp', () => {
  const link = 'https://wa.me/919876543210?text=a%20b%26c'
  it('appLink turns wa.me into the whatsapp:// app link', () =>
    expect(appLink(link)).toBe('whatsapp://send?phone=919876543210&text=a%20b%26c'))
  it('isPhone', () => {
    expect(isPhone('Mozilla/5.0 (Linux; Android 14; Pixel 7) Chrome/120 Mobile')).toBe(true)
    expect(isPhone('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(true)
    expect(isPhone('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120')).toBe(false)
  })
  it('phone: same-tab app link, reports opened', () => {
    const win = { location: { href: '' }, open: vi.fn() }
    expect(openWhatsApp(link, true, win)).toBe(true)
    expect(win.location.href).toBe('whatsapp://send?phone=919876543210&text=a%20b%26c')
    expect(win.open).not.toHaveBeenCalled()
  })
  it('laptop: new tab, opened only if the browser allowed it', () => {
    const win = { location: { href: '' }, open: vi.fn(() => ({})) }
    expect(openWhatsApp(link, false, win)).toBe(true)
    expect(win.open).toHaveBeenCalledWith(link, '_blank')
    win.open.mockReturnValue(null as never)
    expect(openWhatsApp(link, false, win)).toBe(false)
  })
})

// Phones: WhatsApp must open in the same tab (Chrome on Android drops the app hand-off from new tabs).
import { test, expect, devices } from '@playwright/test'
import { createAdminClient } from '@/lib/supabase/server'
import { createShop } from '@/lib/admin/shops'

process.loadEnvFile('.env.local')
const mobile = '9' + String(Math.floor(Math.random() * 1e9)).padStart(9, '0')
test.use({ ...devices['Pixel 7'] })

test.beforeAll(async () => {
  await createShop(createAdminClient(), { name: 'Phone Shop', ownerName: 'Owner', mobile, password: 'secret1' })
})

test('phone: WhatsApp opens in the same tab via whatsapp:// and is recorded', async ({ page, context }) => {
  const errors: string[] = []
  const newPages: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  context.on('page', (p) => newPages.push(p.url()))
  await page.addInitScript(() => localStorage.setItem('lang', 'en'))
  await page.goto('/login')
  await page.getByLabel('Mobile number').fill(mobile)
  await page.getByLabel('Password / PIN').fill('secret1')
  await page.getByRole('button', { name: 'Log in' }).tap()
  await expect(page.getByRole('button', { name: 'Board' })).toBeVisible()

  // Create on a phone: no pre-opened tab; banner always carries the whatsapp:// fallback link.
  await page.goto('/orders/new')
  await page.getByLabel('Customer name').fill('Phone Ravi')
  await page.getByLabel('Mobile number').fill('9876543210')
  await page.getByLabel('Rack (e.g. B3)').fill('A1')
  await page.getByRole('button', { name: 'Pant', exact: true }).tap()
  await page.getByRole('button', { name: 'Save order' }).tap()
  // Headless Chromium has no whatsapp:// handler, so that hand-off shows up as an aborted navigation here.
  await expect(page).toHaveURL(/created=/)
  expect(newPages).toEqual([])
  await expect(page.locator('a[href^="whatsapp://send?phone=919876543210"]')).toHaveCount(1)

  // Card on the board: rack shown, WhatsApp ✓ (the "created" message went out), tapping it stays on the board.
  const card = page.getByTestId('order-card').filter({ hasText: 'Phone Ravi' })
  await expect(card).toContainText('Rack A1')
  const sent = card.getByRole('link', { name: /Sent on WhatsApp/ })
  await expect(sent).toBeVisible()
  await sent.tap()
  await expect(page).not.toHaveURL(/\/orders\//) // stayed on the board (URL may carry the banner params)
  expect(newPages).toEqual([])

  // Status from the card: Unstarted → Ready opens WhatsApp (same tab), stays on the board, then shows ✓ again.
  await card.getByRole('button', { name: /Unstarted/ }).tap()
  await card.getByRole('button', { name: 'Ready', exact: true }).tap() // the open menu sits inside the card
  await expect(card.getByRole('button', { name: /Ready/ })).toBeVisible()
  await expect(card.getByRole('link', { name: /Sent on WhatsApp/ })).toBeVisible()
  await expect(page).not.toHaveURL(/\/orders\//)
  expect(newPages).toEqual([])

  // Ready from a card with no rack: goes to the ticket with the Rack field open and the hint.
  await page.goto('/orders/new')
  await page.getByLabel('Customer name').fill('Phone Sita')
  await page.getByLabel('Mobile number').fill('9876543211')
  await page.getByRole('button', { name: 'Pant', exact: true }).tap()
  await page.getByRole('button', { name: 'Save order' }).tap()
  await expect(page).toHaveURL(/created=/)
  const sita = page.getByTestId('order-card').filter({ hasText: 'Phone Sita' })
  await expect(sita).toContainText('No rack')
  await sita.getByRole('button', { name: /Unstarted/ }).tap()
  await sita.getByRole('button', { name: 'Ready', exact: true }).tap()
  await expect(page).toHaveURL(/\/orders\/[0-9a-f-]+\?rack=1$/)
  await expect(page.getByRole('alert').filter({ hasText: /rack first/i })).toBeVisible()
  await expect(page.locator('main input[type=text]')).toHaveCount(1) // the Rack field is in edit mode
  expect(newPages).toEqual([])
  expect(errors).toEqual([])
})

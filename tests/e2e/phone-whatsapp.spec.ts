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

  // Ticket icon on a phone: no new tab, send recorded (icon turns to the "communicated" style).
  await page.getByText('Phone Ravi').first().tap()
  await expect(page.getByRole('heading', { name: /Phone Ravi/ })).toBeVisible()
  const icon = page.getByRole('link', { name: 'Send on WhatsApp' })
  await expect(icon).toBeVisible()
  await icon.tap()
  await expect(icon).toHaveClass(/bg-\[#F4F5F7\]/)
  expect(newPages).toEqual([])
  expect(page.url()).toMatch(/\/orders\//)
  expect(errors).toEqual([])
})

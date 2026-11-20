import { test, expect } from '@playwright/test'
import { createAdminClient } from '@/lib/supabase/server'
import { createShop } from '@/lib/admin/shops'

process.loadEnvFile('.env.local')

const mobile = String(6 + Math.floor(Math.random() * 4)) + String(Math.floor(Math.random() * 1e9)).padStart(9, '0')
const password = 'secret1'

test.beforeAll(async () => {
  await createShop(createAdminClient(), { name: 'Offline Shop', ownerName: 'Owner', mobile, password })
})

test('board shell and cached orders load offline, banner clears when back online', async ({ page, context }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lang', 'en')
    window.open = () => null // Create's WhatsApp popup: take the banner path
  })
  await page.goto('/login')
  await page.getByLabel('Mobile number').fill(mobile)
  await page.getByLabel('Password / PIN').fill(password)
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByRole('button', { name: 'Board' })).toBeVisible()

  await page.goto('/orders/new')
  await page.getByLabel('Customer name').fill('Offline Ravi')
  await page.getByLabel('Mobile number').fill('9876543210')
  await page.getByRole('button', { name: 'Pant', exact: true }).click()
  await page.getByRole('button', { name: 'Save order' }).click()
  await expect(page.getByText('Offline Ravi')).toBeVisible()

  // SW controls pages only after registration; reload so the `/` navigation goes through it and is cached.
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await expect(page.getByText('Offline Ravi')).toBeVisible()
  await expect.poll(() => page.evaluate(async () => !!(await caches.match('/')))).toBe(true)

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByText('Offline — showing last saved')).toBeVisible()
  await expect(page.getByText('Offline Ravi')).toBeVisible()

  await context.setOffline(false)
  await page.evaluate(() => window.dispatchEvent(new Event('online'))) // headless may not fire it on its own
  await expect(page.getByText('Offline — showing last saved')).toBeHidden()
})

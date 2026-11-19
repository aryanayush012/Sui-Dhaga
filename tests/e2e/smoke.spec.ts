import { test, expect } from '@playwright/test'
import { createAdminClient } from '@/lib/supabase/server'
import { createShop } from '@/lib/admin/shops'

process.loadEnvFile('.env.local')

// Same shape as tests/db/fixtures.ts randomMobile (that file pulls in db-test helpers).
const mobile = String(6 + Math.floor(Math.random() * 4)) + String(Math.floor(Math.random() * 1e9)).padStart(9, '0')
const password = 'secret1'

test.beforeAll(async () => {
  await createShop(createAdminClient(), { name: 'Smoke Shop', ownerName: 'Owner', mobile, password })
})

test('owner books an order, moves it to Ready, customer sees it', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lang', 'en'))

  await page.goto('/login')
  await page.getByLabel('Mobile number').fill(mobile)
  await page.getByLabel('Password / PIN').fill(password)
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByRole('tab', { name: /Cutting/ })).toBeVisible()

  await page.goto('/orders/new')
  await page.getByLabel('Customer name').fill('Ravi Kumar')
  await page.getByLabel('Mobile number').fill('9876543210')
  await page.getByLabel('Rack (e.g. B3)').fill('A1')
  await page.getByRole('button', { name: 'Save order' }).click()
  await expect(page.getByText('Slip number')).toBeVisible()
  await expect(page.getByText(/^#\d+$/)).toBeVisible()
  await page.getByRole('button', { name: 'Skip' }).click()

  await page.getByRole('tab', { name: /Cutting/ }).click()
  const card = page.getByText('Ravi Kumar').locator('xpath=ancestor::div[contains(@class,"rounded-xl")]')
  await expect(card).toContainText('A1')
  for (const stage of ['Stitching', 'Ironing', 'Ready']) {
    await card.getByRole('button', { name: /Move/ }).click()
    await page.getByRole('tab', { name: new RegExp(stage) }).click()
    await expect(page.getByText('Ravi Kumar')).toBeVisible()
    if (stage !== 'Ready') await expect(card).toBeVisible()
  }
  await expect(page.getByRole('tab', { name: /Ready/ })).toHaveAttribute('aria-selected', 'true')

  await page.getByText('Ravi Kumar').click()
  await page.getByRole('button', { name: 'Copy tracking link' }).click()
  await expect(page.getByText('Link copied')).toBeVisible()
  const link = await page.evaluate(() => navigator.clipboard.readText())
  expect(link).toContain('/t/')

  await page.goto(new URL(link).pathname)
  await expect(page.getByText('Ready for collection')).toBeVisible()
})

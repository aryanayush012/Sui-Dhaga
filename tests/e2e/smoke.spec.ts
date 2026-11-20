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
  await page.addInitScript(() => {
    localStorage.setItem('lang', 'en')
    // Record calls and return null: Create takes the blocked-popup path, Ready's call is recorded.
    const w = window as unknown as { __opened: unknown[][] }
    w.__opened = []
    window.open = (...a: unknown[]) => { w.__opened.push(a); return null }
  })

  await page.goto('/login')
  await page.getByLabel('Mobile number').fill(mobile)
  await page.getByLabel('Password / PIN').fill(password)
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByRole('button', { name: 'Board' })).toBeVisible()

  await page.goto('/orders/new')
  await page.getByLabel('Customer name').fill('Ravi Kumar')
  await page.getByLabel('Mobile number').fill('9876543210')
  await page.getByLabel('Rack (e.g. B3)').fill('A1')
  await page.getByRole('button', { name: 'Pant', exact: true }).click()
  await page.getByRole('button', { name: 'Save order' }).click()
  const banner = page.getByRole('status').filter({ hasText: /Order #\d+ created/ })
  await expect(banner).toBeVisible()
  await expect(banner.getByRole('link', { name: 'Send on WhatsApp' })).toHaveAttribute('href', /^https:\/\/wa\.me\//)

  const column = page.locator('section').filter({ has: page.getByRole('heading', { name: /^Not started/ }) })
  const card = column.getByText('Ravi Kumar')
  await expect(card).toBeVisible()
  await expect(column).toContainText('A1')

  await card.click()
  const menu = page.locator('button[aria-haspopup="true"]')
  for (const stage of ['Cutting', 'Stitching', 'Ironing', 'Ready']) {
    await menu.click()
    await page.getByRole('listitem').getByRole('button', { name: stage, exact: true }).click()
    await expect(menu).toContainText(stage)
  }
  const wa = await page.evaluate(() =>
    (window as unknown as { __opened: unknown[][] }).__opened.map((a) => String(a[0])).filter((u) => u.startsWith('https://wa.me/')))
  expect(wa).toHaveLength(1)

  // The top-bar WhatsApp message always carries the tracking link.
  const href = await page.getByRole('link', { name: 'Send on WhatsApp' }).getAttribute('href')
  const link = new URL(href!).searchParams.get('text')!.match(/https?:\/\/\S+\/t\/[\w-]+/)![0]
  const ticket = page.url()

  await page.goto(new URL(link).pathname)
  await expect(page.getByText('Ready for collection').first()).toBeVisible()

  await page.goto(ticket)
  await page.getByRole('button', { name: /^₹0/ }).click()
  await page.getByRole('spinbutton').fill('200')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('button', { name: /^₹200/ })).toBeVisible()
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByText(/Paid:? ₹0 → ₹200/)).toBeVisible()
})

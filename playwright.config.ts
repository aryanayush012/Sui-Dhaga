import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 1,
  use: { baseURL: 'http://localhost:3000', permissions: ['clipboard-read', 'clipboard-write'] },
  webServer: {
    command: 'npm run build && npm start',
    url: 'http://localhost:3000/login',
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
  },
})

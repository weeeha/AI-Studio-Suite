import { defineConfig, devices } from '@playwright/test'

const remote = process.env.SUITE_URL
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: remote ?? 'http://127.0.0.1:4170',
    extraHTTPHeaders: bypass ? { 'x-vercel-protection-bypass': bypass, 'x-vercel-set-bypass-cookie': 'true' } : undefined,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: remote ? undefined : { command: 'npm run serve', url: 'http://127.0.0.1:4170/cork/', reuseExistingServer: true },
})

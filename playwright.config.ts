import { defineConfig, devices } from '@playwright/test'

const remote = process.env.SUITE_URL
// Send the Vercel bypass secret only to a *.vercel.app suite URL, never to other origins.
const onVercel = (() => {
  try { return !!remote && new URL(remote).hostname.endsWith('.vercel.app') } catch { return false }
})()
const bypass = onVercel ? process.env.VERCEL_AUTOMATION_BYPASS_SECRET : undefined

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: {
    trace: 'off',
    baseURL: remote ?? 'http://127.0.0.1:4170',
    extraHTTPHeaders: bypass ? { 'x-vercel-protection-bypass': bypass, 'x-vercel-set-bypass-cookie': 'true' } : undefined,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: remote ? undefined : { command: 'npm run serve', url: 'http://127.0.0.1:4170/cork/', reuseExistingServer: true },
})

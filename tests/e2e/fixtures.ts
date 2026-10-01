import { test as base, expect } from '@playwright/test'

// Vercel injects its feedback toolbar script into Preview navigations. WebKit logs a console
// error for it on page unload ("due to access control checks"). On a *.vercel.app suite URL,
// answer those requests with an empty script so no console error is raised. Never installed locally.
const onVercel = (() => {
  try { return !!process.env.SUITE_URL && new URL(process.env.SUITE_URL).hostname.endsWith('.vercel.app') } catch { return false }
})()

export const test = base.extend<{ stubVercelLive: void }>({
  stubVercelLive: [async ({ context }, use) => {
    if (onVercel) {
      await context.route('https://vercel.live/**', route =>
        route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }))
    }
    await use()
  }, { auto: true }],
})

export { expect }

import { test as base, expect } from '@playwright/test'

// Vercel injects its feedback toolbar script into Preview navigations. WebKit logs a console
// error for it on page unload ("due to access control checks"). On a *.vercel.app suite URL,
// answer those requests with an empty script so no console error is raised. Slate's CSP
// (default-src 'self') also blocks the injected <script> before any request is made, so a stub
// cannot help there: document responses are rewritten to drop the tag. Never installed locally.
const onVercel = (() => {
  try { return !!process.env.SUITE_URL && new URL(process.env.SUITE_URL).hostname.endsWith('.vercel.app') } catch { return false }
})()

export const test = base.extend<{ stubVercelLive: void }>({
  stubVercelLive: [async ({ context }, use) => {
    if (onVercel) {
      await context.route('https://vercel.live/**', route =>
        route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }))
      await context.route('**/*', async route => {
        if (route.request().resourceType() !== 'document') return route.fallback()
        const response = await route.fetch()
        if (!(response.headers()['content-type'] ?? '').includes('text/html')) return route.fulfill({ response })
        const body = (await response.text()).replace(/<script\b[^>]*vercel\.live[^>]*>\s*<\/script>/gi, '')
        const headers = { ...response.headers() }
        for (const h of ['content-length', 'content-encoding', 'transfer-encoding']) delete headers[h]
        await route.fulfill({ status: response.status(), headers, body })
      })
    }
    await use()
  }, { auto: true }],
})

export { expect }

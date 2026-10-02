import type { Page } from '@playwright/test'

// Collects console errors and uncaught exceptions for one page.
export function watchErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', e => errors.push(e.message))
  return errors
}

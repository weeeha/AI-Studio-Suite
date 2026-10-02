import { expect, type Page } from '@playwright/test'

// Collects console errors and uncaught exceptions for one page.
export function watchErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', e => errors.push(e.message))
  return errors
}

/** Fails if the closed suite pill overlaps any visible control of the tool underneath. */
export async function expectPillClear(page: Page): Promise<void> {
  const overlaps = await page.evaluate(() => {
    const host = document.querySelector('suite-pill')
    if (!host) return ['no suite-pill on the page']
    const pill = host.getBoundingClientRect()
    const hits: string[] = []
    for (const el of document.querySelectorAll<HTMLElement>('button, a, input, select, textarea, [role="button"]')) {
      if (host.contains(el)) continue
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0 || getComputedStyle(el).visibility === 'hidden') continue
      const intersects = r.left < pill.right && r.right > pill.left && r.top < pill.bottom && r.bottom > pill.top
      if (intersects) hits.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 40)}"`)
    }
    return hits
  })
  expect(overlaps, 'controls covered by the suite pill').toEqual([])
}

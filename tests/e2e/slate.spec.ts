import { test, expect } from './fixtures'
import { watchErrors, expectPillClear } from './helpers'

const clipFor = (browserName: string) => (browserName === 'chromium' ? 'tests/fixtures/clip.webm' : 'tests/fixtures/clip.mp4')

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  // Capture clipboard writes so the export check works in both engines.
  await page.addInitScript(() => {
    ;(window as unknown as { __copied: string[] }).__copied = []
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (t: string) => { (window as unknown as { __copied: string[] }).__copied.push(t) } },
    })
  })
})

test('Slate creates a project that survives a reload, and the pill stays clear', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/slate/')
  await expectPillClear(page)
  await page.getByPlaceholder('New project title — e.g. Night Market').fill('Smoke Market')
  await page.getByRole('button', { name: 'Create Project' }).click()
  await expect(page.getByRole('button', { name: 'Close Project' })).toBeVisible()
  // Inside a project Slate has controls in both bottom corners; the lifted pill must clear them on every tab.
  for (const tab of ['Setups', 'Coverage', 'Studios', 'Refs', 'Deliver']) {
    await page.getByRole('button', { name: tab, exact: true }).click()
    await expectPillClear(page)
  }
  await expect(page.locator('.save-dot')).toHaveCount(0)
  await page.reload()
  await expect(page.getByText('Smoke Market').first()).toBeVisible()
  expect(errors).toEqual([])
})

test('Slate imports an image and a clip as references and shows their frames', async ({ page, browserName }) => {
  const errors = watchErrors(page)
  await page.goto('/slate/')
  await page.getByPlaceholder('New project title — e.g. Night Market').fill('Refs Test')
  await page.getByRole('button', { name: 'Create Project' }).click()
  await page.getByRole('button', { name: 'Refs', exact: true }).click()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: '+ Add images or clips' }).click()
  await (await chooser).setFiles(['tests/fixtures/still.png', clipFor(browserName)])
  // still.png is 1 frame; a 6 s clip sampled every 2 s from 0.5 s gives 3 frames.
  await expect(page.locator('img[src^="blob:"]')).toHaveCount(4, { timeout: 20_000 })
  // Slate autosaves 500 ms after the last change; the dot shows while that is pending.
  await expect(page.locator('.save-dot')).toHaveCount(0)
  await page.reload()
  await page.getByText('Refs Test').first().click()
  await page.getByRole('button', { name: 'Refs', exact: true }).click()
  await expect(page.locator('img[src^="blob:"]')).toHaveCount(4, { timeout: 20_000 })
  expect(errors).toEqual([])
})

test('Slate copies a compiled prompt (clipboard export)', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/slate/')
  await page.getByPlaceholder('New project title — e.g. Night Market').fill('Copy Test')
  await page.getByRole('button', { name: 'Create Project' }).click()
  await page.getByRole('button', { name: '+ Scene' }).click()
  await page.getByPlaceholder('Scene name…').fill('Scene One')
  await page.getByPlaceholder('Scene name…').press('Enter')
  await page.getByText('+ Add shot').click()
  await page.getByRole('button', { name: 'Deliver', exact: true }).click()
  // Compiling a prompt needs the desktop brain; the scene export copies without it.
  await page.getByRole('button', { name: 'Markdown shot list' }).click()
  await expect(page.getByRole('button', { name: '✓' })).toBeVisible()
  const copied = await page.evaluate(() => (window as unknown as { __copied: string[] }).__copied)
  expect(copied.length).toBeGreaterThan(0)
  expect(errors).toEqual([])
})

import { test, expect } from './fixtures'
import { watchErrors, expectPillClear } from './helpers'

test('Cork Board loads, keeps the project after reload, exports Fountain, imports JSON', async ({ page }) => {
  const errors = watchErrors(page)
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/cork/')
  await expectPillClear(page)
  const title = page.locator('#projectTitle')
  await expect(title).toBeVisible()

  await title.fill('Smoke Test Film')
  await title.press('Tab')
  await expect
    .poll(() =>
      page.evaluate(() =>
        Object.keys(localStorage).some(
          (k) => k.startsWith('cork-board-') && (localStorage.getItem(k) ?? '').includes('Smoke Test Film'),
        ),
      ),
    )
    .toBe(true)
  await page.reload()
  await expect(page.locator('#projectTitle')).toHaveValue('Smoke Test Film')

  await page.locator('#exportBtn').click()
  const download = page.waitForEvent('download')
  await page.locator('#downloadFountainBtn').click()
  expect((await download).suggestedFilename()).toMatch(/\.fountain$/)

  // Round-trip: JSON out (download buttons keep the Export dialog open), then back in.
  const jsonDownload = page.waitForEvent('download')
  await page.locator('#downloadJsonBtn').click()
  const jsonPath = await (await jsonDownload).path()

  // Move the open project away from the exported title so the import has to bring it back.
  await page.keyboard.press('Escape')
  await title.fill('Changed Before Import')
  await title.press('Tab')
  await expect(title).toHaveValue('Changed Before Import')

  // Cork Board's import adds the file as a new project and switches to it.
  await page.locator('#exportBtn').click()
  const chooser = page.waitForEvent('filechooser')
  await page.locator('#importJsonBtn').click()
  await (await chooser).setFiles(jsonPath)
  await expect(page.locator('#projectTitle')).toHaveValue('Smoke Test Film')

  expect(errors).toEqual([])
})

test('the suite pill switches from Cork Board to ScriptBreak', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/cork/')
  const pill = page.locator('suite-pill')
  await pill.getByRole('button', { name: 'Suite' }).click()
  await pill.getByRole('menuitem', { name: 'ScriptBreak' }).click()
  await expect(page).toHaveURL(/\/script\/$/)
  expect(errors).toEqual([])
})

test('tabbing out of the suite pill closes the menu', async ({ page }) => {
  await page.goto('/cork/')
  const pill = page.locator('suite-pill')
  const toggle = pill.getByRole('button', { name: 'Suite' })
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  // Focus starts on Home; Shift+Tab goes to the toggle (inside), then out to the page.
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Shift+Tab')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
})

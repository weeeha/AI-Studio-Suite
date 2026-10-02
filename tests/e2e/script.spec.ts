import { test, expect } from './fixtures'
import { watchErrors, expectPillClear } from './helpers'

test('ScriptBreak imports a Fountain script, keeps it after reload, saves the project', async ({ page }) => {
  const errors = watchErrors(page)
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/script/')
  await expect(page.locator('#fileInput')).toBeAttached()
  await page.locator('#fileInput').setInputFiles('tests/fixtures/two-scenes.fountain')
  await expect(page.locator('.scene-card')).toHaveCount(2)
  await expectPillClear(page)

  const stored = await page.evaluate(() => localStorage.getItem('scriptbreak.db.v2') ?? '')
  expect(stored).toContain('KITCHEN')
  await page.reload()
  const afterReload = await page.evaluate(() => localStorage.getItem('scriptbreak.db.v2') ?? '')
  expect(afterReload).toContain('KITCHEN')

  const download = page.waitForEvent('download')
  await page.locator('#btnSaveProj').click()
  expect((await download).suggestedFilename()).toMatch(/\.(scriptbreak|json)$/)

  expect(errors).toEqual([])
})

test('the suite pill does not cover ScriptBreak\'s sidebar credit', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/script/')
  const credit = page.locator('.foot')
  await expect(credit).toBeVisible()
  const pill = page.locator('suite-pill')
  await expect(pill).toBeVisible()
  const [c, p] = [await credit.boundingBox(), await pill.boundingBox()]
  expect(c).not.toBeNull()
  expect(p).not.toBeNull()
  const overlaps = c!.x < p!.x + p!.width && p!.x < c!.x + c!.width && c!.y < p!.y + p!.height && p!.y < c!.y + c!.height
  expect(overlaps, `pill ${JSON.stringify(p)} vs credit ${JSON.stringify(c)}`).toBe(false)
})

import { test, expect } from '@playwright/test'
import { watchErrors } from './helpers'

test('ScriptBreak imports a Fountain script, keeps it after reload, saves the project', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/script/')
  await page.locator('#fileInput').setInputFiles('tests/fixtures/two-scenes.fountain')
  await expect(page.locator('.scene-card')).toHaveCount(2)

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

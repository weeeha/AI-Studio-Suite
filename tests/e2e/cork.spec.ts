import { test, expect } from '@playwright/test'
import { watchErrors } from './helpers'

test('Cork Board loads, keeps the project after reload, exports Fountain, imports JSON', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/cork/')
  const title = page.locator('#projectTitle')
  await expect(title).toBeVisible()

  await title.fill('Smoke Test Film')
  await title.press('Tab')
  await page.waitForTimeout(800) // autosave is debounced at 400ms
  await page.reload()
  await expect(page.locator('#projectTitle')).toHaveValue('Smoke Test Film')

  await page.locator('#exportBtn').click()
  const download = page.waitForEvent('download')
  await page.locator('#downloadFountainBtn').click()
  expect((await download).suggestedFilename()).toMatch(/\.fountain$/)

  // Round-trip in the same Export dialog (download buttons keep it open): JSON out, then back in.
  const jsonDownload = page.waitForEvent('download')
  await page.locator('#downloadJsonBtn').click()
  const jsonPath = await (await jsonDownload).path()
  const chooser = page.waitForEvent('filechooser')
  await page.locator('#importJsonBtn').click()
  await (await chooser).setFiles(jsonPath)
  await expect(page.locator('#projectTitle')).toHaveValue('Smoke Test Film')

  expect(errors).toEqual([])
})

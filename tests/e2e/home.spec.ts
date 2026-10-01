import { test, expect } from '@playwright/test'
import { watchErrors } from './helpers'

test('home lists the pipeline and opens Cork Board', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(6)
  await page.getByRole('link', { name: 'Open Cork Board' }).click()
  await expect(page).toHaveURL(/\/cork\/$/)
  expect(errors).toEqual([])
})

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

test('each tool ships its fork LICENSE and NOTICE', async ({ request }) => {
  for (const path of ['/cork/', '/script/']) {
    const license = await request.get(`${path}LICENSE.txt`)
    expect(license.ok(), `${path}LICENSE.txt`).toBe(true)
    expect(await license.text()).toContain('Apache License')
  }
  const notice = await request.get('/cork/NOTICE.txt')
  expect(notice.ok(), '/cork/NOTICE.txt').toBe(true)
})

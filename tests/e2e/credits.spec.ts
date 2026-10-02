import { test, expect } from './fixtures'
import { watchErrors } from './helpers'

for (const path of ['/cork/', '/script/']) {
  test(`Credits in the pill leads from ${path} to the author credit`, async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto(path)
    const pill = page.locator('suite-pill')
    await pill.getByRole('button', { name: 'Suite' }).click()
    await pill.getByRole('menuitem', { name: 'Credits' }).click()
    await expect(page).toHaveURL(/\/#credits$/)
    await expect(page.locator('#credits')).toContainText('Sam Wasserman')
    await expect(page.locator('#credits')).toBeInViewport()
    expect(errors).toEqual([])
  })
}

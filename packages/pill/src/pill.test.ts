import { currentTool, hrefTo, mountPill, type PillTool } from './pill'

const tools: PillTool[] = [
  { id: 'cork', name: 'Cork Board', path: '/cork/', enabled: true, theme: 'light' },
  { id: 'script', name: 'ScriptBreak', path: '/script/', enabled: true, theme: 'dark' },
  { id: 'slate', name: 'Slate', path: '/slate/', enabled: false, theme: 'dark' },
]

test('takes the theme of the tool it sits in', () => {
  expect(mountPill({ tools, pathname: '/cork/' }).dataset.theme).toBe('light')
  expect(mountPill({ tools, pathname: '/script/' }).dataset.theme).toBe('dark')
})

test('currentTool matches the first path segment', () => {
  expect(currentTool(tools, '/script/')?.id).toBe('script')
  expect(currentTool(tools, '/script/index.html')?.id).toBe('script')
  expect(currentTool(tools, '/')).toBeUndefined()
})

test('hrefTo builds relative links', () => {
  expect(hrefTo('/cork/', '/script/')).toBe('../script/')
  expect(hrefTo('/cork/', '/')).toBe('../')
})

test('mounts in a shadow root, closed by default', () => {
  const host = mountPill({ tools, pathname: '/cork/' })
  const root = host.shadowRoot!
  const toggle = root.querySelector('button')!
  expect(toggle.getAttribute('aria-expanded')).toBe('false')
  expect(root.querySelector('[role="menu"]')!.hasAttribute('hidden')).toBe(true)
})

test('opens with links for enabled tools, marks the current one, mutes disabled ones', () => {
  const host = mountPill({ tools, pathname: '/cork/' })
  const root = host.shadowRoot!
  root.querySelector('button')!.click()
  expect(root.querySelector('button')!.getAttribute('aria-expanded')).toBe('true')
  const links = [...root.querySelectorAll('a')].map(a => [a.textContent, a.getAttribute('href'), a.getAttribute('aria-current')])
  expect(links).toEqual([['Home', '../', null], ['Cork Board', '../cork/', 'page'], ['ScriptBreak', '../script/', null]])
  expect(root.querySelector('[data-disabled="slate"]')!.textContent).toContain('desktop only')
})

test('Escape closes the menu and returns focus to the toggle', () => {
  const host = mountPill({ tools, pathname: '/cork/' })
  const root = host.shadowRoot!
  const toggle = root.querySelector('button')!
  toggle.click()
  root.querySelector('[role="menu"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  expect(toggle.getAttribute('aria-expanded')).toBe('false')
  expect(root.activeElement ?? document.activeElement).toBe(toggle)
})

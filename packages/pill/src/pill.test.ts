import { currentTool, hrefTo, mountPill, type PillTool } from './pill'

const tools: PillTool[] = [
  { id: 'cork', name: 'Cork Board', path: '/cork/', enabled: true, theme: 'light', pillCorner: 'bottom-left' },
  { id: 'script', name: 'ScriptBreak', path: '/script/', enabled: true, theme: 'dark', pillCorner: 'bottom-right' },
  { id: 'slate', name: 'Slate', path: '/slate/', enabled: false, theme: 'dark', pillCorner: 'bottom-left' },
]

test('takes the theme of the tool it sits in', () => {
  expect(mountPill({ tools, pathname: '/cork/' }).dataset.theme).toBe('light')
  expect(mountPill({ tools, pathname: '/script/' }).dataset.theme).toBe('dark')
})

test('takes its corner from the tool it sits in, defaulting to bottom-left', () => {
  expect(mountPill({ tools, pathname: '/cork/' }).dataset.corner).toBe('bottom-left')
  expect(mountPill({ tools, pathname: '/script/' }).dataset.corner).toBe('bottom-right')
  expect(mountPill({ tools, pathname: '/' }).dataset.corner).toBe('bottom-left')
})

test('a tool can lift the pill with pillBottom', () => {
  const lifted: PillTool[] = [{ ...tools[0], pillBottom: 48 }]
  expect(mountPill({ tools: lifted, pathname: '/cork/' }).style.getPropertyValue('--pill-bottom')).toBe('48px')
  expect(mountPill({ tools, pathname: '/cork/' }).style.getPropertyValue('--pill-bottom')).toBe('')
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
  expect(links).toEqual([['Home', '../', null], ['Cork Board', '../cork/', 'page'], ['ScriptBreak', '../script/', null], ['Credits', '../#credits', null]])
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

function open() {
  const host = mountPill({ tools, pathname: '/cork/' })
  const root = host.shadowRoot!
  const toggle = root.querySelector('button')!
  toggle.click()
  const menu = root.querySelector('[role="menu"]')!
  const key = (k: string) => menu.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
  const links = [...root.querySelectorAll('a')]
  return { host, root, toggle, menu, key, links }
}

test('opening focuses the first item; arrows wrap, Home and End jump', () => {
  const { root, key, links } = open()
  expect(root.activeElement).toBe(links[0])
  key('ArrowDown'); expect(root.activeElement).toBe(links[1])
  key('End'); expect(root.activeElement).toBe(links[3])
  key('ArrowDown'); expect(root.activeElement).toBe(links[0])
  key('ArrowUp'); expect(root.activeElement).toBe(links[3])
  key('Home'); expect(root.activeElement).toBe(links[0])
})

test('a pointer press outside closes the menu, inside does not', () => {
  const { toggle, menu } = open()
  menu.dispatchEvent(new Event('pointerdown', { bubbles: true, composed: true }))
  expect(toggle.getAttribute('aria-expanded')).toBe('true')
  document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
  expect(toggle.getAttribute('aria-expanded')).toBe('false')
  expect(menu.hasAttribute('hidden')).toBe(true)
})

test('focus moving outside the pill closes the menu and keeps focus there', () => {
  const { root, toggle, links } = open()
  const other = document.createElement('input')
  document.body.append(other)
  other.focus()
  links[0].dispatchEvent(new FocusEvent('focusout', { bubbles: true, composed: true, relatedTarget: other }))
  expect(toggle.getAttribute('aria-expanded')).toBe('false')
  expect(root.activeElement).not.toBe(toggle)
})

test('ArrowUp with no focused item goes to the last link', () => {
  const { root, menu, links } = open()
  ;(root.activeElement as HTMLElement).blur()
  menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
  expect(root.activeElement).toBe(links[links.length - 1])
})

test('remounting adds no further document pointerdown listeners', () => {
  mountPill({ tools, pathname: '/cork/' })
  const add = vi.spyOn(document, 'addEventListener')
  mountPill({ tools, pathname: '/cork/' })
  mountPill({ tools, pathname: '/cork/' })
  expect(add.mock.calls.filter(c => c[0] === 'pointerdown').length).toBe(0)
  add.mockRestore()
})

test('ends with a Credits link to the home credits', () => {
  const host = mountPill({ tools, pathname: '/script/' })
  const root = host.shadowRoot!
  root.querySelector('button')!.click()
  const items = [...root.querySelectorAll('[role="menuitem"]')]
  const last = items[items.length - 1] as HTMLAnchorElement
  expect(last.textContent).toBe('Credits')
  expect(last.getAttribute('href')).toBe('../#credits')
})

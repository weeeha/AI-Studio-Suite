import css from './pill.css'

export type PillTool = { id: string; name: string; path: string; enabled: boolean; theme: 'light' | 'dark' }

export function currentTool(tools: PillTool[], pathname: string): PillTool | undefined {
  return tools.find(t => pathname === t.path || pathname.startsWith(t.path))
}

export function hrefTo(fromPath: string, toPath: string): string {
  const up = '../'.repeat(fromPath.split('/').filter(Boolean).length)
  return up + toPath.replace(/^\//, '')
}

const ICON = (d: string) =>
  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`
const GRID_ICON = ICON('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>')
const CHEVRON_ICON = ICON('<path d="m6 15 6-6 6 6"/>')

type Closer = (e: Event) => void
const closers = new WeakMap<Document, Map<HTMLElement, Closer>>()
function outsideClosers(doc: Document): Map<HTMLElement, Closer> {
  let map = closers.get(doc)
  if (!map) {
    const m = new Map<HTMLElement, Closer>()
    map = m
    closers.set(doc, m)
    doc.addEventListener('pointerdown', e => {
      for (const [h, close] of m) {
        if (h.isConnected) close(e)
        else m.delete(h)
      }
    })
  }
  return map
}

export function mountPill({ tools, pathname, doc = document }: { tools: PillTool[]; pathname: string; doc?: Document }): HTMLElement {
  const here = currentTool(tools, pathname)
  const from = here?.path ?? '/'
  const host = doc.createElement('suite-pill')
  host.dataset.theme = here?.theme ?? 'dark'
  const root = host.attachShadow({ mode: 'open' })

  const style = doc.createElement('style')
  style.textContent = css
  const toggle = doc.createElement('button')
  toggle.type = 'button'
  toggle.innerHTML = `${GRID_ICON}<span>Suite</span><span class="chevron">${CHEVRON_ICON}</span>`
  toggle.setAttribute('aria-expanded', 'false')
  toggle.setAttribute('aria-haspopup', 'menu')
  const menu = doc.createElement('div')
  menu.setAttribute('role', 'menu')
  menu.setAttribute('aria-label', 'AI Studio Suite tools')
  menu.hidden = true

  const home = doc.createElement('a')
  home.className = 'home'
  home.textContent = 'Home'
  home.href = hrefTo(from, '/')
  home.setAttribute('role', 'menuitem')
  const separator = doc.createElement('div')
  separator.setAttribute('role', 'separator')
  menu.append(home, separator)
  for (const t of tools) {
    if (t.enabled) {
      const a = doc.createElement('a')
      a.textContent = t.name
      a.href = hrefTo(from, t.path)
      a.setAttribute('role', 'menuitem')
      if (t.id === here?.id) a.setAttribute('aria-current', 'page')
      menu.append(a)
    } else {
      const span = doc.createElement('span')
      span.dataset.disabled = t.id
      span.setAttribute('role', 'menuitem')
      span.setAttribute('aria-disabled', 'true')
      const note = doc.createElement('span')
      note.className = 'note'
      note.textContent = 'desktop only'
      span.append(t.name, ' ', note)
      menu.append(span)
    }
  }

  const items = () => [...menu.querySelectorAll<HTMLElement>('a')]
  const setOpen = (open: boolean, restoreFocus = true) => {
    menu.hidden = !open
    toggle.setAttribute('aria-expanded', String(open))
    if (open) items()[0]?.focus()
    else if (restoreFocus) toggle.focus()
  }
  toggle.addEventListener('click', () => setOpen(menu.hidden))
  menu.addEventListener('keydown', e => {
    const key = (e as KeyboardEvent).key
    if (key === 'Escape') return setOpen(false)
    const list = items()
    const i = list.indexOf(root.activeElement as HTMLElement)
    const target =
      key === 'ArrowDown' ? list[(i + 1) % list.length]
      : key === 'ArrowUp' ? list[i < 0 ? list.length - 1 : (i - 1 + list.length) % list.length]
      : key === 'Home' ? list[0]
      : key === 'End' ? list[list.length - 1]
      : undefined
    if (target) { e.preventDefault(); target.focus() }
  })
  // Keyboard focus leaving the pill closes the menu without stealing focus back.
  root.addEventListener('focusout', e => {
    const next = (e as FocusEvent).relatedTarget as Node | null
    if (!menu.hidden && next && !root.contains(next) && next !== host) setOpen(false, false)
  })
  // A pointer press outside the pill closes it (one shared document listener).
  outsideClosers(doc).set(host, e => {
    if (!menu.hidden && !e.composedPath().includes(host)) setOpen(false, false)
  })

  root.append(style, toggle, menu)
  doc.body.append(host)
  return host
}

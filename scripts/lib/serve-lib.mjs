import { existsSync, statSync } from 'node:fs'
import { join, normalize, sep } from 'node:path'

export function resolveRequest(root, urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0]))
  const full = join(root, clean)
  if (full !== root && !full.startsWith(root + sep)) return { kind: 'missing' }
  if (!existsSync(full)) return { kind: 'missing' }
  if (statSync(full).isDirectory()) {
    if (!urlPath.endsWith('/')) return { kind: 'redirect', location: urlPath + '/' }
    const index = join(full, 'index.html')
    return existsSync(index) ? { kind: 'file', file: index } : { kind: 'missing' }
  }
  return { kind: 'file', file: full }
}

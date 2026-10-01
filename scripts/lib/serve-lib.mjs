import { existsSync, statSync } from 'node:fs'
import { join, normalize, sep } from 'node:path'

export function resolveRequest(root, urlPath) {
  const queryAt = urlPath.indexOf('?')
  const pathOnly = queryAt === -1 ? urlPath : urlPath.slice(0, queryAt)
  const query = queryAt === -1 ? '' : urlPath.slice(queryAt)
  let decoded
  try {
    decoded = decodeURIComponent(pathOnly)
  } catch {
    return { kind: 'missing' }
  }
  const clean = normalize(decoded)
  const full = join(root, clean)
  if (full !== root && !full.startsWith(root + sep)) return { kind: 'missing' }
  if (!existsSync(full)) return { kind: 'missing' }
  if (statSync(full).isDirectory()) {
    if (!pathOnly.endsWith('/')) {
      return { kind: 'redirect', location: pathOnly.replace(/^\/+/, '/') + '/' + query }
    }
    const index = join(full, 'index.html')
    return existsSync(index) ? { kind: 'file', file: index } : { kind: 'missing' }
  }
  return { kind: 'file', file: full }
}

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export async function loadRegistry(root) {
  const tools = JSON.parse(await readFile(join(root, 'tools.json'), 'utf8')).tools
  const lock = JSON.parse(await readFile(join(root, 'suite.lock.json'), 'utf8'))
  return { tools, lock }
}

export function validateRegistry(tools, lock) {
  const errors = []
  const seen = { id: new Set(), path: new Set(), devPort: new Set() }
  for (const t of tools) {
    for (const key of ['id', 'path', 'devPort']) {
      if (seen[key].has(t[key])) errors.push(`duplicate ${key} ${t[key]}`)
      seen[key].add(t[key])
    }
    if (!/^\/[a-z0-9-]+\/$/.test(t.path)) errors.push(`bad path ${t.path}`)
    if (t.theme !== 'light' && t.theme !== 'dark') errors.push(`bad theme for ${t.id}`)
    const entry = lock[t.id]
    if (!entry) { errors.push(`no lock entry for ${t.id}`); continue }
    if (!/^[0-9a-f]{40}$/.test(entry.sha)) errors.push(`bad sha for ${t.id}`)
    if (entry.repo !== t.repo) errors.push(`repo mismatch for ${t.id}`)
  }
  return errors
}

export function enabledTools(tools) {
  return tools.filter(t => t.enabled)
}

export function fillCommand(template, { port, path }) {
  return template.replaceAll('{port}', String(port)).replaceAll('{path}', path)
}

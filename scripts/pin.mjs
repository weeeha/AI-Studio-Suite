import { writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { loadRegistry, validateRegistry } from './lib/registry.mjs'
import { forkHead, isPushed } from './lib/git.mjs'
import { nextLock } from './lib/lock.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const { tools, lock: prev } = await loadRegistry(root)
const heads = {}
const problems = []
for (const t of tools) {
  const dir = join(root, 'forks', t.fork)
  if (!existsSync(dir)) { problems.push(`${t.id}: forks/${t.fork} is missing`); continue }
  execFileSync('git', ['fetch', '-q', 'origin'], { cwd: dir })
  const head = forkHead(dir)
  if (!isPushed(dir, head.sha)) problems.push(`${t.id}: ${head.sha.slice(0, 7)} on ${head.branch} is not pushed`)
  heads[t.id] = head
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1) }
const { lock, changes } = nextLock(tools, heads, prev)
const errors = validateRegistry(tools, lock)
if (errors.length) { console.error(errors.join('\n')); process.exit(1) }
await writeFile(join(root, 'suite.lock.json'), JSON.stringify(lock, null, 2) + '\n')
console.log(changes.length ? changes.join('\n') : 'no changes')

import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { loadRegistry, validateRegistry, enabledTools } from './lib/registry.mjs'
import { sourceDir } from './lib/source.mjs'
import { injectPill, pillSrcFor } from './lib/html.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const local = process.argv.includes('--local')
const only = process.argv.find(a => a.startsWith('--only='))?.slice(7)
const env = { ...process.env, ELECTRON_SKIP_BINARY_DOWNLOAD: '1' }
const run = (cmd, cwd) => { console.log(`$ (${cwd.replace(root, '')}) ${cmd}`); execSync(cmd, { cwd, env, stdio: 'inherit' }) }

const { tools, lock } = await loadRegistry(root)
const errors = validateRegistry(tools, lock)
if (errors.length) { console.error(errors.join('\n')); process.exit(1) }

const dist = join(root, 'dist')
rmSync(dist, { recursive: true, force: true })

if (existsSync(join(root, 'apps/home/package.json'))) {
  run('npm run build -w apps/home', root)
  cpSync(join(root, 'apps/home/dist'), dist, { recursive: true })
}
const pillBuilt = existsSync(join(root, 'packages/pill/package.json'))
if (pillBuilt) {
  run('npm run build -w packages/pill', root)
  cpSync(join(root, 'packages/pill/dist'), join(dist, '_suite'), { recursive: true })
}

for (const tool of enabledTools(tools).filter(t => !only || t.id === only)) {
  const src = await sourceDir(tool, lock, { local, root })
  if (tool.build) {
    if (!local || !existsSync(join(src, 'node_modules'))) run('npm ci --no-audit --no-fund', src)
    run(tool.build, src)
  }
  const target = join(dist, tool.path)
  cpSync(join(src, tool.out), target, { recursive: true })
  if (pillBuilt) {
    const index = join(target, 'index.html')
    writeFileSync(index, injectPill(readFileSync(index, 'utf8'), pillSrcFor(tool.path)))
  }
  console.log(`built ${tool.id} -> dist${tool.path}`)
}

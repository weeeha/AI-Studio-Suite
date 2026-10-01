import { spawn, execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { loadRegistry, enabledTools, fillCommand } from './lib/registry.mjs'
import { proxyTable } from './lib/proxy.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const { tools } = await loadRegistry(root)
const enabled = enabledTools(tools)
const env = { ...process.env, ELECTRON_SKIP_BINARY_DOWNLOAD: '1', PATH: `${join(root, 'node_modules/.bin')}:${process.env.PATH}` }
const children = []

for (const t of enabled) {
  const cwd = join(root, 'forks', t.fork)
  if (existsSync(join(cwd, 'package.json')) && !existsSync(join(cwd, 'node_modules'))) {
    execSync('npm ci --no-audit --no-fund', { cwd, env, stdio: 'inherit' })
  }
  const child = spawn(fillCommand(t.dev, { port: t.devPort, path: t.path }), { cwd, env, shell: true })
  const tag = `[${t.id}] `
  child.stdout.on('data', d => process.stdout.write(tag + d))
  child.stderr.on('data', d => process.stderr.write(tag + d))
  children.push(child)
}

const server = await createServer({
  root: join(root, 'apps/home'),
  configFile: join(root, 'apps/home/vite.config.ts'),
  server: { port: 5170, strictPort: true, proxy: proxyTable(enabled) },
})
await server.listen()
console.log('suite on http://localhost:5170  ' + enabled.map(t => t.path).join('  '))

const stop = () => { children.forEach(c => c.kill()); server.close().then(() => process.exit(0)) }
process.on('SIGINT', stop)
process.on('SIGTERM', stop)

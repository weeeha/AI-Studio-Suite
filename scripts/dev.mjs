import { spawn, execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { loadRegistry, enabledTools, fillCommand } from './lib/registry.mjs'
import { proxyTable } from './lib/proxy.mjs'
import { generateText } from 'ai'
import { handle } from '../api/_lib/brain.js'
import { toWebRequest, sendWebResponse } from './lib/node-web.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
// Child dev servers get the env as it was before .env.local, so AI_GATEWAY_API_KEY / VERCEL_OIDC_TOKEN stay in this process only.
const childEnvBase = { ...process.env }
if (existsSync(join(root, '.env.local'))) process.loadEnvFile(join(root, '.env.local'))
const { tools } = await loadRegistry(root)
const enabled = enabledTools(tools)
const env = { ...childEnvBase, ELECTRON_SKIP_BINARY_DOWNLOAD: '1', PATH: `${join(root, 'node_modules/.bin')}:${childEnvBase.PATH}` }
const children = []
let server
let stopping = false

// Each child leads its own process group (detached), so killing -pid takes the shell, npx and vite together.
const killGroup = (c, sig = 'SIGTERM') => {
  try { process.kill(-c.pid, sig) } catch { /* already gone */ }
}
const stop = async (code = 0) => {
  if (stopping) return
  stopping = true
  children.forEach(c => killGroup(c))
  try { await server?.close() } catch { /* ignore */ }
  process.exit(code)
}
process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))

try {
  for (const t of enabled) {
    const cwd = join(root, 'forks', t.fork)
    if (existsSync(join(cwd, 'package.json')) && !existsSync(join(cwd, 'node_modules'))) {
      execSync('npm ci --no-audit --no-fund', { cwd, env, stdio: 'inherit' })
    }
    const child = spawn(fillCommand(t.dev, { port: t.devPort, path: t.path }), { cwd, env, shell: true, detached: true })
    const tag = `[${t.id}] `
    child.stdout.on('data', d => process.stdout.write(tag + d))
    child.stderr.on('data', d => process.stderr.write(tag + d))
    child.on('error', e => console.error(tag + 'failed to start: ' + e.message))
    child.on('exit', (c, sig) => { if (!stopping) console.error(tag + `exited (${sig ?? c})`) })
    children.push(child)
  }

  server = await createServer({
    root: join(root, 'apps/home'),
    configFile: join(root, 'apps/home/vite.config.ts'),
    server: { port: 5170, strictPort: true, proxy: proxyTable(enabled) },
    plugins: [{
      name: 'suite-api-ai',
      configureServer(server) {
        server.middlewares.use('/api/ai', async (req, res) => {
          try {
            req.url = '/api/ai' + (req.url === '/' ? '' : req.url)
            // Real Host header so the route's host guard sees what a browser sent; cancel the model call when the client goes away.
            const ctrl = new AbortController()
            res.on('close', () => { if (!res.writableFinished) ctrl.abort() })
            const request = await toWebRequest(req, `http://${req.headers.host ?? 'localhost:5170'}`)
            const response = await handle(new Request(request, { signal: ctrl.signal }), { generate: generateText })
            await sendWebResponse(res, response)
          } catch (e) {
            console.error('ai route (dev)', e?.name)
            if (!res.headersSent) {
              res.statusCode = 500
              res.setHeader('content-type', 'application/json')
            }
            res.end(JSON.stringify({ ok: false, error: 'The AI request failed.' }))
          }
        })
      },
    }],
  })
  await server.listen()
  console.log('suite on http://localhost:5170  ' + enabled.map(t => t.path).join('  '))
} catch (e) {
  console.error(e)
  await stop(1)
}

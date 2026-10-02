import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { extname, resolve } from 'node:path'
import { resolveRequest } from './lib/serve-lib.mjs'

const [dir = 'dist', port = '4170'] = process.argv.slice(2)
const root = resolve(dir)
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webp': 'image/webp', '.mp4': 'video/mp4', '.txt': 'text/plain' }

createServer((req, res) => {
  const r = resolveRequest(root, req.url)
  if (r.kind === 'redirect') { res.writeHead(308, { location: r.location }); return res.end() }
  if (r.kind === 'missing') { res.writeHead(404); return res.end('not found') }
  res.writeHead(200, { 'content-type': types[extname(r.file)] ?? 'application/octet-stream' })
  createReadStream(r.file).pipe(res)
}).listen(Number(port), '127.0.0.1', () => console.log(`serving ${root} on http://127.0.0.1:${port}`))

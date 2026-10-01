import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { toWebRequest, sendWebResponse } from './node-web.mjs'

test('round-trips a node request into a web Request and a web Response back out', async () => {
  const server = createServer(async (req, res) => {
    const request = await toWebRequest(req, 'http://localhost:5170')
    const body = await request.json()
    await sendWebResponse(res, Response.json({ method: request.method, url: request.url, got: body }, { status: 201 }))
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const { port } = server.address()
  const res = await fetch(`http://127.0.0.1:${port}/api/ai`, { method: 'POST', body: JSON.stringify({ a: 1 }), headers: { 'content-type': 'application/json' } })
  assert.equal(res.status, 201)
  assert.deepEqual(await res.json(), { method: 'POST', url: 'http://localhost:5170/api/ai', got: { a: 1 } })
  server.close()
})

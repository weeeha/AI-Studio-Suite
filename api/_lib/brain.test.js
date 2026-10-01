import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MODELS, MAX_OUTPUT, LIMITS, allowedHost, validate, toMessages, handle } from './brain.js'

const body = (over = {}) => ({ tool: 'slate', task: 'compile', system: 'sys', prompt: 'hello', tier: 'standard', ...over })
const post = (b, host = 'ai-studio-suite-x.vercel.app') =>
  new Request(`https://${host}/api/ai`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })

test('tiers map to the approved gateway models and caps', () => {
  assert.deepEqual(MODELS, { fast: 'anthropic/claude-haiku-4.5', standard: 'anthropic/claude-sonnet-5.5', top: 'anthropic/claude-opus-5.5' })
  assert.deepEqual(MAX_OUTPUT, { fast: 1024, standard: 2048, top: 4096 })
})

test('only vercel.app and local hosts are allowed', () => {
  assert.equal(allowedHost('ai-studio-suite-eta.vercel.app'), true)
  assert.equal(allowedHost('localhost'), true)
  assert.equal(allowedHost('127.0.0.1'), true)
  assert.equal(allowedHost('studio.example.com'), false)
  assert.equal(allowedHost('vercel.app.evil.com'), false)
})

test('validate accepts a well-formed request and rejects bad ones without echoing content', () => {
  assert.equal(validate(body()).ok, true)
  assert.match(validate(body({ tier: 'huge' })).error, /tier/)
  assert.match(validate(body({ prompt: 42 })).error, /prompt/)
  assert.match(validate(body({ prompt: 'x'.repeat(LIMITS.promptChars + 1) })).error, /too long/)
  const tooMany = Array.from({ length: LIMITS.images + 1 }, () => ({ data: 'AAAA', mediaType: 'image/png' }))
  assert.match(validate(body({ images: tooMany })).error, /images/)
  assert.match(validate(body({ images: [{ data: 'AAAA', mediaType: 'text/html' }] })).error, /image type/)
  assert.ok(!validate(body({ prompt: 'x'.repeat(LIMITS.promptChars + 1) })).error.includes('xxx'))
})

test('toMessages builds one user message with text then image parts', () => {
  const m = toMessages(body({ images: [{ data: 'QUJD', mediaType: 'image/jpeg' }] }))
  assert.deepEqual(m, [{ role: 'user', content: [{ type: 'text', text: 'hello' }, { type: 'image', image: 'QUJD', mediaType: 'image/jpeg' }] }])
})

test('GET reports the provider and models', async () => {
  const res = await handle(new Request('https://ai-studio-suite-x.vercel.app/api/ai'), { generate: async () => ({ text: '' }) })
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { ok: true, provider: 'ai-gateway', models: MODELS })
})

test('POST calls generate with the tier model, cap, system, messages and tags', async () => {
  let seen
  const res = await handle(post(body({ tier: 'top' })), {
    generate: async (opts) => { seen = opts; return { text: 'done', usage: { outputTokens: 3 } } },
    now: (() => { let t = 1000; return () => (t += 5) })(),
  })
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { ok: true, text: 'done', usage: { outputTokens: 3 }, elapsedMs: 5 })
  assert.equal(seen.model, 'anthropic/claude-opus-5.5')
  assert.equal(seen.maxOutputTokens, 4096)
  assert.equal(seen.system, 'sys')
  assert.deepEqual(seen.providerOptions, { gateway: { tags: ['tool:slate', 'task:compile'] } })
})

test('POST from a disallowed host is refused before any model call', async () => {
  let called = false
  const res = await handle(post(body(), 'studio.example.com'), { generate: async () => { called = true; return { text: '' } } })
  assert.equal(res.status, 403)
  assert.equal(called, false)
})

test('invalid JSON and invalid fields return 400', async () => {
  const bad = new Request('https://x.vercel.app/api/ai', { method: 'POST', body: '{nope' })
  assert.equal((await handle(bad, { generate: async () => ({ text: '' }) })).status, 400)
  assert.equal((await handle(post(body({ tier: 'x' })), { generate: async () => ({ text: '' }) })).status, 400)
})

test('inherited object keys are not tiers', async () => {
  for (const tier of ['constructor', 'toString', '__proto__']) {
    let called = false
    const res = await handle(post(body({ tier })), { generate: async () => { called = true; return { text: '' } } })
    assert.equal(res.status, 400, tier)
    assert.equal((await res.json()).error, 'tier must be fast, standard or top.')
    assert.equal(called, false, tier)
  }
})

test('tool and task must be 1-40 characters of a-z, 0-9 or -', async () => {
  const cases = [
    ['tool', 'Slate Pro', 'tool must be 1-40 characters of a-z, 0-9 or -.'],
    ['task', 'x'.repeat(41), 'task must be 1-40 characters of a-z, 0-9 or -.'],
  ]
  for (const [field, value, message] of cases) {
    let called = false
    const res = await handle(post(body({ [field]: value })), { generate: async () => { called = true; return { text: '' } } })
    assert.equal(res.status, 400, field)
    assert.equal((await res.json()).error, message)
    assert.equal(called, false, field)
  }
  assert.equal(validate(body({ task: 'x'.repeat(40) })).ok, true)
})

test('gateway budget and rate errors become plain messages', async () => {
  const fail = (statusCode) => async () => { const e = new Error('upstream'); e.statusCode = statusCode; throw e }
  const r402 = await handle(post(body()), { generate: fail(402) })
  assert.equal(r402.status, 402)
  assert.deepEqual(await r402.json(), { ok: false, error: 'AI budget limit reached.' })
  const r429 = await handle(post(body()), { generate: fail(429) })
  assert.equal(r429.status, 429)
  assert.deepEqual(await r429.json(), { ok: false, error: 'Too many AI requests right now. Try again in a minute.' })
  const r500 = await handle(post(body()), { generate: fail(undefined) })
  assert.equal(r500.status, 502)
  assert.deepEqual(await r500.json(), { ok: false, error: 'The AI request failed.' })
})

test('other methods are 405', async () => {
  const res = await handle(new Request('https://x.vercel.app/api/ai', { method: 'DELETE' }), { generate: async () => ({ text: '' }) })
  assert.equal(res.status, 405)
})

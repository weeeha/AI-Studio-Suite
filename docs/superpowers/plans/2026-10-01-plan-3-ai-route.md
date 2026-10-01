# Plan 3: the AI route, and Slate's brain in the browser

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One protected `POST /api/ai` route on the suite, backed by Vercel AI Gateway. Slate's brain features work in the browser: compile, Break Down, director's note, alt takes, variants, and the brain test in project settings. Any later tool can reuse the same route.

**Architecture:**
- **Route:** a Vercel Function (`api/ai.js`, Web `fetch` handler) wraps a pure handler in `api/_lib/brain.js`. The handler checks the host, validates the request, maps the tier to a model, and calls AI SDK v6 `generateText` with a plain `anthropic/...` model string, which routes through AI Gateway. Auth is the project's Vercel OIDC token, so there are no keys.
- **Local dev:** the same handler runs inside `npm run dev`, via a Vite middleware.
- **Slate:** the browser adapter in the fork calls the route through a small `web/brain.ts`. Image paths go along inline. JSON replies are parsed with Slate's own `extractJson`, which moves to `src/shared`, with the desktop's single retry.

**Tech Stack:** AI SDK `ai@^6` (6.0.x), Vercel Functions (Node, Fluid Compute), Vercel AI Gateway (OIDC), `node:test`, Vitest (fork), Playwright (Chromium + WebKit).

**Spec:** `docs/superpowers/specs/2026-09-30-ai-studio-suite-design.md` section 7.4, amended below by decisions D1 and D2. Earlier plans: `docs/superpowers/plans/2026-09-30-plan-1-suite-infrastructure.md`, `docs/superpowers/plans/2026-10-01-plan-2-slate-web.md`.

## Decisions (approved by Nick 2026-10-01 as A1, B1)

- **D1: access.** The route sits behind the site's Vercel Authentication, which covers every `*.vercel.app` URL. On top of that, the handler refuses any host that isn't `*.vercel.app`, `localhost` or `127.0.0.1` (403), so adding a custom domain later can't expose it. No passphrase. Nick sets a monthly hard limit for AI Gateway spend in the Vercel dashboard (Task 6).
- **D2: models per tier.** These come from the gateway model list fetched on 2026-10-01:
  - `fast`: `anthropic/claude-haiku-4.5`
  - `standard`: `anthropic/claude-sonnet-5.5`
  - `top`: `anthropic/claude-opus-5.5`
- **D3: guardrails.**
  - **Output caps:** `fast` 1024 tokens, `standard` 2048, `top` 4096.
  - **Input limits:** prompt plus system up to 120,000 characters; at most 8 images, each at most 5,000,000 bytes after base64 decoding.
  - **Tags:** every call carries gateway tags `tool:<tool>` and `task:<task>`.
  - **Errors:** a 402 from the gateway becomes "AI budget limit reached." and a 429 becomes "Too many AI requests right now. Try again in a minute."
- **D4: JSON stays client-side.** The route returns text only. Callers that expect JSON parse it themselves; for Slate that's `extractJson` plus one retry, exactly as on desktop.

## Global Constraints

- Node `>=24`. The suite root `package.json` is `"type": "module"`, and the route and its tests are plain `.js` ESM. That needs no build step and runs on Node and Vercel alike.
- Suite branch `feat/ai-route`, created from `feat/slate-web` at the head where this plan is committed. Fork branch `web/ai-brain`, created from `web/browser-adapter` at `7b0b165`. Never push to `main`. Implementers never push; the controller pushes after Nick's yes.
- Commit email `1083934+weeeha@users.noreply.github.com`. The commit trailer names the model that actually wrote the commit.
- Node scripts and tests resolve paths with `fileURLToPath(new URL(..., import.meta.url))`, never `URL.pathname`.
- Fork installs use `ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci --no-audit --no-fund`. The suite gets exactly one new runtime dependency: `ai@^6`.
- Desktop Slate is unchanged. After every fork task, `npm run typecheck`, `npx vitest run`, `ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm run build` and `npm run build:web` all pass in `forks/slate`.
- No test may call the real AI Gateway. Unit tests inject a fake `generate`, and e2e tests stub `/api/ai` with Playwright routes. Only the controller makes real calls, in Task 6.
- Never log or return prompt text, images or tokens in error messages. Errors name the cause only.
- Keep every credit to Sam Wasserman. Fork changes go in `MODIFICATIONS.md`.
- Docs and PR prose have no em dashes. UI copy has no exclamation marks. Never filter console errors to make a test pass. Any server you start runs in the background and is killed before you report.

## File map

Suite (`feat/ai-route`):
```
api/_lib/brain.js           pure handler: host guard, validation, tier->model, messages, errors
api/_lib/brain.test.js      node:test with an injected fake generate()
api/ai.js                   Vercel Function: export default { fetch } -> handle(request, { generate: generateText })
scripts/lib/node-web.mjs    toWebRequest(req), sendWebResponse(res, response) for the dev middleware
scripts/lib/node-web.test.mjs
scripts/dev.mjs             mounts /api/ai on the :5170 gateway; loads .env.local when present
package.json                "ai": "^6.0.300"; test glob includes api/_lib/*.test.js
tests/e2e/slate.spec.ts     brain tests use stubbed /api/ai (online and offline)
```

Fork `forks/slate` (`web/ai-brain`):
```
src/shared/extractJson.ts            moved from src/main/brain.ts (main re-exports it)
src/renderer/src/web/brain.ts        webBrainStatus, webBrainRun, endpoint resolution
src/renderer/src/web/adapter.ts      brainStatus/brainRun/brainCancel/brainTest use web/brain.ts
tests/web-brain.test.ts
MODIFICATIONS.md                     one entry for the browser brain
```

---

### Task 1: The route's handler core (suite)

**Files:**
- Create: `api/_lib/brain.js`, `api/_lib/brain.test.js`
- Modify: `package.json` (test glob)

**Interfaces:**
- Produces (exports of `api/_lib/brain.js`):
  - `MODELS = { fast: 'anthropic/claude-haiku-4.5', standard: 'anthropic/claude-sonnet-5.5', top: 'anthropic/claude-opus-5.5' }`
  - `MAX_OUTPUT = { fast: 1024, standard: 2048, top: 4096 }`
  - `LIMITS = { promptChars: 120000, images: 8, imageBytes: 5000000 }`
  - `allowedHost(hostname: string): boolean`
  - `validate(body: unknown): { ok: true, req: AiRequest } | { ok: false, error: string }`
  - `toMessages(req: AiRequest): ModelMessage[]`
  - `handle(request: Request, deps: { generate: (opts) => Promise<{ text: string, usage?: object }>, now?: () => number }): Promise<Response>`
  - `AiRequest = { tool: string, task: string, system: string, prompt: string, tier: 'fast'|'standard'|'top', images?: Array<{ data: string, mediaType: string }> }`
- **Response contract:**
  - `GET` returns 200 `{ ok: true, provider: 'ai-gateway', models: MODELS }`.
  - `POST` returns 200 `{ ok: true, text, usage, elapsedMs }`, or a 4xx/5xx `{ ok: false, error }`.

- [ ] **Step 1: Branch.** `git checkout feat/ai-route` (the controller created it from `feat/slate-web` when committing this plan). Then add `"api/_lib/*.test.js"` to the root `test` script: `"test": "node --test \"scripts/lib/*.test.mjs\" \"api/_lib/*.test.js\""`.

- [ ] **Step 2: Write the failing tests** `api/_lib/brain.test.js`:

```js
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
```

- [ ] **Step 3: Run to verify failure**

Run: `npm test`
Expected: FAIL with `Cannot find module '.../api/_lib/brain.js'`.

- [ ] **Step 4: Implement** `api/_lib/brain.js`:

```js
// Pure request handler for POST/GET /api/ai. The Vercel Function (api/ai.js) and the
// local dev gateway (scripts/dev.mjs) both call handle() with the real generateText.

export const MODELS = { fast: 'anthropic/claude-haiku-4.5', standard: 'anthropic/claude-sonnet-5.5', top: 'anthropic/claude-opus-5.5' }
export const MAX_OUTPUT = { fast: 1024, standard: 2048, top: 4096 }
export const LIMITS = { promptChars: 120000, images: 8, imageBytes: 5000000 }

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
const json = (status, data) => Response.json(data, { status })

export function allowedHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.vercel.app')
}

export function validate(body) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Body must be a JSON object.' }
  const { tool, task, system, prompt, tier, images = [] } = body
  for (const [name, value] of Object.entries({ tool, task, system, prompt })) {
    if (typeof value !== 'string') return { ok: false, error: `${name} must be a string.` }
  }
  if (!(tier in MODELS)) return { ok: false, error: 'tier must be fast, standard or top.' }
  if (system.length + prompt.length > LIMITS.promptChars) return { ok: false, error: 'Prompt is too long.' }
  if (!Array.isArray(images) || images.length > LIMITS.images) return { ok: false, error: `At most ${LIMITS.images} images.` }
  for (const img of images) {
    if (!img || typeof img.data !== 'string' || !IMAGE_TYPES.has(img.mediaType)) return { ok: false, error: 'Unsupported image type.' }
    if (Math.floor((img.data.length * 3) / 4) > LIMITS.imageBytes) return { ok: false, error: 'An image is too large.' }
  }
  return { ok: true, req: { tool, task, system, prompt, tier, images } }
}

export function toMessages(req) {
  const parts = [{ type: 'text', text: req.prompt }]
  for (const img of req.images ?? []) parts.push({ type: 'image', image: img.data, mediaType: img.mediaType })
  return [{ role: 'user', content: parts }]
}

function upstreamError(e) {
  if (e?.statusCode === 402) return json(402, { ok: false, error: 'AI budget limit reached.' })
  if (e?.statusCode === 429) return json(429, { ok: false, error: 'Too many AI requests right now. Try again in a minute.' })
  return json(502, { ok: false, error: 'The AI request failed.' })
}

export async function handle(request, { generate, now = Date.now }) {
  const url = new URL(request.url)
  if (!allowedHost(url.hostname)) return json(403, { ok: false, error: 'This host may not use the AI route.' })
  if (request.method === 'GET') return json(200, { ok: true, provider: 'ai-gateway', models: MODELS })
  if (request.method !== 'POST') return json(405, { ok: false, error: 'Use GET or POST.' })

  let body
  try { body = await request.json() } catch { return json(400, { ok: false, error: 'Body must be valid JSON.' }) }
  const v = validate(body)
  if (!v.ok) return json(400, { ok: false, error: v.error })

  const started = now()
  try {
    const { text, usage } = await generate({
      model: MODELS[v.req.tier],
      system: v.req.system,
      messages: toMessages(v.req),
      maxOutputTokens: MAX_OUTPUT[v.req.tier],
      abortSignal: request.signal,
      providerOptions: { gateway: { tags: [`tool:${v.req.tool}`, `task:${v.req.task}`] } },
    })
    return json(200, { ok: true, text, usage, elapsedMs: now() - started })
  } catch (e) {
    return upstreamError(e)
  }
}
```

- [ ] **Step 5: Verify**

Run: `npm test`
Expected: all pass. The previous 29 plus 10 new.

- [ ] **Step 6: Commit**

```bash
git add api/_lib/brain.js api/_lib/brain.test.js package.json
git commit -m "feat(api): add the AI route handler core with host guard, limits and tier models"
```

---

### Task 2: The Vercel Function and the local dev route (suite)

**Files:**
- Create: `api/ai.js`, `scripts/lib/node-web.mjs`, `scripts/lib/node-web.test.mjs`
- Modify: `scripts/dev.mjs`, `package.json` (dependency `ai`), `.gitignore` (already has `.env*`; confirm)

**Interfaces:**
- Consumes: `handle` (Task 1).
- Produces:
  - `api/ai.js` default-exports `{ fetch(request) }`.
  - `toWebRequest(req: IncomingMessage, origin: string): Promise<Request>`
  - `sendWebResponse(res: ServerResponse, response: Response): Promise<void>`
  - `npm run dev` answers `/api/ai` on `http://localhost:5170`.

- [ ] **Step 1: Add the SDK**

Run: `npm install ai@^6.0.300 --no-audit --no-fund`
Expected: `package.json` `dependencies` has `"ai"`, and the lockfile is updated.

- [ ] **Step 2: Write the failing test** `scripts/lib/node-web.test.mjs`:

```js
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
```

- [ ] **Step 3: Run to verify failure**

Run: `npm test`
Expected: FAIL with `Cannot find module '.../scripts/lib/node-web.mjs'`.

- [ ] **Step 4: Implement**

`scripts/lib/node-web.mjs`:
```js
// Bridges Node's http request/response to web Request/Response for the dev gateway.

export async function toWebRequest(req, origin) {
  const chunks = []
  for await (const c of req) chunks.push(c)
  const body = chunks.length ? Buffer.concat(chunks) : undefined
  const headers = new Headers()
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
  return new Request(new URL(req.url, origin), { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body })
}

export async function sendWebResponse(res, response) {
  res.statusCode = response.status
  response.headers.forEach((v, k) => res.setHeader(k, v))
  res.end(Buffer.from(await response.arrayBuffer()))
}
```

`api/ai.js`:
```js
// Vercel Function for /api/ai. Auth to AI Gateway is the project's OIDC token on Vercel,
// or AI_GATEWAY_API_KEY / VERCEL_OIDC_TOKEN from .env.local when run locally.
import { generateText } from 'ai'
import { handle } from './_lib/brain.js'

export default {
  fetch(request) {
    return handle(request, { generate: generateText })
  },
}
```

In `scripts/dev.mjs`:
- Before starting servers, load env when present: `if (existsSync(join(root, '.env.local'))) process.loadEnvFile(join(root, '.env.local'))`.
- In the `createServer({...})` options, add a plugin that mounts the route. Keep all existing options:

```js
import { generateText } from 'ai'
import { handle } from '../api/_lib/brain.js'
import { toWebRequest, sendWebResponse } from './lib/node-web.mjs'
// ...
plugins: [{
  name: 'suite-api-ai',
  configureServer(server) {
    server.middlewares.use('/api/ai', async (req, res) => {
      req.url = '/api/ai' + (req.url === '/' ? '' : req.url)
      const response = await handle(await toWebRequest(req, 'http://localhost:5170'), { generate: generateText })
      await sendWebResponse(res, response)
    })
  },
}],
```

- [ ] **Step 5: Verify**

Run: `npm test`
Expected: all pass (the previous count plus 1).

Run `npm run dev` in the background, then:
```bash
curl -s http://localhost:5170/api/ai
curl -s -X POST -H 'content-type: application/json' -d '{"tool":"x","task":"y","system":"","prompt":"","tier":"bogus"}' http://localhost:5170/api/ai
```
Expected: the GET returns `{"ok":true,"provider":"ai-gateway",...}`; the POST returns 400 `tier must be fast, standard or top.`. Don't send a valid POST here, since that would be a real model call. Kill the dev server and check ports 5170-5173 are free.

- [ ] **Step 6: Commit**

```bash
git add api/ai.js scripts/lib/node-web.mjs scripts/lib/node-web.test.mjs scripts/dev.mjs package.json package-lock.json
git commit -m "feat(api): serve /api/ai on Vercel and in npm run dev"
```

---

### Task 3: Move `extractJson` to shared code (fork)

**Files:**
- Create: `forks/slate/src/shared/extractJson.ts`
- Modify: `forks/slate/src/main/brain.ts`
- Test: existing `forks/slate/tests/compile.test.ts` (unchanged) plus `forks/slate/tests/extractJson.test.ts`

**Interfaces:**
- Produces: `src/shared/extractJson.ts` exports `extractJson(text: string): unknown`. It's the same function `src/main/brain.ts` keeps exporting, as a re-export.

- [ ] **Step 1: Branch**

```bash
cd forks/slate && git checkout web/browser-adapter && git checkout -b web/ai-brain
```

- [ ] **Step 2: Write the failing test** `tests/extractJson.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import * as shared from '../src/shared/extractJson'
import * as main from '../src/main/brain'

describe('shared extractJson', () => {
  it('is the same function the desktop brain exports', () => {
    expect(main.extractJson).toBe(shared.extractJson)
  })
  it('pulls JSON out of fenced or chatty replies', () => {
    expect(shared.extractJson('Sure:\n```json\n{"a":[1,2]}\n```')).toEqual({ a: [1, 2] })
  })
})
```

- [ ] **Step 3: Run it.** `npx vitest run tests/extractJson.test.ts` should FAIL with an unresolved import.

- [ ] **Step 4: Move the code.**
  - Cut the whole `extractJson` function from `src/main/brain.ts` and paste it unchanged into `src/shared/extractJson.ts`, keeping `export`.
  - Add a header comment: `// JSON extraction for brain replies, shared by desktop and the browser build. Moved verbatim from src/main/brain.ts; see MODIFICATIONS.md.`
  - In `src/main/brain.ts`, add `import { extractJson } from '../shared/extractJson'` and `export { extractJson }`.
  - If the moved function calls private helpers, move those too, without exporting them.

- [ ] **Step 5: Verify**

Run: `npm run typecheck && npx vitest run && ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm run build`
Expected: clean, with `compile.test.ts` unchanged and passing, and the 2 new tests passing.

- [ ] **Step 6: Commit**

```bash
git add src/shared/extractJson.ts src/main/brain.ts tests/extractJson.test.ts
git commit -m "refactor(brain): move extractJson to src/shared so the browser can reuse it"
```

---

### Task 4: Slate's brain in the browser (fork)

**Files:**
- Create: `forks/slate/src/renderer/src/web/brain.ts`, `forks/slate/tests/web-brain.test.ts`
- Modify: `forks/slate/src/renderer/src/web/adapter.ts`, `forks/slate/MODIFICATIONS.md`

**Interfaces:**
- Consumes:
  - `extractJson` (Task 3)
  - from the existing `adapter.ts`: `DESKTOP_ONLY` and its internal `blobFor(path)`
  - `BrainRequest`, `BrainResult`, `BrainStatus` from shared types
- Produces, `web/brain.ts`:
  - `aiEndpoint(href: string): string` returns `new URL('../api/ai', href).href` for a page under a tool path, so `/slate/` resolves to `/api/ai`.
  - `JSON_RETRY_NOTE = 'IMPORTANT: Respond with ONLY the requested JSON. No prose, no code fences.'`
  - `webBrainStatus(deps: { fetch: typeof fetch; endpoint: string }): Promise<BrainStatus>`
  - `webBrainRun(req: BrainRequest, deps: { fetch: typeof fetch; endpoint: string; loadImage: (path: string) => Promise<{ data: string; mediaType: string } | null>; signal?: AbortSignal; now?: () => number }): Promise<BrainResult>`

- [ ] **Step 1: Write the failing test** `tests/web-brain.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { aiEndpoint, webBrainStatus, webBrainRun, JSON_RETRY_NOTE } from '../src/renderer/src/web/brain'
import { DESKTOP_ONLY } from '../src/renderer/src/web/adapter'
import type { BrainRequest } from '../src/shared/types'

const req = (over: Partial<BrainRequest> = {}): BrainRequest => ({ id: 'r1', task: 'compile', system: 'sys', prompt: 'p', tier: 'standard', ...over })
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('web brain', () => {
  it('resolves the suite route from a tool page', () => {
    expect(aiEndpoint('https://x.vercel.app/slate/')).toBe('https://x.vercel.app/api/ai')
    expect(aiEndpoint('http://localhost:5170/slate/index.html')).toBe('http://localhost:5170/api/ai')
  })

  it('reports the brain online when the route answers', async () => {
    const s = await webBrainStatus({ endpoint: 'e', fetch: async () => reply(200, { ok: true }) })
    expect(s.claude).toEqual({ available: true, version: 'AI Gateway' })
    expect(s.codex.available).toBe(false)
    expect(s.local.available).toBe(false)
  })

  it('reports the brain offline when the route is missing', async () => {
    const s = await webBrainStatus({ endpoint: 'e', fetch: async () => new Response('', { status: 404 }) })
    expect(s.claude.available).toBe(false)
  })

  it('posts tool, task, system, prompt, tier and loaded images', async () => {
    let sent: any
    const r = await webBrainRun(req({ images: ['slate-web:/media/a/f.jpg', 'missing'] }), {
      endpoint: 'e',
      fetch: async (_u, init) => { sent = JSON.parse(String(init!.body)); return reply(200, { ok: true, text: 'hi' }) },
      loadImage: async (p) => (p === 'missing' ? null : { data: 'QUJD', mediaType: 'image/jpeg' }),
      now: (() => { let t = 0; return () => (t += 7) })(),
    })
    expect(sent).toEqual({ tool: 'slate', task: 'compile', system: 'sys', prompt: 'p', tier: 'standard', images: [{ data: 'QUJD', mediaType: 'image/jpeg' }] })
    expect(r).toEqual({ id: 'r1', ok: true, text: 'hi', json: undefined, elapsedMs: 7 })
  })

  it('parses JSON and retries once with the JSON note when parsing fails', async () => {
    const prompts: string[] = []
    const texts = ['not json at all', '```json\n{"v":[1]}\n```']
    const r = await webBrainRun(req({ expectJson: true }), {
      endpoint: 'e',
      fetch: async (_u, init) => { prompts.push(JSON.parse(String(init!.body)).prompt); return reply(200, { ok: true, text: texts.shift() }) },
      loadImage: async () => null,
    })
    expect(prompts).toEqual(['p', `p\n\n${JSON_RETRY_NOTE}`])
    expect(r.ok).toBe(true)
    expect(r.json).toEqual({ v: [1] })
  })

  it('answers with the Desktop app message when the route is absent', async () => {
    const r = await webBrainRun(req(), { endpoint: 'e', fetch: async () => new Response('', { status: 404 }), loadImage: async () => null })
    expect(r).toMatchObject({ id: 'r1', ok: false, error: DESKTOP_ONLY })
  })

  it('passes route errors through as the result error', async () => {
    const r = await webBrainRun(req(), { endpoint: 'e', fetch: async () => reply(402, { ok: false, error: 'AI budget limit reached.' }), loadImage: async () => null })
    expect(r).toMatchObject({ ok: false, error: 'AI budget limit reached.' })
  })
})
```

- [ ] **Step 2: Run to verify failure.** `npx vitest run tests/web-brain.test.ts` fails with an unresolved import.

- [ ] **Step 3: Implement** `src/renderer/src/web/brain.ts`:

```ts
// Browser brain for the AI Studio Suite: Slate's BrainRequest -> POST /api/ai (Vercel AI
// Gateway). Same JSON handling as the desktop brain: extractJson plus one retry.

import type { BrainRequest, BrainResult, BrainStatus } from '../../../shared/types'
import { extractJson } from '../../../shared/extractJson'
import { DESKTOP_ONLY } from './adapter'

export const JSON_RETRY_NOTE = 'IMPORTANT: Respond with ONLY the requested JSON. No prose, no code fences.'

type Fetch = typeof fetch
type Image = { data: string; mediaType: string }

export function aiEndpoint(href: string): string {
  return new URL('../api/ai', href).href
}

const offline: BrainStatus = {
  claude: { available: false, version: null },
  codex: { available: false, version: null },
  local: { available: false, version: null, endpoint: null },
}

export async function webBrainStatus({ fetch, endpoint }: { fetch: Fetch; endpoint: string }): Promise<BrainStatus> {
  try {
    const res = await fetch(endpoint, { method: 'GET' })
    if (!res.ok) return offline
    return { ...offline, claude: { available: true, version: 'AI Gateway' } }
  } catch {
    return offline
  }
}

export async function webBrainRun(
  req: BrainRequest,
  deps: { fetch: Fetch; endpoint: string; loadImage: (path: string) => Promise<Image | null>; signal?: AbortSignal; now?: () => number },
): Promise<BrainResult> {
  const now = deps.now ?? Date.now
  const started = now()
  const images = (await Promise.all((req.images ?? []).map(deps.loadImage))).filter((x): x is Image => x !== null)
  const call = async (prompt: string): Promise<{ ok: true; text: string } | { ok: false; error: string }> => {
    const res = await deps.fetch(deps.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tool: 'slate', task: req.task, system: req.system, prompt, tier: req.tier, images }),
      signal: deps.signal,
    })
    if (res.status === 404) return { ok: false, error: DESKTOP_ONLY }
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; text?: string; error?: string }
    if (!res.ok || !body.ok) return { ok: false, error: body.error ?? 'The AI request failed.' }
    return { ok: true, text: body.text ?? '' }
  }
  try {
    let out = await call(req.prompt)
    if (!out.ok) return { id: req.id, ok: false, text: '', error: out.error, elapsedMs: now() - started }
    let json: unknown
    if (req.expectJson) {
      try {
        json = extractJson(out.text)
      } catch {
        out = await call(`${req.prompt}\n\n${JSON_RETRY_NOTE}`)
        if (!out.ok) return { id: req.id, ok: false, text: '', error: out.error, elapsedMs: now() - started }
        json = extractJson(out.text)
      }
    }
    return { id: req.id, ok: true, text: out.text, json, elapsedMs: now() - started }
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === 'AbortError'
    return { id: req.id, ok: false, text: '', error: aborted ? 'Cancelled.' : 'The AI request failed.', elapsedMs: now() - started }
  }
}
```

If importing `DESKTOP_ONLY` from `./adapter` creates a circular import once `adapter.ts` imports `./brain`, move `DESKTOP_ONLY` into a new `src/renderer/src/web/messages.ts`. Import it from there in both files, and keep `adapter.ts` re-exporting it so existing tests still pass.

- [ ] **Step 4: Wire the adapter.** In `src/renderer/src/web/adapter.ts`, inside `createWebApi`, add:

```ts
const endpoint = typeof location === 'undefined' ? 'http://localhost/api/ai' : aiEndpoint(location.href)
const running = new Map<string, AbortController>()
const loadImage = async (path: string): Promise<{ data: string; mediaType: string } | null> => {
  const blob = await blobFor(path)
  if (!blob || !blob.type.startsWith('image/')) return null
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return { data: btoa(bin), mediaType: blob.type }
}
```

Then replace the brain members:
- `brainStatus` returns `webBrainStatus({ fetch: (u, i) => fetch(u, i), endpoint })`.
- `brainRun(req)` creates an `AbortController`, stores it in `running` under `req.id`, and returns `webBrainRun(req, { fetch: (u, i) => fetch(u, i), endpoint, loadImage, signal: ctrl.signal })`. Delete the entry from `running` when it finishes.
- `brainCancel(id)` calls `running.get(id)?.abort()`.
- `brainTest()` runs `webBrainRun({ id: 'test', task: 'brain-test', system: 'Reply with the single word OK.', prompt: 'Say OK.', tier: 'fast' }, …)` with the same deps.

`localModels` is unchanged. Update `tests/web-adapter.test.ts` only where an assertion depended on the old stubs. In Node, `fetch` to `http://localhost/api/ai` fails, so the status is offline and the existing Desktop-app expectations still hold. Keep them.

- [ ] **Step 5: Record it.** Append to `MODIFICATIONS.md`:

```markdown
## 2026-10-01: browser brain via the suite's AI route
- Moved `extractJson` from `src/main/brain.ts` to `src/shared/extractJson.ts` unchanged; the desktop brain imports it.
- Added `src/renderer/src/web/brain.ts`: in the browser, brain requests go to the AI Studio Suite route `/api/ai` (Vercel AI Gateway). When the route is absent, brain features keep answering with the Desktop app message.
```

- [ ] **Step 6: Verify**

Run: `npm run typecheck && npx vitest run && ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm run build && npm run build:web`
Expected: all pass, with the 7 new `web-brain` tests included.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/src/web/brain.ts src/renderer/src/web/adapter.ts tests/web-brain.test.ts MODIFICATIONS.md
git add src/renderer/src/web/messages.ts 2>/dev/null || true
git commit -m "feat(web): run Slate's brain through the suite AI route in the browser"
```

---

### Task 5: Browser tests for the brain, with the route stubbed (suite)

**Files:**
- Modify: `tests/e2e/slate.spec.ts`, `suite.lock.json` (slate sha = `git -C forks/slate rev-parse web/ai-brain`)

**Interfaces:**
- Consumes: Tasks 1, 2 and 4; Plan 2's e2e helpers and fixtures.
- Produces:
  - Brain tests that run the same everywhere: local `serve` has no `/api/ai`, while the preview has the real one. Both are overridden by `page.route`.

- [ ] **Step 1: Pin the fork locally.** Set `suite.lock.json` `slate.sha` to the `web/ai-brain` head. `npm run pin` refuses until the branch is pushed; local builds use `forks/` anyway.

- [ ] **Step 2: Rewrite the brain tests** in `tests/e2e/slate.spec.ts`. Replace the two existing "Desktop app message" tests, which now pass or fail depending on whether a real route exists, with three stubbed tests. In each, call `await page.route('**/api/ai', handler)` before `page.goto`.
  1. **Offline:** the handler fulfills status 404. Expect the brain pill to show its offline state, and the Break Down action to show the exact text `Desktop app: this runs in the Slate desktop app for now.`. These are the same assertions the current tests use.
  2. **Online status:** GET is fulfilled with 200 `{ ok: true, provider: 'ai-gateway', models: {} }`. Expect the brain pill to stop saying "Brain offline". Read the status label from `App.tsx`/`Home.tsx` and assert on the online text it renders.
  3. **Break Down with the route answering:**
     - GET returns 200; POST returns 200 `{ ok: true, text: '{"lensing":"35mm","lighting":"soft key","palette":"teal","composition":"thirds","movement":"static","texture":"grain","mood":"calm","notes":""}', elapsedMs: 5 }`.
     - Import `tests/fixtures/still.png` as a reference, then click **Break Down** on it.
     - Expect the panel to render at least one value from that JSON, such as `35mm`. Also assert the captured POST body has `tool: 'slate'`, a non-empty `system`, `tier` among `fast`/`standard`/`top`, and exactly 1 image with `mediaType: 'image/png'`.

  Break Down expects the shape of `ElementSheet` from `src/shared/types.ts`; the stub above matches it. If the panel shows elements differently, assert what it actually renders and explain in the report.

- [ ] **Step 3: Run**

Run: `npm run build:local && npm run test:e2e`
Expected: everything passes in Chromium and WebKit. The previous 28, minus the 4 replaced runs, plus 6 new runs, is 30.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/slate.spec.ts suite.lock.json
git commit -m "test(e2e): cover Slate's brain online and offline with a stubbed AI route"
```

---

### Task 6: Ship and live check (controller, after Nick's yes)

Implementers don't run this task.

- [ ] **Step 1: Nick, in the Vercel dashboard.** In team `nick-vyhouskis-projects`, open AI Gateway, check it's enabled, and set a monthly hard spending limit. Claude can't change account or billing settings.
- [ ] **Step 2:** Preflight the authors in both repos. Push `web/ai-brain` in the fork and open its PR, base `web/browser-adapter`, stacked on weeeha/slate#1.
- [ ] **Step 3:** `npm run pin` should show only slate changing to the `web/ai-brain` head. Commit, push `feat/ai-route`, and open the suite PR, base `feat/slate-web`, stacked on #2.
- [ ] **Step 4:** On the new preview, with the bypass header held only in the shell:
  - Run `npm run test:e2e` twice.
  - Make one live call: `curl` POST to `<preview>/api/ai` with `{"tool":"suite","task":"smoke","system":"Reply with OK.","prompt":"Say OK.","tier":"fast"}`. Expect 200 with `ok: true` and non-empty `text`.
  - Check the AI Gateway dashboard shows the call tagged `tool:suite` and `task:smoke`.
- [ ] **Step 5:** Send Nick the preview link to try Break Down and compile in Safari.

## Acceptance (Plan 3)

- [ ] Suite: `npm test` (+11), pill 14, home 4, and `npm run test:e2e` (30) pass locally and against the preview in Chromium and WebKit. No test calls the real gateway.
- [ ] Fork: typecheck, Vitest (+9), the desktop build and `build:web` pass. Desktop brain behaviour is unchanged.
- [ ] `GET /api/ai` on the preview returns 200 for a logged-in browser. A request whose host isn't allowed gets 403. A real `fast` POST returns text and shows up tagged in the AI Gateway dashboard.
- [ ] In Slate on the preview: the brain shows online, and Break Down on a reference fills the element sheet. When the route is unavailable, brain actions say "Desktop app: …".
- [ ] Nick has set the AI Gateway hard limit and tried it in Safari.

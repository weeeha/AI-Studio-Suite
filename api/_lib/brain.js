// Pure request handler for POST/GET /api/ai. The Vercel Function (api/ai.js) and the
// local dev gateway (scripts/dev.mjs) both call handle() with the real generateText.

export const MODELS = { fast: 'anthropic/claude-haiku-4.5', standard: 'anthropic/claude-sonnet-5.5', top: 'anthropic/claude-opus-5.5' }
export const MAX_OUTPUT = { fast: 1024, standard: 2048, top: 4096 }
export const LIMITS = { promptChars: 120000, images: 8, imageBytes: 5000000 }

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/
const TAG = /^[a-z0-9-]{1,40}$/
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
  for (const name of ['tool', 'task']) {
    if (!TAG.test(body[name])) return { ok: false, error: `${name} must be 1-40 characters of a-z, 0-9 or -.` }
  }
  if (typeof tier !== 'string' || !Object.hasOwn(MODELS, tier)) return { ok: false, error: 'tier must be fast, standard or top.' }
  if (prompt.trim() === '') return { ok: false, error: 'prompt must not be empty.' }
  if (system.length + prompt.length > LIMITS.promptChars) return { ok: false, error: 'Prompt is too long.' }
  if (!Array.isArray(images) || images.length > LIMITS.images) return { ok: false, error: `At most ${LIMITS.images} images.` }
  for (const img of images) {
    if (!img || typeof img.data !== 'string' || !IMAGE_TYPES.has(img.mediaType)) return { ok: false, error: 'Unsupported image type.' }
    // Plain base64 only: the SDK treats an https: or data: string as a URL and downloads it, which would skip the size cap.
    if (img.data.length % 4 !== 0 || !BASE64.test(img.data)) return { ok: false, error: 'Image data must be base64.' }
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
  // generateText wraps retried failures in a RetryError whose lastError carries the status.
  const status = e?.statusCode ?? e?.lastError?.statusCode
  console.error('ai route', e?.name, status)
  if (status === 402) return json(402, { ok: false, error: 'AI budget limit reached.' })
  if (status === 429) return json(429, { ok: false, error: 'Too many AI requests right now. Try again in a minute.' })
  return json(502, { ok: false, error: 'The AI request failed.' })
}

export async function handle(request, { generate, now = Date.now }) {
  const url = new URL(request.url)
  if (!allowedHost(url.hostname)) return json(403, { ok: false, error: 'This host may not use the AI route.' })
  if (request.method === 'GET') return json(200, { ok: true, provider: 'ai-gateway', models: MODELS })
  if (request.method !== 'POST') return json(405, { ok: false, error: 'Use GET or POST.' })

  // Requiring JSON makes a cross-origin browser call send a CORS preflight first.
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return json(415, { ok: false, error: 'Content-Type must be application/json.' })
  }
  let body
  try { body = await request.json() } catch { return json(400, { ok: false, error: 'Body must be valid JSON.' }) }
  const v = validate(body)
  if (!v.ok) return json(400, { ok: false, error: v.error })

  const started = now()
  try {
    const { text, usage, finishReason } = await generate({
      model: MODELS[v.req.tier],
      system: v.req.system,
      messages: toMessages(v.req),
      maxOutputTokens: MAX_OUTPUT[v.req.tier],
      maxRetries: 0, // the SDK default of 2 retries hides 429s behind a RetryError and triples gateway attempts
      abortSignal: request.signal,
      providerOptions: { gateway: { tags: [`tool:${v.req.tool}`, `task:${v.req.task}`] } },
    })
    return json(200, { ok: true, text, usage, finishReason, elapsedMs: now() - started })
  } catch (e) {
    return upstreamError(e)
  }
}

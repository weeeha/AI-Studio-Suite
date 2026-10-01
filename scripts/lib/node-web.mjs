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

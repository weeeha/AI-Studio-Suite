// Vercel Function for /api/ai. Auth to AI Gateway is the project's OIDC token on Vercel,
// or AI_GATEWAY_API_KEY / VERCEL_OIDC_TOKEN from .env.local when run locally.
import { generateText } from 'ai'
import { handle } from './_lib/brain.js'

export default {
  fetch(request) {
    return handle(request, { generate: generateText })
  },
}

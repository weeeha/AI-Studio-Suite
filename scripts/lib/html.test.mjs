import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pillSrcFor, injectPill } from './html.mjs'

test('pillSrcFor walks up one level per path segment', () => {
  assert.equal(pillSrcFor('/cork/'), '../_suite/pill.js')
})

test('injectPill adds one module script before </body>', () => {
  const out = injectPill('<html><body><div id="app"></div></body></html>', '../_suite/pill.js')
  assert.equal(out, '<html><body><div id="app"></div><script type="module" src="../_suite/pill.js" data-suite-pill></script></body></html>')
})

test('injectPill appends when there is no </body>', () => {
  assert.equal(injectPill('<div></div>', 'p.js'), '<div></div><script type="module" src="p.js" data-suite-pill></script>')
})

test('injectPill is idempotent', () => {
  const once = injectPill('<body></body>', 'p.js')
  assert.equal(injectPill(once, 'p.js'), once)
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { loadRegistry, validateRegistry, enabledTools, fillCommand } from './registry.mjs'

const tool = (over = {}) => ({
  id: 'cork', name: 'Cork Board', blurb: 'b', path: '/cork/', repo: 'weeeha/cork-board',
  fork: 'cork-board', enabled: true, theme: 'dark', build: 'npm run build', out: 'dist', devPort: 5171,
  dev: 'npm run dev -- --port {port} --base {path}', ...over,
})
const lockFor = (tools) => Object.fromEntries(tools.map(t => [t.id, { repo: t.repo, sha: 'a'.repeat(40) }]))

test('the committed registry is valid', async () => {
  const { tools, lock } = await loadRegistry(fileURLToPath(new URL('../..', import.meta.url)))
  assert.deepEqual(validateRegistry(tools, lock), [])
  assert.deepEqual(tools.map(t => t.id), ['cork', 'script', 'slate', 'storyboard', 'motion', 'blockout'])
})

test('rejects duplicate ids, paths and ports', () => {
  const tools = [tool(), tool()]
  const errors = validateRegistry(tools, lockFor(tools))
  assert.ok(errors.some(e => e.includes('duplicate id cork')))
  assert.ok(errors.some(e => e.includes('duplicate path /cork/')))
  assert.ok(errors.some(e => e.includes('duplicate devPort 5171')))
})

test('paths must start and end with a slash and have one segment', () => {
  for (const path of ['cork/', '/cork', '/a/b/']) {
    const tools = [tool({ path })]
    assert.ok(validateRegistry(tools, lockFor(tools)).some(e => e.includes(`bad path ${path}`)), path)
  }
})

test('every tool needs a lock entry with a 40-hex sha and the same repo', () => {
  const tools = [tool()]
  assert.ok(validateRegistry(tools, {}).some(e => e.includes('no lock entry for cork')))
  assert.ok(validateRegistry(tools, { cork: { repo: 'weeeha/cork-board', sha: 'abc' } }).some(e => e.includes('bad sha for cork')))
  assert.ok(validateRegistry(tools, { cork: { repo: 'other/repo', sha: 'a'.repeat(40) } }).some(e => e.includes('repo mismatch for cork')))
})

test('theme must be light or dark', () => {
  const tools = [tool({ theme: 'sepia' })]
  assert.ok(validateRegistry(tools, lockFor(tools)).some(e => e.includes('bad theme for cork')))
})

test('enabledTools keeps order and drops disabled tools', () => {
  const tools = [tool(), tool({ id: 'slate', enabled: false }), tool({ id: 'script' })]
  assert.deepEqual(enabledTools(tools).map(t => t.id), ['cork', 'script'])
})

test('fillCommand substitutes port and path', () => {
  assert.equal(fillCommand('vite --port {port} --base {path}', { port: 5171, path: '/cork/' }), 'vite --port 5171 --base /cork/')
})

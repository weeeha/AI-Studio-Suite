import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { loadRegistry, validateRegistry, enabledTools, fillCommand } from './registry.mjs'

const tool = (over = {}) => ({
  id: 'cork', name: 'Cork Board', blurb: 'b', path: '/cork/', repo: 'weeeha/cork-board',
  fork: 'cork-board', enabled: true, theme: 'dark', pillCorner: 'bottom-left', build: 'npm run build', out: 'dist', devPort: 5171,
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

test('pillCorner must be bottom-left or bottom-right', () => {
  for (const pillCorner of ['top-left', undefined]) {
    const tools = [tool({ pillCorner })]
    assert.ok(validateRegistry(tools, lockFor(tools)).some(e => e.includes('bad pillCorner for cork')), String(pillCorner))
  }
  const ok = [tool({ pillCorner: 'bottom-right' })]
  assert.deepEqual(validateRegistry(ok, lockFor(ok)), [])
})

test('pillBottom is optional and must be an integer from 16 to 200', () => {
  for (const pillBottom of [8, 12.5, 400, '40']) {
    const tools = [tool({ pillBottom })]
    assert.ok(validateRegistry(tools, lockFor(tools)).some(e => e.includes('bad pillBottom for cork')), String(pillBottom))
  }
  const ok = [tool({ pillBottom: 48 })]
  assert.deepEqual(validateRegistry(ok, lockFor(ok)), [])
})

test('enabledTools keeps order and drops disabled tools', () => {
  const tools = [tool(), tool({ id: 'slate', enabled: false }), tool({ id: 'script' })]
  assert.deepEqual(enabledTools(tools).map(t => t.id), ['cork', 'script'])
})

test('fillCommand substitutes port and path', () => {
  assert.equal(fillCommand('vite --port {port} --base {path}', { port: 5171, path: '/cork/' }), 'vite --port 5171 --base /cork/')
})

test('every committed dev command binds 127.0.0.1', async () => {
  const { tools } = await loadRegistry(fileURLToPath(new URL('../..', import.meta.url)))
  for (const t of tools) assert.ok(t.dev.includes('127.0.0.1'), `${t.id} dev command lacks 127.0.0.1`)
})

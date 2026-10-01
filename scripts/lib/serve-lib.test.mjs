import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { resolveRequest } from './serve-lib.mjs'

const root = mkdtempSync(join(tmpdir(), 'suite-serve-'))
mkdirSync(join(root, 'cork', 'assets'), { recursive: true })
writeFileSync(join(root, 'index.html'), 'home')
writeFileSync(join(root, 'cork', 'index.html'), 'cork')
writeFileSync(join(root, 'cork', 'assets', 'a.js'), 'x')

test('serves index.html for the root and for directories with a slash', () => {
  assert.deepEqual(resolveRequest(root, '/'), { kind: 'file', file: join(root, 'index.html') })
  assert.deepEqual(resolveRequest(root, '/cork/'), { kind: 'file', file: join(root, 'cork', 'index.html') })
})

test('redirects a directory without its trailing slash', () => {
  assert.deepEqual(resolveRequest(root, '/cork'), { kind: 'redirect', location: '/cork/' })
})

test('serves files and reports missing ones', () => {
  assert.deepEqual(resolveRequest(root, '/cork/assets/a.js'), { kind: 'file', file: join(root, 'cork', 'assets', 'a.js') })
  assert.deepEqual(resolveRequest(root, '/nope.js'), { kind: 'missing' })
})

test('refuses to leave the root', () => {
  assert.deepEqual(resolveRequest(root, '/../etc/passwd'), { kind: 'missing' })
})

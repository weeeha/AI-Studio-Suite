import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { copyLicenses } from './licenses.mjs'

function setup(files) {
  const root = mkdtempSync(join(tmpdir(), 'lic-'))
  const src = join(root, 'src')
  const target = join(root, 'dist', 'tool')
  mkdirSync(src, { recursive: true })
  mkdirSync(target, { recursive: true })
  for (const [n, c] of Object.entries(files)) writeFileSync(join(src, n), c)
  return { src, target }
}

test('copies LICENSE and NOTICE from the fork root', () => {
  const { src, target } = setup({ LICENSE: 'apache', NOTICE: 'notice' })
  assert.deepEqual(copyLicenses(src, target), ['LICENSE.txt', 'NOTICE.txt'])
  assert.equal(readFileSync(join(target, 'LICENSE.txt'), 'utf8'), 'apache')
  assert.equal(readFileSync(join(target, 'NOTICE.txt'), 'utf8'), 'notice')
})

test('skips files the fork does not have', () => {
  const { src, target } = setup({ LICENSE: 'apache' })
  assert.deepEqual(copyLicenses(src, target), ['LICENSE.txt'])
  assert.equal(existsSync(join(target, 'NOTICE.txt')), false)
})

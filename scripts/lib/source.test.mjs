import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tarballUrl, sourceDir } from './source.mjs'

test('tarballUrl points at codeload for the pinned commit', () => {
  assert.equal(tarballUrl('weeeha/cork-board', 'abc'), 'https://codeload.github.com/weeeha/cork-board/tar.gz/abc')
})

test('local mode uses the forks/ clone', async () => {
  const dir = await sourceDir({ id: 'cork', fork: 'cork-board' }, {}, { local: true, root: '/suite' })
  assert.equal(dir, '/suite/forks/cork-board')
})

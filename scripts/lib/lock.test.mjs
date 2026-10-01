import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { forkHead, isPushed } from './git.mjs'
import { nextLock } from './lock.mjs'

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()

function repoWithCommit() {
  const dir = mkdtempSync(join(tmpdir(), 'suite-pin-'))
  git(dir, 'init', '-q', '-b', 'main')
  git(dir, 'config', 'user.email', 'test@example.com')
  git(dir, 'config', 'user.name', 'Test')
  writeFileSync(join(dir, 'a.txt'), 'a')
  git(dir, 'add', '.')
  git(dir, 'commit', '-qm', 'first')
  return dir
}

test('forkHead returns the HEAD sha and branch', () => {
  const dir = repoWithCommit()
  const head = forkHead(dir)
  assert.equal(head.sha, git(dir, 'rev-parse', 'HEAD'))
  assert.equal(head.branch, 'main')
})

test('isPushed is false until a remote branch contains the commit', () => {
  const dir = repoWithCommit()
  const sha = git(dir, 'rev-parse', 'HEAD')
  assert.equal(isPushed(dir, sha), false)
  const remote = mkdtempSync(join(tmpdir(), 'suite-remote-'))
  git(remote, 'init', '-q', '--bare')
  git(dir, 'remote', 'add', 'origin', remote)
  git(dir, 'push', '-q', 'origin', 'main')
  git(dir, 'fetch', '-q', 'origin')
  assert.equal(isPushed(dir, sha), true)
})

test('nextLock updates shas and reports changes', () => {
  const tools = [{ id: 'cork', repo: 'weeeha/cork-board' }, { id: 'script', repo: 'weeeha/scriptbreak' }]
  const prev = { cork: { repo: 'weeeha/cork-board', sha: 'a'.repeat(40) }, script: { repo: 'weeeha/scriptbreak', sha: 'b'.repeat(40) } }
  const { lock, changes } = nextLock(tools, { cork: { sha: 'c'.repeat(40) }, script: { sha: 'b'.repeat(40) } }, prev)
  assert.equal(lock.cork.sha, 'c'.repeat(40))
  assert.equal(lock.script.sha, 'b'.repeat(40))
  assert.deepEqual(changes, ['cork aaaaaaa -> ccccccc'])
})

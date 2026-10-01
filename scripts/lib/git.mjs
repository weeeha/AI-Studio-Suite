import { execFileSync } from 'node:child_process'

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()

export function forkHead(dir) {
  return { sha: git(dir, 'rev-parse', 'HEAD'), branch: git(dir, 'branch', '--show-current') }
}

export function isPushed(dir, sha) {
  return git(dir, 'branch', '-r', '--contains', sha).length > 0
}

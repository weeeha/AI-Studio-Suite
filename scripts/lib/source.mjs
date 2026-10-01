import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

export function tarballUrl(repo, sha) {
  return `https://codeload.github.com/${repo}/tar.gz/${sha}`
}

export async function sourceDir(tool, lock, { local, root }) {
  if (local) return join(root, 'forks', tool.fork)
  const { repo, sha } = lock[tool.id]
  const dir = join(root, '.build', 'src', tool.id)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  const res = await fetch(tarballUrl(repo, sha))
  if (!res.ok) throw new Error(`${tool.id}: download failed ${res.status} for ${repo}@${sha}`)
  const tar = spawnSync('tar', ['-xzf', '-', '--strip-components=1', '-C', dir], { input: Buffer.from(await res.arrayBuffer()) })
  if (tar.status !== 0) throw new Error(`${tool.id}: tar failed: ${tar.stderr}`)
  return dir
}

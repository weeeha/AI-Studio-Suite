export function nextLock(tools, heads, prev) {
  const lock = {}
  const changes = []
  for (const t of tools) {
    const sha = heads[t.id]?.sha ?? prev[t.id]?.sha
    lock[t.id] = { repo: t.repo, sha }
    const old = prev[t.id]?.sha
    if (old && old !== sha) changes.push(`${t.id} ${old.slice(0, 7)} -> ${sha.slice(0, 7)}`)
  }
  return { lock, changes }
}

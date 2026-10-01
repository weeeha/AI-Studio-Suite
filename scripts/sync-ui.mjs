import { cpSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = fileURLToPath(new URL('..', import.meta.url))
const mds = process.env.MDS_PATH ?? join(repo, '..', 'Minimal Design System')
const dest = fileURLToPath(new URL('../apps/home/src/ui/', import.meta.url))
const files = ['components/button.tsx', 'components/card.tsx', 'lib/utils.ts', 'styles/globals.css', 'tokens.ts']
for (const f of files) {
  const from = join(mds, 'src', f)
  mkdirSync(dirname(join(dest, f)), { recursive: true })
  cpSync(from, join(dest, f))
  console.log(`copied ${f}`)
}

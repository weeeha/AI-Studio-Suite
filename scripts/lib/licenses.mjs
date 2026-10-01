import { copyFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

export const LICENSE_FILES = ['LICENSE', 'NOTICE']

// Copies the fork root's LICENSE and NOTICE (Apache-2.0 4(a)/4(d)) next to the built tool.
// Returns the names copied. Files missing from the fork are skipped.
export function copyLicenses(srcRoot, target) {
  const copied = []
  for (const name of LICENSE_FILES) {
    const from = join(srcRoot, name)
    if (!existsSync(from)) continue
    copyFileSync(from, join(target, name))
    copied.push(name)
  }
  return copied
}

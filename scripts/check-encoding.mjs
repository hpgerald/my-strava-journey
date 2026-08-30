import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const suspect = /Â|â[\u0080-\u00BF]|Ã[\u0080-\u00BF]/u
const files = []
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (['node_modules', 'dist', '.git'].includes(name)) continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path)
    else if (/\.(?:jsx?|css|html|md|json|ya?ml|py|csv)$/u.test(name)) files.push(path)
  }
}
walk(root)
const bad = files.filter((file) => suspect.test(readFileSync(file, 'utf8')))
if (bad.length) {
  console.error(`Possible mojibake found in:\n${bad.join('\n')}`)
  process.exit(1)
}

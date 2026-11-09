// Varredura de textos: toda frase literal entre aspas nos arquivos de docs/mapeamento deve aparecer no código-fonte da interface.
// Marcadores {…} viram curingas (cada trecho fixo precisa existir). Uso: npm run check:texts [-- --list]
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

const norm = (s) => s.replace(/\*\*/g, '').replace(/<\/?b>/g, '').replace(/\s+/g, ' ').trim()

const source = norm(
  walk(join(root, 'src'))
    .filter((f) => /\.(tsx?|ts)$/.test(f) && !/\.test\./.test(f) && !f.includes('__golden__'))
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n')
    // quebras de string/JSX viram espaço para casar frases longas
    .replace(/['"`]\s*\+\s*['"`]/g, ''),
)

const docs = walk(join(root, 'docs/mapeamento')).filter((f) => f.endsWith('.md') && !f.endsWith('README.md'))
const phrases = new Set()
for (const f of docs) {
  for (const m of readFileSync(f, 'utf8').matchAll(/"([^"\n]{7,})"/g)) phrases.add(norm(m[1]))
}

// frases montadas em tempo de execução (rótulos com valores) ou com formatação inline que a busca literal não alcança
const ignore = [/^[a-z_]+$/, /\.(py|csv|xlsx|txt)$/, /^DD\/MM/, /^\.\.\./, /`/, /^[(·;]/, /^\(/, /^Tratado:/, /^\d?º ·/, /^\{?\w+\}? ?º/, /^Semana (n|de)/, /^Laudo automático/, /^Em /, /\|$/]
const missing = []
for (const p of phrases) {
  if (ignore.some((r) => r.test(p))) continue
  const parts = p.split(/\{[^}]*\}/).map((x) => x.trim()).filter((x) => x.length >= 4)
  if (parts.length === 0) continue
  if (!parts.every((part) => source.includes(part))) missing.push(p)
}

if (process.argv.includes('--list') || missing.length) {
  console.log(`${phrases.size} frases literais no mapeamento; ${missing.length} não encontradas no código:`)
  for (const m of missing) console.log('  - ' + m)
}
if (missing.length) process.exit(1)
console.log(`Textos ok: ${phrases.size} frases do mapeamento presentes na interface.`)

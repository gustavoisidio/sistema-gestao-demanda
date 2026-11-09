// Rastreabilidade spec ↔ teste: todo requisito SPEC-XXX-NN de docs/specs precisa ser
// citado por ao menos um teste, e todo ID citado em teste precisa existir nas specs.
// Requisitos com "**Status:** planejado" (ainda não implementados) são exigidos só quando virarem ativos.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const ID = /SPEC-[A-Z]+-\d+/g;

function walk(dir, filter, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name !== 'node_modules') walk(p, filter, out);
    } else if (filter(p)) out.push(p);
  }
  return out;
}

const declared = new Map(); // id -> arquivo
const planned = new Set();
for (const file of walk(join(root, 'docs/specs'), (p) => p.endsWith('.md') && !p.endsWith('README.md'))) {
  let current = null;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^### (SPEC-[A-Z]+-\d+)\b/);
    if (m) {
      current = m[1];
      declared.set(current, file.replace(root, ''));
    } else if (current && /^\*\*Status:\*\* planejado/i.test(line)) {
      planned.add(current);
    }
  }
}

const cited = new Map(); // id -> arquivos de teste
for (const file of walk(join(root, 'src'), (p) => /\.test\.tsx?$/.test(p))) {
  for (const id of new Set(readFileSync(file, 'utf8').match(ID) ?? [])) {
    cited.set(id, [...(cited.get(id) ?? []), file.replace(root, '')]);
  }
}

// "SPEC-UPL-01 a SPEC-UPL-06" cobre o intervalo inteiro
for (const file of walk(join(root, 'src'), (p) => /\.test\.tsx?$/.test(p))) {
  const text = readFileSync(file, 'utf8');
  for (const [, prefix, from, to] of text.matchAll(/SPEC-([A-Z]+)-(\d+) a SPEC-\1-(\d+)/g)) {
    for (let n = Number(from); n <= Number(to); n++) {
      const id = `SPEC-${prefix}-${String(n).padStart(2, '0')}`;
      cited.set(id, [...(cited.get(id) ?? []), file.replace(root, '')]);
    }
  }
}

const untested = [...declared.keys()].filter((id) => !planned.has(id) && !cited.has(id));
const unknown = [...cited.keys()].filter((id) => !declared.has(id));

if (untested.length) console.error(`Requisitos sem teste:\n${untested.map((i) => `  ${i} (${declared.get(i)})`).join('\n')}`);
if (unknown.length) console.error(`IDs citados em testes mas inexistentes nas specs:\n${unknown.map((i) => `  ${i} (${cited.get(i)[0]})`).join('\n')}`);
if (untested.length || unknown.length) process.exit(1);
const active = declared.size - planned.size;
console.log(`Specs ok: ${active} requisitos ativos, todos com teste (${planned.size} planejados).`);

// Garante que a versão do package.json é a mesma da entrada mais recente do CHANGELOG.
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
const latest = changelog.match(/^## (\d+\.\d+\.\d+)\b/m)?.[1];

if (!latest) {
  console.error('CHANGELOG.md: nenhuma entrada "## x.y.z" encontrada.');
  process.exit(1);
}
if (latest !== pkg.version) {
  console.error(`Versão divergente: package.json=${pkg.version} vs CHANGELOG.md=${latest}`);
  process.exit(1);
}
console.log(`Versão ok: ${pkg.version}`);

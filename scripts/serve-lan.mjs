// Gera o build de produção e o serve acessível por IP na rede local (para testar em outro aparelho).
// Uso: npm run serve:lan [-- --port 4173] [-- --no-build]
import { spawn, spawnSync } from 'node:child_process'
import { networkInterfaces } from 'node:os'

const args = process.argv.slice(2)
const portIdx = args.indexOf('--port')
const port = portIdx >= 0 ? Number(args[portIdx + 1]) : 4173

if (!args.includes('--no-build')) {
  const b = spawnSync('npm', ['run', 'build'], { stdio: 'inherit' })
  if (b.status !== 0) process.exit(b.status ?? 1)
}

const ips = Object.values(networkInterfaces())
  .flat()
  .filter((i) => i && i.family === 'IPv4' && !i.internal)
  .map((i) => i.address)

const server = spawn('npx', ['vite', 'preview', '--host', '0.0.0.0', '--port', String(port), '--strictPort'], { stdio: 'inherit' })
console.log('\nAbra em outro aparelho conectado à mesma rede Wi-Fi:')
for (const ip of ips) console.log(`  http://${ip}:${port}/`)
console.log('(Ctrl+C para encerrar)\n')
process.on('SIGINT', () => { server.kill(); process.exit(0) })

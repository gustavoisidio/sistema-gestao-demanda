// Diagnóstico para aparelhos reais: abra `?debug` na URL e um painel mostra os últimos eventos de navegação,
// guardados em sessionStorage (sobrevivem a recarregamentos). Sem `?debug`, não faz nada.
const KEY = 'debug-log'

export function startDebug(): void {
  if (!/[?&]debug\b/.test(window.location.search)) return
  const read = (): string[] => {
    try { return JSON.parse(sessionStorage.getItem(KEY) ?? '[]') as string[] } catch { return [] }
  }
  const lines = read()
  const render = () => { box.textContent = lines.slice(-14).join('\n') }
  const log = (msg: string) => {
    const t = new Date().toISOString().slice(11, 23)
    lines.push(`${t} ${msg} [${window.location.href.replace(window.location.origin, '')}] hist=${window.history.length}`)
    try { sessionStorage.setItem(KEY, JSON.stringify(lines.slice(-60))) } catch { /* ignora */ }
    render()
  }
  const box = document.createElement('pre')
  box.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:99999;margin:0;padding:6px;font:10px/1.3 monospace;background:#000c;color:#7f7;max-height:30vh;overflow:auto;pointer-events:none'
  document.body.appendChild(box)
  log(`carregou (nav: ${(performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type ?? '?'}, hist: ${window.history.length})`)
  document.addEventListener('click', (e) => { const a = (e.target as Element).closest('a'); if (a) log(`clique em ${a.getAttribute('href')}`) }, true)
  for (const ev of ['hashchange', 'popstate', 'pageshow', 'pagehide', 'beforeunload', 'visibilitychange', 'error', 'unhandledrejection', 'vite:preloadError', 'freeze', 'resume']) {
    window.addEventListener(ev, (e) => log(`${ev}${(e as PageTransitionEvent).persisted ? ' (bfcache)' : ''}${(e as ErrorEvent).message ? ': ' + (e as ErrorEvent).message : ''}`))
  }
}

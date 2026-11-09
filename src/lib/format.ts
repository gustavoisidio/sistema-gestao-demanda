// Formatação pt-BR (SPEC-FMT-01…04). Inválido → "—".

const DASH = '—'

function isNum(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x)
}

function group(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function format(x: number, dec: number): string {
  const fixed = Math.abs(x).toFixed(dec)
  const [int, frac] = fixed.split('.')
  const body = frac ? `${group(int)},${frac}` : group(int)
  // evita "-0" / "-0,0" quando o arredondamento zera o valor
  const isZero = /^[0.,]*$/.test(body)
  return x < 0 && !isZero ? `-${body}` : body
}

export function fmtInt(x: unknown): string {
  return isNum(x) ? format(x, 0) : DASH
}

export function fmtNum(x: unknown, dec = 1): string {
  return isNum(x) ? format(x, dec) : DASH
}

export function fmtPct(x: unknown, dec = 1, signed = false): string {
  if (!isNum(x)) return DASH
  const sign = signed && x > 0 ? '+' : ''
  return `${sign}${format(x, dec)}%`
}

/** `YYYY-MM-DD` → `DD/MM/AAAA`. */
export function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

/** `YYYY-MM-DD` → `MM/AAAA`. */
export function fmtMonthYear(iso: string): string {
  const [y, m] = iso.slice(0, 10).split('-')
  return `${m}/${y}`
}

/** `YYYY-MM-DD` → `MM/AA`. */
export function fmtMonthYearShort(iso: string): string {
  const [y, m] = iso.slice(0, 10).split('-')
  return `${m}/${y.slice(2)}`
}

/** Relógio local → `DD/MM/AAAA HH:MM`. */
export function fmtDateTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

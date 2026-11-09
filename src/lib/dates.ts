// Aritmética de datas de calendário sem fuso horário (SPEC-FMT-05).
// Datas são strings `YYYY-MM-DD`; internamente viram índices de dia UTC.

const MS_PER_DAY = 86_400_000
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/

const pad = (n: number, size = 2) => String(n).padStart(size, '0')

export function isValidISO(value: string): boolean {
  const m = ISO.exec(value)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const t = new Date(Date.UTC(y, mo - 1, d))
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d
}

export function toDayIndex(iso: string): number {
  const m = ISO.exec(iso)
  if (!m) throw new Error(`Data inválida: ${iso}`)
  return Math.floor(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / MS_PER_DAY)
}

export function fromDayIndex(index: number): string {
  const d = new Date(index * MS_PER_DAY)
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

export function addDays(iso: string, days: number): string {
  return fromDayIndex(toDayIndex(iso) + days)
}

/** a − b, em dias. */
export function diffDays(a: string, b: string): number {
  return toDayIndex(a) - toDayIndex(b)
}

/** Segunda = 0 … domingo = 6. */
export function weekdayMon0(iso: string): number {
  return (((toDayIndex(iso) + 3) % 7) + 7) % 7
}

/** Domingo que encerra a semana (segunda a domingo) da data; um domingo devolve ele mesmo. */
export function endOfWeekSunday(iso: string): string {
  return addDays(iso, 6 - weekdayMon0(iso))
}

export function yearOf(iso: string): number {
  return Number(iso.slice(0, 4))
}

/** 1–12. */
export function monthOf(iso: string): number {
  return Number(iso.slice(5, 7))
}

export function dayOf(iso: string): number {
  return Number(iso.slice(8, 10))
}

/** 1–4. */
export function quarterOf(iso: string): number {
  return Math.ceil(monthOf(iso) / 3)
}

export function startOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`
}

export function endOfMonth(iso: string): string {
  const y = yearOf(iso)
  const m = monthOf(iso)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return `${pad(y, 4)}-${pad(m)}-${pad(last)}`
}

/** Último dia do mês seguinte ao da data. */
export function endOfNextMonth(iso: string): string {
  return endOfMonth(addDays(endOfMonth(iso), 1))
}

/** Data de hoje no relógio local, como `YYYY-MM-DD`. */
export function todayLocalISO(now: Date): string {
  return `${pad(now.getFullYear(), 4)}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

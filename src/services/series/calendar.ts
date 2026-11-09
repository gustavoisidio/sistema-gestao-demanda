import { addDays, endOfMonth, endOfNextMonth, endOfWeekSunday } from '../../lib/dates'
import type { Freq } from '../../types'

/** SPEC-SER-02: rótulo do período que contém a data. */
export function periodLabel(date: string, freq: Freq): string {
  if (freq === 'D') return date
  if (freq === 'W') return endOfWeekSunday(date)
  return endOfMonth(date)
}

/** Rótulo do período seguinte. */
export function nextLabel(label: string, freq: Freq): string {
  if (freq === 'D') return addDays(label, 1)
  if (freq === 'W') return addDays(label, 7)
  return endOfNextMonth(label)
}

/** SPEC-SER-05: os `h` rótulos seguintes ao último. */
export function futureIndex(lastLabel: string, h: number, freq: Freq): string[] {
  const out: string[] = []
  let cur = lastLabel
  for (let i = 0; i < h; i++) {
    cur = nextLabel(cur, freq)
    out.push(cur)
  }
  return out
}

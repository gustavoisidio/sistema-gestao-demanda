import {
  addDays, diffDays, endOfMonth, endOfNextMonth, endOfWeekSunday, fromDayIndex, isValidISO, monthOf, quarterOf,
  startOfMonth, toDayIndex, weekdayMon0, yearOf,
} from './dates'

describe('lib/dates (SPEC-FMT-05)', () => {
  it('converte ida e volta sem depender do fuso', () => {
    for (const iso of ['1970-01-01', '2023-01-02', '2024-02-29', '2026-12-31', '2000-02-29']) {
      expect(fromDayIndex(toDayIndex(iso))).toBe(iso)
    }
  })

  it('soma dias atravessando bissexto e virada de ano', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(addDays('2023-02-28', 1)).toBe('2023-03-01')
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
    expect(diffDays('2026-01-01', '2025-01-01')).toBe(365)
  })

  it('weekdayMon0: segunda = 0, domingo = 6', () => {
    expect(weekdayMon0('2023-01-02')).toBe(0) // segunda
    expect(weekdayMon0('2023-01-08')).toBe(6) // domingo
    expect(weekdayMon0('1970-01-01')).toBe(3) // quinta
    expect(weekdayMon0('1969-12-31')).toBe(2) // antes da época
  })

  it('endOfWeekSunday devolve o domingo da semana', () => {
    expect(endOfWeekSunday('2023-01-02')).toBe('2023-01-08')
    expect(endOfWeekSunday('2023-01-05')).toBe('2023-01-08')
    expect(endOfWeekSunday('2023-01-08')).toBe('2023-01-08')
  })

  it('endOfMonth cobre fevereiro bissexto e meses de 30/31 dias', () => {
    expect(endOfMonth('2024-02-10')).toBe('2024-02-29')
    expect(endOfMonth('2023-02-10')).toBe('2023-02-28')
    expect(endOfMonth('2023-04-01')).toBe('2023-04-30')
    expect(endOfMonth('2023-12-15')).toBe('2023-12-31')
    expect(endOfNextMonth('2023-01-31')).toBe('2023-02-28')
    expect(endOfNextMonth('2023-12-31')).toBe('2024-01-31')
  })

  it('partes da data e trimestre', () => {
    expect(startOfMonth('2023-05-17')).toBe('2023-05-01')
    expect([yearOf('2023-05-17'), monthOf('2023-05-17')]).toEqual([2023, 5])
    expect([1, 3, 4, 6, 7, 9, 10, 12].map((m) => quarterOf(`2023-${String(m).padStart(2, '0')}-01`))).toEqual([1, 1, 2, 2, 3, 3, 4, 4])
  })

  it('valida datas impossíveis', () => {
    expect(isValidISO('2025-02-30')).toBe(false)
    expect(isValidISO('2024-02-29')).toBe(true)
    expect(isValidISO('2025-1-1')).toBe(false)
  })
})

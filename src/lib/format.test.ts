import { fmtDate, fmtDateTime, fmtInt, fmtMonthYear, fmtMonthYearShort, fmtNum, fmtPct } from './format'

describe('fmtInt (SPEC-FMT-01)', () => {
  it('usa ponto de milhar e 0 casas', () => {
    expect(fmtInt(1234567)).toBe('1.234.567')
    expect(fmtInt(-1500)).toBe('-1.500')
    expect(fmtInt(0)).toBe('0')
    expect(fmtInt(999.6)).toBe('1.000')
  })
  it('inválido vira travessão', () => {
    expect(fmtInt(NaN)).toBe('—')
    expect(fmtInt(null)).toBe('—')
    expect(fmtInt(undefined)).toBe('—')
    expect(fmtInt('12')).toBe('—')
    expect(fmtInt(Infinity)).toBe('—')
  })
})

describe('fmtNum (SPEC-FMT-02)', () => {
  it('usa vírgula decimal e ponto de milhar', () => {
    expect(fmtNum(1234.5)).toBe('1.234,5')
    expect(fmtNum(0.256, 2)).toBe('0,26')
    expect(fmtNum(1234567.891, 2)).toBe('1.234.567,89')
    expect(fmtNum(7, 0)).toBe('7')
  })
  it('não mostra zero negativo', () => {
    expect(fmtNum(-0.0004, 1)).toBe('0,0')
    expect(fmtNum(-0.5, 1)).toBe('-0,5')
  })
  it('inválido vira travessão', () => {
    expect(fmtNum(NaN)).toBe('—')
  })
})

describe('fmtPct (SPEC-FMT-03)', () => {
  it('formata com sinal opcional', () => {
    expect(fmtPct(12.34, 1, true)).toBe('+12,3%')
    expect(fmtPct(12.34)).toBe('12,3%')
    expect(fmtPct(-5)).toBe('-5,0%')
    expect(fmtPct(0, 1, true)).toBe('0,0%')
    expect(fmtPct(-5, 1, true)).toBe('-5,0%')
  })
  it('NaN vira travessão', () => {
    expect(fmtPct(NaN)).toBe('—')
    expect(fmtPct(undefined, 1, true)).toBe('—')
  })
})

describe('datas (SPEC-FMT-04)', () => {
  it('formata datas de calendário', () => {
    expect(fmtDate('2026-11-09')).toBe('09/11/2026')
    expect(fmtMonthYear('2026-11-09')).toBe('11/2026')
    expect(fmtMonthYearShort('2026-11-09')).toBe('11/26')
  })
  it('formata data e hora locais', () => {
    expect(fmtDateTime(new Date(2026, 10, 9, 8, 5))).toBe('09/11/2026 08:05')
  })
})

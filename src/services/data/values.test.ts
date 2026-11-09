import { parseDate, parseQuantity } from './values'

describe('parseQuantity (SPEC-DAT-06)', () => {
  it.each([
    ['1234.5', 1234.5], ['1234,5', 1234.5], ['1.234,5', 1234.5], ['1,234.5', 1234.5],
    ['-50', -50], ['  7 ', 7], ['R$ 12,50', 12.5], ['0', 0], ['+3', 3],
  ])('%s → %s', (raw, expected) => {
    expect(parseQuantity(raw)).toBe(expected)
  })

  it.each([[''], ['   '], ['abc'], ['1,2,3'], ['12abc'], [null], [undefined]])('%s → null', (raw) => {
    expect(parseQuantity(raw as string | null | undefined)).toBeNull()
  })
})

describe('parseDate (SPEC-DAT-07)', () => {
  it.each([
    ['2025-01-01', '2025-01-01'], ['2025-01-01 10:30:00', '2025-01-01'], ['2025-01-01T10:30:00Z', '2025-01-01'],
    ['2025/01/05', '2025-01-05'], ['05/01/2025', '2025-01-05'], ['5-1-2025', '2025-01-05'], ['05.01.2025', '2025-01-05'],
    ['45658', '2025-01-01'], ['45658.5', '2025-01-01'],
  ])('%s → %s', (raw, expected) => {
    expect(parseDate(raw)).toBe(expected)
  })

  it('assume dia/mês/ano e rejeita datas impossíveis', () => {
    expect(parseDate('13/01/2025')).toBe('2025-01-13')
    expect(parseDate('01/13/2025')).toBeNull()
    expect(parseDate('2025-02-30')).toBeNull()
    expect(parseDate('29/02/2023')).toBeNull()
    expect(parseDate('29/02/2024')).toBe('2024-02-29')
  })

  it.each([[''], ['ontem'], ['123'], [null], [undefined]])('%s → null', (raw) => {
    expect(parseDate(raw as string | null | undefined)).toBeNull()
  })
})

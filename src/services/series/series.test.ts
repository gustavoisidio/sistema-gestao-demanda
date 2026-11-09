import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildDemoRecords } from '../data/demo'
import { listSkus } from '../data/summary'
import { futureIndex, periodLabel } from './calendar'
import { resample, seriesFor, sliceByDates, trimPartialPeriods, valuesOf } from './aggregate'
import { DEFAULT_H, FREQ_LABELS, MAX_H, SEASON, UNIT, UNIT_SING } from './params'
import type { Freq, SaleRecord } from '../../types'
import golden from '../__golden__/series.json'

type GoldenEntry = { n: number; first: string; last: string; sum: number; labels: string[] | null; values: number[] | null; head: number[]; tail: number[]; future: string[] }
const G = golden as unknown as Record<string, Record<Freq, GoldenEntry>>

const records = buildDemoRecords(readFileSync(resolve(process.cwd(), 'src/assets/demo_dataset.csv'), 'utf8'))
const rec = (sku: string, data: string, q: number): SaleRecord => ({ sku, data, quantidade_vendida: q })

describe('resample (SPEC-SER-01)', () => {
  it('soma por período e preenche buracos com 0', () => {
    const s = resample([{ date: '2025-01-01', value: 1 }, { date: '2025-01-04', value: 4 }], 'D')
    expect(s.map((p) => [p.date, p.value])).toEqual([['2025-01-01', 1], ['2025-01-02', 0], ['2025-01-03', 0], ['2025-01-04', 4]])
  })

  it('soma duplicados do mesmo dia', () => {
    expect(resample([{ date: '2025-01-01', value: 1 }, { date: '2025-01-01', value: 2 }], 'D')).toEqual([{ date: '2025-01-01', value: 3 }])
  })

  it('um só registro → série de 1 ponto; entrada fora de ordem', () => {
    expect(resample([{ date: '2025-01-01', value: 5 }], 'ME')).toEqual([{ date: '2025-01-31', value: 5 }])
    const s = resample([{ date: '2025-03-10', value: 1 }, { date: '2025-01-10', value: 2 }], 'ME')
    expect(s.map((p) => p.date)).toEqual(['2025-01-31', '2025-02-28', '2025-03-31'])
    expect(s.map((p) => p.value)).toEqual([2, 0, 1])
  })

  it('vazio → vazio', () => {
    expect(resample([], 'W')).toEqual([])
  })
})

describe('rótulos de período (SPEC-SER-02)', () => {
  it('semana termina no domingo; mês no último dia', () => {
    expect(periodLabel('2023-01-02', 'W')).toBe('2023-01-08')
    expect(periodLabel('2023-01-08', 'W')).toBe('2023-01-08')
    expect(periodLabel('2024-02-10', 'ME')).toBe('2024-02-29')
    expect(periodLabel('2024-02-10', 'D')).toBe('2024-02-10')
  })
})

describe('trimPartialPeriods (SPEC-SER-04)', () => {
  it('semanal: descarta a última semana incompleta e a primeira que não começa na segunda', () => {
    const s = resample([{ date: '2025-01-01', value: 1 }, { date: '2025-01-20', value: 1 }], 'W') // quarta … segunda
    expect(s.map((p) => p.date)).toEqual(['2025-01-05', '2025-01-12', '2025-01-19', '2025-01-26'])
    expect(trimPartialPeriods(s, 'W', '2025-01-01', '2025-01-20').map((p) => p.date)).toEqual(['2025-01-12', '2025-01-19'])
  })

  it('semanal: mantém a primeira semana quando começa na segunda e a última quando termina no domingo', () => {
    const s = resample([{ date: '2025-01-06', value: 1 }, { date: '2025-01-19', value: 1 }], 'W')
    expect(trimPartialPeriods(s, 'W', '2025-01-06', '2025-01-19')).toHaveLength(2)
  })

  it('mensal: descarta o primeiro mês se não começa no dia 1 e o último se não termina no fim do mês', () => {
    const s = resample([{ date: '2025-01-15', value: 1 }, { date: '2025-04-10', value: 1 }], 'ME')
    expect(trimPartialPeriods(s, 'ME', '2025-01-15', '2025-04-10').map((p) => p.date)).toEqual(['2025-02-28', '2025-03-31'])
    const full = resample([{ date: '2025-01-01', value: 1 }, { date: '2025-03-31', value: 1 }], 'ME')
    expect(trimPartialPeriods(full, 'ME', '2025-01-01', '2025-03-31')).toHaveLength(3)
  })

  it('diária nunca descarta; com 2 períodos ou menos nada é descartado', () => {
    const d = resample([{ date: '2025-01-15', value: 1 }, { date: '2025-01-17', value: 1 }], 'D')
    expect(trimPartialPeriods(d, 'D', '2025-01-15', '2025-01-17')).toHaveLength(3)
    const two = resample([{ date: '2025-01-15', value: 1 }, { date: '2025-02-10', value: 1 }], 'ME')
    expect(trimPartialPeriods(two, 'ME', '2025-01-15', '2025-02-10')).toHaveLength(2)
  })
})

describe('seriesFor (SPEC-SER-03)', () => {
  it('usa só o SKU pedido e as datas dele para recortar', () => {
    const recs = [rec('A', '2025-01-01', 5), rec('A', '2025-04-30', 5), rec('B', '2025-06-15', 99)]
    const s = seriesFor(recs, 'A', 'ME')
    expect(s.map((p) => p.date)).toEqual(['2025-01-31', '2025-02-28', '2025-03-31', '2025-04-30'])
    expect(valuesOf(s)).toEqual([5, 0, 0, 5])
  })

  it('SKU inexistente → série vazia', () => {
    expect(seriesFor(records, 'nao-existe', 'W')).toEqual([])
  })
})

describe('futureIndex (SPEC-SER-05)', () => {
  it('diária, semanal e mensal', () => {
    expect(futureIndex('2025-12-30', 3, 'D')).toEqual(['2025-12-31', '2026-01-01', '2026-01-02'])
    expect(futureIndex('2026-12-27', 3, 'W')).toEqual(['2027-01-03', '2027-01-10', '2027-01-17'])
    expect(futureIndex('2023-11-30', 3, 'ME')).toEqual(['2023-12-31', '2024-01-31', '2024-02-29'])
  })

  it('h = 0 → vazio', () => {
    expect(futureIndex('2025-01-31', 0, 'ME')).toEqual([])
  })
})

describe('sliceByDates (SPEC-SER-06)', () => {
  const s = resample([{ date: '2025-01-01', value: 1 }, { date: '2025-01-05', value: 5 }], 'D')
  it('inclusivo nas duas pontas', () => {
    expect(sliceByDates(s, '2025-01-02', '2025-01-04').map((p) => p.date)).toEqual(['2025-01-02', '2025-01-03', '2025-01-04'])
  })
  it('janela vazia → série vazia', () => {
    expect(sliceByDates(s, '2026-01-01', '2026-02-01')).toEqual([])
  })
})

describe('parâmetros por granularidade (SPEC-SER-07)', () => {
  it('constantes do original', () => {
    expect(SEASON).toEqual({ D: 7, W: 52, ME: 12 })
    expect(DEFAULT_H).toEqual({ D: 30, W: 12, ME: 6 })
    expect(MAX_H).toEqual({ D: 180, W: 52, ME: 24 })
    expect(FREQ_LABELS).toEqual({ D: 'Diária', W: 'Semanal', ME: 'Mensal' })
    expect(UNIT).toEqual({ D: 'dias', W: 'semanas', ME: 'meses' })
    expect(UNIT_SING).toEqual({ D: 'dia', W: 'semana', ME: 'mês' })
  })
})

describe('paridade com o Python original — séries da demo (SPEC-SER-01, SPEC-SER-04, SPEC-SER-05)', () => {
  const freqs: Freq[] = ['D', 'W', 'ME']
  for (const sku of listSkus(records)) {
    for (const freq of freqs) {
      it(`${sku} · ${freq}`, () => {
        const g = G[sku][freq]
        const s = seriesFor(records, sku, freq)
        expect(s).toHaveLength(g.n)
        expect(s[0].date).toBe(g.first)
        expect(s[s.length - 1].date).toBe(g.last)
        expect(valuesOf(s).reduce((a, b) => a + b, 0)).toBeCloseTo(g.sum, 6)
        expect(valuesOf(s).slice(0, 5)).toEqual(g.head)
        expect(valuesOf(s).slice(-5)).toEqual(g.tail)
        if (g.labels && g.values) {
          expect(s.map((p) => p.date)).toEqual(g.labels)
          expect(valuesOf(s)).toEqual(g.values)
        }
        expect(futureIndex(s[s.length - 1].date, 5, freq)).toEqual(g.future)
      })
    }
  }

  it('a demo mantém 208 semanas e descarta jan/2023 e dez/2026 nos meses (46 restantes)', () => {
    expect(seriesFor(records, 'Smartphone TechX', 'W')).toHaveLength(208)
    const me = seriesFor(records, 'Smartphone TechX', 'ME')
    expect([me.length, me[0].date, me[me.length - 1].date]).toEqual([46, '2023-02-28', '2026-11-30'])
  })
})

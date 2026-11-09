import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildDemoRecords } from '../data/demo'
import { listSkus } from '../data/summary'
import { seriesFor, valuesOf } from '../series/aggregate'
import { calcIndicators, classifyBehavior } from './indicators'
import { portfolioTable, profile } from './profile'
import { linearTrend, rollingMean, windowStats } from './window'
import { dailyRecords, histogram, monthlyByYear, quarterBoxStats, weekdayIndex } from './distribution'
import { compareSeries } from './compare'
import type { Indicators } from '../../types'
import profileGolden from '../__golden__/profile.json'
import edaGolden from '../__golden__/eda.json'

const records = buildDemoRecords(readFileSync(resolve(process.cwd(), 'src/assets/demo_dataset.csv'), 'utf8'))
const skus = listSkus(records)

const ind = (over: Partial<Indicators>): Indicators => ({
  total: 100, media: 10, maximo: 20, minimo: 0, desvio_padrao: 1, cv: 0.3, crescimento_pct: 0, periodos_zerados: 0, pct_zerados: 0, ...over,
})

describe('calcIndicators (SPEC-EDA-01, SPEC-EDA-02)', () => {
  it('calcula os indicadores com desvio amostral (SPEC-EDA-01)', () => {
    const r = calcIndicators([2, 4, 4, 4, 5, 5, 7, 9])!
    expect(r.total).toBe(40)
    expect(r.media).toBe(5)
    expect(r.maximo).toBe(9)
    expect(r.minimo).toBe(2)
    expect(r.desvio_padrao).toBeCloseTo(2.138089935299395, 12)
    expect(r.cv).toBeCloseTo(2.138089935299395 / 5, 12)
    // meio = 4: m1 = 3,5 · m2 = 6,5 → +85,714…%
    expect(r.crescimento_pct).toBeCloseTo(((6.5 - 3.5) / 3.5) * 100, 10)
  })

  it('série constante tem cv 0; n = 1 tem desvio NaN (SPEC-EDA-01)', () => {
    expect(calcIndicators([5, 5, 5, 5])!.cv).toBe(0)
    expect(Number.isNaN(calcIndicators([7])!.desvio_padrao)).toBe(true)
    expect(calcIndicators([7])!.crescimento_pct).toBe(0)
  })

  it('conta períodos zerados (SPEC-EDA-01)', () => {
    const r = calcIndicators([0, 0, 5, 10])!
    expect([r.periodos_zerados, r.pct_zerados]).toEqual([2, 0.5])
  })

  it('série vazia → null e "Sem Dados" (SPEC-EDA-02)', () => {
    expect(calcIndicators([])).toBeNull()
    expect(classifyBehavior(null)).toEqual({ classe: 'Sem Dados', motivo: '' })
  })
})

describe('classifyBehavior (SPEC-EDA-03)', () => {
  it('aplica as regras na ordem do original', () => {
    expect(classifyBehavior(ind({ pct_zerados: 0.31 })).classe).toBe('Intermitente')
    expect(classifyBehavior(ind({ pct_zerados: 0.3, cv: 0.1, crescimento_pct: 5 })).classe).toBe('Estável')
    expect(classifyBehavior(ind({ cv: 0.1, crescimento_pct: 25 })).classe).toBe('Crescente')
    expect(classifyBehavior(ind({ cv: 0.4, crescimento_pct: -25 })).classe).toBe('Decrescente')
    expect(classifyBehavior(ind({ cv: 0.5, crescimento_pct: 0 })).classe).toBe('Irregular')
    expect(classifyBehavior(ind({ cv: 0.3, crescimento_pct: 0 })).classe).toBe('Sazonal/Variável')
  })

  it('valores exatamente nos limites', () => {
    expect(classifyBehavior(ind({ cv: 0.2, crescimento_pct: 0 })).classe).toBe('Sazonal/Variável') // cv < 0,20 é estrito
    expect(classifyBehavior(ind({ cv: 0.1, crescimento_pct: 10 })).classe).toBe('Sazonal/Variável') // |cresc| < 10 é estrito
    expect(classifyBehavior(ind({ cv: 0.1, crescimento_pct: 20 })).classe).toBe('Sazonal/Variável') // > 20 é estrito
    expect(classifyBehavior(ind({ cv: 0.3, crescimento_pct: -20 })).classe).toBe('Sazonal/Variável') // < −20 é estrito
    expect(classifyBehavior(ind({ pct_zerados: 0.3, cv: 0.3 })).classe).toBe('Sazonal/Variável') // > 0,30 é estrito
  })

  it('traz o motivo de cada classe', () => {
    expect(classifyBehavior(ind({ pct_zerados: 0.5 })).motivo).toBe('Muitos períodos sem demanda.')
    expect(classifyBehavior(ind({ cv: 0.1 })).motivo).toBe('Baixa variabilidade.')
    expect(classifyBehavior(ind({ crescimento_pct: 30 })).motivo).toBe('Tendência de alta.')
    expect(classifyBehavior(ind({ crescimento_pct: -30 })).motivo).toBe('Tendência de queda.')
    expect(classifyBehavior(ind({ cv: 0.9 })).motivo).toBe('Alta variabilidade (picos).')
    expect(classifyBehavior(ind({ cv: 0.3 })).motivo).toBe('Variação moderada.')
  })

  it('NaN não satisfaz nenhuma comparação → Sazonal/Variável', () => {
    expect(classifyBehavior(ind({ cv: NaN, crescimento_pct: NaN, pct_zerados: 0 })).classe).toBe('Sazonal/Variável')
  })
})

describe('profile e portfolioTable (SPEC-EDA-04, SPEC-EDA-05)', () => {
  const P = profileGolden as unknown as Record<string, { indicators: Indicators; classe: string; motivo: string }>

  for (const sku of skus) {
    it(`perfil semanal de ${sku} bate com o Python (SPEC-EDA-04)`, () => {
      const r = profile(records, sku, 'W')
      expect(r.classe).toBe(P[sku].classe)
      expect(r.motivo).toBe(P[sku].motivo)
      const g = P[sku].indicators
      for (const k of Object.keys(g) as (keyof Indicators)[]) expect(r.indicators![k]).toBeCloseTo(g[k], 8)
    })
  }

  it('portfolioTable: uma linha por SKU em ordem alfabética, tendência de 52 semanas (SPEC-EDA-05)', () => {
    const t = portfolioTable(records)
    expect(t.map((r) => r.sku)).toEqual(skus)
    expect(t.map((r) => r.perfil)).toEqual(skus.map((s) => P[s].classe))
    expect(t[0].tendencia).toHaveLength(52)
    expect(t[0].volumeTotal).toBeCloseTo(P[skus[0]].indicators.total, 6)
  })

  it('SKU inexistente → "Sem Dados" (SPEC-EDA-04)', () => {
    expect(profile(records, 'zzz').classe).toBe('Sem Dados')
  })
})

describe('windowStats (SPEC-EDA-06)', () => {
  it('KPIs sobre a janela', () => {
    const serie = [{ date: '2025-01-05', value: 0 }, { date: '2025-01-12', value: 10 }, { date: '2025-01-19', value: 30 }, { date: '2025-01-26', value: 20 }]
    const s = windowStats(serie)
    expect(s.volume).toBe(60)
    expect(s.media).toBe(15)
    expect(s.pico).toEqual({ value: 30, date: '2025-01-19' })
    expect(s.pctZerados).toBe(25)
    expect(s.crescimentoPct).toBeCloseTo(((25 - 5) / 5) * 100, 10)
    expect(s.cv).toBeCloseTo(Math.sqrt((225 + 25 + 225 + 25) / 3) / 15, 10)
  })

  it('média zero → cv 0; janela vazia sem pico', () => {
    expect(windowStats([{ date: '2025-01-05', value: 0 }, { date: '2025-01-12', value: 0 }]).cv).toBe(0)
    expect(windowStats([]).pico).toBeNull()
  })
})

describe('rollingMean e linearTrend (SPEC-EDA-07, SPEC-EDA-08)', () => {
  const weekly = valuesOf(seriesFor(records, skus[0], 'W'))

  it('média móvel com min_periods=1 bate com o pandas (SPEC-EDA-07)', () => {
    const r = rollingMean(weekly, 8)
    expect(r).toHaveLength(weekly.length)
    r.forEach((v, i) => expect(v).toBeCloseTo(edaGolden.rolling8[i], 8))
    expect(rollingMean([1, 2, 3], 2)).toEqual([1, 1.5, 2.5])
  })

  it('tendência linear bate com np.polyfit (SPEC-EDA-08)', () => {
    const t = linearTrend(weekly)
    t.forEach((v, i) => expect(v).toBeCloseTo(edaGolden.trend[i], 6))
    expect(linearTrend([4])).toEqual([4])
    expect(linearTrend([])).toEqual([])
  })
})

describe('sazonalidade e distribuição (SPEC-EDA-09…12)', () => {
  const daily = dailyRecords(records, skus[0], '2000-01-01', '2100-01-01')

  it('matriz mensal por ano bate com o pivot do pandas (SPEC-EDA-09)', () => {
    const m = monthlyByYear(daily)
    expect(m.years).toEqual(edaGolden.years)
    m.matrix.forEach((row, i) => row.forEach((v, j) => {
      const g = edaGolden.monthly_matrix[i][j]
      if (g === null) expect(v).toBeNull()
      else expect(v).toBeCloseTo(g, 6)
    }))
  })

  it('meses fora da série ficam nulos (SPEC-EDA-09)', () => {
    const m = monthlyByYear([{ sku: 'A', data: '2025-03-10', quantidade_vendida: 4 }])
    expect(m.matrix[0][2]).toBe(4)
    expect(m.matrix[0][0]).toBeNull()
  })

  it('índice por dia da semana bate com o pandas (SPEC-EDA-10)', () => {
    const idx = weekdayIndex(daily)
    idx.forEach((v, i) => expect(v).toBeCloseTo(edaGolden.weekday_index[i], 8))
  })

  it('dia sem dados fica nulo (SPEC-EDA-10)', () => {
    const idx = weekdayIndex([{ sku: 'A', data: '2025-01-06', quantidade_vendida: 10 }, { sku: 'A', data: '2025-01-07', quantidade_vendida: 30 }])
    expect(idx).toEqual([50, 150, null, null, null, null, null])
  })

  it('histograma com 30 classes iguais (SPEC-EDA-11)', () => {
    const h = histogram([0, 10, 20, 30, 60], 30)
    expect(h).toHaveLength(30)
    expect(h.reduce((a, b) => a + b.count, 0)).toBe(5)
    expect(h[0].x0).toBe(0)
    expect(h[29].x1).toBeCloseTo(60, 10)
    expect(h[29].count).toBe(1) // o máximo cai na última classe
    expect(histogram([5, 5, 5], 30)).toEqual([{ x0: 5, x1: 5, count: 3 }])
    expect(histogram([], 30)).toEqual([])
  })

  it('caixa por trimestre bate com os quantis do pandas (SPEC-EDA-12)', () => {
    const boxes = quarterBoxStats(seriesFor(records, skus[0], 'W'))
    expect(boxes.map((b) => b.quarter)).toEqual(['T1', 'T2', 'T3', 'T4'])
    for (const b of boxes) {
      const g = edaGolden.box[b.quarter as 'T1']
      expect([b.q1, b.median, b.q3, b.min, b.max].map((v) => +v.toFixed(8))).toEqual([g.q1, g.med, g.q3, g.min, g.max].map((v) => +v.toFixed(8)))
    }
  })

  it('whiskers a 1,5 × IQR e outliers (SPEC-EDA-12)', () => {
    const pts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 100].map((v, i) => ({ date: `2025-01-${String(i + 1).padStart(2, '0')}`, value: v }))
    const [b] = quarterBoxStats(pts)
    expect(b.outliers).toEqual([100])
    expect(b.whiskerHigh).toBe(9)
    expect(b.whiskerLow).toBe(1)
  })
})

describe('compareSeries (SPEC-EDA-13)', () => {
  it('normaliza para índice base 100 na ordem da seleção', () => {
    const out = compareSeries(records, [skus[1], skus[0]], 'ME', '2023-01-01', '2026-12-31', true)
    expect(out.map((o) => o.sku)).toEqual([skus[1], skus[0]])
    const mean = out[0].points.reduce((a, p) => a + p.value, 0) / out[0].points.length
    expect(mean).toBeCloseTo(100, 8)
  })

  it('sem normalizar mantém os valores; recorta pela janela', () => {
    const raw = compareSeries(records, [skus[0]], 'W', '2024-01-01', '2024-01-31', false)[0].points
    expect(raw.every((p) => p.date >= '2024-01-01' && p.date <= '2024-01-31')).toBe(true)
    expect(raw.length).toBeGreaterThan(3)
  })
})

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildDemoRecords } from '../data/demo'
import { listSkus } from '../data/summary'
import { seriesFor, valuesOf } from '../series/aggregate'
import { SEASON } from '../series/params'
import { availableModels, confidenceBand, croston, holt, holtWinters, linearRegression, naive, runAll, runModels, simpleMovingAverage, ses } from './index'
import type { Freq, ModelName } from '../../types'
import golden from '../__golden__/models.json'

const records = buildDemoRecords(readFileSync(resolve(process.cwd(), 'src/assets/demo_dataset.csv'), 'utf8'))

type Ref = { fit: number[] | null; fit_head: number[] | null; forecast_raw: number[]; forecast: number[]; sigma: number; sse: number | null }
const G = golden as unknown as Record<string, Record<Freq, { h: number; m: number; order: string[]; models: Record<string, Ref> }>>

const close = (a: number, b: number, rel = 1e-9) => Math.abs(a - b) <= rel * Math.max(1, Math.abs(b))
const sum = (x: readonly number[]) => x.reduce((a, b) => a + b, 0)

describe('Naive (SPEC-FCS-01)', () => {
  it('ajuste deslocado em 1 e previsão = último valor', () => {
    const r = naive([3, 5, 9], 2)
    expect(r.fit).toEqual([3, 3, 5])
    expect(r.forecast).toEqual([9, 9])
  })
  it('série de 1 ponto', () => {
    expect(naive([7], 3)).toEqual({ fit: [7], forecast: [7, 7, 7] })
  })
})

describe('Média Móvel (SPEC-FCS-02)', () => {
  it('preserva a particularidade P1: a previsão exclui a última observação', () => {
    const r = simpleMovingAverage([1, 2, 3, 4, 5, 6], 2)!
    expect(r.fit).toEqual([2, 2, 2, 2, 3, 4])
    expect(r.forecast).toEqual([4, 4]) // média de 3,4,5 — o 6 fica de fora
  })
  it('com n = janela, todo o ajuste é a média das observações', () => {
    expect(simpleMovingAverage([3, 6, 9], 1)!.fit).toEqual([6, 6, 6])
  })
  it('n < janela → indisponível; janela 4 usa o mesmo procedimento', () => {
    expect(simpleMovingAverage([1, 2], 3)).toBeNull()
    expect(simpleMovingAverage([1, 2, 3, 4, 5, 6, 7], 1, 4)!.forecast).toEqual([4.5]) // média de y[2..5] = 3,4,5,6
  })
})

describe('SES (SPEC-FCS-03)', () => {
  it('n < 10: nível inicial = primeira observação', () => {
    const r = ses([10, 12, 14], 2)
    expect(r.fit[0]).toBe(10)
    expect(r.fit[1]).toBe(10)
    expect(r.fit[2]).toBeCloseTo(10.4, 12)
    expect(r.forecast[0]).toBeCloseTo(11.12, 12)
    expect(r.forecast[1]).toBeCloseTo(11.12, 12)
  })
  it('n ≥ 10: nível inicial pela regressão das 10 primeiras observações', () => {
    const y = Array.from({ length: 12 }, (_, t) => 100 + 5 * t)
    expect(ses(y, 1).fit[0]).toBeCloseTo(95, 10) // intercepto − inclinação = 100 − 5
  })
  it('série constante → previsão = constante', () => {
    expect(ses(new Array(15).fill(8), 3).forecast).toEqual([8, 8, 8])
  })
})

describe('Holt (SPEC-FCS-04)', () => {
  it('reproduz exatamente uma reta', () => {
    const y = Array.from({ length: 20 }, (_, t) => 3 + 2 * t)
    const r = holt(y, 3)!
    expect(r.forecast[0]).toBeCloseTo(3 + 2 * 20, 4)
    expect(r.forecast[2]).toBeCloseTo(3 + 2 * 22, 4)
    r.fit.forEach((f, t) => expect(f).toBeCloseTo(y[t], 4))
  })
  it('série constante tem tendência zero', () => {
    const r = holt(new Array(12).fill(50), 4)!
    r.forecast.forEach((f) => expect(f).toBeCloseTo(50, 6))
  })
  it('série com 2 pontos ajusta exatamente; com 1 ponto é indisponível', () => {
    expect(holt([10, 14], 2)!.forecast[0]).toBeCloseTo(18, 5)
    expect(holt([10], 2)).toBeNull()
  })
})

describe('Holt-Winters (SPEC-FCS-05)', () => {
  const season = [10, -5, 0, -5]
  const y = Array.from({ length: 24 }, (_, t) => 100 + 2 * t + season[t % 4])

  it('reproduz tendência e sazonalidade aditivas exatas', () => {
    const r = holtWinters(y, 8, 4)!
    for (let k = 0; k < 8; k++) expect(r.forecast[k]).toBeCloseTo(100 + 2 * (24 + k) + season[(24 + k) % 4], 3)
    expect(r.fit).toHaveLength(24)
  })
  it('exige dois ciclos completos (n ≥ 2m)', () => {
    expect(holtWinters(y.slice(0, 7), 2, 4)).toBeNull()
    expect(holtWinters(y.slice(0, 8), 2, 4)).not.toBeNull()
    expect(holtWinters(y, 2, 1)).toBeNull()
  })
})

describe('Regressão linear (SPEC-FCS-06)', () => {
  it('ajusta a reta e limita a 0', () => {
    const r = linearRegression([10, 8, 6, 4], 3)
    expect(r.fit).toEqual([10, 8, 6, 4])
    expect(r.forecast).toEqual([2, 0, 0])
  })
  it('1 ponto e série constante', () => {
    expect(linearRegression([5], 2)).toEqual({ fit: [5], forecast: [5, 5] })
    expect(linearRegression([4, 4, 4], 1).forecast).toEqual([4])
  })
})

describe('Croston (SPEC-FCS-07)', () => {
  it('segue as recursões do original', () => {
    const r = croston([0, 0, 5, 0, 10], 2)
    expect(r.fit[0]).toBe(2.5)
    expect(r.fit[1]).toBe(2.5)
    // t=2: y>0 com q=2 → período 0,1·2 + 0,9·2 = 2; nível 5 → 2,5 · t=4: nível 5,5, período 2 → 2,75
    expect(r.fit[2]).toBeCloseTo(2.5, 12)
    expect(r.fit[3]).toBeCloseTo(2.5, 12)
    expect(r.fit[4]).toBeCloseTo(2.75, 12)
    expect(r.forecast).toEqual([2.75, 2.75])
  })
  it('primeira observação positiva no índice 0 → período inicial 1', () => {
    expect(croston([4, 0, 0], 1).fit[0]).toBe(4)
  })
  it('sem demanda: ajuste = série e previsão zero', () => {
    expect(croston([0, 0, 0], 2)).toEqual({ fit: [0, 0, 0], forecast: [0, 0] })
  })
})

describe('runAll (SPEC-FCS-08)', () => {
  it('roda os 7 modelos na ordem do original', () => {
    const y = Array.from({ length: 30 }, (_, t) => 50 + (t % 7))
    expect(Object.keys(runAll(y, 3, 7))).toEqual(['Naive', 'Média Móvel', 'SES', 'Holt', 'Holt-Winters', 'Regressão', 'Croston'])
  })
  it('omite indisponíveis: n < 3 sem Média Móvel; n < 2m sem Holt-Winters', () => {
    expect(Object.keys(runAll([1, 2], 2, 12))).toEqual(['Naive', 'SES', 'Holt', 'Regressão', 'Croston'])
    expect(Object.keys(runAll([1, 2, 3, 4, 5], 2, 12))).not.toContain('Holt-Winters')
  })
})

describe('availableModels (SPEC-FCS-08)', () => {
  it('coincide com os modelos que runAll de fato ajusta', () => {
    for (const n of [1, 2, 3, 5, 10, 23, 24, 30]) {
      const y = Array.from({ length: n }, (_, t) => 10 + (t % 5))
      expect(availableModels(n, 12)).toEqual(Object.keys(runAll(y, 2, 12)))
    }
    expect(availableModels(0, 12)).toEqual([])
  })
})

describe('runModels (SPEC-FCS-09)', () => {
  it('limita previsões a ≥ 0 e calcula sigma populacional dos resíduos sem o 1º ponto', () => {
    const y = [10, 8, 6, 4, 2]
    const r = runModels(y, 3, 12)
    expect(r.Regressão!.forecast.every((v) => v >= 0)).toBe(true)
    const naiveRes = [8 - 10, 6 - 8, 4 - 6, 2 - 4] // resíduos do Naive sem o 1º ponto: todos −2
    expect(r.Naive!.sigma).toBeCloseTo(0, 12)
    expect(naiveRes.every((v) => v === -2)).toBe(true)
  })
  it('com ≤ 1 resíduo, sigma = 0', () => {
    expect(runModels([5, 7], 1, 12).Naive!.sigma).toBe(0)
  })
  it('paridade do sigma e da previsão limitada com o run_models do original', () => {
    for (const sku of listSkus(records)) {
      const ref = G[sku].ME
      const res = runModels(valuesOf(seriesFor(records, sku, 'ME')), ref.h, ref.m)
      for (const name of ref.order.filter((n) => ['Naive', 'Média Móvel', 'SES', 'Regressão', 'Croston'].includes(n))) {
        expect(close(res[name as ModelName]!.sigma, ref.models[name].sigma, 1e-9)).toBe(true)
        res[name as ModelName]!.forecast.forEach((v, i) => expect(close(v, ref.models[name].forecast[i], 1e-9)).toBe(true))
      }
    }
  })
})

describe('paridade com o Python original (SPEC-FCS-10)', () => {
  const DETERMINISTIC = ['Naive', 'Média Móvel', 'SES', 'Regressão', 'Croston']
  for (const sku of listSkus(records)) {
    for (const freq of ['ME', 'W', 'D'] as Freq[]) {
      it(`${sku} · ${freq}`, () => {
        const ref = G[sku][freq]
        const y = valuesOf(seriesFor(records, sku, freq))
        const res = runAll(y, ref.h, ref.m)
        expect(Object.keys(res)).toEqual(ref.order)
        for (const name of ref.order) {
          const mine = res[name as ModelName]!
          const r = ref.models[name]
          if (DETERMINISTIC.includes(name)) {
            mine.forecast.forEach((v, i) => expect(close(v, r.forecast_raw[i])).toBe(true))
            if (r.fit) r.fit.forEach((v, t) => expect(close(mine.fit[t], v)).toBe(true))
            else expect(close(mine.fit.slice(0, 6).reduce((a, b) => a + b, 0), r.fit_head!.reduce((a, b) => a + b, 0))).toBe(true)
          } else {
            const sse = mine.fit.reduce((a, f, t) => a + (y[t] - f) ** 2, 0)
            expect(sse).toBeLessThanOrEqual(r.sse! * (1 + 1e-6))
            const ratio = sum(mine.forecast) / sum(r.forecast_raw)
            expect(Math.abs(ratio - 1)).toBeLessThanOrEqual(name === 'Holt' ? 0.02 : 0.15)
          }
        }
      })
    }
  }
})

describe('determinismo e desempenho (SPEC-FCS-11)', () => {
  it('mesma entrada, mesma saída', () => {
    const y = valuesOf(seriesFor(records, 'Camiseta Promocional', 'ME'))
    expect(runAll(y, 6, 12)).toEqual(runAll(y, 6, 12))
  })
  it('série semanal de 208 pontos com m = 52 em menos de 1,5 s', () => {
    const y = valuesOf(seriesFor(records, 'Agua Mineral 500ml', 'W'))
    expect(y).toHaveLength(208)
    // melhor de 3 execuções: os arquivos de teste rodam em paralelo e uma medida isolada oscila com a carga da máquina
    const times = [0, 1, 2].map(() => {
      const t0 = performance.now()
      runAll(y, 12, SEASON.W)
      return performance.now() - t0
    })
    expect(Math.min(...times)).toBeLessThan(1500)
  })
})

describe('confidenceBand (SPEC-FCS-12)', () => {
  it('80% e 95% com fator min(√passo, 3)', () => {
    const fc = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100]
    const b80 = confidenceBand(fc, 10, '80%')
    expect(b80.sup[0]).toBeCloseTo(100 + 1.2816 * 10 * 1, 10)
    expect(b80.sup[3]).toBeCloseTo(100 + 1.2816 * 10 * 2, 10)
    expect(b80.sup[9]).toBeCloseTo(100 + 1.2816 * 10 * 3, 10) // √10 > 3 → limitado a 3
    const b95 = confidenceBand(fc, 10, '95%')
    expect(b95.inf[0]).toBeCloseTo(100 - 1.96 * 10, 10)
  })
  it('limite inferior com piso em 0', () => {
    expect(confidenceBand([5], 100, '95%').inf).toEqual([0])
  })
})

describe('entradas inválidas (SPEC-FCS-13)', () => {
  it('série vazia, h < 1 ou valores não finitos → nenhum modelo', () => {
    expect(runAll([], 3, 12)).toEqual({})
    expect(runAll([1, 2, 3], 0, 12)).toEqual({})
    expect(runAll([1, NaN, 3], 2, 12)).toEqual({})
    expect(runAll([1, Infinity, 3], 2, 12)).toEqual({})
    expect(runModels([], 3, 12)).toEqual({})
  })
})

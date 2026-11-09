import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildDemoRecords } from '../data/demo'
import { listSkus } from '../data/summary'
import { seriesFor, valuesOf } from '../series/aggregate'
import { buildConsensus, cpfrStatistical, sanitizePartnerValue, STATUS_LABEL } from '../cpfr/cpfr'
import { applyLinear, applyPromotion, buildScenario, clampPromoWeeks, defaultPromoWeeks, scenarioTable } from './scenarios'
import cpfrGolden from '../__golden__/cpfr.json'

const records = buildDemoRecords(readFileSync(resolve(process.cwd(), 'src/assets/demo_dataset.csv'), 'utf8'))

describe('applyLinear (SPEC-SCN-01)', () => {
  it('multiplica por (1 + pct/100) sem alterar a entrada', () => {
    const base = [100, 200]
    expect(applyLinear(base, -50)).toEqual([50, 100])
    expect(applyLinear(base, 0)).toEqual([100, 200])
    expect(base).toEqual([100, 200])
  })
})

describe('applyPromotion (SPEC-SCN-02)', () => {
  it('aplica só nas posições indicadas e ignora índices fora do intervalo', () => {
    const base = [100, 100, 100]
    expect(applyPromotion(base, [0, 2, 9, -1], 30)).toEqual([130, 100, 130])
    expect(base).toEqual([100, 100, 100])
  })
})

describe('buildScenario (SPEC-SCN-03)', () => {
  it('choque primeiro, promoção depois; calcula agregados e pico', () => {
    const s = buildScenario([100, 100, 100, 100], 10, [2, 4], 50)
    expect(s.cenario[0]).toBeCloseTo(110, 10)
    expect(s.cenario[1]).toBeCloseTo(165, 10) // 100 × 1,1 × 1,5
    expect(s.volumeBase).toBe(400)
    expect(s.volumeCenario).toBeCloseTo(110 + 165 + 110 + 165, 10)
    expect(s.incremental).toBeCloseTo(s.volumeCenario - 400, 10)
    expect(s.variacaoPct).toBeCloseTo(((550 - 400) / 400) * 100, 10)
    expect([s.picoValor, s.picoIndice]).toEqual([s.cenario[1], 1])
    expect(s.efeito[0]).toBeCloseTo(10, 10)
  })

  it('base zerada: variação 0 sem dividir por zero', () => {
    expect(buildScenario([0, 0], 20, [1], 30).variacaoPct).toBe(0)
  })
})

describe('semanas de promoção (SPEC-SCN-04)', () => {
  it('padrão 4 e 8 filtradas pelo horizonte; descarta semanas além de h', () => {
    expect(defaultPromoWeeks(12)).toEqual([4, 8])
    expect(defaultPromoWeeks(6)).toEqual([4])
    expect(defaultPromoWeeks(4)).toEqual([4])
    expect(defaultPromoWeeks(3)).toEqual([])
    expect(clampPromoWeeks([4, 8, 10], 8)).toEqual([4, 8])
  })
})

describe('scenarioTable (SPEC-SCN-05)', () => {
  it('linhas com semana, data, valores arredondados, promoção e variação', () => {
    const rows = scenarioTable([100.4, 0], [130.6, 5], ['2027-01-03', '2027-01-10'], [1])
    expect(rows[0]).toEqual({ semana: 'Semana 1', data: '2027-01-03', base: 100, cenario: 131, promocao: true, variacaoPct: 31 })
    expect(rows[1]).toMatchObject({ semana: 'Semana 2', promocao: false, variacaoPct: 0 })
  })
})

describe('cpfrStatistical (SPEC-CPF-01)', () => {
  it('bate com o Python (média móvel de janela 4, arredondada como np.round)', () => {
    for (const sku of listSkus(records)) {
      const weekly = valuesOf(seriesFor(records, sku, 'W'))
      expect(cpfrStatistical(weekly, 8)).toEqual((cpfrGolden as Record<string, { stat: number[] }>)[sku].stat)
    }
  })

  it('arredonda empates para o par e devolve null com menos de 4 pontos', () => {
    expect(cpfrStatistical([2, 2, 3, 3, 9], 1)).toEqual([2]) // média de y[0..3]=2,5 → 2 (par)
    expect(cpfrStatistical([3, 3, 3, 4, 9], 1)).toEqual([3]) // 3,25 → 3
    expect(cpfrStatistical([1, 2, 3], 2)).toBeNull()
  })
})

describe('buildConsensus (SPEC-CPF-02, SPEC-CPF-03, SPEC-CPF-04)', () => {
  it('divergência e status com limites exatos', () => {
    const c = buildConsensus([100, 100, 100, 100, 0], [100, 120, 80, 119, 50], 20)
    expect(c.rows.map((r) => r.divergenciaPct)).toEqual([0, 20, -20, 19, 0]) // sistema 0 → divergência 0
    expect(c.rows.map((r) => r.status)).toEqual(['Alinhado', 'Risco de ruptura', 'Risco de excesso', 'Alinhado', 'Alinhado'])
    expect(c.rows.map((r) => r.critico)).toEqual([false, true, true, false, false])
  })

  it('agregados', () => {
    const c = buildConsensus([100, 100], [150, 100], 20)
    expect([c.criticos, c.alinhadas, c.aderenciaPct]).toEqual([1, 1, 50])
    expect([c.totalSistema, c.totalParceiro]).toEqual([200, 250])
    expect(c.divergenciaTotalPct).toBe(25)
    expect(buildConsensus([0], [5], 20).divergenciaTotalPct).toBe(500) // divide por max(Σsistema, 1)
  })

  it('rótulos dos status', () => {
    expect(STATUS_LABEL).toEqual({ Alinhado: '✅ Alinhado', 'Risco de ruptura': '🔺 Risco de ruptura', 'Risco de excesso': '🔻 Risco de excesso' })
  })
})

describe('sanitizePartnerValue (SPEC-CPF-05)', () => {
  it('só inteiros ≥ 0', () => {
    expect(sanitizePartnerValue('12')).toBe(12)
    expect(sanitizePartnerValue('12,6')).toBe(13)
    expect(sanitizePartnerValue('-5')).toBe(0)
    expect(sanitizePartnerValue('abc')).toBe(0)
    expect(sanitizePartnerValue('')).toBe(0)
    expect(sanitizePartnerValue(7.4)).toBe(7)
  })
})

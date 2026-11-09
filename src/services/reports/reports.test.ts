import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildDemoRecords } from '../data/demo'
import { listSkus } from '../data/summary'
import { buildReport, portfolioReport, recommendations, reportSummary, reportText } from './report'

const records = buildDemoRecords(readFileSync(resolve(process.cwd(), 'src/assets/demo_dataset.csv'), 'utf8'))
const skus = listSkus(records)

describe('recommendations (SPEC-REL-01)', () => {
  it('texto da classe + viés + modelo, na ordem', () => {
    const r = recommendations('Crescente', 0, 'Holt', 100)
    expect(r).toHaveLength(3)
    expect(r[0]).toBe('O produto apresenta **tendência clara de crescimento**; revise níveis de estoque de segurança e capacidade de reposição.')
    expect(r[1]).toBe('O viés do modelo está **sob controle** (0,0% do volume real no teste).')
    expect(r[2]).toBe('🎯 Com base no backtesting, recomenda-se adotar o método **Holt** no planejamento.')
  })

  it('superestima acima de +5% e subestima abaixo de −5%; ±5 exato é "sob controle"', () => {
    expect(recommendations('Estável', 6, 'SES', 100)[1]).toBe('⚠️ O modelo tende a **superestimar** a demanda (+6,0%) — risco de excesso de estoque.')
    expect(recommendations('Estável', -6, 'SES', 100)[1]).toBe('⚠️ O modelo tende a **subestimar** a demanda (-6,0%) — risco de ruptura e venda perdida.')
    expect(recommendations('Estável', 5, 'SES', 100)[1]).toContain('sob controle')
    expect(recommendations('Estável', -5, 'SES', 100)[1]).toContain('sob controle')
    expect(recommendations('Estável', 50, 'SES', 0)[1]).toContain('(0,0% do volume')
  })

  it('"Sem Dados" não gera linha de classe; as seis classes têm texto', () => {
    expect(recommendations('Sem Dados', 0, 'X', 1)).toHaveLength(2)
    for (const c of ['Estável', 'Crescente', 'Decrescente', 'Irregular', 'Intermitente', 'Sazonal/Variável'] as const) {
      expect(recommendations(c, 0, 'X', 1)).toHaveLength(3)
    }
  })
})

describe('reportText (SPEC-REL-02)', () => {
  it('cabeçalho, data e uma linha por recomendação sem negrito', () => {
    const txt = reportText('SKU 1', new Date(2026, 10, 9, 14, 5), ['a **b** c', 'd'])
    expect(txt).toBe('LAUDO DE DEMANDA — SKU 1\nGerado em 09/11/2026 14:05\n\n- a b c\n- d')
  })
})

describe('buildReport (SPEC-REL-03, SPEC-REL-04)', () => {
  const agora = new Date(2026, 10, 9, 10, 0)
  const sku = 'Smartphone TechX'
  const report = buildReport(records, sku, agora)!

  it('usa a série semanal, o melhor modelo e 12 semanas de projeção (SPEC-REL-03)', () => {
    expect(report.classe).toBe('Crescente')
    expect(report.projecao).toHaveLength(12)
    expect(report.projecaoDatas).toHaveLength(12)
    expect(report.modelo).toBe(report.metricas[0].Modelo)
    expect(report.acuracia).toBeCloseTo(100 - report.metricas[0]['WAPE (%)'], 10)
    expect(report.geradoEm).toBe(agora)
    expect(report.recomendacoes).toHaveLength(3)
    expect(report.projecao.every((v) => v >= 0)).toBe(true)
  })

  it('SKU sem dados → null (SPEC-REL-03)', () => {
    expect(buildReport(records, 'zzz', agora)).toBeNull()
  })

  it('resumo na ordem e formato do original (SPEC-REL-04)', () => {
    const rows = reportSummary(report)
    expect(rows.map((r) => r.Indicador)).toEqual(['SKU', 'Perfil', 'Motivo', 'Volume total', 'Média semanal', 'Coef. variação', 'Crescimento (%)', 'Modelo recomendado', 'WAPE (%)'])
    expect(rows[0].Valor).toBe(sku)
    expect(rows[1].Valor).toBe('Crescente')
    expect(rows.every((r) => typeof r.Valor === 'string')).toBe(true)
    expect(rows[4].Valor).toBe(String(Math.round(report.indicators.media * 100) / 100))
  })
})

describe('portfolioReport (SPEC-REL-05)', () => {
  it('uma linha por SKU em ordem alfabética, com progresso', () => {
    const calls: string[] = []
    const rows = portfolioReport(records, (i, total, sku) => calls.push(`${i + 1}/${total} ${sku}`))
    expect(rows.map((r) => r.sku)).toEqual(skus)
    expect(calls[0]).toBe('1/5 Agua Mineral 500ml')
    expect(calls).toHaveLength(5)
    for (const r of rows) {
      expect(r.tendencia).toHaveLength(52)
      expect(r.volume52).toBe(r.tendencia.reduce((a, b) => a + b, 0))
      expect(r.acuracia === null || r.acuracia <= 100).toBe(true)
    }
  })
})

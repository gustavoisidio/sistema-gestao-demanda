import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { applyDefaultTreatment } from './clean'
import { parseCsvText } from './parse'
import { datasetSummary, listSkus, problemCount, qualityScore } from './summary'
import { DEMO_ORIGIN, fileOrigin, templateCsv } from './template'
import { validateData } from './validate'
import { buildDemoRecords } from './demo'
import type { RawRow } from '../../types'
import golden from '../__golden__/data.json'

const demoText = readFileSync(resolve(process.cwd(), 'src/assets/demo_dataset.csv'), 'utf8')

// as mesmas linhas sintéticas usadas pelo gerador Python (scripts/golden/generate.py), com a data impossível já trocada
const synthetic: RawRow[] = [
  { sku: 'A', data: '2025-01-01', quantidade_vendida: '10' },
  { sku: 'A', data: '2025-01-02', quantidade_vendida: '-5' },
  { sku: 'A', data: '2025-01-02', quantidade_vendida: '7' },
  { sku: 'B', data: '2025-01-01', quantidade_vendida: '' },
  { sku: 'B', data: '2025-02-03', quantidade_vendida: '3' },
  { sku: 'C', data: '2025-01-03', quantidade_vendida: '4' },
  { sku: '', data: '2025-01-03', quantidade_vendida: '9' },
]

describe('validateData (SPEC-DAT-08)', () => {
  it('bate com o validar_dados do Python original', () => {
    const v = validateData(synthetic)
    expect(v.nulos).toBe(golden.alertas.valores_nulos)
    expect(v.negativos).toBe(golden.alertas.valores_negativos)
    expect(v.duplicadas).toBe(golden.alertas.linhas_duplicadas)
    expect(v.datasInvalidas).toBe(0)
    expect(v.todasDatasInvalidas).toBe(false)
  })

  it('conta datas inválidas sem bloquear; bloqueia só quando nenhuma data é válida', () => {
    const some = validateData([...synthetic, { sku: 'A', data: 'ontem', quantidade_vendida: '1' }])
    expect(some.datasInvalidas).toBe(1)
    expect(some.todasDatasInvalidas).toBe(false)
    const all = validateData([{ sku: 'A', data: 'x', quantidade_vendida: '1' }, { sku: 'A', data: 'y', quantidade_vendida: '2' }])
    expect(all.todasDatasInvalidas).toBe(true)
    expect(validateData([]).todasDatasInvalidas).toBe(false)
  })

  it('quantidade não numérica conta como nulo', () => {
    expect(validateData([{ sku: 'A', data: '2025-01-01', quantidade_vendida: 'abc' }]).nulos).toBe(1)
  })
})

describe('applyDefaultTreatment (SPEC-DAT-09)', () => {
  it('bate com aplicar_tratamento_padrao do Python original', () => {
    const out = applyDefaultTreatment(synthetic)
    expect(out.map((r) => ({ sku: r.sku, data: r.data, q: r.quantidade_vendida }))).toEqual(golden.treated)
  })

  it('mantém duplicatas, não altera a entrada e é estável', () => {
    const input: RawRow[] = [
      { sku: 'B', data: '2025-01-01', quantidade_vendida: '1' },
      { sku: 'A', data: '2025-01-02', quantidade_vendida: '2' },
      { sku: 'A', data: '2025-01-02', quantidade_vendida: '3' },
    ]
    const copy = JSON.stringify(input)
    const out = applyDefaultTreatment(input)
    expect(out.map((r) => r.quantidade_vendida)).toEqual([2, 3, 1])
    expect(JSON.stringify(input)).toBe(copy)
  })

  it('ordena SKUs por ponto de código e descarta sku vazio/data inválida', () => {
    const out = applyDefaultTreatment([
      { sku: 'b', data: '2025-01-01', quantidade_vendida: '1' },
      { sku: 'B', data: '2025-01-01', quantidade_vendida: '1' },
      { sku: '  ', data: '2025-01-01', quantidade_vendida: '1' },
      { sku: 'C', data: 'nada', quantidade_vendida: '1' },
    ])
    expect(out.map((r) => r.sku)).toEqual(['B', 'b'])
  })
})

describe('datasetSummary / qualityScore (SPEC-DAT-10, SPEC-DAT-11)', () => {
  it('resume a base (SPEC-DAT-10)', () => {
    const s = datasetSummary(applyDefaultTreatment(synthetic))
    expect(s).toEqual({ registros: 6, skus: 3, inicio: '2025-01-01', fim: '2025-02-03', volume: 24 })
    expect(listSkus(applyDefaultTreatment(synthetic))).toEqual(['A', 'B', 'C'])
  })

  it('índice de qualidade (SPEC-DAT-11)', () => {
    expect(qualityScore(0, 100)).toBe(100)
    expect(qualityScore(10, 100)).toBe(0)
    expect(qualityScore(5, 100)).toBe(50)
    expect(qualityScore(50, 100)).toBe(0)
    expect(qualityScore(3, 0)).toBe(0)
    const v = validateData(synthetic)
    expect(problemCount(v)).toBe(3)
    expect(qualityScore(problemCount(v), synthetic.length)).toBe(0) // 3 de 7 linhas: 100 − 428 → piso em 0
  })
})

describe('modelo CSV e origens (SPEC-DAT-12, SPEC-DAT-14)', () => {
  it('templateCsv é exatamente o modelo do original (SPEC-DAT-12)', () => {
    expect(templateCsv()).toBe('sku,data,quantidade_vendida\nPROD_A,2025-01-01,120\nPROD_A,2025-01-02,98\nPROD_B,2025-01-01,40\n')
  })

  it('origens (SPEC-DAT-14)', () => {
    expect(fileOrigin('vendas.csv')).toBe('Arquivo · vendas.csv')
    expect(DEMO_ORIGIN).toBe('Base de demonstração')
  })
})

describe('base de demonstração (SPEC-DAT-13)', () => {
  it('7.280 linhas, 5 SKUs, 1.456 dias cada, sem problemas', () => {
    const table = parseCsvText(demoText)
    expect(table.ok).toBe(true)
    if (!table.ok) return
    const v = validateData(table.table.rows)
    expect([v.nulos, v.negativos, v.duplicadas, v.datasInvalidas]).toEqual([0, 0, 0, 0])
    const recs = buildDemoRecords(demoText)
    expect(recs).toHaveLength(7280)
    expect(listSkus(recs)).toEqual(['Agua Mineral 500ml', 'Camiseta Promocional', 'Placa Mae Servidor', 'Protetor Solar FPS50', 'Smartphone TechX'])
    expect(recs.filter((r) => r.sku === 'Smartphone TechX')).toHaveLength(1456)
    const s = datasetSummary(recs)
    expect([s.inicio, s.fim]).toEqual(['2023-01-02', '2026-12-27'])
  })

  it('buildDemoRecords lança com texto inválido', () => {
    expect(() => buildDemoRecords('')).toThrow()
  })
})

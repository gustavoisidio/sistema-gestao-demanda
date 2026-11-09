import { parseCsvText, parseSpreadsheet } from '../data/parse'
import { fileNames, safeFileName, SHEETS, toCsv, toExcel } from './export'

describe('toExcel (SPEC-EXP-01)', () => {
  it('uma aba por chave, relida pelo parser com as mesmas linhas e datas ISO', async () => {
    const rows = [
      { Período: '2027-01-03', Previsão: 120, 'Limite inferior (80%)': 100 },
      { Período: '2027-01-10', Previsão: 130.5, 'Limite inferior (80%)': null },
    ]
    const buf = await toExcel({ Previsao: rows })
    const r = await parseSpreadsheet(buf)
    expect(r.ok && r.table.columns).toEqual(['período', 'previsão', 'limite_inferior_(80%)'])
    expect(r.ok && r.table.rows[0]).toEqual({ período: '2027-01-03', previsão: '120', 'limite_inferior_(80%)': '100' })
    expect(r.ok && r.table.rows[1]['limite_inferior_(80%)']).toBe('')
  })

  it('trunca nome de aba em 31 caracteres, grava NaN como vazio e booleanos', async () => {
    const XLSX = await import('xlsx')
    const long = 'a'.repeat(40)
    const buf = await toExcel({ [long]: [{ x: NaN, y: true }], Outra: [{ a: 1 }] })
    const wb = XLSX.read(buf, { type: 'array' })
    expect(wb.SheetNames).toEqual(['a'.repeat(31), 'Outra'])
    expect(wb.Sheets['a'.repeat(31)]['A2']).toBeUndefined()
    expect(wb.Sheets['a'.repeat(31)]['B2'].v).toBe(true)
  })

  it('aba sem linhas só tem o cabeçalho vazio e não quebra', async () => {
    const buf = await toExcel({ Vazia: [] })
    expect(buf.byteLength).toBeGreaterThan(100)
  })
})

describe('toCsv (SPEC-EXP-02)', () => {
  it('cabeçalho, vírgula, escape, datas ISO e vazios', () => {
    const csv = toCsv([
      { sku: 'Água, 500ml', data: '2027-01-03', q: 1.5, n: null },
      { sku: 'Say "hi"', data: '2027-01-10', q: NaN, n: 2 },
    ])
    expect(csv).toBe('sku,data,q,n\n"Água, 500ml",2027-01-03,1.5,\n"Say ""hi""",2027-01-10,,2')
  })

  it('ida e volta pelo leitor de CSV', () => {
    const r = parseCsvText(toCsv([{ sku: 'A', data: '2025-01-01', quantidade_vendida: 3 }]))
    expect(r.ok && r.table.rows[0]).toEqual({ sku: 'A', data: '2025-01-01', quantidade_vendida: '3' })
  })
})

describe('nomes de arquivo e abas (SPEC-EXP-03, SPEC-EXP-04)', () => {
  it('nomes do original (SPEC-EXP-03)', () => {
    expect(fileNames.forecastXlsx('Smartphone TechX', 'Mensal')).toBe('previsao_Smartphone TechX_mensal.xlsx')
    expect(fileNames.forecastCsv('A')).toBe('previsao_A.csv')
    expect(fileNames.scenario('A')).toBe('cenario_A.xlsx')
    expect(fileNames.cpfr('A')).toBe('cpfr_A.xlsx')
    expect(fileNames.reportXlsx('A')).toBe('laudo_A.xlsx')
    expect(fileNames.historyCsv('A')).toBe('historico_A.csv')
    expect(fileNames.reportTxt('A')).toBe('laudo_A.txt')
    expect(fileNames.portfolio).toBe('portfolio.xlsx')
    expect(fileNames.template).toBe('modelo_importacao.csv')
  })
  it('caracteres inválidos viram _ (SPEC-EXP-03)', () => {
    expect(safeFileName('a/b\\c:d*e?f"g<h>i|j')).toBe('a_b_c_d_e_f_g_h_i_j')
    expect(fileNames.reportXlsx('PROD/A')).toBe('laudo_PROD_A.xlsx')
  })
  it('abas (SPEC-EXP-04)', () => {
    expect(SHEETS).toEqual({
      forecast: 'Previsao', scenario: 'Cenario', cpfr: 'CPFR', portfolio: 'Portfolio',
      report: { summary: 'Resumo', metrics: 'Metricas', forecast: 'Previsao', history: 'Historico' },
    })
  })
})

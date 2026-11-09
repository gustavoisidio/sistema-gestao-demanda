import { loadFile, parseCsvText, parseSpreadsheet } from './parse'
import type { FileLike } from './parse'

const file = (name: string, content = ''): FileLike => ({
  name,
  text: async () => content,
  arrayBuffer: async () => new TextEncoder().encode(content).buffer as ArrayBuffer,
})

describe('parseCsvText (SPEC-DAT-01, SPEC-DAT-02)', () => {
  it('normaliza cabeçalhos (minúsculas, espaço → _) e preserva colunas extras (SPEC-DAT-01)', () => {
    const r = parseCsvText('SKU,Data,Quantidade Vendida,Preço Unitário\nA,2025-01-01,10,5\n')
    expect(r.ok && r.table.columns).toEqual(['sku', 'data', 'quantidade_vendida', 'preço_unitário'])
    expect(r.ok && r.table.rows[0]).toEqual({ sku: 'A', data: '2025-01-01', quantidade_vendida: '10', 'preço_unitário': '5' })
  })

  it('descarta BOM, aceita CRLF e ignora linhas vazias', () => {
    const r = parseCsvText(String.fromCharCode(0xfeff) + 'sku,data,quantidade_vendida\r\nA,2025-01-01,10\r\n\r\nB,2025-01-02,20\r\n\r\n')
    expect(r.ok && r.table.columns[0]).toBe('sku')
    expect(r.ok && r.table.rows).toHaveLength(2)
  })

  it('detecta ponto e vírgula e tab como delimitador', () => {
    const semi = parseCsvText('sku;data;quantidade_vendida\nA;2025-01-01;10,5\n')
    expect(semi.ok && semi.table.rows[0].quantidade_vendida).toBe('10,5')
    const tab = parseCsvText('sku\tdata\tquantidade_vendida\nA\t2025-01-01\t10\n')
    expect(tab.ok && tab.table.columns).toEqual(['sku', 'data', 'quantidade_vendida'])
  })

  it('campos entre aspas com vírgula interna', () => {
    const r = parseCsvText('sku,data,quantidade_vendida\n"Água, 500ml",2025-01-01,10\n')
    expect(r.ok && r.table.rows[0].sku).toBe('Água, 500ml')
  })

  it('erro legível para arquivo vazio ou sem linhas de dados', () => {
    expect(parseCsvText('')).toEqual({ ok: false, message: 'O arquivo está vazio.' })
    expect(parseCsvText('sku,data,quantidade_vendida\n')).toEqual({ ok: false, message: 'O arquivo não tem linhas de dados.' })
  })
})

describe('parseSpreadsheet (SPEC-DAT-03)', () => {
  async function workbook(build: (XLSX: typeof import('xlsx')) => import('xlsx').WorkSheet, extra?: boolean) {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, build(XLSX), 'Dados')
    if (extra) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['x'], ['y']]), 'Outra')
    return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  }

  it('lê a primeira aba, com cabeçalho normalizado', async () => {
    const buf = await workbook((X) => X.utils.aoa_to_sheet([['SKU', 'Data', 'Quantidade Vendida'], ['A', '2025-01-01', 10], ['B', '2025-01-02', 20.5]]), true)
    const r = await parseSpreadsheet(buf)
    expect(r.ok && r.table.columns).toEqual(['sku', 'data', 'quantidade_vendida'])
    expect(r.ok && r.table.rows).toEqual([
      { sku: 'A', data: '2025-01-01', quantidade_vendida: '10' },
      { sku: 'B', data: '2025-01-02', quantidade_vendida: '20.5' },
    ])
  })

  it('células de data viram YYYY-MM-DD sem depender do fuso', async () => {
    const buf = await workbook((X) => {
      const ws = X.utils.aoa_to_sheet([['sku', 'data', 'quantidade_vendida'], ['A', 45658, 10]])
      ws['B2'].z = 'dd/mm/yyyy' // 45658 = 2025-01-01
      return ws
    })
    const r = await parseSpreadsheet(buf)
    expect(r.ok && r.table.rows[0].data).toBe('2025-01-01')
  })

  it('planilha vazia devolve erro legível', async () => {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([]), 'Vazia')
    const r = await parseSpreadsheet(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer)
    expect(r).toEqual({ ok: false, message: 'A planilha está vazia.' })
  })
})

describe('loadFile (SPEC-DAT-04)', () => {
  it('escolhe o leitor pela extensão, sem diferenciar maiúsculas', async () => {
    const r = await loadFile(file('BASE.CSV', 'sku,data,quantidade_vendida\nA,2025-01-01,1\n'))
    expect(r.ok).toBe(true)
  })

  it('extensão desconhecida devolve "Formato não suportado."', async () => {
    expect(await loadFile(file('base.json', '{}'))).toEqual({ ok: false, message: 'Formato não suportado.' })
    expect(await loadFile(file('semextensao'))).toEqual({ ok: false, message: 'Formato não suportado.' })
  })

  it('falha de leitura vira { ok: false } e nunca lança', async () => {
    const quebrado: FileLike = { name: 'a.csv', text: async () => { throw new Error('disco falhou') }, arrayBuffer: async () => new ArrayBuffer(0) }
    expect(await loadFile(quebrado)).toEqual({ ok: false, message: 'disco falhou' })
    const xlsxRuim = await loadFile({ name: 'a.xlsx', text: async () => '', arrayBuffer: async () => new ArrayBuffer(0) })
    expect(xlsxRuim.ok).toBe(false)
  })
})

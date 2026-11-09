import { applyMapping, isMappingComplete, mappingOptions, missingRequired, normalizeColumnName } from './columns'

describe('colunas e mapeamento (SPEC-DAT-01, SPEC-DAT-05)', () => {
  it('normalizeColumnName (SPEC-DAT-01)', () => {
    expect(normalizeColumnName('Quantidade Vendida')).toBe('quantidade_vendida')
    expect(normalizeColumnName(String.fromCharCode(0xfeff) + 'SKU')).toBe('sku')
  })

  it('missingRequired devolve as ausentes na ordem do esquema (SPEC-DAT-05)', () => {
    expect(missingRequired(['sku', 'data', 'quantidade_vendida'])).toEqual([])
    expect(missingRequired(['produto', 'dia', 'qtd'])).toEqual(['sku', 'data', 'quantidade_vendida'])
    expect(missingRequired(['quantidade_vendida', 'sku', 'dia'])).toEqual(['data'])
  })

  it('mappingOptions exclui colunas com nome padrão (SPEC-DAT-05)', () => {
    expect(mappingOptions(['sku', 'dia', 'qtd', 'quantidade_vendida'])).toEqual(['dia', 'qtd'])
  })

  it('isMappingComplete rejeita incompleto e coluna repetida (SPEC-DAT-05)', () => {
    expect(isMappingComplete(['data', 'quantidade_vendida'], { data: 'dia' })).toBe(false)
    expect(isMappingComplete(['data', 'quantidade_vendida'], { data: 'dia', quantidade_vendida: 'dia' })).toBe(false)
    expect(isMappingComplete(['data', 'quantidade_vendida'], { data: 'dia', quantidade_vendida: 'qtd' })).toBe(true)
    expect(isMappingComplete([], {})).toBe(true)
  })

  it('applyMapping renomeia sem alterar valores nem a entrada (SPEC-DAT-05)', () => {
    const table = { columns: ['sku', 'dia', 'qtd'], rows: [{ sku: 'A', dia: '2025-01-01', qtd: '3' }] }
    const out = applyMapping(table, { data: 'dia', quantidade_vendida: 'qtd' })
    expect(out.columns).toEqual(['sku', 'data', 'quantidade_vendida'])
    expect(out.rows[0]).toEqual({ sku: 'A', data: '2025-01-01', quantidade_vendida: '3' })
    expect(table.columns).toEqual(['sku', 'dia', 'qtd'])
  })
})

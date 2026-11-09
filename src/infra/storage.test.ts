import { clearDataset, CURRENT_SCHEMA_VERSION, loadDataset, saveDataset } from './datasetStorage'
import { getItem, setItem } from './storage.service'
import { STORAGE_KEYS } from './storageKeys'

const recs = [{ sku: 'A', data: '2025-01-01', quantidade_vendida: 3 }]

beforeEach(() => localStorage.clear())

describe('storage.service e chaves (SPEC-PER-01)', () => {
  it('chaves travadas', () => {
    expect(STORAGE_KEYS).toEqual({ dataset: 'demanda_dataset_v1' })
  })
  it('get/set tipados; ausente ou corrompido → null', () => {
    expect(setItem('k', { a: 1 })).toBe(true)
    expect(getItem<{ a: number }>('k')).toEqual({ a: 1 })
    expect(getItem('nada')).toBeNull()
    localStorage.setItem('ruim', '{não é json')
    expect(getItem('ruim')).toBeNull()
  })
  it('gravação que falha devolve false e não lança', () => {
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new DOMException('cheio', 'QuotaExceededError') })
    expect(setItem('k', 1)).toBe(false)
    spy.mockRestore()
  })
})

describe('base salva (SPEC-PER-02, SPEC-PER-03)', () => {
  it('salva e restaura origem e registros', () => {
    expect(saveDataset('Base de demonstração', recs, new Date('2026-11-09T10:00:00Z'))).toBe(true)
    expect(loadDataset()).toEqual({ origem: 'Base de demonstração', registros: recs })
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.dataset)!)
    expect(raw).toMatchObject({ schemaVersion: CURRENT_SCHEMA_VERSION, salvoEm: '2026-11-09T10:00:00.000Z' })
  })
  it('versão desconhecida ou registros inválidos são descartados (SPEC-PER-02)', () => {
    localStorage.setItem(STORAGE_KEYS.dataset, JSON.stringify({ schemaVersion: 99, origem: 'x', registros: recs }))
    expect(loadDataset()).toBeNull()
    localStorage.setItem(STORAGE_KEYS.dataset, JSON.stringify({ schemaVersion: 1, origem: 'x', registros: [{ sku: 1 }] }))
    expect(loadDataset()).toBeNull()
    localStorage.setItem(STORAGE_KEYS.dataset, 'lixo')
    expect(loadDataset()).toBeNull()
  })
  it('clearDataset remove o registro (SPEC-PER-03)', () => {
    saveDataset('x', recs)
    clearDataset()
    expect(loadDataset()).toBeNull()
  })
  it('falha de gravação é sinalizada com false (SPEC-PER-04)', () => {
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('cota') })
    expect(saveDataset('x', recs)).toBe(false)
    spy.mockRestore()
  })
})

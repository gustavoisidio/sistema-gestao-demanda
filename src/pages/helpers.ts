import { useEffect, useState } from 'react'
import type { Freq } from '../types'
import { DEFAULT_H, MAX_H } from '../services/series/params'

/** Guarda um valor por chave (ex.: horizonte por granularidade), na sessão. */
export function useKeyedState<T>(initial: (key: string) => T) {
  const [store, setStore] = useState<Record<string, T>>({})
  const get = (key: string) => (key in store ? store[key] : initial(key))
  const set = (key: string, v: T) => setStore((s) => ({ ...s, [key]: v }))
  return [get, set] as const
}

export function defaultHorizon(freq: Freq) {
  return { value: DEFAULT_H[freq], max: MAX_H[freq] }
}

/**
 * Executa um cálculo pesado depois da pintura (para o aviso "Ajustando…" aparecer) e só entrega o
 * resultado quando ele corresponde à `key` atual; `pending` fica verdadeiro enquanto calcula.
 */
export function useDeferredCompute<T>(key: string, compute: () => T): { value: T | null; pending: boolean } {
  const [state, setState] = useState<{ key: string; value: T } | null>(null)
  useEffect(() => {
    const id = setTimeout(() => setState({ key, value: compute() }), 0)
    return () => clearTimeout(id)
    // `key` resume todas as entradas de `compute`: só recalcula quando ela muda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  const ready = state !== null && state.key === key
  return { value: ready ? state.value : null, pending: !ready }
}

const memoStore = new WeakMap<object, Map<string, unknown>>()

/** Memoiza um cálculo pesado por (base, chave): trocar de tela e voltar não recalcula. */
export function memoByRecords<T>(records: object, key: string, compute: () => T): T {
  let m = memoStore.get(records)
  if (!m) memoStore.set(records, (m = new Map()))
  if (!m.has(key)) m.set(key, compute())
  return m.get(key) as T
}

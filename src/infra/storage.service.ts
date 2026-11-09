/** Única camada que toca o localStorage (SPEC-PER-01). */

export function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? null : (JSON.parse(raw) as T)
  } catch {
    return null
  }
}

/** Devolve `true` se gravou; `false` em cota estourada, modo privado, etc. */
export function setItem<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function removeItem(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    /* sem armazenamento: nada a remover */
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const toHex = (c: number) => Math.round(c).toString(16).padStart(2, '0')

/** Escala contínua por interpolação linear entre as cores (t em 0…1, igualmente espaçadas). */
export function colorScale(stops: readonly string[]): (t: number) => string {
  const rgb = stops.map(hexToRgb)
  return (t) => {
    const x = Math.min(1, Math.max(0, t)) * (rgb.length - 1)
    const i = Math.min(rgb.length - 2, Math.floor(x))
    const f = x - i
    const [a, b] = [rgb[i], rgb[i + 1]]
    return `#${toHex(a[0] + (b[0] - a[0]) * f)}${toHex(a[1] + (b[1] - a[1]) * f)}${toHex(a[2] + (b[2] - a[2]) * f)}`.toUpperCase()
  }
}

/** Mapa de calor sequencial da Análise histórica (docs/mapeamento/02). */
export const SEQUENTIAL = colorScale(['#EEF2FF', '#818CF8', '#312E81'])
/** Mapa de calor divergente do Dashboard, centrado em 100 (docs/mapeamento/05). */
export const DIVERGING = colorScale(['#FDE68A', '#FFFFFF', '#4F46E5'])

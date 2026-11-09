/** Remove o BOM (U+FEFF) do início do texto. */
export function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s
}

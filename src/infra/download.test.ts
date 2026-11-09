import { downloadFile } from './download'

describe('downloadFile (SPEC-EXP-05)', () => {
  it('cria o link com o nome, clica e libera o URL', () => {
    vi.useFakeTimers()
    const created: string[] = []
    const revoked: string[] = []
    URL.createObjectURL = vi.fn(() => { created.push('blob:x'); return 'blob:x' })
    URL.revokeObjectURL = vi.fn((u: string) => { revoked.push(u) })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('arquivo.csv')
      expect(this.href).toBe('blob:x')
    })
    downloadFile('arquivo.csv', 'a,b', 'text/csv')
    expect(click).toHaveBeenCalledTimes(1)
    expect(document.querySelector('a[download]')).not.toBeNull()
    vi.advanceTimersByTime(1000)
    expect(document.querySelector('a[download]')).toBeNull()
    expect(revoked).toEqual(['blob:x'])
    vi.useRealTimers()
    click.mockRestore()
  })
})

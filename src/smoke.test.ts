describe('ambiente de testes', () => {
  it('roda o Vitest com jsdom', () => {
    expect(typeof document).toBe('object')
  })
})

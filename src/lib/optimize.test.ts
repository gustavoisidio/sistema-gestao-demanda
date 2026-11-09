import { multiStartNelderMead, nelderMead } from './optimize'

describe('lib/optimize (Nelder–Mead)', () => {
  it('encontra o mínimo de uma quadrática', () => {
    const r = nelderMead(([x, y]) => (x - 0.3) ** 2 + (y - 0.7) ** 2, [0.9, 0.1], { lower: [0, 0], upper: [1, 1] })
    expect(r.x[0]).toBeCloseTo(0.3, 4)
    expect(r.x[1]).toBeCloseTo(0.7, 4)
    expect(r.fx).toBeLessThan(1e-8)
  })

  it('respeita os limites quando o mínimo está fora da caixa', () => {
    const r = nelderMead(([x]) => (x - 5) ** 2, [0.5], { lower: [0], upper: [1] })
    expect(r.x[0]).toBeCloseTo(1, 6)
  })

  it('resolve Rosenbrock dentro da caixa', () => {
    const rosen = ([x, y]: number[]) => (1 - x) ** 2 + 100 * (y - x * x) ** 2
    const r = nelderMead(rosen, [0.2, 0.2], { lower: [0, 0], upper: [2, 2], maxIterations: 2000 })
    expect(r.x[0]).toBeCloseTo(1, 2)
    expect(r.x[1]).toBeCloseTo(1, 2)
  })

  it('é determinístico', () => {
    const f = ([x, y]: number[]) => Math.sin(5 * x) + (x - 0.5) ** 2 + (y - 0.2) ** 2
    const a = nelderMead(f, [0.1, 0.9], { lower: [0, 0], upper: [1, 1] })
    const b = nelderMead(f, [0.1, 0.9], { lower: [0, 0], upper: [1, 1] })
    expect(a).toEqual(b)
  })

  it('tolera funções que retornam NaN', () => {
    const r = nelderMead(([x]) => (x < 0.2 ? NaN : (x - 0.6) ** 2), [0.9], { lower: [0], upper: [1] })
    expect(r.x[0]).toBeCloseTo(0.6, 3)
  })

  it('multi-start escapa de mínimo local', () => {
    const f = ([x]: number[]) => (x < 0.5 ? 0.5 + (x - 0.2) ** 2 : (x - 0.8) ** 2)
    const r = multiStartNelderMead(f, [[0.1], [0.9]], { lower: [0], upper: [1] })
    expect(r.x[0]).toBeCloseTo(0.8, 3)
  })
})

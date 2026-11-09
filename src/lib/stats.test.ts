import { max, mean, min, nanMean, nanStd, olsLine, quantile, solveLinear, std, sum, variance } from './stats'

describe('lib/stats', () => {
  it('média e soma', () => {
    expect(sum([1, 2, 3])).toBe(6)
    expect(mean([1, 2, 3, 4])).toBe(2.5)
    expect(Number.isNaN(mean([]))).toBe(true)
    expect(nanMean([1, NaN, 3])).toBe(2)
  })

  it('desvio amostral (ddof 1) e populacional (ddof 0) como pandas/numpy', () => {
    const x = [2, 4, 4, 4, 5, 5, 7, 9]
    expect(std(x, 0)).toBeCloseTo(2, 12)
    expect(std(x, 1)).toBeCloseTo(2.138089935299395, 12) // pandas .std()
    expect(variance([5], 0)).toBe(0)
    expect(Number.isNaN(std([5], 1))).toBe(true)
    expect(nanStd([2, NaN, 4], 0)).toBe(1)
  })

  it('máximo e mínimo', () => {
    expect(max([1, 9, 3])).toBe(9)
    expect(min([4, 2, 8])).toBe(2)
    expect(Number.isNaN(max([]))).toBe(true)
  })

  it('quantil por interpolação linear (numpy)', () => {
    const s = [1, 2, 3, 4]
    expect(quantile(s, 0.25)).toBe(1.75)
    expect(quantile(s, 0.5)).toBe(2.5)
    expect(quantile(s, 0.75)).toBe(3.25)
    expect(quantile([7], 0.9)).toBe(7)
  })

  it('reta de mínimos quadrados', () => {
    const { intercept, slope } = olsLine([1, 3, 5, 7])
    expect(intercept).toBeCloseTo(1, 12)
    expect(slope).toBeCloseTo(2, 12)
    expect(olsLine([5])).toEqual({ intercept: 5, slope: 0 })
  })

  it('resolve sistemas lineares', () => {
    const x = solveLinear([[2, 1], [1, 3]], [3, 5])!
    expect(x[0]).toBeCloseTo(0.8, 12)
    expect(x[1]).toBeCloseTo(1.4, 12)
    expect(solveLinear([[1, 2], [2, 4]], [1, 2])).toBeNull()
  })
})

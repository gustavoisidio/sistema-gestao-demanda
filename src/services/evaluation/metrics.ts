import { mean, sum } from '../../lib/stats'
import type { Metrics } from '../../types'

/** SPEC-EVL-01: métricas de erro de previsão (convenções do `evaluator.py`). */
export function calculateMetrics(real: readonly number[], pred: readonly number[]): Metrics {
  const errors = real.map((v, i) => v - pred[i])
  const mae = mean(errors.map(Math.abs))
  const mse = mean(errors.map((e) => e * e))
  const nonZero = real.map((v, i) => ({ v, i })).filter(({ v }) => v !== 0)
  const mape = nonZero.length ? mean(nonZero.map(({ v, i }) => Math.abs((v - pred[i]) / v))) * 100 : NaN
  const sumReal = sum(real)
  return {
    MAE: mae,
    MSE: mse,
    RMSE: Math.sqrt(mse),
    'MAPE (%)': mape,
    'WAPE (%)': sumReal > 0 ? (sum(errors.map(Math.abs)) / sumReal) * 100 : NaN,
    'Viés (Bias)': sum(pred.map((p, i) => p - real[i])),
    'Tracking Signal': mae > 0 ? sum(errors) / mae : 0,
  }
}

/** SPEC-EVL-06 */
export function trackingSignalStatus(ts: number): 'viés' | 'controle' {
  return Math.abs(ts) > 4 ? 'viés' : 'controle'
}

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../components/App'
import { buildDemoRecords } from '../services/data/demo'
import { bestModel } from '../services/evaluation/backtest'
import { confidenceBand, runModels } from '../services/forecasting'
import { MODEL_INFO } from '../services/forecasting/info'
import { seriesFor } from '../services/series/aggregate'
import { fmtInt } from '../lib/format'
import { sum } from '../lib/stats'

const downloads: { name: string; content: unknown; mime: string }[] = []
vi.mock('../infra/download', async (orig) => ({
  ...(await orig<typeof import('../infra/download')>()),
  downloadFile: (name: string, content: unknown, mime: string) => { downloads.push({ name, content, mime }) },
}))

const records = buildDemoRecords(readFileSync(resolve(process.cwd(), 'src/assets/demo_dataset.csv'), 'utf8'))
const demo = { records, origem: 'Base de demonstração' }
const SKU = 'Agua Mineral 500ml'

beforeEach(() => {
  localStorage.clear()
  downloads.length = 0
  window.location.hash = '#/previsao'
})

const open = async (initial = demo) => {
  render(<App initial={initial} />)
  await screen.findByRole('heading', { level: 1, name: 'Previsão de demanda' })
  return screen.findByTestId('forecast-kpis')
}

describe('controles da previsão (SPEC-PAG-09)', () => {
  it('padrões: Mensal, horizonte 6, confiança 80%', async () => {
    await open()
    expect(screen.getByText('Módulo 03 · Planejamento')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Mensal' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('Horizonte (meses)')).toBeInTheDocument()
    expect(screen.getByTestId('horizon')).toHaveValue('6')
    expect(screen.getByRole('radio', { name: '80%' })).toHaveAttribute('aria-checked', 'true')
  })

  it('o horizonte é lembrado por granularidade e respeita máximo e padrão de cada uma', async () => {
    await open()
    fireEvent.change(screen.getByTestId('horizon'), { target: { value: '10' } })
    await userEvent.click(screen.getByRole('radio', { name: 'Semanal' }))
    expect(screen.getByText('Horizonte (semanas)')).toBeInTheDocument()
    expect(screen.getByTestId('horizon')).toHaveValue('12')
    expect(screen.getByTestId('horizon')).toHaveAttribute('max', '52')
    await userEvent.click(screen.getByRole('radio', { name: 'Diária' }))
    expect(screen.getByTestId('horizon')).toHaveValue('30')
    expect(screen.getByTestId('horizon')).toHaveAttribute('max', '180')
    await userEvent.click(screen.getByRole('radio', { name: 'Mensal' }))
    expect(screen.getByTestId('horizon')).toHaveValue('10')
    expect(screen.getByTestId('horizon')).toHaveAttribute('max', '24')
  })

  it('histórico com menos de 6 períodos mostra a mensagem e nada mais', async () => {
    const short = Array.from({ length: 151 }, (_, i) => {
      const d = new Date(Date.UTC(2023, 0, 1 + i)).toISOString().slice(0, 10)
      return { sku: 'A', data: d, quantidade_vendida: 5 }
    })
    render(<App initial={{ records: short, origem: 'x' }} />)
    expect(await screen.findByTestId('too-short')).toHaveTextContent('Histórico insuficiente para previsões estatísticas (mínimo de 6 períodos nessa granularidade).')
    expect(screen.queryByTestId('forecast-kpis')).toBeNull()
  })

  it('o cálculo pesado só entrega o resultado depois da pintura (aviso "Ajustando…" visível)', async () => {
    const { renderHook } = await import('@testing-library/react')
    const { useDeferredCompute } = await import('./helpers')
    const compute = vi.fn(() => 42)
    const { result, rerender } = renderHook(({ k }) => useDeferredCompute(k, compute), { initialProps: { k: 'a' } })
    expect(result.current).toEqual({ value: null, pending: true })
    await waitFor(() => expect(result.current).toEqual({ value: 42, pending: false }))
    rerender({ k: 'b' })
    expect(result.current.pending).toBe(true)
    await waitFor(() => expect(result.current.pending).toBe(false))
    expect(compute).toHaveBeenCalledTimes(2)
  })
})

describe('modelo recomendado (SPEC-PAG-10)', () => {
  const series = seriesFor(records, SKU, 'ME')
  const recommended = bestModel(series, 'ME').modelo!

  it('o recomendado leva ★, vem selecionado e mostra a legenda; os 7 (ou os disponíveis) aparecem', async () => {
    await open()
    const pills = within(screen.getByTestId('model-pills'))
    expect(pills.getByRole('radio', { name: `★ ${recommended}` })).toHaveAttribute('aria-checked', 'true')
    expect(pills.getAllByRole('radio')).toHaveLength(7)
    expect(screen.getByTestId('model-info')).toHaveTextContent(`ℹ ${MODEL_INFO[recommended]} · Recomendado pelo backtesting.`)
  })

  it('trocar o modelo atualiza a legenda e os KPIs', async () => {
    await open()
    const before = within(screen.getByTestId('forecast-kpis')).getByText(/Demanda prevista/).parentElement!.textContent
    await userEvent.click(screen.getByRole('radio', { name: 'Naive' }))
    expect(screen.getByTestId('model-info')).toHaveTextContent(`ℹ ${MODEL_INFO.Naive}`)
    expect(screen.getByTestId('model-info')).not.toHaveTextContent('Recomendado pelo backtesting.')
    expect(within(screen.getByTestId('forecast-kpis')).getByText(/Demanda prevista/).parentElement!.textContent).not.toBe(before)
  })

  it('a escolha não vaza para outro SKU', async () => {
    await open()
    await userEvent.click(screen.getByRole('radio', { name: 'Naive' }))
    await userEvent.selectOptions(screen.getByTestId('sku-select'), 'Smartphone TechX')
    await screen.findByTestId('forecast-kpis')
    const rec = bestModel(seriesFor(records, 'Smartphone TechX', 'ME'), 'ME').modelo!
    await waitFor(() => expect(screen.getByRole('radio', { name: `★ ${rec}` })).toHaveAttribute('aria-checked', 'true'))
  })
})

describe('KPIs da previsão (SPEC-PAG-11)', () => {
  it('seguem as fórmulas do mapeamento', async () => {
    const kpis = within(await open())
    const values = series().map((p) => p.value)
    const models = runModels(values, 6, 12)
    const best = bestModel(series(), 'ME')
    const r = models[best.modelo!]!
    const total = sum(r.forecast)
    const ultimo = sum(values.slice(-6))
    const band = confidenceBand(r.forecast, r.sigma, '80%')
    expect(kpis.getByText('Demanda prevista (6 meses)').parentElement).toHaveTextContent(fmtInt(total))
    expect(kpis.getByText('Demanda prevista (6 meses)').parentElement!.textContent).toMatch(/vs\. período anterior/)
    expect(((total - ultimo) / ultimo) * 100).toBeDefined()
    expect(kpis.getByText('Média por mês')).toBeInTheDocument()
    expect(kpis.getByText('Faixa 80% (total)').parentElement).toHaveTextContent(`${fmtInt(sum(band.inf))} – ${fmtInt(sum(band.sup))}`)
    expect(kpis.getByText('Acurácia no backtest').parentElement!.textContent).toMatch(/\d+,\d%/)
    expect(kpis.getByTitle('100% − WAPE medido em teste cego sobre o final do histórico.')).toBeInTheDocument()
  })

  it('a confiança de 95% muda o rótulo e alarga a faixa', async () => {
    const kpis = within(await open())
    const band80 = kpis.getByText('Faixa 80% (total)').parentElement!.textContent
    await userEvent.click(screen.getByRole('radio', { name: '95%' }))
    expect(kpis.getByText('Faixa 95% (total)')).toBeInTheDocument()
    expect(kpis.getByText('Faixa 95% (total)').parentElement!.textContent).not.toBe(band80)
  })

  it('o gráfico, a tabela e os expansores existem', async () => {
    await open()
    expect(screen.getByTestId('chart-forecast')).toBeInTheDocument()
    expect(screen.getByText('Tabela da previsão')).toBeInTheDocument()
    expect(screen.getByText('Comparar todos os modelos neste horizonte')).toBeInTheDocument()
    expect(screen.getByText('Entenda os modelos')).toBeInTheDocument()
    expect(screen.getByText('As faixas de confiança são estimadas a partir do desvio-padrão dos resíduos do ajuste no histórico.')).toBeInTheDocument()
  })
})

describe('exportação da previsão (SPEC-PAG-12)', () => {
  it('Excel e CSV com as colunas e nomes do original', async () => {
    await open()
    await userEvent.click(screen.getByTestId('export-csv'))
    expect(downloads[0].name).toBe(`previsao_${SKU}.csv`)
    const csv = downloads[0].content as string
    expect(csv.split('\n')[0]).toBe('Período,Previsão,Limite inferior (80%),Limite superior (80%)')
    expect(csv.split('\n')).toHaveLength(7) // cabeçalho + 6 meses
    expect(csv.split('\n')[1]).toMatch(/^2026-12-31,\d+,\d+,\d+$/)

    await userEvent.click(screen.getByTestId('export-xlsx'))
    await waitFor(() => expect(downloads).toHaveLength(2))
    expect(downloads[1].name).toBe(`previsao_${SKU}_mensal.xlsx`)
    const { parseSpreadsheet } = await import('../services/data/parse')
    const read = await parseSpreadsheet(downloads[1].content as ArrayBuffer)
    expect(read.ok && read.table.columns).toEqual(['período', 'previsão', 'limite_inferior_(80%)', 'limite_superior_(80%)'])
    expect(read.ok && read.table.rows).toHaveLength(6)
  })
})

function series() {
  return seriesFor(records, SKU, 'ME')
}

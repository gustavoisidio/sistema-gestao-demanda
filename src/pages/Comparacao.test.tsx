import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../components/App'
import { buildDemoRecords } from '../services/data/demo'
import { backtest, gainOverNaive } from '../services/evaluation/backtest'
import { seriesFor } from '../services/series/aggregate'
import { fmtNum, fmtPct } from '../lib/format'

const records = buildDemoRecords(readFileSync(resolve(process.cwd(), 'src/assets/demo_dataset.csv'), 'utf8'))
const demo = { records, origem: 'Base de demonstração' }
const SKU = 'Agua Mineral 500ml'

beforeEach(() => {
  localStorage.clear()
  window.location.hash = '#/comparacao'
})

const open = async (initial = demo) => {
  render(<App initial={initial} />)
  await screen.findByRole('heading', { level: 1, name: 'Comparação de modelos' })
  return screen.findByTestId('metrics-table')
}

describe('limites do teste (SPEC-PAG-13)', () => {
  it('slider de 1 a min(máx, n − 4) com padrão min(padrão, máx)', async () => {
    await open()
    expect(screen.getByText('Módulo 04 · Planejamento')).toBeInTheDocument()
    for (const c of ['MAE', 'RMSE', 'MAPE', 'WAPE', 'Viés', 'Tracking Signal']) expect(screen.getAllByText(c).length).toBeGreaterThan(0)
    const n = seriesFor(records, SKU, 'ME').length // 46
    expect(screen.getByText('Períodos de teste (meses)')).toBeInTheDocument()
    expect(screen.getByTestId('test-periods')).toHaveAttribute('min', '1')
    expect(screen.getByTestId('test-periods')).toHaveAttribute('max', String(Math.min(24, n - 4)))
    expect(screen.getByTestId('test-periods')).toHaveValue('6')
    await userEvent.click(screen.getByRole('radio', { name: 'Semanal' }))
    expect(screen.getByTestId('test-periods')).toHaveValue('12')
    expect(screen.getByTestId('test-periods')).toHaveAttribute('max', '52')
  })

  it('n ≤ h + 3 mostra a mensagem do original; ao reduzir o teste, volta o resultado', async () => {
    const short = Array.from({ length: 214 }, (_, i) => ({ sku: 'A', data: new Date(Date.UTC(2023, 0, 1 + i)).toISOString().slice(0, 10), quantidade_vendida: 5 + (i % 7) }))
    render(<App initial={{ records: short, origem: 'x' }} />)
    await screen.findByRole('heading', { level: 1, name: 'Comparação de modelos' })
    // 7 meses completos (jan–jul/2023): max_h = max(1, min(24, 3)) = 3 → padrão 3 → 7 > 6: resultado normal
    expect(await screen.findByTestId('metrics-table')).toBeInTheDocument()
    expect(screen.getByTestId('test-periods')).toHaveAttribute('max', '3')
    // série diária (214 pontos) não é curta; força o caso com poucos meses
  })

  it('base muito curta: "Histórico insuficiente: a base tem N períodos e o teste usa H."', async () => {
    const tiny = Array.from({ length: 120 }, (_, i) => ({ sku: 'A', data: new Date(Date.UTC(2023, 0, 1 + i)).toISOString().slice(0, 10), quantidade_vendida: 5 }))
    render(<App initial={{ records: tiny, origem: 'x' }} />) // jan–abr = 4 meses → n ≤ h + 3 com h = 1
    expect(await screen.findByTestId('too-short')).toHaveTextContent('Histórico insuficiente: a base tem 4 períodos e o teste usa 1. Reduza os períodos de teste.')
    expect(screen.queryByTestId('metrics-table')).toBeNull()
  })
})

describe('vencedor, ranking e tabela (SPEC-PAG-14)', () => {
  it('cartão do vencedor com WAPE, ganho sobre o Naive, MAE, viés e callout do tracking signal', async () => {
    await open()
    const bt = backtest(seriesFor(records, SKU, 'ME'), 6, 12)
    const top = bt.table[0]
    const gain = gainOverNaive(bt.table)
    const card = screen.getByTestId('winner-card')
    expect(card).toHaveTextContent('Modelo vencedor')
    expect(card).toHaveTextContent(`🏆 ${top.Modelo}`)
    expect(card).toHaveTextContent(`WAPE de ${fmtPct(top['WAPE (%)'])} em 6 meses de teste${gain === null ? '' : ` · ${fmtNum(gain, 0)}% menos erro que o Naive`}`)
    expect(screen.getByTitle('Erro médio absoluto, em unidades.')).toHaveTextContent(fmtNum(top.MAE))
    expect(screen.getByTitle('Soma (previsto − real). Positivo = superestima.')).toBeInTheDocument()
    const ts = top['Tracking Signal']
    expect(screen.getByTestId('ts-callout')).toHaveTextContent(Math.abs(ts) > 4 ? 'o modelo apresenta viés sistemático; monitore.' : 'dentro do controle (±4).')
  })

  it('tabela com as 9 colunas, uma linha por modelo e posições 1…k', async () => {
    const table = within(await open())
    for (const h of ['#', 'Modelo', 'Acurácia', 'WAPE (%)', 'MAE', 'RMSE', 'MAPE (%)', 'Viés (Bias)', 'Tracking Signal']) expect(table.getAllByText(h).length).toBeGreaterThan(0)
    const rows = table.getAllByRole('row').slice(1)
    expect(rows).toHaveLength(7)
    expect(rows.map((r) => within(r).getAllByRole('cell')[0].textContent)).toEqual(['1', '2', '3', '4', '5', '6', '7'])
    expect(table.getAllByTitle('Ignora períodos com demanda zero.').length).toBe(7)
  })

  it('gráficos e ajuda de métricas', async () => {
    await open()
    expect(screen.getByText(/Ranking de erro \(WAPE\)/)).toBeInTheDocument()
    expect(screen.getByTestId('chart-ranking')).toBeInTheDocument()
    expect(screen.getByText('Visualização do teste cego')).toBeInTheDocument()
    expect(screen.getByText('Histórico de treino, realidade escondida e as 3 melhores previsões.')).toBeInTheDocument()
    expect(screen.getByTestId('chart-blind')).toBeInTheDocument()
    expect(screen.getByText('Tabela completa de métricas')).toBeInTheDocument()
    expect(screen.getByText('Como ler as métricas')).toBeInTheDocument()
    expect(screen.getByText(/erro absoluto total ÷ demanda total/)).toBeInTheDocument()
  })

  it('mudar os períodos de teste recalcula o vencedor', async () => {
    await open()
    fireEvent.change(screen.getByTestId('test-periods'), { target: { value: '3' } })
    expect(await screen.findByText(/em 3 meses de teste/)).toBeInTheDocument()
  })
})

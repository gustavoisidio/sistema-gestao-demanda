import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../components/App'
import { fmtInt } from '../lib/format'
import { buildDemoRecords } from '../services/data/demo'
import { dashboardKpis } from '../services/dashboard/dashboard'

const records = buildDemoRecords(readFileSync(resolve(process.cwd(), 'src/assets/demo_dataset.csv'), 'utf8'))
const demo = { records, origem: 'Base de demonstração' }

beforeEach(() => {
  localStorage.clear()
  window.location.hash = '#/dashboard'
})

const open = async () => {
  render(<App initial={demo} />)
  await screen.findByRole('heading', { level: 1, name: 'Dashboard gerencial' })
  return screen.findByTestId('dash-kpis')
}

describe('filtros e KPIs (SPEC-PAG-17)', () => {
  it('cinco KPIs conforme SPEC-DSH-02, com deltas e campeão', async () => {
    const k = within(await open())
    const ref = dashboardKpis(records)!
    expect(screen.getByText('Módulo 05 · Gestão')).toBeInTheDocument()
    expect(k.getByText('Volume no período').parentElement).toHaveTextContent(fmtInt(ref.volume))
    expect(k.getByText('Últimos 30 dias').parentElement).toHaveTextContent(fmtInt(ref.r30))
    expect(k.getByText('Últimos 30 dias').parentElement).toHaveTextContent('vs. 30 dias anteriores')
    expect(k.getByText('Últimos 12 meses').parentElement).toHaveTextContent('vs. 12 meses anteriores')
    expect(k.getByText('Média diária')).toBeInTheDocument()
    expect(k.getByText('Produto campeão').parentElement).toHaveTextContent(ref.campeao)
    expect(k.getByText('Produto campeão').parentElement).toHaveTextContent(/\d+% do volume/)
    expect(k.getAllByTestId('sparkline')).toHaveLength(2)
  })

  it('"Produtos" vazio = todos; escolher um SKU filtra os KPIs', async () => {
    const k = within(await open())
    const todos = k.getByText('Volume no período').parentElement!.textContent
    expect(screen.getByTestId('dash-skus').querySelector('summary')!.textContent).toBe('Todos os produtos')
    await userEvent.click(screen.getByText('Todos os produtos'))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Smartphone TechX' }))
    expect(k.getByText('Volume no período').parentElement!.textContent).not.toBe(todos)
    expect(k.getByText('Produto campeão').parentElement).toHaveTextContent('Smartphone TechX')
    expect(k.getByText('Produto campeão').parentElement).toHaveTextContent('100% do volume')
  })

  it('base filtrada vazia (SKU sem dados no recorte) exibe "Nenhum dado para os filtros selecionados."', async () => {
    const two = [
      { sku: 'A', data: '2024-01-01', quantidade_vendida: 5 },
      { sku: 'B', data: '2024-03-01', quantidade_vendida: 7 },
    ]
    render(<App initial={{ records: two, origem: 'x' }} />)
    await screen.findByRole('heading', { level: 1, name: 'Dashboard gerencial' })
    await userEvent.click(screen.getByText('Todos os produtos'))
    await userEvent.click(screen.getByRole('checkbox', { name: 'A' }))
    fireEvent.change(screen.getByTestId('dash-period-ini'), { target: { value: '2024-02-01' } })
    fireEvent.change(screen.getByTestId('dash-period-fim'), { target: { value: '2024-03-01' } })
    expect(await screen.findByTestId('dash-empty')).toHaveTextContent('Nenhum dado para os filtros selecionados.')
    expect(screen.queryByTestId('dash-kpis')).toBeNull()
  })
})

describe('gráficos do dashboard (SPEC-PAG-18)', () => {
  it('volume por produto, participação, evolução e intensidade', async () => {
    await open()
    expect(screen.getByText('Volume por produto')).toBeInTheDocument()
    expect(screen.getByTestId('chart-volume')).toBeInTheDocument()
    expect(screen.getByText('Participação no portfólio')).toBeInTheDocument()
    expect(screen.getByText('unidades')).toBeInTheDocument()
    expect(screen.getByText('Evolução temporal')).toBeInTheDocument()
    expect(screen.getByText('Volume mensal por produto.')).toBeInTheDocument()
    expect(screen.getByText('Meses incompletos no fim do período são omitidos. Dados até 27/12/2026.')).toBeInTheDocument()
    expect(screen.getByText('Intensidade mensal por produto')).toBeInTheDocument()
    expect(screen.getByText('Índice do mês em relação à média do próprio produto (100 = média).')).toBeInTheDocument()
    // 5 SKUs × 47 meses completos
    expect(within(screen.getByTestId('heat-intensity')).getAllByTestId('heat-cell')).toHaveLength(5 * 47)
  })

  it('a visualização alterna entre Empilhado, Linhas e Participação %', async () => {
    await open()
    expect(screen.getByRole('radio', { name: 'Empilhado' })).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(screen.getByRole('radio', { name: 'Linhas' }))
    expect(screen.getByRole('radio', { name: 'Linhas' })).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(screen.getByRole('radio', { name: 'Participação %' }))
    expect(screen.getByTestId('chart-evolution')).toBeInTheDocument()
  })
})

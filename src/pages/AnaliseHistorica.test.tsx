import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../components/App'
import { buildDemoRecords } from '../services/data/demo'

const demo = { records: buildDemoRecords(readFileSync(resolve(process.cwd(), 'src/assets/demo_dataset.csv'), 'utf8')), origem: 'Base de demonstração' }

beforeEach(() => {
  localStorage.clear()
  window.location.hash = '#/analise'
})

const open = async () => {
  render(<App initial={demo} />)
  await screen.findByRole('heading', { level: 1, name: 'Análise histórica' })
}

describe('filtros e janela (SPEC-PAG-07)', () => {
  it('padrões: primeiro SKU, Semanal e série inteira; perfil semanal do SKU', async () => {
    await open()
    expect(screen.getByText('Módulo 02 · Dados')).toBeInTheDocument()
    expect(screen.getByTestId('sku-select')).toHaveValue('Agua Mineral 500ml')
    expect(screen.getByRole('radio', { name: 'Semanal' })).toHaveAttribute('aria-checked', 'true')
    const line = within(screen.getByTestId('profile-line'))
    expect(line.getByText('Agua Mineral 500ml')).toBeInTheDocument()
    expect(line.getByText('Perfil: Estável')).toBeInTheDocument()
    expect(line.getByText(/Baixa variabilidade\. · classificação sobre a série semanal completa/)).toBeInTheDocument()
    expect(within(screen.getByTestId('window')).getByText('01/2023')).toBeInTheDocument()
    expect(within(screen.getByTestId('window')).getByText('12/2026')).toBeInTheDocument()
  })

  it('o perfil não muda com a granularidade, mas os KPIs sim', async () => {
    await open()
    const volumeSemanal = within(screen.getByTestId('hist-kpis')).getByText('Volume no período').parentElement!.textContent
    await userEvent.click(screen.getByRole('radio', { name: 'Mensal' }))
    expect(screen.getByText('Perfil: Estável')).toBeInTheDocument()
    const kpis = within(screen.getByTestId('hist-kpis'))
    expect(kpis.getByText('Média por mês')).toBeInTheDocument()
    expect(kpis.getByText('Volume no período').parentElement!.textContent).not.toBe(volumeSemanal) // meses omitem as pontas
    await userEvent.click(screen.getByRole('radio', { name: 'Diária' }))
    expect(kpis.getByText('Média por dia')).toBeInTheDocument()
  })

  it('mover a janela recalcula os KPIs; trocar o SKU reinicia a janela', async () => {
    await open()
    const volume = () => within(screen.getByTestId('hist-kpis')).getByText('Volume no período').parentElement!.textContent!
    const inicial = volume()
    fireEvent.change(screen.getByTestId('window-lo'), { target: { value: '100' } })
    expect(volume()).not.toBe(inicial)
    expect(within(screen.getByTestId('window')).queryByText('01/2023')).toBeNull()
    await userEvent.selectOptions(screen.getByTestId('sku-select'), 'Smartphone TechX')
    expect(screen.getByText('Perfil: Crescente')).toBeInTheDocument()
    expect(within(screen.getByTestId('window')).getByText('01/2023')).toBeInTheDocument()
  })
})

describe('KPIs e abas (SPEC-PAG-08)', () => {
  it('cinco KPIs com os rótulos do original', async () => {
    await open()
    const k = within(screen.getByTestId('hist-kpis'))
    for (const label of ['Volume no período', 'Média por semana', 'Pico', 'Variabilidade (CV)', 'Crescimento']) expect(k.getByText(label)).toBeInTheDocument()
    expect(k.getByText(/% períodos zerados/)).toBeInTheDocument()
    expect(k.getByTitle('Desvio-padrão ÷ média. < 0,2 estável · > 0,5 irregular.')).toBeInTheDocument()
    expect(k.getByTitle('Média da 2ª metade da janela vs. 1ª metade.')).toBeInTheDocument()
    expect(k.getByTitle(/^Em \d{2}\/\d{2}\/\d{4}$/)).toBeInTheDocument()
  })

  it('quatro abas; série temporal é a inicial', async () => {
    await open()
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Série temporal', 'Sazonalidade', 'Distribuição', 'Comparar SKUs'])
    expect(screen.getByTestId('chart-series')).toBeInTheDocument()
  })

  it('Sazonalidade: mapa de calor 4 anos × 12 meses e índice por dia da semana', async () => {
    await open()
    await userEvent.click(screen.getByRole('tab', { name: 'Sazonalidade' }))
    expect(screen.getByText('Mapa de calor · volume mensal por ano')).toBeInTheDocument()
    expect(within(screen.getByTestId('heat-monthly')).getAllByTestId('heat-cell')).toHaveLength(48)
    expect(screen.getByText('Índice por dia da semana (100 = média)')).toBeInTheDocument()
  })

  it('Distribuição: histograma e dispersão por trimestre com T1…T4', async () => {
    await open()
    await userEvent.click(screen.getByRole('tab', { name: 'Distribuição' }))
    expect(screen.getByText('Histograma de demanda (semanal)')).toBeInTheDocument()
    expect(screen.getByText('Dispersão por trimestre')).toBeInTheDocument()
    for (const q of ['T1', 'T2', 'T3', 'T4']) expect(screen.getByTestId(`box-${q}`)).toBeInTheDocument()
  })

  it('Comparar SKUs: começa com os 3 primeiros e normalizado', async () => {
    await open()
    await userEvent.click(screen.getByRole('tab', { name: 'Comparar SKUs' }))
    expect(screen.getByText('Agua Mineral 500ml, Camiseta Promocional, Placa Mae Servidor')).toBeInTheDocument()
    expect(screen.getByTestId('normalize')).toBeChecked()
    expect(screen.getByTestId('chart-compare')).toBeInTheDocument()
    await userEvent.click(screen.getByTestId('normalize'))
    expect(screen.getByTestId('normalize')).not.toBeChecked()
  })
})

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../components/App'
import { buildDemoRecords } from '../services/data/demo'

const demo = { records: buildDemoRecords(readFileSync(resolve(process.cwd(), 'src/assets/demo_dataset.csv'), 'utf8')), origem: 'Base de demonstração' }

beforeEach(() => {
  localStorage.clear()
  window.location.hash = ''
})

describe('Visão geral sem base (SPEC-PAG-01)', () => {
  it('hero, cartão "Comece em segundos" e fluxo de trabalho; sem KPIs nem tabela', async () => {
    render(<App initial={null} />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Planeje a demanda com precisão estatística' })).toBeInTheDocument()
    expect(screen.getByText('Demanda+ · Central de planejamento')).toBeInTheDocument()
    for (const chip of ['7 modelos de previsão', 'Backtesting out-of-sample', 'Simulação de cenários', 'CPFR colaborativo', 'Laudos automáticos']) expect(screen.getByText(chip)).toBeInTheDocument()
    expect(screen.getByText('Comece em segundos')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Importar minha base/ })).toHaveAttribute('href', '#/importacao')
    expect(screen.queryByTestId('home-kpis')).toBeNull()
    expect(screen.queryByTestId('portfolio-table')).toBeNull()
    const cards = within(screen.getByTestId('workflow'))
    expect(cards.getAllByRole('link', { name: /Abrir módulo/ })).toHaveLength(6)
    expect(cards.getByText('Dashboard e laudos')).toBeInTheDocument()
    expect(cards.getByText('Simule choques e promoções; alinhe o plano com parceiros.')).toBeInTheDocument()
    expect(cards.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['#/importacao', '#/analise', '#/previsao', '#/comparacao', '#/cenarios', '#/dashboard'])
  })

  it('"Explorar com dados de demonstração" ativa a base e mostra os KPIs', async () => {
    render(<App initial={null} />)
    await userEvent.click(await screen.findByTestId('home-demo'))
    expect(await screen.findByTestId('home-kpis')).toBeInTheDocument()
    expect(screen.queryByText('Comece em segundos')).toBeNull()
  })
})

describe('Visão geral com base (SPEC-PAG-02)', () => {
  it('quatro KPIs e a tabela do portfólio com um perfil por SKU', async () => {
    render(<App initial={demo} />)
    const kpis = within(await screen.findByTestId('home-kpis'))
    expect(kpis.getByText('Volume histórico')).toBeInTheDocument()
    expect(kpis.getByText('Produtos (SKUs)')).toBeInTheDocument()
    expect(kpis.getByText('Registros')).toBeInTheDocument()
    expect(kpis.getByText('7.280')).toBeInTheDocument()
    expect(kpis.getByText('Cobertura')).toBeInTheDocument()
    expect(kpis.getByText('48 meses')).toBeInTheDocument() // 1.455 dias ÷ 30
    expect(screen.getByTitle('02/01/2023 a 27/12/2026')).toBeInTheDocument()
    expect(screen.getByText('Portfólio em um relance')).toBeInTheDocument()
    expect(screen.getByText('Perfil de demanda identificado automaticamente para cada SKU (base semanal).')).toBeInTheDocument()

    const table = within(screen.getByTestId('portfolio-table'))
    const rows = table.getAllByRole('row').slice(1)
    expect(rows).toHaveLength(5)
    const expected = { 'Agua Mineral 500ml': 'Estável', 'Camiseta Promocional': 'Irregular', 'Placa Mae Servidor': 'Intermitente', 'Protetor Solar FPS50': 'Sazonal/Variável', 'Smartphone TechX': 'Crescente' }
    rows.forEach((row, i) => {
      const [sku, perfil] = Object.entries(expected)[i]
      expect(within(row).getAllByRole('cell')[0]).toHaveTextContent(sku)
      expect(within(row).getAllByRole('cell')[1]).toHaveTextContent(perfil)
    })
    for (const h of ['SKU', 'Perfil', 'Volume total', 'Média semanal', 'Variabilidade (CV)', 'Crescimento (%)', 'Últimas 52 semanas']) expect(table.getByText(h)).toBeInTheDocument()
    expect(table.getAllByTestId('sparkline')).toHaveLength(5)
    expect(screen.getByText('Fluxo de trabalho')).toBeInTheDocument()
  })
})

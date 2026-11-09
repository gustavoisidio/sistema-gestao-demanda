import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../components/App'
import { fmtInt } from '../lib/format'
import { buildDemoRecords } from '../services/data/demo'
import { runModels } from '../services/forecasting'
import { buildScenario } from '../services/scenarios/scenarios'
import { seriesFor } from '../services/series/aggregate'

const downloads: { name: string; content: unknown; mime: string }[] = []
vi.mock('../infra/download', async (orig) => ({
  ...(await orig<typeof import('../infra/download')>()),
  downloadFile: (name: string, content: unknown, mime: string) => { downloads.push({ name, content, mime }) },
}))

const records = buildDemoRecords(readFileSync(resolve(process.cwd(), 'src/assets/demo_dataset.csv'), 'utf8'))
const demo = { records, origem: 'Base de demonstração' }
const SKU = 'Agua Mineral 500ml'
const weekly = seriesFor(records, SKU, 'W').map((p) => p.value)

beforeEach(() => {
  localStorage.clear()
  downloads.length = 0
  window.location.hash = '#/cenarios'
})

const open = async () => {
  render(<App initial={demo} />)
  await screen.findByRole('heading', { level: 1, name: 'Cenários e CPFR' })
  return screen.findByTestId('scenario-kpis')
}

describe('simulação de cenários (SPEC-PAG-15)', () => {
  it('abas, hero e padrões do original', async () => {
    await open()
    expect(screen.getByText('Módulos 08 e 09 · Planejamento')).toBeInTheDocument()
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Simulação de cenários', 'CPFR · gestão colaborativa'])
    expect(screen.getByTestId('cen-h')).toHaveValue('12')
    expect(screen.getByTestId('cen-choque')).toHaveValue('0')
    expect(screen.getByTestId('cen-choque')).toHaveAttribute('min', '-50')
    expect(screen.getByTestId('cen-choque')).toHaveAttribute('max', '100')
    expect(screen.getByLabelText('Uplift da promoção (%)')).toHaveValue(30)
    expect(within(screen.getByTestId('cen-model')).getByRole('radio', { name: 'Média Móvel' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByTestId('cen-promo').querySelector('summary')!.textContent).toBe('Semana 4, Semana 8')
    expect(screen.getByTitle('Efeito macro em todo o horizonte (ex.: recessão −15%, nova praça +20%).')).toBeInTheDocument()
  })

  it('os KPIs refletem buildScenario sobre a previsão da Média Móvel', async () => {
    const kpis = within(await open())
    const fc = runModels(weekly, 12, 52)['Média Móvel']!.forecast
    const s = buildScenario(fc, 0, [4, 8], 30)
    expect(kpis.getByText('Volume base').parentElement).toHaveTextContent(fmtInt(s.volumeBase))
    expect(kpis.getByText('Volume do cenário').parentElement).toHaveTextContent(fmtInt(s.volumeCenario))
    expect(kpis.getByText('Unidades incrementais').parentElement).toHaveTextContent(fmtInt(s.incremental))
    expect(kpis.getByText('Pico semanal').parentElement).toHaveTextContent(fmtInt(s.picoValor))
    expect(kpis.getByText('Pico semanal').parentElement!.getAttribute('title')).toMatch(/^Semana de \d{2}\/\d{2}\/\d{4}$/)
  })

  it('o choque muda o volume do cenário; reduzir as semanas descarta promoções além do horizonte', async () => {
    const kpis = within(await open())
    const antes = kpis.getByText('Volume do cenário').parentElement!.textContent
    fireEvent.change(screen.getByTestId('cen-choque'), { target: { value: '50' } })
    expect(kpis.getByText('Volume do cenário').parentElement!.textContent).not.toBe(antes)
    expect(kpis.getByText('Volume do cenário').parentElement).toHaveTextContent('+')

    fireEvent.change(screen.getByTestId('cen-h'), { target: { value: '6' } })
    const summary = () => screen.getByTestId('cen-promo').querySelector('summary')!.textContent
    expect(summary()).toBe('Semana 4')
    await screen.findByTestId('scenario-kpis')
    expect(summary()).toBe('Semana 4')
    expect(within(screen.getByTestId('cen-promo')).queryByLabelText('Semana 8')).toBeNull() // horizonte de 6 semanas
  })

  it('detalhamento semanal e exportação cenario_{sku}.xlsx', async () => {
    await open()
    await userEvent.click(screen.getByText('Detalhamento semanal'))
    const rows = within(screen.getByTestId('scenario-detail')).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(12)
    expect(within(rows[0]).getAllByRole('cell')[0]).toHaveTextContent('Semana 1')
    expect(within(rows[3]).getByRole('checkbox')).toBeChecked() // semana 4 em promoção
    expect(within(rows[0]).getByRole('checkbox')).not.toBeChecked()
    await userEvent.click(screen.getByTestId('export-scenario'))
    await waitFor(() => expect(downloads).toHaveLength(1))
    expect(downloads[0].name).toBe(`cenario_${SKU}.xlsx`)
    const { parseSpreadsheet } = await import('../services/data/parse')
    const read = await parseSpreadsheet(downloads[0].content as ArrayBuffer)
    expect(read.ok && read.table.columns).toEqual(['semana', 'data', 'base', 'cenário', 'promoção', 'variação_(%)'])
  })
})

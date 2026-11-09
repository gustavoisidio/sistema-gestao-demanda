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

describe('CPFR (SPEC-PAG-16)', () => {
  const goCpfr = async () => {
    render(<App initial={demo} />)
    await screen.findByRole('heading', { level: 1, name: 'Cenários e CPFR' })
    await userEvent.click(screen.getByRole('tab', { name: 'CPFR · gestão colaborativa' }))
    return screen.findByTestId('partner-editor')
  }

  it('controles e padrões; tabela editável só na coluna do parceiro, começando igual ao sistema', async () => {
    await goCpfr()
    expect(screen.getByTestId('cpfr-h')).toHaveValue('8')
    expect(screen.getByTestId('cpfr-tol')).toHaveValue('20')
    expect(screen.getByText(/Edite a coluna/)).toBeInTheDocument()
    expect(screen.getByText(/A análise de consenso é atualizada instantaneamente\./)).toBeInTheDocument()
    expect(within(screen.getByTestId('partner-editor')).getAllByRole('spinbutton')).toHaveLength(8)
    const k = within(screen.getByTestId('cpfr-kpis'))
    expect(k.getByText('8/8')).toBeInTheDocument()
    expect(k.getByText('100% de aderência')).toBeInTheDocument()
    expect(screen.getByText('Plano em consenso.')).toBeInTheDocument()
    expect(screen.getByText(/Todas as semanas estão dentro da margem de ±20%\./)).toBeInTheDocument()
  })

  it('uma semana fora da tolerância gera alerta crítico, status e recomendação do original', async () => {
    await goCpfr()
    const input = screen.getByTestId('partner-0') as HTMLInputElement
    const sistema = Number(input.value)
    fireEvent.change(input, { target: { value: String(Math.round(sistema * 1.5)) } })
    expect(screen.getByText('1 semana(s) com desvio crítico.')).toBeInTheDocument()
    expect(screen.getByText(/Recomenda-se reunião de alinhamento tático com o parceiro\./)).toBeInTheDocument()
    expect(within(screen.getByTestId('cpfr-alerts')).getByText(/\+50,0% · ruptura/)).toBeInTheDocument()
    const table = within(screen.getByTestId('cpfr-table'))
    expect(table.getByText('🔺 Risco de ruptura')).toBeInTheDocument()
    expect(table.getAllByText('✅ Alinhado')).toHaveLength(7)
    expect(within(screen.getByTestId('cpfr-kpis')).getByText('7/8')).toBeInTheDocument()

    fireEvent.change(input, { target: { value: String(Math.round(sistema * 0.5)) } })
    expect(within(screen.getByTestId('cpfr-alerts')).getByText(/-50,0% · excesso/)).toBeInTheDocument()
    expect(within(screen.getByTestId('cpfr-table')).getByText('🔻 Risco de excesso')).toBeInTheDocument()
  })

  it('trocar a tolerância preserva as edições; trocar o horizonte as reinicia', async () => {
    await goCpfr()
    const input = screen.getByTestId('partner-0') as HTMLInputElement
    const sistema = Number(input.value)
    fireEvent.change(input, { target: { value: String(Math.round(sistema * 1.3)) } })
    expect(screen.getByText('1 semana(s) com desvio crítico.')).toBeInTheDocument()
    fireEvent.change(screen.getByTestId('cpfr-tol'), { target: { value: '50' } })
    expect((screen.getByTestId('partner-0') as HTMLInputElement).value).toBe(String(Math.round(sistema * 1.3)))
    expect(screen.getByText('Plano em consenso.')).toBeInTheDocument()
    fireEvent.change(screen.getByTestId('cpfr-h'), { target: { value: '9' } })
    expect((screen.getByTestId('partner-0') as HTMLInputElement).value).toBe(String(sistema))
  })

  it('valores inválidos viram inteiros ≥ 0', async () => {
    await goCpfr()
    const input = screen.getByTestId('partner-1') as HTMLInputElement
    fireEvent.change(input, { target: { value: '-40' } })
    expect(input.value).toBe('0')
  })

  it('exporta cpfr_{sku}.xlsx', async () => {
    await goCpfr()
    await userEvent.click(screen.getByTestId('export-cpfr'))
    await waitFor(() => expect(downloads).toHaveLength(1))
    expect(downloads[0].name).toBe(`cpfr_${SKU}.xlsx`)
  })

  it('histórico insuficiente mostra a mensagem em vez de quebrar', async () => {
    const few = Array.from({ length: 21 }, (_, i) => ({ sku: 'A', data: new Date(Date.UTC(2023, 0, 2 + i)).toISOString().slice(0, 10), quantidade_vendida: 4 }))
    render(<App initial={{ records: few, origem: 'x' }} />)
    await screen.findByRole('heading', { level: 1, name: 'Cenários e CPFR' })
    await userEvent.click(screen.getByRole('tab', { name: 'CPFR · gestão colaborativa' }))
    expect(await screen.findByTestId('cpfr-short')).toHaveTextContent('Histórico insuficiente para o plano de consenso.')
  })
})

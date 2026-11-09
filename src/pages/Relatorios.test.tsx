import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../components/App'
import { buildDemoRecords } from '../services/data/demo'
import { buildReport, recommendations } from '../services/reports/report'

const downloads: { name: string; content: unknown; mime: string }[] = []
vi.mock('../infra/download', async (orig) => ({
  ...(await orig<typeof import('../infra/download')>()),
  downloadFile: (name: string, content: unknown, mime: string) => { downloads.push({ name, content, mime }) },
}))

const records = buildDemoRecords(readFileSync(resolve(process.cwd(), 'src/assets/demo_dataset.csv'), 'utf8'))
const demo = { records, origem: 'Base de demonstração' }

beforeEach(() => {
  localStorage.clear()
  downloads.length = 0
  window.location.hash = '#/relatorios'
})

const open = async () => {
  render(<App initial={demo} />)
  await screen.findByRole('heading', { level: 1, name: 'Relatórios e laudos' })
}

describe('laudo por produto (SPEC-PAG-19)', () => {
  it('antes de gerar mostra a dica; gerar monta cartão, KPIs, gráfico e 3 downloads', async () => {
    await open()
    expect(screen.getByText('Módulo 10 · Gestão')).toBeInTheDocument()
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Laudo por produto', 'Visão do portfólio'])
    expect(screen.getByTestId('rel-hint')).toHaveTextContent('Selecione o produto e clique em Gerar laudo.')
    expect(screen.queryByTestId('report-card')).toBeNull()

    await userEvent.selectOptions(screen.getByTestId('rel-sku'), 'Smartphone TechX')
    await userEvent.click(screen.getByTestId('generate'))
    const card = await screen.findByTestId('report-card')
    expect(await screen.findByTestId('rel-done')).toHaveTextContent('Laudo pronto')
    expect(card).toHaveTextContent(/Laudo automático · \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/)
    expect(card).toHaveTextContent('Smartphone TechX')
    expect(card).toHaveTextContent('Perfil: Crescente')
    expect(card).toHaveTextContent('Recomendações')
    const ref = buildReport(records, 'Smartphone TechX', new Date())!
    expect(card).toHaveTextContent(`Modelo: ${ref.modelo}`)
    expect(card).toHaveTextContent('O produto apresenta tendência clara de crescimento')
    expect(card.querySelectorAll('li')).toHaveLength(3)
    expect(card.querySelector('b')).not.toBeNull()

    const k = within(screen.getByTestId('report-kpis'))
    for (const l of ['Volume total', 'Média semanal', 'CV', 'Acurácia validada', 'Previsão 12 semanas']) expect(k.getByText(l)).toBeInTheDocument()
    expect(screen.getByTestId('chart-report')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Laudo completo \(Excel\)/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Histórico semanal \(CSV\)/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Laudo em texto \(TXT\)/ })).toBeInTheDocument()
  })

  it('os três downloads têm os nomes e conteúdos do original', async () => {
    await open()
    await userEvent.click(screen.getByTestId('generate'))
    await screen.findByTestId('rel-done')
    await userEvent.click(screen.getByTestId('dl-csv'))
    await userEvent.click(screen.getByTestId('dl-txt'))
    await userEvent.click(screen.getByTestId('dl-xlsx'))
    await waitFor(() => expect(downloads).toHaveLength(3))
    const sku = 'Agua Mineral 500ml'
    expect(downloads.map((d) => d.name)).toEqual([`historico_${sku}.csv`, `laudo_${sku}.txt`, `laudo_${sku}.xlsx`])
    expect((downloads[0].content as string).split('\n')[0]).toBe('data,quantidade_vendida')
    expect(downloads[1].content).toMatch(/^LAUDO DE DEMANDA — Agua Mineral 500ml\nGerado em \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}\n\n- /)
    expect(downloads[1].content).not.toContain('**')
    const XLSX = await import('xlsx')
    const wb = XLSX.read(downloads[2].content as ArrayBuffer, { type: 'array' })
    expect(wb.SheetNames).toEqual(['Resumo', 'Metricas', 'Previsao', 'Historico'])
    const resumo = XLSX.utils.sheet_to_json<{ Indicador: string; Valor: string }>(wb.Sheets.Resumo)
    expect(resumo.map((r) => r.Indicador)).toEqual(['SKU', 'Perfil', 'Motivo', 'Volume total', 'Média semanal', 'Coef. variação', 'Crescimento (%)', 'Modelo recomendado', 'WAPE (%)'])
  })

  it('trocar o SKU depois de gerar volta ao estado inicial', async () => {
    await open()
    await userEvent.click(screen.getByTestId('generate'))
    await screen.findByTestId('report-card')
    await userEvent.selectOptions(screen.getByTestId('rel-sku'), 'Placa Mae Servidor')
    expect(screen.getByTestId('rel-hint')).toBeInTheDocument()
    expect(screen.queryByTestId('report-card')).toBeNull()
  })

  it('o texto do viés usa os limites de ±5% do original', () => {
    expect(recommendations('Estável', 6, 'SES', 100)[1]).toContain('superestimar')
  })
})

describe('visão do portfólio (SPEC-PAG-20)', () => {
  it('barra de progresso e depois a tabela com os 5 SKUs, modelo, acurácia, viés e volume', async () => {
    await open()
    await userEvent.click(screen.getByRole('tab', { name: 'Visão do portfólio' }))
    expect(await screen.findByTestId('portfolio-progress')).toBeInTheDocument()
    expect(screen.getByText(/Avaliando .+…/)).toBeInTheDocument()
    const table = within(await screen.findByTestId('portfolio-report'))
    expect(screen.getByText('Backtesting consolidado de todos os produtos (base semanal) com o modelo vencedor de cada um.')).toBeInTheDocument()
    for (const h of ['SKU', 'Perfil', 'Modelo recomendado', 'Acurácia', 'Viés', 'Volume 52 sem.', 'Últimas 52 semanas']) expect(table.getByText(h)).toBeInTheDocument()
    expect(table.getAllByRole('row').slice(1)).toHaveLength(5)
    expect(table.getAllByTestId('sparkline')).toHaveLength(5)
  })

  it('exporta portfolio.xlsx com a aba Portfolio, sem a coluna de tendência', async () => {
    await open()
    await userEvent.click(screen.getByRole('tab', { name: 'Visão do portfólio' }))
    await screen.findByTestId('portfolio-report')
    await userEvent.click(screen.getByTestId('export-portfolio'))
    await waitFor(() => expect(downloads).toHaveLength(1))
    expect(downloads[0].name).toBe('portfolio.xlsx')
    const XLSX = await import('xlsx')
    const wb = XLSX.read(downloads[0].content as ArrayBuffer, { type: 'array' })
    expect(wb.SheetNames).toEqual(['Portfolio'])
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets.Portfolio)
    expect(rows).toHaveLength(5)
    expect(Object.keys(rows[0])).not.toContain('Tendência')
  })
})

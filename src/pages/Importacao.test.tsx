import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../components/App'

beforeEach(() => {
  localStorage.clear()
  window.location.hash = '#/importacao'
})

const csv = (name: string, content: string) => new File([content], name, { type: 'text/csv' })
const upload = (f: File) => userEvent.upload(screen.getByTestId('file-input'), f)

describe('fluxo de importação (SPEC-PAG-03)', () => {
  it('CSV válido: auditoria, pré-visualização e confirmação que ativa a base e vai para a análise', async () => {
    render(<App initial={null} />)
    await screen.findByRole('heading', { level: 1, name: 'Importação de dados' })
    expect(screen.getByText('Módulo 01 · Dados')).toBeInTheDocument()
    expect(screen.getByText('Formato esperado do arquivo')).toBeInTheDocument()

    await upload(csv('vendas.csv', 'sku,data,quantidade_vendida\nA,2025-01-01,10\nA,2025-01-02,20\nB,2025-01-01,5\n'))
    expect(await screen.findByText('Origem: Arquivo · vendas.csv')).toBeInTheDocument()
    expect(screen.queryByText('Formato esperado do arquivo')).toBeNull()
    const kpis = within(screen.getByTestId('audit-kpis'))
    expect(kpis.getByText('3')).toBeInTheDocument()
    expect(kpis.getByText('2')).toBeInTheDocument()
    expect(kpis.getByText('01/25 – 01/25')).toBeInTheDocument()
    expect(kpis.getByText('100/100')).toBeInTheDocument()
    expect(kpis.getByText('Sem ocorrências')).toBeInTheDocument()
    expect(within(screen.getByTestId('audit-checks')).getAllByText('OK')).toHaveLength(3)
    expect(screen.getByText('Pré-visualização da base tratada')).toBeInTheDocument()
    expect(within(screen.getByTestId('preview-records')).getAllByRole('row')).toHaveLength(4)

    await userEvent.click(screen.getByRole('tab', { name: 'Resumo por SKU' }))
    expect(within(screen.getByTestId('preview-skus')).getAllByRole('row')).toHaveLength(3)

    await userEvent.click(screen.getByTestId('confirm'))
    expect(await screen.findByText('Base salva! Abrindo a análise histórica…')).toBeInTheDocument()
    expect(window.location.hash).toBe('#/analise')
    expect(JSON.parse(localStorage.getItem('demanda_dataset_v1')!).origem).toBe('Arquivo · vendas.csv')
  })

  it('"Usar demonstração" apenas pré-visualiza: a base só é ativada ao confirmar', async () => {
    render(<App initial={null} />)
    await userEvent.click(await screen.findByTestId('use-demo'))
    expect(await screen.findByText('Origem: Base de demonstração')).toBeInTheDocument()
    expect(localStorage.getItem('demanda_dataset_v1')).toBeNull()
    expect(within(screen.getByTestId('audit-kpis')).getByText('7.280')).toBeInTheDocument()
    await userEvent.click(screen.getByTestId('confirm'))
    await waitFor(() => expect(localStorage.getItem('demanda_dataset_v1')).not.toBeNull())
  })

  it('o botão "Modelo CSV" baixa modelo_importacao.csv', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:t')
    URL.revokeObjectURL = vi.fn()
    let name = ''
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { name = this.download })
    render(<App initial={null} />)
    await userEvent.click(await screen.findByTestId('download-template'))
    expect(name).toBe('modelo_importacao.csv')
    vi.restoreAllMocks()
  })
})

describe('mapeamento de colunas (SPEC-PAG-04)', () => {
  it('colunas fora do padrão pedem o mapeamento e bloqueiam a auditoria até completar', async () => {
    render(<App initial={null} />)
    await upload(csv('x.csv', 'produto,dia,qtd\nA,2025-01-01,10\nA,2025-01-02,20\n'))
    expect(await screen.findByText('Mapeamento de colunas')).toBeInTheDocument()
    expect(screen.getByLabelText('Produto / SKU')).toBeInTheDocument()
    expect(screen.getByLabelText('Data')).toBeInTheDocument()
    expect(screen.getByLabelText('Quantidade vendida')).toBeInTheDocument()
    expect(screen.getAllByRole('option', { name: 'Selecione a coluna…' })).toHaveLength(3)
    expect(screen.getByText('Complete o mapeamento para continuar.')).toBeInTheDocument()
    expect(screen.queryByTestId('audit-kpis')).toBeNull()

    await userEvent.selectOptions(screen.getByTestId('map-sku'), 'produto')
    await userEvent.selectOptions(screen.getByTestId('map-data'), 'dia')
    expect(screen.queryByTestId('audit-kpis')).toBeNull()
    await userEvent.selectOptions(screen.getByTestId('map-quantidade_vendida'), 'qtd')
    expect(screen.queryByText('Complete o mapeamento para continuar.')).toBeNull()
    expect(within(await screen.findByTestId('audit-kpis')).getByText('2')).toBeInTheDocument()
  })

  it('só pede os campos que faltam', async () => {
    render(<App initial={null} />)
    await upload(csv('x.csv', 'sku,dia,quantidade_vendida\nA,2025-01-01,10\n'))
    await screen.findByText('Mapeamento de colunas')
    expect(screen.queryByTestId('map-sku')).toBeNull()
    expect(screen.getByTestId('map-data')).toBeInTheDocument()
  })
})

describe('auditoria (SPEC-PAG-05)', () => {
  it('conta nulos, negativos e duplicidades, com selos "Tratado" e índice', async () => {
    render(<App initial={null} />)
    await upload(csv('x.csv', 'sku,data,quantidade_vendida\nA,2025-01-01,10\nA,2025-01-02,-5\nA,2025-01-02,7\nB,2025-01-01,\n'))
    const checks = within(await screen.findByTestId('audit-checks'))
    expect(checks.getByText('Tratado: substituídos por 0')).toBeInTheDocument()
    expect(checks.getByText('Tratado: ajustadas para 0')).toBeInTheDocument()
    expect(checks.getByText('Tratado: mantidas para revisão')).toBeInTheDocument()
    expect(checks.getByText('Valores nulos')).toBeInTheDocument()
    expect(checks.getByText('Quantidades negativas')).toBeInTheDocument()
    expect(checks.getByText('Duplicidades (SKU × data)')).toBeInTheDocument()
    const kpis = within(screen.getByTestId('audit-kpis'))
    expect(kpis.getByText('3 ocorrência(s)')).toBeInTheDocument()
    expect(kpis.getByText('0/100')).toBeInTheDocument()
  })

  it('datas inválidas são descartadas e informadas, sem bloquear', async () => {
    render(<App initial={null} />)
    await upload(csv('x.csv', 'sku,data,quantidade_vendida\nA,2025-01-01,10\nA,ontem,5\n'))
    expect(await screen.findByTestId('dates-discarded')).toHaveTextContent('1 linha(s) com data inválida foram descartadas.')
    expect(screen.getByTestId('confirm')).toBeInTheDocument()
  })

  it('nenhuma data válida bloqueia com a mensagem do original', async () => {
    render(<App initial={null} />)
    await upload(csv('x.csv', 'sku,data,quantidade_vendida\nA,x,10\nA,y,5\n'))
    expect(await screen.findByText('A coluna de datas não pôde ser convertida. Verifique o formato (ex.: AAAA-MM-DD).')).toBeInTheDocument()
    expect(screen.queryByTestId('confirm')).toBeNull()
  })
})

describe('erros de leitura (SPEC-PAG-06)', () => {
  it('formato não suportado', async () => {
    render(<App initial={null} />)
    const input = await screen.findByTestId('file-input')
    await userEvent.upload(input, new File(['{}'], 'a.json'), { applyAccept: false })
    expect(await screen.findByText('Não foi possível ler o arquivo: Formato não suportado.')).toBeInTheDocument()
    expect(screen.queryByText('Formato esperado do arquivo')).toBeNull()
    expect(screen.queryByTestId('audit-kpis')).toBeNull()
  })

  it('arquivo vazio', async () => {
    render(<App initial={null} />)
    await upload(csv('vazio.csv', ''))
    expect(await screen.findByText('Não foi possível ler o arquivo: O arquivo está vazio.')).toBeInTheDocument()
  })
})

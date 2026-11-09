import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { DOCUMENT_TITLE, ROUTES, SECTIONS, routeFromHash } from '../routes'
import { buildDemoRecords } from '../services/data/demo'

const demoCsv = readFileSync(resolve(process.cwd(), 'src/assets/demo_dataset.csv'), 'utf8')
const demo = { records: buildDemoRecords(demoCsv), origem: 'Base de demonstração' }

function setHash(h: string) {
  act(() => {
    window.location.hash = h
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
}

beforeEach(() => {
  localStorage.clear()
  window.location.hash = ''
})

describe('rotas por hash (SPEC-SHL-01)', () => {
  it('oito rotas conhecidas; hash vazio ou desconhecido abre a Visão geral', () => {
    expect(ROUTES.map((r) => r.path)).toEqual(['/', '/importacao', '/analise', '/previsao', '/comparacao', '/cenarios', '/dashboard', '/relatorios'])
    expect(routeFromHash('').id).toBe('inicio')
    expect(routeFromHash('#/nao-existe').id).toBe('inicio')
    expect(routeFromHash('#/previsao').id).toBe('previsao')
    expect(DOCUMENT_TITLE).toBe('Demanda+ · Gestão de Demanda')
    expect(readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')).toContain(`<title>${DOCUMENT_TITLE}</title>`)
  })

  it('muda de tela com o hash (voltar/avançar do navegador)', async () => {
    render(<App initial={demo} />)
    const current = () => within(screen.getByTestId('sidebar-desktop')).getByRole('link', { current: 'page' })
    expect(current()).toHaveTextContent('Visão geral')
    setHash('#/previsao')
    await waitFor(() => expect(current()).toHaveTextContent('Previsão de demanda'))
    setHash('#/xyz')
    await waitFor(() => expect(current()).toHaveTextContent('Visão geral'))
  })
})

describe('menu (SPEC-SHL-02)', () => {
  it('seções e itens na ordem do original, com aria-current no item atual', async () => {
    expect(SECTIONS.map((s) => s.title)).toEqual(['Início', 'Dados', 'Planejamento', 'Gestão'])
    expect(SECTIONS.flatMap((s) => s.routes.map((r) => r.title))).toEqual([
      'Visão geral', 'Importação de dados', 'Análise histórica', 'Previsão de demanda', 'Comparação de modelos', 'Cenários e CPFR', 'Dashboard gerencial', 'Relatórios e laudos',
    ])
    render(<App initial={demo} />)
    setHash('#/cenarios')
    const desktop = within(screen.getByTestId('sidebar-desktop'))
    await waitFor(() => expect(desktop.getByRole('link', { name: 'Cenários e CPFR' })).toHaveAttribute('aria-current', 'page'))
    expect(desktop.getByRole('link', { name: 'Visão geral' })).not.toHaveAttribute('aria-current')
  })
})

describe('cartão de status da base (SPEC-SHL-03, SPEC-SHL-04)', () => {
  it('sem base: convida a carregar a demonstração (SPEC-SHL-03)', () => {
    render(<App initial={null} />)
    const side = within(screen.getByTestId('sidebar-desktop'))
    expect(side.getByText('Sem base ativa')).toBeInTheDocument()
    expect(side.getByText('Carregue dados para começar')).toBeInTheDocument()
    expect(side.getByRole('button', { name: /Carregar demonstração/ })).toBeInTheDocument()
    expect(side.getByText(/Demanda\+ · v2\.0 — Previsão estatística, backtesting e colaboração CPFR\./)).toBeInTheDocument()
  })

  it('com base: origem, SKUs, registros e período (SPEC-SHL-03)', () => {
    render(<App initial={demo} />)
    const side = within(screen.getByTestId('sidebar-desktop'))
    expect(side.getByText('Base ativa')).toBeInTheDocument()
    expect(side.getByText('Base de demonstração')).toBeInTheDocument()
    expect(side.getByText('5')).toBeInTheDocument()
    expect(side.getByText('7.280')).toBeInTheDocument()
    expect(side.getByText('01/2023 – 12/2026')).toBeInTheDocument()
    expect(side.getByRole('button', { name: /Trocar base/ })).toBeInTheDocument()
  })

  it('Carregar demonstração ativa a base e avisa (SPEC-SHL-04)', async () => {
    render(<App initial={null} />)
    await userEvent.click(within(screen.getByTestId('sidebar-desktop')).getByTestId('side-demo'))
    expect(await screen.findByText('Base de demonstração carregada')).toBeInTheDocument()
    await waitFor(() => expect(within(screen.getByTestId('sidebar-desktop')).getByText('Base ativa')).toBeInTheDocument())
    expect(localStorage.getItem('demanda_dataset_v1')).not.toBeNull()
  })

  it('Trocar base limpa tudo e vai para a importação (SPEC-SHL-04)', async () => {
    render(<App initial={demo} />)
    await userEvent.click(within(screen.getByTestId('sidebar-desktop')).getByTestId('side-clear'))
    expect(window.location.hash).toBe('#/importacao')
    await waitFor(() => expect(within(screen.getByTestId('sidebar-desktop')).getByText('Sem base ativa')).toBeInTheDocument())
    expect(localStorage.getItem('demanda_dataset_v1')).toBeNull()
  })
})

describe('guarda de dados (SPEC-SHL-05)', () => {
  it.each(['#/analise', '#/previsao', '#/comparacao', '#/cenarios', '#/dashboard', '#/relatorios'])('%s sem base mostra a guarda e não renderiza a tela', async (hash) => {
    window.location.hash = hash
    render(<App initial={null} />)
    expect(await screen.findByText('Nenhuma base carregada ainda')).toBeInTheDocument()
    expect(screen.getByText(/5 produtos com perfis estável, crescente, sazonal, irregular e intermitente\./)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Usar dados de demonstração/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Importar minha base' })).toHaveAttribute('href', '#/importacao')
    expect(screen.queryByTestId('placeholder')).toBeNull()
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
  })

  it('Visão geral e Importação não exigem base', async () => {
    window.location.hash = '#/importacao'
    render(<App initial={null} />)
    await waitFor(() => expect(within(screen.getByTestId('sidebar-desktop')).getByRole('link', { current: 'page' })).toHaveTextContent('Importação de dados'))
    expect(screen.queryByText('Nenhuma base carregada ainda')).toBeNull()
    window.location.hash = ''
    setHash('')
    expect(screen.queryByText('Nenhuma base carregada ainda')).toBeNull()
  })

  it('"Usar dados de demonstração" ativa a base e libera a tela', async () => {
    window.location.hash = '#/analise'
    render(<App initial={null} />)
    await userEvent.click(await screen.findByTestId('guard-demo'))
    await waitFor(() => expect(screen.queryByText('Nenhuma base carregada ainda')).toBeNull())
    expect(within(screen.getByTestId('sidebar-desktop')).getByText('Base ativa')).toBeInTheDocument()
  })
})

describe('menu em telas estreitas (SPEC-SHL-06)', () => {
  it('abre a gaveta, fecha ao escolher item, no fundo e com Esc', async () => {
    render(<App initial={demo} />)
    expect(screen.queryByTestId('drawer')).toBeNull()
    await userEvent.click(screen.getByTestId('menu-button'))
    const drawer = within(screen.getByTestId('drawer'))
    await userEvent.click(drawer.getByRole('link', { name: 'Dashboard gerencial' }))
    expect(screen.queryByTestId('drawer')).toBeNull()

    await userEvent.click(screen.getByTestId('menu-button'))
    await userEvent.click(screen.getByTestId('drawer-backdrop'))
    expect(screen.queryByTestId('drawer')).toBeNull()

    await userEvent.click(screen.getByTestId('menu-button'))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByTestId('drawer')).toBeNull()
  })

  it('o conteúdo não cria rolagem horizontal da página (layout em coluna única, sem larguras fixas)', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
    expect(css).toContain('overflow-x: hidden')
  })
})

describe('avisos (SPEC-SHL-07)', () => {
  it('toast tem role=status e some sozinho', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(<App initial={null} />)
    await act(async () => { await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(within(screen.getByTestId('sidebar-desktop')).getByTestId('side-demo')) })
    const toast = await screen.findByRole('status')
    expect(toast).toHaveTextContent('Base de demonstração carregada')
    await act(async () => { vi.advanceTimersByTime(3100) })
    expect(screen.queryByText('Base de demonstração carregada')).toBeNull()
    vi.useRealTimers()
  })
})

describe('falha ao gravar a base (SPEC-PER-04)', () => {
  it('a base segue ativa e a interface avisa', async () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('cota') })
    render(<App initial={null} />)
    await userEvent.click(within(screen.getByTestId('sidebar-desktop')).getByTestId('side-demo'))
    expect(await screen.findByText('Não foi possível salvar a base neste aparelho. Ela continua disponível até você fechar ou recarregar a página.')).toBeInTheDocument()
    expect(within(screen.getByTestId('sidebar-desktop')).getByText('Base ativa')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Entendi' }))
    expect(screen.queryByTestId('save-warning')).toBeNull()
    vi.restoreAllMocks()
  })
})

describe('base restaurada (SPEC-PER-03)', () => {
  it('ao abrir o app a base gravada volta como "Base ativa"', async () => {
    const { unmount } = render(<App initial={null} />)
    await userEvent.click(within(screen.getByTestId('sidebar-desktop')).getByTestId('side-demo'))
    await waitFor(() => expect(localStorage.getItem('demanda_dataset_v1')).not.toBeNull())
    unmount()
    render(<App />)
    expect(within(screen.getByTestId('sidebar-desktop')).getByText('Base ativa')).toBeInTheDocument()
  })
})

describe('tema e identidade (SPEC-SHL-09)', () => {
  it('tokens, fonte, manifesto, ícone e theme-color', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
    expect(css).toContain('--color-canvas: #f6f7fb')
    expect(css).toContain('--color-primary: #4f46e5')
    expect(css).toContain('@fontsource-variable/inter')
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
    expect(html).toContain('name="theme-color" content="#0F172A"')
    expect(html).toContain('rel="manifest" href="/manifest.json"')
    expect(html).toContain('href="/icon.svg"')
    const manifest = JSON.parse(readFileSync(resolve(process.cwd(), 'public/manifest.json'), 'utf8'))
    expect(manifest).toMatchObject({ name: 'Demanda+ · Gestão de Demanda', theme_color: '#0F172A', display: 'standalone' })
    expect(readFileSync(resolve(process.cwd(), 'public/logo.svg'), 'utf8')).toContain('Demanda')
    render(<App initial={demo} />)
    expect(within(screen.getByTestId('sidebar-desktop')).getByAltText('Demanda+ · Planejamento · S&OP')).toHaveAttribute('src', '/logo.svg')
  })
})

describe('estado de interface não persistente (SPEC-PER-05)', () => {
  it('só a base é gravada no aparelho; filtros e seleções vivem na sessão', async () => {
    window.location.hash = '#/previsao'
    render(<App initial={null} />)
    await userEvent.click(within(screen.getByTestId('sidebar-desktop')).getByTestId('side-demo'))
    await userEvent.selectOptions(await screen.findByTestId('sku-select'), 'Smartphone TechX')
    await userEvent.click(screen.getByRole('radio', { name: '95%' }))
    expect(localStorage.length).toBe(1)
    expect(localStorage.key(0)).toBe('demanda_dataset_v1')
  })
})

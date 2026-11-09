import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { DataTable, BarCell, Sparkline } from './DataTable'
import { Badge, Callout, Card, Hero, Metric, ProgressBar, Section, Step, WinnerCard } from './display'
import { DateRange, Expander, FileDrop, MultiSelect, NumberInput, Pills, RangeSlider, Segmented, Select, Slider, Tabs } from './controls'
import { TONES } from './tones'

describe('átomos de exibição (SPEC-SHL-08)', () => {
  it('seguem os tokens do mapeamento', () => {
    expect(TONES.teal).toEqual({ bg: '#E6FAF7', fg: '#0F766E' })
    expect(TONES.amber.bg).toBe('#FFF7E6')
    render(
      <div>
        <Hero title="Título" subtitle="Sub" eyebrow="Módulo 01 · Dados" chips={['a', 'b']} />
        <Section title="Seção" subtitle="detalhe" />
        <Badge tone="green">OK</Badge>
        <Callout tone="amber" icon="⚠️">Cuidado</Callout>
        <Metric label="Volume" value="1.234" delta="+5,0%" deltaTone="good" help="ajuda" testId="m" />
        <Step n={1} title="Passo" desc="Descrição" />
        <WinnerCard label="Modelo vencedor" value="🏆 Holt" meta="WAPE de 5,0%" />
        <Card>cartão</Card>
        <ProgressBar value={30} label="Avaliando…" />
      </div>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Título' })).toBeInTheDocument()
    expect(screen.getByText('Módulo 01 · Dados')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Seção' })).toBeInTheDocument()
    expect(screen.getByText('OK')).toHaveStyle({ color: '#15803D' })
    expect(screen.getByTestId('m')).toHaveAttribute('title', 'ajuda')
    expect(screen.getByTestId('winner-card')).toHaveTextContent('🏆 Holt')
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '30')
  })
})

describe('controles (SPEC-SHL-08)', () => {
  function Wrapper() {
    const [freq, setFreq] = useState<'Diária' | 'Semanal' | 'Mensal'>('Mensal')
    const [tab, setTab] = useState<'a' | 'b'>('a')
    const [h, setH] = useState(6)
    const [sel, setSel] = useState<string[]>([])
    const [sku, setSku] = useState('A')
    const [n, setN] = useState(30)
    return (
      <div>
        <Segmented label="Granularidade" options={['Diária', 'Semanal', 'Mensal']} value={freq} onChange={setFreq} testId="seg" />
        <Pills label="Modelo" options={['Naive', 'Holt']} value="Naive" onChange={() => {}} format={(m) => (m === 'Holt' ? `★ ${m}` : m)} />
        <Tabs tabs={[{ id: 'a', label: 'Aba A' }, { id: 'b', label: 'Aba B' }]} value={tab} onChange={setTab}>conteúdo {tab}</Tabs>
        <Slider label="Horizonte" value={h} min={1} max={24} onChange={setH} testId="slider" />
        <MultiSelect label="Produtos" options={['A', 'B', 'C']} value={sel} onChange={setSel} placeholder="Todos os produtos" />
        <Select label="Produto (SKU)" value={sku} options={['A', 'B']} onChange={setSku} testId="sel" />
        <NumberInput label="Uplift" value={n} min={0} max={300} step={10} onChange={setN} />
        <output data-testid="state">{`${freq}|${tab}|${h}|${sel.join(',')}|${sku}|${n}`}</output>
      </div>
    )
  }

  it('Segmented: sempre uma opção e setas navegam', async () => {
    render(<Wrapper />)
    const radio = screen.getByRole('radio', { name: 'Mensal' })
    expect(radio).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(screen.getByRole('radio', { name: 'Semanal' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Semanal' })) // não desmarca
    expect(screen.getByTestId('state')).toHaveTextContent('Semanal|')
    screen.getByRole('radio', { name: 'Semanal' }).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByTestId('state')).toHaveTextContent('Mensal|')
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByTestId('state')).toHaveTextContent('Diária|')
  })

  it('Pills usa o formato dos rótulos', () => {
    render(<Wrapper />)
    expect(screen.getByRole('radio', { name: '★ Holt' })).toBeInTheDocument()
  })

  it('Tabs: troca por clique e setas, mostrando só o painel ativo', async () => {
    render(<Wrapper />)
    expect(screen.getByRole('tabpanel')).toHaveTextContent('conteúdo a')
    await userEvent.click(screen.getByRole('tab', { name: 'Aba B' }))
    expect(screen.getByRole('tabpanel')).toHaveTextContent('conteúdo b')
    await userEvent.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Aba A' })).toHaveAttribute('aria-selected', 'true')
  })

  it('Slider, Select, MultiSelect e NumberInput atualizam o estado', async () => {
    render(<Wrapper />)
    const { fireEvent } = await import('@testing-library/react')
    fireEvent.change(screen.getByTestId('slider'), { target: { value: '12' } })
    await userEvent.selectOptions(screen.getByTestId('sel'), 'B')
    await userEvent.click(screen.getByText('Todos os produtos'))
    await userEvent.click(screen.getByRole('checkbox', { name: 'C' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'A' }))
    fireEvent.change(screen.getByLabelText('Uplift'), { target: { value: '999' } })
    expect(screen.getByTestId('state')).toHaveTextContent('Mensal|a|12|A,C|B|300')
  })

  it('RangeSlider mantém início ≤ fim e formata as pontas', () => {
    const onChange = vi.fn()
    render(<RangeSlider label="Janela" labels={['2023-01-08', '2023-02-05', '2023-03-05']} value={[0, 2]} onChange={onChange} format={(s) => s.slice(0, 7)} testId="rng" />)
    expect(screen.getByText('2023-01')).toBeInTheDocument()
    expect(screen.getByText('2023-03')).toBeInTheDocument()
  })

  it('DateRange limita o intervalo', async () => {
    const onChange = vi.fn()
    render(<DateRange label="Período" min="2023-01-01" max="2026-12-31" value={['2024-01-01', '2024-06-01']} onChange={onChange} testId="dr" />)
    const { fireEvent } = await import('@testing-library/react')
    fireEvent.change(screen.getByTestId('dr-ini'), { target: { value: '2024-09-01' } })
    expect(onChange).toHaveBeenCalledWith(['2024-09-01', '2024-09-01'])
  })

  it('FileDrop entrega o arquivo escolhido', async () => {
    const onFile = vi.fn()
    render(<FileDrop label="Arraste o arquivo ou clique para selecionar" accept=".csv" onFile={onFile} testId="file" />)
    const f = new File(['a'], 'a.csv', { type: 'text/csv' })
    await userEvent.upload(screen.getByTestId('file'), f)
    expect(onFile).toHaveBeenCalledWith(f)
  })

  it('Expander abre e fecha', async () => {
    render(<Expander title="Entenda os modelos">detalhe</Expander>)
    const details = screen.getByText('Entenda os modelos').closest('details')!
    expect(details.open).toBe(false)
    await userEvent.click(screen.getByText('Entenda os modelos'))
    expect(details.open).toBe(true)
  })
})

describe('DataTable (SPEC-SHL-08)', () => {
  const rows = [{ n: 'b', v: 2 }, { n: 'a', v: 3 }, { n: 'c', v: 1 }]
  const columns = [
    { key: 'n', header: 'Nome', value: (r: (typeof rows)[number]) => r.n },
    { key: 'v', header: 'Valor', align: 'right' as const, value: (r: (typeof rows)[number]) => r.v, render: (r: (typeof rows)[number]) => <BarCell value={r.v} max={3} label={String(r.v)} /> },
  ]

  it('ordena em três estados e busca', async () => {
    render(<DataTable columns={columns} rows={rows} rowKey={(r) => r.n} searchable testId="t" />)
    const names = () => within(screen.getByTestId('t')).getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[0].textContent)
    expect(names()).toEqual(['b', 'a', 'c'])
    await userEvent.click(screen.getByRole('button', { name: /Nome/ }))
    expect(names()).toEqual(['a', 'b', 'c'])
    await userEvent.click(screen.getByRole('button', { name: /Nome/ }))
    expect(names()).toEqual(['c', 'b', 'a'])
    await userEvent.click(screen.getByRole('button', { name: /Nome/ }))
    expect(names()).toEqual(['b', 'a', 'c'])
    await userEvent.type(screen.getByLabelText('Buscar na tabela'), 'a')
    expect(names()).toEqual(['a'])
    await userEvent.clear(screen.getByLabelText('Buscar na tabela'))
    await userEvent.type(screen.getByLabelText('Buscar na tabela'), 'zzz')
    expect(screen.getByText('Nenhum registro.')).toBeInTheDocument()
  })

  it('Sparkline desenha a linha e tolera séries curtas', () => {
    const { rerender } = render(<Sparkline values={[1, 3, 2]} area />)
    expect(screen.getByTestId('sparkline')).toBeInTheDocument()
    rerender(<Sparkline values={[1]} />)
    expect(screen.queryByTestId('sparkline')).toBeNull()
  })
})

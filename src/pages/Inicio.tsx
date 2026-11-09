import { useMemo } from 'react'
import { DataTable, BarCell, Sparkline, type Column } from '../components/ui/DataTable'
import { Badge, Button, Card, Hero, Metric, Section, Step } from '../components/ui/display'
import { Icon, type IconName } from '../components/ui/Icon'
import { PROFILE_TONE } from '../components/ui/tones'
import { diffDays } from '../lib/dates'
import { fmtDate, fmtInt, fmtNum, fmtPct } from '../lib/format'
import { portfolioTable, type PortfolioRow } from '../services/eda/profile'
import { useDataset } from '../store/useDataset'
import { useToast } from '../store/useToast'

const STEPS: { n: number; title: string; desc: string; href: string; icon: IconName }[] = [
  { n: 1, title: 'Importação de dados', desc: 'Carregue CSV/Excel, mapeie colunas e valide a qualidade da base.', href: '#/importacao', icon: 'upload' },
  { n: 2, title: 'Análise histórica', desc: 'Indicadores, perfil de demanda, sazonalidade e distribuição.', href: '#/analise', icon: 'chart-search' },
  { n: 3, title: 'Previsão de demanda', desc: 'Projeções com intervalos de confiança e exportação.', href: '#/previsao', icon: 'trending-up' },
  { n: 4, title: 'Comparação de modelos', desc: 'Teste cego (out-of-sample) para eleger o melhor método.', href: '#/comparacao', icon: 'leaderboard' },
  { n: 5, title: 'Cenários e CPFR', desc: 'Simule choques e promoções; alinhe o plano com parceiros.', href: '#/cenarios', icon: 'tune' },
  { n: 6, title: 'Dashboard e laudos', desc: 'Visão executiva do portfólio e relatórios prontos para S&OP.', href: '#/dashboard', icon: 'monitor' },
]

function Portfolio({ rows }: { rows: PortfolioRow[] }) {
  const maxCv = Math.max(1, ...rows.map((r) => r.cv))
  const columns: Column<PortfolioRow>[] = [
    { key: 'sku', header: 'SKU', value: (r) => r.sku },
    { key: 'perfil', header: 'Perfil', value: (r) => r.perfil, render: (r) => <Badge tone={PROFILE_TONE[r.perfil]}>{r.perfil}</Badge> },
    { key: 'volume', header: 'Volume total', align: 'right', value: (r) => r.volumeTotal, render: (r) => fmtInt(r.volumeTotal) },
    { key: 'media', header: 'Média semanal', align: 'right', value: (r) => r.mediaSemanal, render: (r) => fmtNum(r.mediaSemanal, 1) },
    { key: 'cv', header: 'Variabilidade (CV)', value: (r) => r.cv, render: (r) => <BarCell value={r.cv} max={maxCv} label={fmtNum(r.cv, 2)} /> },
    { key: 'cresc', header: 'Crescimento (%)', align: 'right', value: (r) => r.crescimentoPct, render: (r) => fmtPct(r.crescimentoPct, 1, true) },
    { key: 'trend', header: 'Últimas 52 semanas', sortable: false, value: () => null, render: (r) => <Sparkline values={r.tendencia} area /> },
  ]
  return <DataTable testId="portfolio-table" columns={columns} rows={rows} rowKey={(r) => r.sku} />
}

export default function Inicio() {
  const { records, summary, loadDemo } = useDataset()
  const toast = useToast()
  const rows = useMemo(() => (records ? portfolioTable(records) : []), [records])

  return (
    <div>
      <Hero
        eyebrow="Demanda+ · Central de planejamento"
        title="Planeje a demanda com precisão estatística"
        subtitle="Do histórico de vendas ao plano consensado: importe sua base, entenda o comportamento de cada produto, gere previsões com 7 modelos estatísticos, valide com backtesting e alinhe o plano com parceiros via CPFR."
        chips={['7 modelos de previsão', 'Backtesting out-of-sample', 'Simulação de cenários', 'CPFR colaborativo', 'Laudos automáticos']}
      />

      {!summary ? (
        <Card testId="start-card">
          <div className="grid items-center gap-4 sm:grid-cols-[3fr_2fr]">
            <div>
              <h2 className="text-[1.05rem] font-bold text-ink">Comece em segundos</h2>
              <p className="mt-1 text-[0.86rem] leading-relaxed text-muted">
                Carregue a base de demonstração com 5 produtos de perfis distintos (estável, crescente, sazonal, irregular e intermitente) ou importe sua própria planilha CSV/Excel com as colunas <b>sku</b>, <b>data</b> e <b>quantidade_vendida</b>.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button variant="primary" icon="bolt" data-testid="home-demo" onClick={async () => { await loadDemo(); toast.show('Base de demonstração carregada') }}>
                Explorar com dados de demonstração
              </Button>
              <a href="#/importacao" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control text-[0.9rem] font-semibold text-primary hover:bg-primary-soft">
                <Icon name="upload" size={16} /> Importar minha base
              </a>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="home-kpis">
            <Metric label="Volume histórico" value={fmtInt(summary.volume)} help="Soma de todas as unidades vendidas na base." />
            <Metric label="Produtos (SKUs)" value={summary.skus} />
            <Metric label="Registros" value={fmtInt(summary.registros)} />
            <Metric label="Cobertura" value={`${Math.floor(diffDays(summary.fim, summary.inicio) / 30)} meses`} help={`${fmtDate(summary.inicio)} a ${fmtDate(summary.fim)}`} />
          </div>
          <Section title="Portfólio em um relance" subtitle="Perfil de demanda identificado automaticamente para cada SKU (base semanal)." />
          <Portfolio rows={rows} />
        </>
      )}

      <Section title="Fluxo de trabalho" subtitle="Siga as etapas na ordem ou vá direto ao módulo que precisa." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="workflow">
        {STEPS.map((s) => (
          <Card key={s.n} className="flex flex-col justify-between gap-3">
            <Step n={s.n} title={s.title} desc={s.desc} />
            <a href={s.href} className="inline-flex min-h-11 items-center gap-2 text-[0.9rem] font-semibold text-primary">
              <Icon name={s.icon} size={16} /> Abrir módulo
            </a>
          </Card>
        ))}
      </div>
    </div>
  )
}

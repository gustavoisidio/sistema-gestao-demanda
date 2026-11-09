import { useEffect, useMemo, useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartFrame } from '../components/charts/ChartFrame'
import { AXIS, COLORS, GRID, TOOLTIP } from '../components/charts/theme'
import { Select, Tabs } from '../components/ui/controls'
import { BarCell, DataTable, Sparkline, type Column } from '../components/ui/DataTable'
import { Badge, Button, Callout, Card, Hero, Metric, ProgressBar, Spinner } from '../components/ui/display'
import { PROFILE_TONE } from '../components/ui/tones'
import { downloadFile, MIME } from '../infra/download'
import { fmtDate, fmtDateTime, fmtInt, fmtNum, fmtPct } from '../lib/format'
import { fileNames, SHEETS, toCsv, toExcel, type ExportRow } from '../services/export/export'
import { listSkus } from '../services/data/summary'
import { buildReport, portfolioRow, reportSummary, reportText, type PortfolioReportRow, type Report } from '../services/reports/report'
import { useRecords } from '../store/useDataset'
import { memoByRecords, useDeferredCompute } from './helpers'
import { RichText } from './RichText'
import type { SaleRecord } from '../types'

export default function Relatorios() {
  const [tab, setTab] = useState<'laudo' | 'portfolio'>('laudo')
  return (
    <div>
      <Hero eyebrow="Módulo 10 · Gestão" title="Relatórios e laudos"
        subtitle="O sistema analisa o histórico, executa o backtesting de todos os modelos e redige um laudo gerencial automático — pronto para embasar reuniões de S&OP." />
      <Tabs tabs={[{ id: 'laudo', label: 'Laudo por produto', icon: 'file-text' }, { id: 'portfolio', label: 'Visão do portfólio', icon: 'box' }]} value={tab} onChange={setTab}>
        {tab === 'laudo' ? <LaudoTab /> : <PortfolioTab />}
      </Tabs>
    </div>
  )
}

function LaudoTab() {
  const { records, skus } = useRecords()
  const [sku, setSku] = useState(skus[0])
  const [generated, setGenerated] = useState<{ sku: string; at: Date } | null>(null)

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid items-end gap-4 sm:grid-cols-[3fr_1fr]">
          <Select label="Produto para o laudo" value={sku} options={skus} onChange={setSku} testId="rel-sku" />
          <Button variant="primary" icon="sparkles" data-testid="generate" onClick={() => setGenerated({ sku, at: new Date() })}>Gerar laudo</Button>
        </div>
      </Card>
      {generated?.sku !== sku ? (
        <Callout tone="indigo" icon="👆" testId="rel-hint">Selecione o produto e clique em <b>Gerar laudo</b>.</Callout>
      ) : (
        <ReportView key={generated.at.getTime()} records={records} sku={sku} at={generated.at} />
      )}
    </div>
  )
}

function ReportView({ records, sku, at }: { records: SaleRecord[]; sku: string; at: Date }) {
  const { value: report, pending } = useDeferredCompute(`${sku}|${at.getTime()}`, () => buildReport(records, sku, at))
  if (pending) {
    return (
      <Card testId="rel-progress">
        <Spinner label="Compilando laudo…" />
        <ul className="ml-7 list-disc text-[0.85rem] text-muted">
          <li>Agregando histórico semanal…</li>
          <li>Executando backtesting de 7 modelos…</li>
          <li>Projetando as próximas 12 semanas…</li>
        </ul>
      </Card>
    )
  }
  if (!report) return <Callout tone="red" icon="⛔">Não há dados suficientes para gerar o laudo.</Callout>
  return <ReportBody report={report} />
}

function ReportBody({ report: r }: { report: Report }) {
  const hist = r.serie.slice(-52)
  const last = hist[hist.length - 1]
  const data = [
    ...hist.map((p, i) => ({ date: p.date, hist: p.value, proj: i === hist.length - 1 ? p.value : undefined })),
    ...r.projecaoDatas.map((d, i) => ({ date: d, hist: undefined, proj: r.projecao[i] })),
  ]
  const modelLabel = r.modelo
  const resumo = reportSummary(r)
  const metrics: ExportRow[] = r.metricas.map((m) => ({ ...m }))
  const history: ExportRow[] = r.serie.map((p) => ({ data: p.date, quantidade_vendida: p.value }))
  const previsao: ExportRow[] = r.projecaoDatas.map((d, i) => ({ Semana: d, Previsão: Math.round(r.projecao[i]) }))

  return (
    <div className="space-y-4">
      <p className="text-[0.85rem] text-muted" data-testid="rel-done">✓ Laudo pronto</p>
      <Card testId="report-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[0.72rem] font-bold uppercase tracking-[0.08em] text-muted">Laudo automático · {fmtDateTime(r.geradoEm)}</div>
            <div className="text-[1.4rem] font-extrabold tracking-tight text-ink">{r.sku}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={PROFILE_TONE[r.classe]}>Perfil: {r.classe}</Badge>
            <Badge tone="teal">Modelo: {modelLabel}</Badge>
          </div>
        </div>
        <h3 className="mb-1 mt-4 text-[1.05rem] font-bold text-ink">Recomendações</h3>
        <ul className="ml-5 list-disc space-y-1.5 text-[0.92rem] leading-relaxed text-slate-700">
          {r.recomendacoes.map((rec, i) => <li key={i}><RichText text={rec} /></li>)}
        </ul>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5" data-testid="report-kpis">
        <Metric label="Volume total" value={fmtInt(r.indicators.total)} />
        <Metric label="Média semanal" value={fmtNum(r.indicators.media)} />
        <Metric label="CV" value={fmtNum(r.indicators.cv, 2)} />
        <Metric label="Acurácia validada" value={fmtPct(r.acuracia)} help="100% − WAPE no teste cego" />
        <Metric label="Previsão 12 semanas" value={fmtInt(r.projecao.reduce((a, b) => a + b, 0))} />
      </div>

      <Card>
        <ChartFrame height={340} testId="chart-report">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="date" {...AXIS} tickFormatter={fmtDate} minTickGap={40} />
            <YAxis {...AXIS} domain={['auto', 'auto']} width={56} tickFormatter={fmtInt} />
            <Tooltip {...TOOLTIP} labelFormatter={(d) => fmtDate(String(d))} formatter={(v) => fmtNum(v, 1)} />
            <Legend verticalAlign="top" align="left" height={48} wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="hist" name="Últimas 52 semanas" stroke={COLORS.series} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="proj" name={`Projeção · ${modelLabel}`} stroke={COLORS.accent} strokeWidth={3} dot={false} isAnimationActive={false} />
          </LineChart>
        </ChartFrame>
        <span className="sr-only">{last.date}</span>
      </Card>

      <div className="grid gap-2 sm:grid-cols-3">
        <Button variant="primary" icon="download" data-testid="dl-xlsx"
          onClick={async () => downloadFile(fileNames.reportXlsx(r.sku), await toExcel({ [SHEETS.report.summary]: resumo, [SHEETS.report.metrics]: metrics, [SHEETS.report.forecast]: previsao, [SHEETS.report.history]: history }), MIME.xlsx)}>
          Laudo completo (Excel)
        </Button>
        <Button icon="download" data-testid="dl-csv" onClick={() => downloadFile(fileNames.historyCsv(r.sku), toCsv(history), MIME.csv)}>Histórico semanal (CSV)</Button>
        <Button icon="file-text" data-testid="dl-txt" onClick={() => downloadFile(fileNames.reportTxt(r.sku), reportText(r.sku, r.geradoEm, r.recomendacoes), MIME.txt)}>Laudo em texto (TXT)</Button>
      </div>
    </div>
  )
}

function usePortfolio(records: SaleRecord[]) {
  const skus = useMemo(() => listSkus(records), [records])
  const cached = memoByRecords<{ rows: PortfolioReportRow[] | null }>(records, 'portfolio', () => ({ rows: null }))
  const [rows, setRows] = useState<PortfolioReportRow[] | null>(cached.rows)
  const [progress, setProgress] = useState({ i: 0, sku: '' })

  useEffect(() => {
    if (cached.rows) return
    let cancelled = false
    const acc: PortfolioReportRow[] = []
    const step = (i: number) => {
      if (cancelled) return
      if (i >= skus.length) {
        cached.rows = acc
        setRows(acc)
        return
      }
      setProgress({ i, sku: skus[i] })
      // dá tempo de pintar a barra antes de calcular o SKU
      setTimeout(() => {
        if (cancelled) return
        acc.push(portfolioRow(records, skus[i]))
        step(i + 1)
      }, 20)
    }
    step(0)
    return () => { cancelled = true }
  }, [records, skus, cached])

  return { rows, progress, total: skus.length }
}

function PortfolioTab() {
  const { records } = useRecords()
  const { rows, progress, total } = usePortfolio(records)

  if (!rows) {
    return (
      <Card testId="portfolio-progress">
        <ProgressBar value={progress.i} max={total} label={progress.sku ? `Avaliando ${progress.sku}…` : 'Avaliando portfólio…'} />
      </Card>
    )
  }

  const columns: Column<PortfolioReportRow>[] = [
    { key: 'sku', header: 'SKU', value: (r) => r.sku },
    { key: 'perfil', header: 'Perfil', value: (r) => r.perfil, render: (r) => <Badge tone={PROFILE_TONE[r.perfil]}>{r.perfil}</Badge> },
    { key: 'modelo', header: 'Modelo recomendado', value: (r) => r.modelo },
    { key: 'acc', header: 'Acurácia', value: (r) => r.acuracia, render: (r) => (r.acuracia === null ? '—' : <BarCell value={r.acuracia} max={100} label={fmtPct(r.acuracia)} />) },
    { key: 'vies', header: 'Viés', align: 'right', value: (r) => r.vies, render: (r) => fmtNum(r.vies, 0) },
    { key: 'vol', header: 'Volume 52 sem.', align: 'right', value: (r) => r.volume52, render: (r) => fmtInt(r.volume52) },
    { key: 'trend', header: 'Últimas 52 semanas', sortable: false, value: () => null, render: (r) => <Sparkline values={r.tendencia} /> },
  ]

  return (
    <div className="space-y-4">
      <p className="text-[0.86rem] text-muted">Backtesting consolidado de todos os produtos (base semanal) com o modelo vencedor de cada um.</p>
      <DataTable testId="portfolio-report" columns={columns} rows={rows} rowKey={(r) => r.sku} />
      <Button variant="primary" icon="download" data-testid="export-portfolio"
        onClick={async () => downloadFile(fileNames.portfolio, await toExcel({ [SHEETS.portfolio]: rows.map((r) => ({ SKU: r.sku, Perfil: r.perfil, 'Modelo recomendado': r.modelo, 'Acurácia (%)': r.acuracia, Viés: r.vies, 'Volume 52 sem.': r.volume52 })) }), MIME.xlsx)}>
        Exportar visão do portfólio (Excel)
      </Button>
    </div>
  )
}

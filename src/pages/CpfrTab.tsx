import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartFrame } from '../components/charts/ChartFrame'
import { AXIS, COLORS, GRID, TOOLTIP } from '../components/charts/theme'
import { Select, Slider } from '../components/ui/controls'
import { Badge, Button, Callout, Card, Metric, Section } from '../components/ui/display'
import { DataTable, type Column } from '../components/ui/DataTable'
import { downloadFile, MIME } from '../infra/download'
import { fmtDate, fmtInt, fmtNum, fmtPct } from '../lib/format'
import { buildConsensus, cpfrStatistical, sanitizePartnerValue, STATUS_LABEL, type ConsensusRow } from '../services/cpfr/cpfr'
import { fileNames, SHEETS, toExcel } from '../services/export/export'
import { seriesFor } from '../services/series/aggregate'
import { futureIndex } from '../services/series/calendar'
import { useRecords } from '../store/useDataset'

export function CpfrTab() {
  const { records, skus } = useRecords()
  const [sku, setSku] = useState(skus[0])
  const [h, setH] = useState(8)
  const [tol, setTol] = useState(20)
  // edições do parceiro por (SKU, horizonte): trocar a tolerância preserva, trocar SKU/horizonte reinicia (SPEC-CPF-05)
  const [edits, setEdits] = useState<{ key: string; values: number[] } | null>(null)

  const weekly = useMemo(() => seriesFor(records, sku, 'W'), [records, sku])
  const stat = useMemo(() => cpfrStatistical(weekly.map((p) => p.value), h), [weekly, h])
  const key = `${sku}|${h}`

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-4 md:grid-cols-3">
          <Select label="Produto para consenso" value={sku} options={skus} onChange={setSku} testId="cpfr-sku" />
          <Slider label="Horizonte (semanas)" value={h} min={4} max={16} onChange={setH} testId="cpfr-h" />
          <Slider label="Tolerância de divergência (%)" value={tol} min={5} max={50} step={5} onChange={setTol} testId="cpfr-tol" />
        </div>
      </Card>

      {!stat ? (
        <Callout tone="red" icon="⛔" testId="cpfr-short">Histórico insuficiente para o plano de consenso.</Callout>
      ) : (
        <Consensus sku={sku} stat={stat} dates={futureIndex(weekly[weekly.length - 1].date, h, 'W')} tol={tol}
          partner={edits?.key === key ? edits.values : stat} onEdit={(i, v) => setEdits({ key, values: (edits?.key === key ? edits.values : stat).map((x, k) => (k === i ? v : x)) })} />
      )}
    </div>
  )
}

function Consensus({ sku, stat, dates, tol, partner, onEdit }: {
  sku: string
  stat: number[]
  dates: string[]
  tol: number
  partner: number[]
  onEdit: (index: number, value: number) => void
}) {
  const c = buildConsensus(stat, partner, tol)
  const rows = c.rows.map((r, i) => ({ ...r, semana: dates[i] }))
  const criticos = rows.filter((r) => r.critico)
  const data = rows.map((r) => ({ semana: r.semana, sistema: r.sistema, parceiro: r.parceiro, critico: r.critico }))

  const columns: Column<(typeof rows)[number]>[] = [
    { key: 'semana', header: 'Semana', value: (r) => r.semana, render: (r) => fmtDate(r.semana) },
    { key: 'sistema', header: 'Estatística (sistema)', align: 'right', value: (r) => r.sistema, render: (r) => fmtInt(r.sistema) },
    { key: 'parceiro', header: 'Plano do parceiro', align: 'right', value: (r) => r.parceiro, render: (r) => fmtInt(r.parceiro) },
    { key: 'div', header: 'Divergência (%)', align: 'right', value: (r) => r.divergenciaPct, render: (r) => fmtPct(r.divergenciaPct, 1, true) },
    { key: 'status', header: 'Status', value: (r) => STATUS_LABEL[r.status], render: (r) => STATUS_LABEL[r.status] },
  ]

  return (
    <>
      <Callout tone="indigo" icon="✍️">Edite a coluna <b>Plano do parceiro</b> com as projeções recebidas do cliente/fornecedor. A análise de consenso é atualizada instantaneamente.</Callout>

      <div className="overflow-x-auto rounded-xl border border-border bg-white" data-testid="partner-editor">
        <table className="w-full border-collapse text-[0.88rem]">
          <thead className="bg-canvas-2">
            <tr>
              {['Semana', 'Estatística (sistema)', 'Plano do parceiro'].map((h, i) => (
                <th key={h} scope="col" className={`px-3 py-2.5 text-[0.76rem] font-bold uppercase tracking-wide text-muted ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.semana} className="border-t border-grid">
                <td className="px-3 py-1.5">{fmtDate(r.semana)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-muted">{fmtInt(r.sistema)}</td>
                <td className="px-3 py-1.5 text-right">
                  <input type="number" inputMode="numeric" min={0} step={1} value={r.parceiro} aria-label={`Plano do parceiro ${fmtDate(r.semana)}`} data-testid={`partner-${i}`}
                    className="min-h-11 w-28 rounded-control border border-border px-2 text-right tabular-nums" title="Clique duas vezes para editar"
                    onChange={(e) => onEdit(i, sanitizePartnerValue(e.target.value))} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Section title="Análise de consenso" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="cpfr-kpis">
        <Metric label="Semanas alinhadas" value={`${c.alinhadas}/${rows.length}`} delta={`${fmtNum(c.aderenciaPct, 0)}% de aderência`} />
        <Metric label="Plano do parceiro" value={fmtInt(c.totalParceiro)} />
        <Metric label="Estatística" value={fmtInt(c.totalSistema)} />
        <Metric label="Divergência total" value={fmtPct(c.divergenciaTotalPct, 1, true)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card>
          <ChartFrame height={320} testId="chart-cpfr">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="semana" {...AXIS} tickFormatter={fmtDate} minTickGap={20} />
              <YAxis {...AXIS} width={56} tickFormatter={fmtInt} label={{ value: 'Quantidade', angle: -90, position: 'insideLeft', fill: COLORS.muted, fontSize: 12 }} />
              <Tooltip {...TOOLTIP} labelFormatter={(d) => fmtDate(String(d))} formatter={(v) => fmtInt(v)} />
              <Legend verticalAlign="top" align="left" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="sistema" name="Estatística" fill={COLORS.soft} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="parceiro" name="Parceiro" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {data.map((d) => <Cell key={d.semana} fill={d.critico ? COLORS.amber : COLORS.accent} />)}
              </Bar>
            </BarChart>
          </ChartFrame>
        </Card>
        <div data-testid="cpfr-alerts">
          {criticos.length === 0 ? (
            <Callout tone="green" icon="✅">
              <b>Plano em consenso.</b> Todas as semanas estão dentro da margem de ±{tol}%.
            </Callout>
          ) : (
            <>
              <Callout tone="red" icon="⚠️"><b>{criticos.length} semana(s) com desvio crítico.</b> Recomenda-se reunião de alinhamento tático com o parceiro.</Callout>
              <ul className="mt-2">
                {criticos.map((r: ConsensusRow & { semana: string }) => {
                  const acima = r.divergenciaPct > 0
                  return (
                    <li key={r.semana} className="flex items-center justify-between border-b border-grid px-0.5 py-2">
                      <span className="font-semibold text-ink">{fmtDate(r.semana)}</span>
                      <Badge tone={acima ? 'amber' : 'red'}>{fmtPct(r.divergenciaPct, 1, true)}{acima ? ' · ruptura' : ' · excesso'}</Badge>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      </div>

      <DataTable testId="cpfr-table" columns={columns} rows={rows} rowKey={(r) => r.semana} />
      <Button variant="primary" icon="download" data-testid="export-cpfr"
        onClick={async () => downloadFile(fileNames.cpfr(sku), await toExcel({ [SHEETS.cpfr]: rows.map((r) => ({ Semana: r.semana, 'Estatística (sistema)': r.sistema, 'Plano do parceiro': r.parceiro, 'Divergência (%)': r.divergenciaPct, Status: STATUS_LABEL[r.status] })) }), MIME.xlsx)}>
        Exportar plano de consenso (Excel)
      </Button>
    </>
  )
}

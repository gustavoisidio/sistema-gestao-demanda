import { useMemo, useState } from 'react'
import { Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartFrame } from '../components/charts/ChartFrame'
import { AXIS, COLORS, GRID, TOOLTIP } from '../components/charts/theme'
import { Expander, MultiSelect, NumberInput, Pills, Select, Slider } from '../components/ui/controls'
import { Button, Card, Metric, Spinner } from '../components/ui/display'
import { DataTable, type Column } from '../components/ui/DataTable'
import { downloadFile, MIME } from '../infra/download'
import { fmtDate, fmtInt, fmtNum, fmtPct } from '../lib/format'
import { fileNames, SHEETS, toExcel } from '../services/export/export'
import { availableModels, runModels } from '../services/forecasting'
import { buildScenario, clampPromoWeeks, defaultPromoWeeks, scenarioTable, type ScenarioRow } from '../services/scenarios/scenarios'
import { seriesFor } from '../services/series/aggregate'
import { futureIndex } from '../services/series/calendar'
import { useRecords } from '../store/useDataset'
import type { ModelName } from '../types'
import { useDeferredCompute } from './helpers'

const weekLabel = (w: string) => `Semana ${w}`

export function ScenarioTab() {
  const { records, skus } = useRecords()
  const [sku, setSku] = useState(skus[0])
  const [h, setH] = useState(12)
  const [model, setModel] = useState<ModelName | null>(null)
  const [choque, setChoque] = useState(0)
  const [promo, setPromo] = useState<number[]>(() => defaultPromoWeeks(12))
  const [uplift, setUplift] = useState(30)

  const series = useMemo(() => seriesFor(records, sku, 'W'), [records, sku])
  const names = availableModels(series.length, 52)
  const base: ModelName = model && names.includes(model) ? model : names.includes('Média Móvel') ? 'Média Móvel' : names[0]
  const { value: models, pending } = useDeferredCompute(`${sku}|${h}`, () => runModels(series.map((p) => p.value), h, 52))

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-4 md:grid-cols-[2fr_3fr]">
          <Select label="Produto" value={sku} options={skus} onChange={setSku} testId="cen-sku" />
          <Slider label="Semanas no futuro" value={h} min={4} max={52} onChange={setH} testId="cen-h" />
        </div>
        <div className="mt-4 space-y-4">
          <Pills label="Previsão base" options={names} value={base} onChange={setModel} testId="cen-model" />
          <div className="grid gap-4 md:grid-cols-[3fr_3fr_2fr]">
            <Slider label="Choque de demanda global (%)" value={choque} min={-50} max={100} step={5} onChange={setChoque} testId="cen-choque"
              help="Efeito macro em todo o horizonte (ex.: recessão −15%, nova praça +20%)." />
            <MultiSelect label="Semanas com promoção" placeholder="Selecione semanas…" options={Array.from({ length: h }, (_, i) => String(i + 1))} format={weekLabel}
              value={clampPromoWeeks(promo, h).map(String)} onChange={(v) => setPromo(v.map(Number))} testId="cen-promo" />
            <NumberInput label="Uplift da promoção (%)" value={uplift} min={0} max={300} step={10} onChange={setUplift} testId="cen-uplift" />
          </div>
        </div>
      </Card>

      {pending || !models || !models[base] ? (
        <Spinner label="Ajustando modelos estatísticos…" />
      ) : (
        <ScenarioResult sku={sku} h={h} baseName={base} baseFc={models[base]!.forecast} lastDate={series[series.length - 1].date} choque={choque} promo={clampPromoWeeks(promo, h)} uplift={uplift} />
      )}
    </div>
  )
}

function ScenarioResult({ sku, h, baseName, baseFc, lastDate, choque, promo, uplift }: {
  sku: string
  h: number
  baseName: ModelName
  baseFc: number[]
  lastDate: string
  choque: number
  promo: number[]
  uplift: number
}) {
  const s = buildScenario(baseFc, choque, promo, uplift)
  const datas = futureIndex(lastDate, h, 'W')
  const table = scenarioTable(baseFc, s.cenario, datas, promo)
  const hasEffect = s.efeito.some((e) => Math.abs(e) > 0.5)
  const data = datas.map((d, i) => ({ date: d, week: i + 1, base: baseFc[i], cenario: s.cenario[i], efeito: s.efeito[i] }))

  const columns: Column<ScenarioRow>[] = [
    { key: 'semana', header: 'Semana', value: (r) => r.semana },
    { key: 'data', header: 'Data', value: (r) => r.data, render: (r) => fmtDate(r.data) },
    { key: 'base', header: 'Base', align: 'right', value: (r) => r.base, render: (r) => fmtInt(r.base) },
    { key: 'cenario', header: 'Cenário', align: 'right', value: (r) => r.cenario, render: (r) => fmtInt(r.cenario) },
    { key: 'promo', header: 'Promoção', align: 'center', value: (r) => r.promocao, render: (r) => <input type="checkbox" checked={r.promocao} readOnly disabled aria-label={`Promoção ${r.semana}`} /> },
    { key: 'var', header: 'Variação (%)', align: 'right', value: (r) => r.variacaoPct, render: (r) => fmtPct(r.variacaoPct, 1, true) },
  ]

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="scenario-kpis">
        <Metric label="Volume base" value={fmtInt(s.volumeBase)} />
        <Metric label="Volume do cenário" value={fmtInt(s.volumeCenario)} delta={fmtPct(s.variacaoPct, 1, true)} />
        <Metric label="Unidades incrementais" value={fmtInt(s.incremental)} />
        <Metric label="Pico semanal" value={fmtInt(s.picoValor)} help={`Semana de ${fmtDate(datas[s.picoIndice])}`} />
      </div>

      <Card>
        <ChartFrame height={430} testId="chart-scenario">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="date" {...AXIS} tickFormatter={fmtDate} minTickGap={30} />
            <YAxis yAxisId="l" {...AXIS} width={56} domain={[0, 'auto']} tickFormatter={fmtInt} label={{ value: 'Quantidade semanal', angle: -90, position: 'insideLeft', fill: COLORS.muted, fontSize: 12 }} />
            {hasEffect && <YAxis yAxisId="r" orientation="right" {...AXIS} width={56} tickFormatter={fmtInt} label={{ value: 'Efeito (un.)', angle: 90, position: 'insideRight', fill: COLORS.muted, fontSize: 12 }} />}
            <Tooltip {...TOOLTIP} labelFormatter={(d) => fmtDate(String(d))} formatter={(v) => fmtNum(v, 1)} />
            <Legend verticalAlign="top" align="left" wrapperStyle={{ fontSize: 12 }} />
            {hasEffect && (
              <Bar yAxisId="r" dataKey="efeito" name="Efeito do cenário" fillOpacity={0.35} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {data.map((d) => <Cell key={d.date} fill={d.efeito >= 0 ? COLORS.accent : '#F87171'} />)}
              </Bar>
            )}
            <Line yAxisId="l" type="monotone" dataKey="base" name={`Base · ${baseName}`} stroke={COLORS.slate} strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
            <Line yAxisId="l" type="monotone" dataKey="cenario" name="Cenário simulado" stroke={COLORS.primary} strokeWidth={3} isAnimationActive={false}
              dot={(p: { cx?: number; cy?: number; payload?: { week: number } }) => {
                const promoWeek = p.payload ? promo.includes(p.payload.week) : false
                return <circle key={p.payload?.week} cx={p.cx} cy={p.cy} r={promoWeek ? 5.5 : 3} fill={promoWeek ? COLORS.accent : COLORS.primary} stroke="#fff" strokeWidth={1.5} />
              }} />
          </ComposedChart>
        </ChartFrame>
      </Card>

      <Expander title="Detalhamento semanal" icon="table" testId="scenario-detail">
        <DataTable columns={columns} rows={table} rowKey={(r) => r.semana} />
        <div className="mt-3">
          <Button icon="download" data-testid="export-scenario"
            onClick={async () => downloadFile(fileNames.scenario(sku), await toExcel({ [SHEETS.scenario]: table.map((r) => ({ Semana: r.semana, Data: r.data, Base: r.base, Cenário: r.cenario, Promoção: r.promocao, 'Variação (%)': r.variacaoPct })) }), MIME.xlsx)}>
            Exportar cenário (Excel)
          </Button>
        </div>
      </Expander>
    </>
  )
}

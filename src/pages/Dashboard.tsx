import { useMemo, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Line, LineChart, Pie, PieChart, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartFrame } from '../components/charts/ChartFrame'
import { Heatmap } from '../components/charts/Heatmap'
import { DIVERGING } from '../components/charts/colorScale'
import { AXIS, COLORS, GRID, TOOLTIP, colorOf } from '../components/charts/theme'
import { DateRange, MultiSelect, Segmented } from '../components/ui/controls'
import { Sparkline } from '../components/ui/DataTable'
import { Callout, Card, Hero, Metric, Section } from '../components/ui/display'
import { fmtDate, fmtInt, fmtNum, fmtPct } from '../lib/format'
import { dailyTotals, dashboardKpis, filterBase, intensityIndex, monthlyBySku, shareByMonth, volumeBySku } from '../services/dashboard/dashboard'
import { useRecords } from '../store/useDataset'

type Mode = 'Empilhado' | 'Linhas' | 'Participação %'
const MODES: Mode[] = ['Empilhado', 'Linhas', 'Participação %']
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const monthShort = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]}/${d.slice(2, 4)}`

export default function Dashboard() {
  const { records, skus } = useRecords()
  const dates = useMemo(() => records.map((r) => r.data).sort(), [records])
  const [dmin, dmax] = [dates[0], dates[dates.length - 1]]
  const [sel, setSel] = useState<string[]>([])
  const [range, setRange] = useState<[string, string]>([dmin, dmax])
  const [mode, setMode] = useState<Mode>('Empilhado')

  const base = useMemo(() => filterBase(records, sel, range[0], range[1]), [records, sel, range])
  const kpis = useMemo(() => dashboardKpis(base), [base])

  return (
    <div>
      <Hero eyebrow="Módulo 05 · Gestão" title="Dashboard gerencial" subtitle="Visão executiva do portfólio: volume, ritmo recente, participação por produto e evolução temporal." />

      <Card>
        <div className="grid gap-4 md:grid-cols-[3fr_2fr]">
          <MultiSelect label="Produtos" options={skus} value={sel} onChange={setSel} placeholder="Todos os produtos" testId="dash-skus" />
          <DateRange label="Período" min={dmin} max={dmax} value={range} onChange={setRange} testId="dash-period" />
        </div>
      </Card>

      <div className="mt-4">
        {!kpis ? (
          <Callout tone="indigo" icon="ℹ️" testId="dash-empty">Nenhum dado para os filtros selecionados.</Callout>
        ) : (
          <Body base={base} kpis={kpis} skus={skus} mode={mode} setMode={setMode} />
        )}
      </div>
    </div>
  )
}

function Body({ base, kpis, skus, mode, setMode }: { base: ReturnType<typeof filterBase>; kpis: NonNullable<ReturnType<typeof dashboardKpis>>; skus: string[]; mode: Mode; setMode: (m: Mode) => void }) {
  const volume = useMemo(() => volumeBySku(base, skus), [base, skus])
  const monthly = useMemo(() => monthlyBySku(base, kpis.ultimo), [base, kpis.ultimo])
  const daily = useMemo(() => dailyTotals(base).slice(-60).map((d) => d.value), [base])
  const total = volume.reduce((a, v) => a + v.volume, 0)

  const evolution = useMemo(() => {
    const share = shareByMonth(monthly)
    return monthly.months.map((m, i) => {
      const row: Record<string, number | string> = { date: m }
      for (const s of monthly.skus) row[s] = mode === 'Participação %' ? (share[s][i] ?? 0) : (monthly.values[s][i] ?? 0)
      return row
    })
  }, [monthly, mode])

  const intensity = useMemo(() => intensityIndex(monthly), [monthly])
  const idxRows = monthly.skus
  const idxValues = idxRows.map((s) => intensity[s])
  const flat = idxValues.flat().filter((v): v is number => v !== null)
  const spread = flat.length ? Math.max(...flat.map((v) => Math.abs(v - 100))) : 1
  const colorFor = (sku: string) => colorOf(skus.indexOf(sku))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5" data-testid="dash-kpis">
        <Metric label="Volume no período" value={fmtInt(kpis.volume)}>
          <div className="mt-2"><Sparkline values={kpis.mensal} area width={140} /></div>
        </Metric>
        <Metric label="Últimos 30 dias" value={fmtInt(kpis.r30)} delta={kpis.delta30 === null ? undefined : `${fmtPct(kpis.delta30, 1, true)} vs. 30 dias anteriores`} deltaTone={kpis.delta30 === null ? 'neutral' : kpis.delta30 >= 0 ? 'good' : 'bad'} />
        <Metric label="Últimos 12 meses" value={fmtInt(kpis.ano)} delta={kpis.yoy === null ? undefined : `${fmtPct(kpis.yoy, 1, true)} vs. 12 meses anteriores`} deltaTone={kpis.yoy === null ? 'neutral' : kpis.yoy >= 0 ? 'good' : 'bad'} />
        <Metric label="Média diária" value={fmtNum(kpis.mediaDiaria)}>
          <div className="mt-2"><Sparkline values={daily} width={140} /></div>
        </Metric>
        <Metric label="Produto campeão" value={<span className="text-[1.15rem]">{kpis.campeao}</span>} delta={`${fmtNum(kpis.participacao, 0)}% do volume`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card>
          <h3 className="mb-2 text-[0.92rem] font-semibold text-ink">Volume por produto</h3>
          <ChartFrame height={320} testId="chart-volume">
            <BarChart data={volume} layout="vertical" margin={{ top: 4, right: 70, bottom: 0, left: 0 }}>
              <CartesianGrid {...GRID} horizontal={false} vertical />
              <XAxis type="number" {...AXIS} tickFormatter={fmtInt} />
              <YAxis type="category" dataKey="sku" {...AXIS} width={120} />
              <Tooltip {...TOOLTIP} formatter={(v) => `${fmtInt(v)} un.`} />
              <Bar dataKey="volume" radius={[0, 6, 6, 0]} isAnimationActive={false}>
                {volume.map((v) => <Cell key={v.sku} fill={colorOf(v.colorIndex)} />)}
                <LabelList dataKey="volume" position="right" formatter={(v: unknown) => fmtInt(v)} style={{ fontSize: 12, fill: COLORS.muted }} />
              </Bar>
            </BarChart>
          </ChartFrame>
        </Card>
        <Card>
          <h3 className="mb-2 text-[0.92rem] font-semibold text-ink">Participação no portfólio</h3>
          <div className="relative">
            <ChartFrame height={320} testId="chart-share">
              <PieChart>
                <Pie data={volume} dataKey="volume" nameKey="sku" innerRadius="62%" outerRadius="90%" stroke="#fff" strokeWidth={2} isAnimationActive={false}
                  label={({ percent }) => (percent && percent > 0.05 ? fmtPct((percent ?? 0) * 100, 0) : '')} labelLine={false}>
                  {volume.map((v) => <Cell key={v.sku} fill={colorOf(v.colorIndex)} />)}
                </Pie>
                <Tooltip {...TOOLTIP} formatter={(v) => `${fmtInt(v)} un. (${fmtPct((Number(v) / total) * 100, 1)})`} />
                <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ChartFrame>
            <div className="pointer-events-none absolute inset-x-0 top-[38%] text-center">
              <div className="text-lg font-extrabold text-ink">{fmtInt(total)}</div>
              <div className="text-[0.7rem] text-muted">unidades</div>
            </div>
          </div>
        </Card>
      </div>

      <Section title="Evolução temporal" subtitle="Volume mensal por produto." />
      <Segmented label="Visualização" options={MODES} value={mode} onChange={setMode} testId="dash-mode" />
      <p className="text-[0.82rem] text-muted">Meses incompletos no fim do período são omitidos. Dados até {fmtDate(kpis.ultimo)}.</p>
      <Card>
        <ChartFrame height={420} testId="chart-evolution">
          {mode === 'Linhas' ? (
            <LineChart data={evolution} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="date" {...AXIS} tickFormatter={monthShort} minTickGap={30} />
              <YAxis {...AXIS} width={60} tickFormatter={fmtInt} label={{ value: 'Volume mensal', angle: -90, position: 'insideLeft', fill: COLORS.muted, fontSize: 12 }} />
              <Tooltip {...TOOLTIP} labelFormatter={(d) => monthShort(String(d))} formatter={(v) => fmtInt(v)} />
              <Legend verticalAlign="top" align="left" wrapperStyle={{ fontSize: 12 }} />
              {monthly.skus.map((s) => <Line key={s} type="monotone" dataKey={s} stroke={colorFor(s)} strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false} />)}
            </LineChart>
          ) : (
            <AreaChart data={evolution} stackOffset={mode === 'Participação %' ? 'expand' : 'none'} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="date" {...AXIS} tickFormatter={monthShort} minTickGap={30} />
              <YAxis {...AXIS} width={60} tickFormatter={(v) => (mode === 'Participação %' ? `${Math.round(v * 100)}%` : fmtInt(v))}
                label={{ value: mode === 'Participação %' ? '% do volume' : 'Volume mensal', angle: -90, position: 'insideLeft', fill: COLORS.muted, fontSize: 12 }} />
              <Tooltip {...TOOLTIP} labelFormatter={(d) => monthShort(String(d))} formatter={(v) => (mode === 'Participação %' ? fmtPct(v, 1) : fmtInt(v))} />
              <Legend verticalAlign="top" align="left" wrapperStyle={{ fontSize: 12 }} />
              {monthly.skus.map((s) => <Area key={s} type="monotone" dataKey={s} stackId="1" stroke={colorFor(s)} fill={colorFor(s)} fillOpacity={0.85} strokeWidth={1} isAnimationActive={false} />)}
            </AreaChart>
          )}
        </ChartFrame>
      </Card>

      <Section title="Intensidade mensal por produto" subtitle="Índice do mês em relação à média do próprio produto (100 = média)." />
      <Card>
        <Heatmap testId="heat-intensity" rows={idxRows} cols={monthly.months.map(monthShort)} values={idxValues} scale={DIVERGING} domain={[100 - spread, 100 + spread]}
          tooltip={(r, c, v) => `${r} · ${c}: índice ${fmtNum(v, 0)}`} />
      </Card>
    </div>
  )
}

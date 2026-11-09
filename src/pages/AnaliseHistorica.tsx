import { useMemo, useState } from 'react'
import { Bar, BarChart, Brush, CartesianGrid, Cell, Legend, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts'
import { BoxPlot } from '../components/charts/BoxPlot'
import { ChartFrame } from '../components/charts/ChartFrame'
import { Heatmap } from '../components/charts/Heatmap'
import { SEQUENTIAL } from '../components/charts/colorScale'
import { AXIS, COLORS, GRID, TOOLTIP, colorOf } from '../components/charts/theme'
import { MultiSelect, RangeSlider, Segmented, Select, Tabs } from '../components/ui/controls'
import { Badge, Card, Hero, Metric } from '../components/ui/display'
import { Sparkline } from '../components/ui/DataTable'
import { PROFILE_TONE } from '../components/ui/tones'
import { fmtDate, fmtInt, fmtMonthYear, fmtNum, fmtPct } from '../lib/format'
import { compareSeries } from '../services/eda/compare'
import { dailyRecords, histogram, monthlyByYear, quarterBoxStats, weekdayIndex } from '../services/eda/distribution'
import { profile } from '../services/eda/profile'
import { ROLLING_WINDOW, linearTrend, rollingMean, windowStats } from '../services/eda/window'
import { seriesFor, sliceByDates } from '../services/series/aggregate'
import { FREQ_BY_LABEL, FREQ_LABELS, FREQS, UNIT_SING } from '../services/series/params'
import { useRecords } from '../store/useDataset'
import type { Freq } from '../types'

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const FREQ_OPTIONS = FREQS.map((f) => FREQ_LABELS[f])
type TabId = 'serie' | 'sazonal' | 'dist' | 'comparar'

const tickDate = (d: string) => fmtMonthYear(d)

export default function AnaliseHistorica() {
  const { records, skus } = useRecords()
  const [sku, setSku] = useState(skus[0])
  const [freqLabel, setFreqLabel] = useState<string>('Semanal')
  const freq: Freq = FREQ_BY_LABEL[freqLabel]
  const [tab, setTab] = useState<TabId>('serie')
  const [compared, setCompared] = useState<string[]>(() => skus.slice(0, Math.min(3, skus.length)))
  const [normalize, setNormalize] = useState(true)
  const [winState, setWinState] = useState<{ key: string; win: [number, number] } | null>(null)

  const full = useMemo(() => seriesFor(records, sku, freq), [records, sku, freq])
  const labels = useMemo(() => full.map((p) => p.date), [full])
  const key = `${sku}|${freq}`
  // trocar SKU ou granularidade reinicia a janela (SPEC-PAG-07)
  const win: [number, number] = winState?.key === key ? winState.win : [0, Math.max(0, full.length - 1)]
  const inicio = labels[win[0]]
  const fim = labels[win[1]]
  const serie = useMemo(() => sliceByDates(full, inicio, fim), [full, inicio, fim])

  const perfil = useMemo(() => profile(records, sku, 'W'), [records, sku])
  const stats = useMemo(() => windowStats(serie), [serie])

  const values = serie.map((p) => p.value)
  const mm = rollingMean(values, ROLLING_WINDOW[freq])
  const trend = linearTrend(values)
  const lineData = serie.map((p, i) => ({ date: p.date, real: p.value, mm: mm[i], trend: trend[i] }))

  return (
    <div>
      <Hero eyebrow="Módulo 02 · Dados" title="Análise histórica"
        subtitle="Entenda o comportamento de cada produto antes de prever: volume, variabilidade, tendência, sazonalidade e classificação automática do perfil de demanda." />

      <Card>
        <div className="grid gap-4 md:grid-cols-[2fr_2fr_3fr]">
          <Select label="Produto (SKU)" value={sku} options={skus} onChange={setSku} testId="sku-select" />
          <Segmented label="Granularidade" options={FREQ_OPTIONS} value={freqLabel} onChange={setFreqLabel} testId="freq-seg" />
          <RangeSlider label="Janela de análise" labels={labels} value={win} onChange={(v) => setWinState({ key, win: v })} format={fmtMonthYear} testId="window" />
        </div>
      </Card>

      <div className="my-4 flex flex-wrap items-center gap-3" data-testid="profile-line">
        <span className="text-xl font-extrabold tracking-tight text-ink">{sku}</span>
        <Badge tone={PROFILE_TONE[perfil.classe]}>Perfil: {perfil.classe}</Badge>
        <span className="text-[0.86rem] text-muted">{perfil.motivo} · classificação sobre a série semanal completa</span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5" data-testid="hist-kpis">
        <Metric label="Volume no período" value={fmtInt(stats.volume)}>
          <div className="mt-2"><Sparkline values={values.slice(-52)} area width={140} /></div>
        </Metric>
        <Metric label={`Média por ${UNIT_SING[freq]}`} value={fmtNum(stats.media)} />
        <Metric label="Pico" value={fmtInt(stats.pico?.value)} help={stats.pico ? `Em ${fmtDate(stats.pico.date)}` : undefined} />
        <Metric label="Variabilidade (CV)" value={fmtNum(stats.cv, 2)} help="Desvio-padrão ÷ média. < 0,2 estável · > 0,5 irregular." />
        <Metric label="Crescimento" value={fmtPct(stats.crescimentoPct, 1, true)} delta={`${fmtNum(stats.pctZerados, 0)}% períodos zerados`} help="Média da 2ª metade da janela vs. 1ª metade." />
      </div>

      <div className="mt-6">
        <Tabs tabs={[
          { id: 'serie', label: 'Série temporal', icon: 'chart-search' },
          { id: 'sazonal', label: 'Sazonalidade', icon: 'calendar' },
          { id: 'dist', label: 'Distribuição', icon: 'leaderboard' },
          { id: 'comparar', label: 'Comparar SKUs', icon: 'compare' },
        ]} value={tab} onChange={setTab}>
          {tab === 'serie' && (
            <Card>
              <ChartFrame height={440} testId="chart-series">
                <LineChart data={lineData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="date" {...AXIS} tickFormatter={tickDate} minTickGap={40} />
                  <YAxis {...AXIS} domain={['auto', 'auto']} width={56} tickFormatter={fmtInt} label={{ value: 'Quantidade', angle: -90, position: 'insideLeft', fill: COLORS.muted, fontSize: 12 }} />
                  <Tooltip {...TOOLTIP} labelFormatter={(d) => fmtDate(String(d))} formatter={(v) => fmtNum(v, 1)} />
                  <Legend verticalAlign="top" align="left" height={48} wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="real" name="Demanda real" stroke={COLORS.primary} strokeWidth={1.6} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="mm" name={`Média móvel (${ROLLING_WINDOW[freq]})`} stroke={COLORS.accent} strokeWidth={2.6} dot={false} isAnimationActive={false} />
                  <Line type="linear" dataKey="trend" name="Tendência linear" stroke={COLORS.amber} strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
                  <ReferenceLine y={stats.media} stroke={COLORS.slate} strokeDasharray="2 3" label={{ value: `média ${fmtNum(stats.media)}`, position: 'insideTopLeft', fill: COLORS.muted, fontSize: 11 }} />
                  <Brush dataKey="date" height={24} stroke={COLORS.primary} travellerWidth={12} tickFormatter={tickDate} />
                </LineChart>
              </ChartFrame>
            </Card>
          )}
          {tab === 'sazonal' && <Seasonality records={records} sku={sku} inicio={inicio} fim={fim} />}
          {tab === 'dist' && <Distribution serie={serie} freqLabel={freqLabel} />}
          {tab === 'comparar' && (
            <div className="space-y-4">
              <div className="grid items-end gap-4 sm:grid-cols-[3fr_2fr]">
                <MultiSelect label="SKUs para comparar" options={skus} value={compared} onChange={setCompared} placeholder="Selecione os SKUs" testId="compare-select" />
                <label className="flex min-h-11 items-center gap-3 text-[0.9rem] font-semibold text-ink" title="Facilita comparar produtos com escalas diferentes.">
                  <input type="checkbox" role="switch" className="h-5 w-5 accent-primary" checked={normalize} onChange={(e) => setNormalize(e.target.checked)} data-testid="normalize" />
                  Normalizar (índice base 100)
                </label>
              </div>
              <Compare records={records} skus={compared} freq={freq} inicio={inicio} fim={fim} normalize={normalize} all={skus} />
            </div>
          )}
        </Tabs>
      </div>
    </div>
  )
}

function Seasonality({ records, sku, inicio, fim }: { records: ReturnType<typeof useRecords>['records']; sku: string; inicio: string; fim: string }) {
  const daily = useMemo(() => dailyRecords(records, sku, inicio, fim), [records, sku, inicio, fim])
  const matrix = useMemo(() => monthlyByYear(daily), [daily])
  const idx = useMemo(() => weekdayIndex(daily), [daily])
  const bars = WEEKDAYS.map((d, i) => ({ dia: d, indice: idx[i] }))
  return (
    <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
      <Card>
        <h3 className="mb-3 text-[0.92rem] font-semibold text-ink">Mapa de calor · volume mensal por ano</h3>
        <Heatmap testId="heat-monthly" rows={matrix.years.map(String)} cols={MONTHS} values={matrix.matrix} scale={SEQUENTIAL} tooltip={(r, c, v) => `${r} · ${c}: ${fmtInt(v)} un.`} />
      </Card>
      <Card>
        <ChartFrame height={360} title="Índice por dia da semana (100 = média)" testId="chart-weekday">
          <BarChart data={bars} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="dia" {...AXIS} />
            <YAxis {...AXIS} width={40} />
            <Tooltip {...TOOLTIP} formatter={(v) => [`índice ${fmtNum(v, 0)}`, '']} />
            <ReferenceLine y={100} stroke={COLORS.slate} strokeDasharray="2 3" />
            <Bar dataKey="indice" radius={[6, 6, 0, 0]} isAnimationActive={false}>
              {bars.map((b) => <Cell key={b.dia} fill={(b.indice ?? 0) >= 100 ? COLORS.accent : '#CBD5E1'} />)}
            </Bar>
          </BarChart>
        </ChartFrame>
      </Card>
    </div>
  )
}

function Distribution({ serie, freqLabel }: { serie: ReturnType<typeof seriesFor>; freqLabel: string }) {
  const bins = useMemo(() => histogram(serie.map((p) => p.value), 30), [serie])
  const boxes = useMemo(() => quarterBoxStats(serie), [serie])
  const data = bins.map((b) => ({ faixa: `${fmtInt(b.x0)}–${fmtInt(b.x1)}`, count: b.count }))
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <ChartFrame height={360} title={`Histograma de demanda (${freqLabel.toLowerCase()})`} testId="chart-hist">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={1}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="faixa" {...AXIS} interval="preserveStartEnd" tick={false} label={{ value: 'Quantidade', position: 'insideBottom', fill: COLORS.muted, fontSize: 12 }} />
            <YAxis {...AXIS} width={40} label={{ value: 'Frequência', angle: -90, position: 'insideLeft', fill: COLORS.muted, fontSize: 12 }} />
            <Tooltip {...TOOLTIP} formatter={(v) => [v, 'Frequência']} />
            <Bar dataKey="count" fill={COLORS.primary} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ChartFrame>
      </Card>
      <Card>
        <h3 className="mb-2 text-[0.92rem] font-semibold text-ink">Dispersão por trimestre</h3>
        <BoxPlot boxes={boxes} />
      </Card>
    </div>
  )
}

function Compare({ records, skus, freq, inicio, fim, normalize, all }: {
  records: ReturnType<typeof useRecords>['records']
  skus: string[]
  freq: Freq
  inicio: string
  fim: string
  normalize: boolean
  all: string[]
}) {
  const series = useMemo(() => compareSeries(records, skus, freq, inicio, fim, normalize), [records, skus, freq, inicio, fim, normalize])
  const data = useMemo(() => {
    const byDate = new Map<string, Record<string, number | string>>()
    for (const s of series) for (const p of s.points) byDate.set(p.date, { ...(byDate.get(p.date) ?? { date: p.date }), [s.sku]: p.value })
    return [...byDate.values()].sort((a, b) => (a.date as string).localeCompare(b.date as string))
  }, [series])
  return (
    <Card>
      <ChartFrame height={420} testId="chart-compare">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="date" {...AXIS} tickFormatter={tickDate} minTickGap={40} />
          <YAxis {...AXIS} domain={['auto', 'auto']} width={56} tickFormatter={fmtInt} label={{ value: normalize ? 'Índice (100 = média)' : 'Quantidade', angle: -90, position: 'insideLeft', fill: COLORS.muted, fontSize: 12 }} />
          <Tooltip {...TOOLTIP} labelFormatter={(d) => fmtDate(String(d))} formatter={(v) => fmtNum(v, 1)} />
          <Legend verticalAlign="bottom" align="left" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          {skus.map((s, i) => <Line key={s} type="monotone" dataKey={s} name={s} stroke={colorOf(all.indexOf(s) >= 0 ? i : i)} strokeWidth={2} dot={false} isAnimationActive={false} />)}
        </LineChart>
      </ChartFrame>
    </Card>
  )
}

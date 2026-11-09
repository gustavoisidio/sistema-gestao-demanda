import { useMemo, useState } from 'react'
import { Area, CartesianGrid, ComposedChart, Legend, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartFrame } from '../components/charts/ChartFrame'
import { AXIS, COLORS, GRID, TOOLTIP, colorOf } from '../components/charts/theme'
import { Expander, Pills, Segmented, Select, Slider } from '../components/ui/controls'
import { Button, Callout, Card, Hero, Metric, Spinner } from '../components/ui/display'
import { DataTable, type Column } from '../components/ui/DataTable'
import { downloadFile, MIME } from '../infra/download'
import { fmtDate, fmtInt, fmtNum, fmtPct } from '../lib/format'
import { roundHalfEven, sum } from '../lib/stats'
import { bestModel, type BestModel } from '../services/evaluation/backtest'
import { confidenceBand, modelOrder, runModels, type ConfidenceLevel } from '../services/forecasting'
import { MODEL_INFO } from '../services/forecasting/info'
import { fileNames, SHEETS, toCsv, toExcel, type ExportRow } from '../services/export/export'
import { seriesFor } from '../services/series/aggregate'
import { futureIndex } from '../services/series/calendar'
import { DEFAULT_H, FREQ_BY_LABEL, FREQ_LABELS, FREQS, MAX_H, SEASON, UNIT, UNIT_SING } from '../services/series/params'
import { useRecords } from '../store/useDataset'
import type { Freq, ModelName } from '../types'
import { memoByRecords, useDeferredCompute, useKeyedState } from './helpers'

const FREQ_OPTIONS = FREQS.map((f) => FREQ_LABELS[f])
const CONFIDENCE: ConfidenceLevel[] = ['80%', '95%']
const tick = (d: string) => fmtDate(d)

export default function Previsao() {
  const { records, skus } = useRecords()
  const [sku, setSku] = useState(skus[0])
  const [freqLabel, setFreqLabel] = useState<string>('Mensal')
  const freq: Freq = FREQ_BY_LABEL[freqLabel]
  const [conf, setConf] = useState<ConfidenceLevel>('80%')
  const [getH, setH] = useKeyedState<number>((f) => DEFAULT_H[f as Freq])
  const [getModel, setModel] = useKeyedState<ModelName | null>(() => null)

  const h = getH(freq)
  const series = useMemo(() => seriesFor(records, sku, freq), [records, sku, freq])
  const enough = series.length >= 6

  const { value: computed, pending } = useDeferredCompute(`${sku}|${freq}|${h}|${enough}`, () => {
    if (!enough) return null
    const values = series.map((p) => p.value)
    const models = runModels(values, h, SEASON[freq])
    const best = memoByRecords<BestModel>(records, `best|${sku}|${freq}`, () => bestModel(series, freq))
    return { models, best }
  })

  return (
    <div>
      <Hero eyebrow="Módulo 03 · Planejamento" title="Previsão de demanda"
        subtitle="Projete o futuro de cada produto com 7 modelos estatísticos. O sistema recomenda o método com melhor desempenho no backtesting e exibe faixas de confiança para apoiar decisões de estoque." />

      <Card>
        <div className="grid gap-4 md:grid-cols-[2fr_2.2fr_2.8fr_1.4fr]">
          <Select label="Produto (SKU)" value={sku} options={skus} onChange={setSku} testId="sku-select" />
          <Segmented label="Granularidade" options={FREQ_OPTIONS} value={freqLabel} onChange={setFreqLabel} testId="freq-seg" />
          <Slider label={`Horizonte (${UNIT[freq]})`} value={h} min={1} max={MAX_H[freq]} onChange={(v) => setH(freq, v)} testId="horizon" />
          <Segmented label="Confiança" options={CONFIDENCE} value={conf} onChange={setConf} testId="conf-seg" />
        </div>
      </Card>

      <div className="mt-4">
        {!enough ? (
          <Callout tone="red" icon="⛔" testId="too-short">Histórico insuficiente para previsões estatísticas (mínimo de 6 períodos nessa granularidade).</Callout>
        ) : pending || !computed ? (
          <Spinner label="Ajustando modelos estatísticos…" />
        ) : (
          <Result key={`${sku}|${freq}`} sku={sku} freq={freq} freqLabel={freqLabel} h={h} conf={conf} computed={computed}
            series={series} selected={getModel(`${sku}|${freq}`)} onSelect={(m) => setModel(`${sku}|${freq}`, m)} />
        )}
      </div>
    </div>
  )
}

interface ResultProps {
  sku: string
  freq: Freq
  freqLabel: string
  h: number
  conf: ConfidenceLevel
  computed: { models: ReturnType<typeof runModels>; best: BestModel }
  series: ReturnType<typeof seriesFor>
  selected: ModelName | null
  onSelect: (m: ModelName) => void
}

function Result({ sku, freq, freqLabel, h, conf, computed, series, selected, onSelect }: ResultProps) {
  const [showFit, setShowFit] = useState(false)
  const names = modelOrder(computed.models)
  const recomendado = computed.best.modelo
  const padrao = recomendado && names.includes(recomendado) ? recomendado : names[0]
  const modelo = selected && names.includes(selected) ? selected : padrao
  const r = computed.models[modelo]!

  const { inf, sup } = confidenceBand(r.forecast, r.sigma, conf)
  const datas = futureIndex(series[series.length - 1].date, h, freq)
  const values = series.map((p) => p.value)
  const ultimo = values.length >= h ? sum(values.slice(-h)) : NaN
  const total = sum(r.forecast)
  const variacao = ultimo ? ((total - ultimo) / ultimo) * 100 : NaN
  const row = computed.best.tabela.find((x) => x.Modelo === modelo)
  const wape = row ? row['WAPE (%)'] : NaN

  const histN = Math.max(h * 4, 24)
  const hist = series.slice(-histN)
  const last = hist[hist.length - 1]
  const data = [
    ...hist.map((p, i) => ({ date: p.date, hist: p.value, fit: r.fit[series.length - hist.length + i], forecast: i === hist.length - 1 ? p.value : undefined, band: undefined as [number, number] | undefined })),
    ...datas.map((d, i) => ({ date: d, hist: undefined, fit: undefined, forecast: r.forecast[i], band: [inf[i], sup[i]] as [number, number] })),
  ]

  const tableRows = datas.map((d, i) => ({ periodo: d, previsao: roundHalfEven(r.forecast[i]), inf: roundHalfEven(inf[i]), sup: roundHalfEven(sup[i]) }))
  const columns: Column<(typeof tableRows)[number]>[] = [
    { key: 'periodo', header: 'Período', value: (x) => x.periodo, render: (x) => fmtDate(x.periodo) },
    { key: 'previsao', header: 'Previsão', align: 'right', value: (x) => x.previsao, render: (x) => fmtInt(x.previsao) },
    { key: 'inf', header: `Limite inferior (${conf})`, align: 'right', value: (x) => x.inf, render: (x) => fmtInt(x.inf) },
    { key: 'sup', header: `Limite superior (${conf})`, align: 'right', value: (x) => x.sup, render: (x) => fmtInt(x.sup) },
  ]
  const exportRows = (): ExportRow[] => tableRows.map((x) => ({ Período: x.periodo, Previsão: x.previsao, [`Limite inferior (${conf})`]: x.inf, [`Limite superior (${conf})`]: x.sup }))

  const allData = [
    ...hist.map((p) => ({ date: p.date, hist: p.value } as Record<string, number | string | undefined>)),
    ...datas.map((d, i) => Object.fromEntries([['date', d], ...names.map((n) => [n, computed.models[n]!.forecast[i]])]) as Record<string, number | string | undefined>),
  ]

  return (
    <div className="space-y-4">
      <Pills label="Modelo estatístico" options={names} value={modelo} onChange={onSelect} format={(m) => (m === recomendado ? `★ ${m}` : m)} testId="model-pills" />
      <p className="text-[0.86rem] text-muted" data-testid="model-info">
        ℹ {MODEL_INFO[modelo]}{modelo === recomendado && <> · <b>Recomendado pelo backtesting.</b></>}
      </p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="forecast-kpis">
        <Metric label={`Demanda prevista (${h} ${UNIT[freq]})`} value={fmtInt(total)} delta={Number.isNaN(variacao) ? undefined : `${fmtPct(variacao, 1, true)} vs. período anterior`} />
        <Metric label={`Média por ${UNIT_SING[freq]}`} value={fmtNum(total / h)} />
        <Metric label={`Faixa ${conf} (total)`} value={`${fmtInt(sum(inf))} – ${fmtInt(sum(sup))}`} />
        <Metric label="Acurácia no backtest" value={Number.isNaN(wape) ? '—' : fmtPct(100 - wape, 1)} help="100% − WAPE medido em teste cego sobre o final do histórico." />
      </div>

      <Card>
        <ChartFrame height={460} testId="chart-forecast">
          <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="date" {...AXIS} tickFormatter={tick} minTickGap={40} />
            <YAxis {...AXIS} width={56} tickFormatter={fmtInt} label={{ value: 'Quantidade', angle: -90, position: 'insideLeft', fill: COLORS.muted, fontSize: 12 }} />
            <Tooltip {...TOOLTIP} labelFormatter={(d) => fmtDate(String(d))} formatter={(v) => (Array.isArray(v) ? `${fmtInt(v[0])} – ${fmtInt(v[1])}` : fmtNum(v, 1))} />
            <Legend verticalAlign="top" align="left" wrapperStyle={{ fontSize: 12, cursor: 'pointer' }}
              onClick={(e) => { if (e.dataKey === 'fit') setShowFit((s) => !s) }} />
            <Area type="monotone" dataKey="band" name={`Intervalo ${conf}`} stroke="none" fill={COLORS.accent} fillOpacity={0.14} isAnimationActive={false} />
            <Line type="monotone" dataKey="hist" name="Histórico" stroke={COLORS.series} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="fit" name="Ajuste do modelo" stroke={COLORS.amber} strokeWidth={1.6} strokeDasharray="2 3" dot={false} hide={!showFit} isAnimationActive={false} />
            <Line type="monotone" dataKey="forecast" name={`Previsão · ${modelo}`} stroke={COLORS.accent} strokeWidth={3} dot={{ r: 3, fill: COLORS.accent, stroke: '#fff', strokeWidth: 1.5 }} isAnimationActive={false} />
            <ReferenceLine x={last.date} stroke="#CBD5E1" strokeDasharray="5 4" label={{ value: 'início da previsão', position: 'insideTopRight', fill: COLORS.muted, fontSize: 11 }} />
          </ComposedChart>
        </ChartFrame>
      </Card>

      <div className="grid gap-3 lg:grid-cols-[3fr_1fr]">
        <Expander title="Tabela da previsão" icon="table" testId="forecast-table">
          <DataTable columns={columns} rows={tableRows} rowKey={(x) => x.periodo} />
        </Expander>
        <div className="flex flex-col gap-2">
          <Button variant="primary" icon="download" data-testid="export-xlsx"
            onClick={async () => downloadFile(fileNames.forecastXlsx(sku, freqLabel), await toExcel({ [SHEETS.forecast]: exportRows() }), MIME.xlsx)}>Exportar Excel</Button>
          <Button icon="download" data-testid="export-csv" onClick={() => downloadFile(fileNames.forecastCsv(sku), toCsv(exportRows()), MIME.csv)}>Exportar CSV</Button>
        </div>
      </div>

      <Expander title="Comparar todos os modelos neste horizonte" icon="chart-search" testId="compare-models">
        <ChartFrame height={380} testId="chart-all-models">
          <LineChart data={allData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="date" {...AXIS} tickFormatter={tick} minTickGap={40} />
            <YAxis {...AXIS} width={56} tickFormatter={fmtInt} />
            <Tooltip {...TOOLTIP} labelFormatter={(d) => fmtDate(String(d))} formatter={(v) => fmtNum(v, 1)} />
            <Legend verticalAlign="top" align="left" wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="hist" name="Histórico" stroke={COLORS.series} strokeWidth={2} dot={false} isAnimationActive={false} />
            {names.map((n, i) => <Line key={n} type="monotone" dataKey={n} name={n} stroke={colorOf(i)} strokeWidth={n === modelo ? 3 : 1.6} dot={false} isAnimationActive={false} />)}
          </LineChart>
        </ChartFrame>
      </Expander>

      <Expander title="Entenda os modelos" icon="school" testId="model-help">
        <ul className="list-disc space-y-1.5 pl-5 text-[0.9rem] text-ink">
          {(Object.keys(MODEL_INFO) as ModelName[]).map((n) => <li key={n}><b>{n}</b> — {MODEL_INFO[n]}</li>)}
        </ul>
        <p className="mt-3 text-[0.82rem] text-muted">As faixas de confiança são estimadas a partir do desvio-padrão dos resíduos do ajuste no histórico.</p>
      </Expander>
    </div>
  )
}

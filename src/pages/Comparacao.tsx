import { useMemo, useState } from 'react'
import { Bar, BarChart, Cell, CartesianGrid, ComposedChart, Legend, Line, ReferenceArea, Tooltip, XAxis, YAxis, LabelList } from 'recharts'
import { ChartFrame } from '../components/charts/ChartFrame'
import { AXIS, COLORS, GRID, TOOLTIP } from '../components/charts/theme'
import { Expander, Segmented, Select, Slider } from '../components/ui/controls'
import { BarCell, DataTable, type Column } from '../components/ui/DataTable'
import { Callout, Card, Hero, Metric, Section, Spinner, WinnerCard } from '../components/ui/display'
import { fmtDate, fmtNum, fmtPct } from '../lib/format'
import { backtest, gainOverNaive, type BacktestResult, type BacktestRow } from '../services/evaluation/backtest'
import { trackingSignalStatus } from '../services/evaluation/metrics'
import { seriesFor } from '../services/series/aggregate'
import { DEFAULT_H, FREQ_BY_LABEL, FREQ_LABELS, FREQS, MAX_H, SEASON, UNIT } from '../services/series/params'
import { useRecords } from '../store/useDataset'
import type { Freq } from '../types'
import { useDeferredCompute, useKeyedState } from './helpers'

const FREQ_OPTIONS = FREQS.map((f) => FREQ_LABELS[f])
const RANK_COLORS = [COLORS.accent, COLORS.primary, COLORS.amber]
const tick = (d: string) => fmtDate(d)

export default function Comparacao() {
  const { records, skus } = useRecords()
  const [sku, setSku] = useState(skus[0])
  const [freqLabel, setFreqLabel] = useState<string>('Mensal')
  const freq: Freq = FREQ_BY_LABEL[freqLabel]
  const series = useMemo(() => seriesFor(records, sku, freq), [records, sku, freq])
  const maxH = Math.max(1, Math.min(MAX_H[freq], series.length - 4))
  const [getH, setH] = useKeyedState<number>((f) => Math.min(DEFAULT_H[f as Freq], Math.max(1, Math.min(MAX_H[f as Freq], series.length - 4))))
  const h = Math.min(getH(freq), maxH)
  const tooShort = series.length <= h + 3

  const { value: bt, pending } = useDeferredCompute(`${sku}|${freq}|${h}|${tooShort}`, () => (tooShort ? null : backtest(series, h, SEASON[freq])))

  return (
    <div>
      <Hero eyebrow="Módulo 04 · Planejamento" title="Comparação de modelos"
        subtitle="Teste cego (out-of-sample): os modelos são treinados sem conhecer o final do histórico e avaliados contra a realidade escondida. Vence quem erra menos em dados que nunca viu."
        chips={['MAE', 'RMSE', 'MAPE', 'WAPE', 'Viés', 'Tracking Signal']} />

      <Card>
        <div className="grid gap-4 md:grid-cols-[2fr_2fr_3fr]">
          <Select label="Produto (SKU)" value={sku} options={skus} onChange={setSku} testId="sku-select" />
          <Segmented label="Granularidade" options={FREQ_OPTIONS} value={freqLabel} onChange={setFreqLabel} testId="freq-seg" />
          <Slider label={`Períodos de teste (${UNIT[freq]})`} value={h} min={1} max={maxH} onChange={(v) => setH(freq, v)} testId="test-periods" />
        </div>
      </Card>

      <div className="mt-4">
        {tooShort ? (
          <Callout tone="red" icon="⛔" testId="too-short">Histórico insuficiente: a base tem {series.length} períodos e o teste usa {h}. Reduza os períodos de teste.</Callout>
        ) : pending || !bt ? (
          <Spinner label="Executando backtesting de todos os modelos…" />
        ) : bt.table.length === 0 ? (
          <Callout tone="red" icon="⛔" testId="no-model">Nenhum modelo conseguiu calcular o horizonte selecionado.</Callout>
        ) : (
          <Result bt={bt} h={h} freq={freq} />
        )}
      </div>
    </div>
  )
}

function Result({ bt, h, freq }: { bt: BacktestResult; h: number; freq: Freq }) {
  const top = bt.table[0]
  const gain = gainOverNaive(bt.table)
  const ganho = gain === null ? '' : ` · ${fmtNum(gain, 0)}% menos erro que o Naive`
  const ts = top['Tracking Signal']
  const ranking = [...bt.table].sort((a, b) => a['WAPE (%)'] - b['WAPE (%)']).map((r) => ({ modelo: r.Modelo, wape: r['WAPE (%)'] }))

  const trecho = bt.train.slice(-Math.max(h * 3, 24))
  const data = [
    ...trecho.map((p) => ({ date: p.date, treino: p.value } as Record<string, number | string>)),
    ...bt.test.map((p, i) => {
      const row: Record<string, number | string> = { date: p.date, real: p.value }
      bt.table.slice(0, 3).forEach((m, k) => { row[`p${k}`] = bt.forecasts[m.Modelo]![i] })
      return row
    }),
  ]

  const columns: Column<BacktestRow>[] = [
    { key: 'pos', header: '#', value: (r) => r.Posição },
    { key: 'modelo', header: 'Modelo', value: (r) => r.Modelo },
    { key: 'acc', header: 'Acurácia', value: (r) => (Number.isNaN(r['Acurácia (%)']) ? null : r['Acurácia (%)']), render: (r) => <BarCell value={Number.isNaN(r['Acurácia (%)']) ? 0 : r['Acurácia (%)']} max={100} label={fmtPct(r['Acurácia (%)'])} /> },
    { key: 'wape', header: 'WAPE (%)', align: 'right', value: (r) => (Number.isNaN(r['WAPE (%)']) ? null : r['WAPE (%)']), render: (r) => fmtPct(r['WAPE (%)']) },
    { key: 'mae', header: 'MAE', align: 'right', value: (r) => r.MAE, render: (r) => fmtNum(r.MAE, 1) },
    { key: 'rmse', header: 'RMSE', align: 'right', value: (r) => r.RMSE, render: (r) => fmtNum(r.RMSE, 1) },
    { key: 'mape', header: 'MAPE (%)', align: 'right', value: (r) => (Number.isNaN(r['MAPE (%)']) ? null : r['MAPE (%)']), render: (r) => <span title="Ignora períodos com demanda zero.">{fmtPct(r['MAPE (%)'])}</span> },
    { key: 'bias', header: 'Viés (Bias)', align: 'right', value: (r) => r['Viés (Bias)'], render: (r) => fmtNum(r['Viés (Bias)'], 0) },
    { key: 'ts', header: 'Tracking Signal', align: 'right', value: (r) => r['Tracking Signal'], render: (r) => fmtNum(r['Tracking Signal'], 2) },
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
        <div className="space-y-3">
          <WinnerCard label="Modelo vencedor" value={`🏆 ${top.Modelo}`} meta={`WAPE de ${fmtPct(top['WAPE (%)'])} em ${h} ${UNIT[freq]} de teste${ganho}`} />
          <div className="grid grid-cols-2 gap-3">
            <Metric label="MAE" value={fmtNum(top.MAE)} help="Erro médio absoluto, em unidades." />
            <Metric label="Viés" value={fmtNum(top['Viés (Bias)'], 0)} help="Soma (previsto − real). Positivo = superestima." />
          </div>
          {trackingSignalStatus(ts) === 'viés' ? (
            <Callout tone="amber" icon="⚠️" testId="ts-callout">Tracking signal de <b>{fmtNum(ts)}</b> — o modelo apresenta viés sistemático; monitore.</Callout>
          ) : (
            <Callout tone="green" icon="✅" testId="ts-callout">Tracking signal de <b>{fmtNum(ts)}</b> — dentro do controle (±4).</Callout>
          )}
        </div>
        <Card>
          <p className="mb-2 text-[0.92rem] text-ink"><b>Ranking de erro (WAPE)</b> — quanto menor, melhor</p>
          <ChartFrame height={300} testId="chart-ranking">
            <BarChart data={ranking} layout="vertical" margin={{ top: 4, right: 56, bottom: 0, left: 0 }}>
              <CartesianGrid {...GRID} horizontal={false} vertical />
              <XAxis type="number" {...AXIS} tickFormatter={(v) => `${v}`} label={{ value: 'WAPE (%)', position: 'insideBottom', offset: -2, fill: COLORS.muted, fontSize: 12 }} />
              <YAxis type="category" dataKey="modelo" {...AXIS} width={96} />
              <Tooltip {...TOOLTIP} formatter={(v) => `${fmtNum(v, 1)}%`} />
              <Bar dataKey="wape" radius={[0, 6, 6, 0]} isAnimationActive={false}>
                {ranking.map((r) => <Cell key={r.modelo} fill={r.modelo === top.Modelo ? COLORS.accent : COLORS.soft} />)}
                <LabelList dataKey="wape" position="right" formatter={(v: unknown) => fmtPct(v)} style={{ fontSize: 12, fill: COLORS.muted }} />
              </Bar>
            </BarChart>
          </ChartFrame>
        </Card>
      </div>

      <Section title="Visualização do teste cego" subtitle="Histórico de treino, realidade escondida e as 3 melhores previsões." />
      <Card>
        <ChartFrame height={430} testId="chart-blind">
          <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="date" {...AXIS} tickFormatter={tick} minTickGap={40} />
            <YAxis {...AXIS} domain={['auto', 'auto']} width={56} tickFormatter={(v) => fmtNum(v, 0)} label={{ value: 'Quantidade', angle: -90, position: 'insideLeft', fill: COLORS.muted, fontSize: 12 }} />
            <Tooltip {...TOOLTIP} labelFormatter={(d) => fmtDate(String(d))} formatter={(v) => fmtNum(v, 1)} />
            <Legend verticalAlign="top" align="left" height={48} wrapperStyle={{ fontSize: 12 }} />
            <ReferenceArea x1={bt.test[0].date} x2={bt.test[bt.test.length - 1].date} fill="rgba(148,163,184,.10)" stroke="none" label={{ value: 'janela de teste', position: 'insideTopLeft', fill: COLORS.muted, fontSize: 11 }} />
            <Line type="monotone" dataKey="treino" name="Treino" stroke={COLORS.series} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="real" name="Realidade (teste)" stroke={COLORS.slate} strokeWidth={3} dot={{ r: 3.5 }} isAnimationActive={false} />
            {bt.table.slice(0, 3).map((m, k) => (
              <Line key={m.Modelo} type="monotone" dataKey={`p${k}`} name={`${k + 1}º · ${m.Modelo}`} stroke={RANK_COLORS[k]} strokeWidth={k === 0 ? 3.2 : 2} strokeDasharray={k === 0 ? undefined : '6 4'} dot={false} isAnimationActive={false} />
            ))}
          </ComposedChart>
        </ChartFrame>
      </Card>

      <Section title="Tabela completa de métricas" />
      <DataTable testId="metrics-table" columns={columns} rows={bt.table} rowKey={(r) => r.Modelo} />

      <Expander title="Como ler as métricas" icon="school" testId="metrics-help">
        <ul className="list-disc space-y-1.5 pl-5 text-[0.9rem] text-ink">
          <li><b>WAPE</b> — erro absoluto total ÷ demanda total. Robusto para itens com zeros; métrica principal do ranking.</li>
          <li><b>MAE / RMSE</b> — erro médio em unidades; o RMSE penaliza mais os grandes erros.</li>
          <li><b>MAPE</b> — erro percentual médio (ignora períodos zerados).</li>
          <li><b>Viés</b> — positivo indica superestimação (excesso de estoque); negativo, subestimação (ruptura).</li>
          <li><b>Tracking Signal</b> — viés acumulado ÷ MAE. Fora de ±4 indica modelo descalibrado.</li>
        </ul>
      </Expander>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { BarCell, DataTable, type Column } from '../components/ui/DataTable'
import { Expander, FileDrop, Select, Tabs } from '../components/ui/controls'
import { Badge, Button, Callout, Card, Hero, Metric, Section } from '../components/ui/display'
import { Icon } from '../components/ui/Icon'
import { downloadFile, MIME } from '../infra/download'
import { loadDemoCsv } from '../infra/demoSource'
import { fmtDate, fmtInt, fmtMonthYearShort, fmtNum } from '../lib/format'
import { applyMapping, isMappingComplete, mappingOptions, missingRequired, REQUIRED_LABELS, type ColumnMapping } from '../services/data/columns'
import { applyDefaultTreatment } from '../services/data/clean'
import { loadFile, parseCsvText } from '../services/data/parse'
import { datasetSummary, problemCount, qualityScore } from '../services/data/summary'
import { DEMO_ORIGIN, fileOrigin, templateCsv } from '../services/data/template'
import { validateData } from '../services/data/validate'
import { fileNames } from '../services/export/export'
import { useDataset } from '../store/useDataset'
import { useToast } from '../store/useToast'
import type { RawTable, RequiredColumn, SaleRecord } from '../types'

interface Source {
  table: RawTable
  origem: string
}

function Review({ source, onConfirm }: { source: Source; onConfirm: (records: SaleRecord[], origem: string) => void }) {
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [tab, setTab] = useState<'registros' | 'resumo'>('registros')

  const missing = missingRequired(source.table.columns)
  const complete = isMappingComplete(missing, mapping)
  const table = useMemo(() => (missing.length ? (complete ? applyMapping(source.table, mapping) : null) : source.table), [source.table, mapping, missing.length, complete])

  const audit = useMemo(() => {
    if (!table) return null
    const v = validateData(table.rows)
    if (v.todasDatasInvalidas) return { v, records: [] as SaleRecord[] }
    return { v, records: applyDefaultTreatment(table.rows) }
  }, [table])

  const bySku = useMemo(() => {
    const m = new Map<string, { sku: string; registros: number; volume: number; inicio: string; fim: string }>()
    for (const r of audit?.records ?? []) {
      const e = m.get(r.sku) ?? { sku: r.sku, registros: 0, volume: 0, inicio: r.data, fim: r.data }
      e.registros++
      e.volume += r.quantidade_vendida
      if (r.data < e.inicio) e.inicio = r.data
      if (r.data > e.fim) e.fim = r.data
      m.set(r.sku, e)
    }
    return [...m.values()]
  }, [audit])

  return (
    <>
      {missing.length > 0 && (
        <>
          <Section title="Mapeamento de colunas" subtitle="Não encontramos alguns nomes padrão. Indique qual coluna do arquivo corresponde a cada campo." />
          <Card>
            <div className="grid gap-3 sm:grid-cols-3" data-testid="mapping">
              {missing.map((campo: RequiredColumn) => (
                <Select key={campo} label={REQUIRED_LABELS[campo]} placeholder="Selecione a coluna…" value={mapping[campo] ?? ''} testId={`map-${campo}`}
                  options={mappingOptions(source.table.columns)} onChange={(v) => setMapping((m) => ({ ...m, [campo]: v || undefined }))} />
              ))}
            </div>
          </Card>
          {!complete && <div className="mt-3"><Callout tone="indigo" icon="ℹ️">Complete o mapeamento para continuar.</Callout></div>}
        </>
      )}

      {audit && audit.v.todasDatasInvalidas && (
        <div className="mt-3" data-testid="date-error"><Callout tone="red" icon="⛔">A coluna de datas não pôde ser convertida. Verifique o formato (ex.: AAAA-MM-DD).</Callout></div>
      )}

      {audit && !audit.v.todasDatasInvalidas && (() => {
        const { v, records } = audit
        const resumo = datasetSummary(records)
        const problemas = problemCount(v)
        const score = qualityScore(problemas, table!.rows.length)
        const checks = [
          { nome: 'Valores nulos', qtd: v.nulos, acao: 'substituídos por 0' },
          { nome: 'Quantidades negativas', qtd: v.negativos, acao: 'ajustadas para 0' },
          { nome: 'Duplicidades (SKU × data)', qtd: v.duplicadas, acao: 'mantidas para revisão' },
        ]
        const recordColumns: Column<SaleRecord>[] = [
          { key: 'sku', header: 'SKU', value: (r) => r.sku },
          { key: 'data', header: 'Data', value: (r) => r.data, render: (r) => fmtDate(r.data) },
          { key: 'q', header: 'Quantidade', align: 'right', value: (r) => r.quantidade_vendida, render: (r) => fmtInt(r.quantidade_vendida) },
        ]
        const maxVol = Math.max(0, ...bySku.map((s) => s.volume))
        const skuColumns: Column<(typeof bySku)[number]>[] = [
          { key: 'sku', header: 'SKU', value: (r) => r.sku },
          { key: 'registros', header: 'Registros', align: 'right', value: (r) => r.registros, render: (r) => fmtInt(r.registros) },
          { key: 'volume', header: 'Volume', value: (r) => r.volume, render: (r) => <BarCell value={r.volume} max={maxVol} label={fmtInt(r.volume)} /> },
          { key: 'media', header: 'Média por registro', align: 'right', value: (r) => r.volume / r.registros, render: (r) => fmtNum(r.volume / r.registros, 1) },
          { key: 'inicio', header: 'Início', value: (r) => r.inicio, render: (r) => fmtDate(r.inicio) },
          { key: 'fim', header: 'Fim', value: (r) => r.fim, render: (r) => fmtDate(r.fim) },
        ]
        return (
          <>
            <Section title="Auditoria de qualidade" subtitle={`Origem: ${source.origem}`} />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="audit-kpis">
              <Metric label="Registros" value={fmtInt(table!.rows.length)} />
              <Metric label="SKUs" value={resumo.skus} />
              <Metric label="Período" value={`${fmtMonthYearShort(resumo.inicio)} – ${fmtMonthYearShort(resumo.fim)}`} help={`${fmtDate(resumo.inicio)} a ${fmtDate(resumo.fim)}`} />
              <Metric label="Índice de qualidade" value={`${score.toFixed(0)}/100`} delta={problemas ? `${problemas} ocorrência(s)` : 'Sem ocorrências'} deltaTone={problemas ? 'bad' : 'good'} />
            </div>
            <Card className="mt-3">
              <div className="grid gap-4 sm:grid-cols-3" data-testid="audit-checks">
                {checks.map((c) => (
                  <div key={c.nome}>
                    <div className="text-[0.72rem] font-bold uppercase tracking-[0.08em] text-muted">{c.nome}</div>
                    <div className="mt-1 flex items-center gap-2.5">
                      <span className="text-2xl font-extrabold tracking-tight text-ink">{c.qtd}</span>
                      <Badge tone={c.qtd === 0 ? 'green' : 'amber'}>{c.qtd === 0 ? 'OK' : `Tratado: ${c.acao}`}</Badge>
                    </div>
                  </div>
                ))}
              </div>
              {v.datasInvalidas > 0 && (
                <p className="mt-3 text-[0.85rem] text-amber-700" data-testid="dates-discarded">{v.datasInvalidas} linha(s) com data inválida foram descartadas.</p>
              )}
            </Card>

            <Section title="Pré-visualização da base tratada" subtitle="Ordenada por SKU e data. Use a busca e a ordenação das colunas para inspecionar." />
            <Tabs tabs={[{ id: 'registros', label: 'Registros', icon: 'table' }, { id: 'resumo', label: 'Resumo por SKU', icon: 'box' }]} value={tab} onChange={setTab}>
              {tab === 'registros' ? (
                <DataTable testId="preview-records" columns={recordColumns} rows={records} rowKey={(_, i) => String(i)} searchable maxHeight={380} pageSize={200} />
              ) : (
                <DataTable testId="preview-skus" columns={skuColumns} rows={bySku} rowKey={(r) => r.sku} />
              )}
            </Tabs>

            <Card className="mt-5">
              <div className="grid items-center gap-3 sm:grid-cols-[3fr_1fr]">
                <p className="text-[0.92rem] text-ink"><b>Tudo certo?</b> Confirme para disponibilizar a base em todos os módulos de análise e previsão.</p>
                <Button variant="primary" icon="check" data-testid="confirm" onClick={() => onConfirm(records, source.origem)}>Confirmar e salvar base</Button>
              </div>
            </Card>
          </>
        )
      })()}
    </>
  )
}

export default function Importacao() {
  const { setDataset } = useDataset()
  const toast = useToast()
  const [source, setSource] = useState<Source | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onFile = async (file: File) => {
    const r = await loadFile(file)
    if (!r.ok) {
      setSource(null)
      setError(r.message)
      return
    }
    setError(null)
    setSource({ table: r.table, origem: fileOrigin(file.name) })
  }

  const useDemo = async () => {
    const r = parseCsvText(await loadDemoCsv())
    if (r.ok) {
      setError(null)
      setSource({ table: r.table, origem: DEMO_ORIGIN })
    }
  }

  const confirm = (records: SaleRecord[], origem: string) => {
    setDataset(records, origem)
    toast.show('Base salva! Abrindo a análise histórica…')
    window.location.hash = '/analise'
  }

  const template = parseCsvText(templateCsv())

  return (
    <div>
      <Hero eyebrow="Módulo 01 · Dados" title="Importação de dados"
        subtitle="Traga o histórico de vendas ou demanda. O sistema mapeia as colunas, audita a qualidade da base e aplica o tratamento padrão antes de liberar as análises."
        chips={['CSV · XLSX · XLS', 'Validação automática', 'Tratamento de nulos e negativos']} />

      <div className="grid gap-3 lg:grid-cols-[3fr_2fr]">
        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-[1rem] font-bold text-ink"><Icon name="upload" size={18} className="text-primary" /> Carregar base própria</h2>
          <FileDrop label="Arraste o arquivo ou clique para selecionar" accept=".csv,.xlsx,.xls" onFile={onFile} testId="file-input"
            hint="Colunas mínimas: sku, data e quantidade_vendida (nomes diferentes podem ser mapeados abaixo)." />
        </Card>
        <Card>
          <h2 className="mb-2 flex items-center gap-2 text-[1rem] font-bold text-ink"><Icon name="flask" size={18} className="text-primary" /> Base de demonstração</h2>
          <p className="text-[0.86rem] leading-relaxed text-muted">5 produtos com perfis estatísticos distintos, 4 anos de histórico diário — ideal para conhecer todas as funcionalidades.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="primary" icon="bolt" data-testid="use-demo" onClick={useDemo}>Usar demonstração</Button>
            <Button icon="download" data-testid="download-template" onClick={() => downloadFile(fileNames.template, templateCsv(), MIME.csv)}>Modelo CSV</Button>
          </div>
        </Card>
      </div>

      {error && <div className="mt-4" data-testid="read-error"><Callout tone="red" icon="⛔">Não foi possível ler o arquivo: {error}</Callout></div>}

      {!source && !error && (
        <div className="mt-4">
          <Expander title="Formato esperado do arquivo" icon="info" testId="format-help">
            <p className="mb-3 text-[0.88rem] text-ink">Uma linha por <b>produto × data</b>. Colunas extras (ex.: <code>categoria</code>, <code>preco_unitario</code>) são preservadas.</p>
            <DataTable columns={(template.ok ? template.table.columns : []).map((c) => ({ key: c, header: c, sortable: false, value: (r: Record<string, string>) => r[c] }))}
              rows={template.ok ? template.table.rows : []} rowKey={(_, i) => String(i)} />
          </Expander>
        </div>
      )}

      {source && <Review key={source.origem} source={source} onConfirm={confirm} />}
    </div>
  )
}

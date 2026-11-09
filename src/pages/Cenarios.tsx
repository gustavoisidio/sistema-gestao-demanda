import { useState } from 'react'
import { Tabs } from '../components/ui/controls'
import { Hero } from '../components/ui/display'
import { ScenarioTab } from './ScenarioTab'
import { CpfrTab } from './CpfrTab'

export default function Cenarios() {
  const [tab, setTab] = useState<'cenarios' | 'cpfr'>('cenarios')
  return (
    <div>
      <Hero eyebrow="Módulos 08 e 09 · Planejamento" title="Cenários e CPFR"
        subtitle="Simule choques de mercado e promoções sobre a previsão base e construa o plano de consenso com clientes e fornecedores (Collaborative Planning, Forecasting and Replenishment)." />
      <Tabs tabs={[{ id: 'cenarios', label: 'Simulação de cenários', icon: 'tune' }, { id: 'cpfr', label: 'CPFR · gestão colaborativa', icon: 'handshake' }]} value={tab} onChange={setTab}>
        {tab === 'cenarios' ? <ScenarioTab /> : <CpfrTab />}
      </Tabs>
    </div>
  )
}

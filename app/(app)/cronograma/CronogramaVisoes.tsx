'use client';

import { useMemo, useState } from 'react';
import { ImportarMsProjectModal } from './ImportarMsProjectModal';
import { TarefasGantt, TarefasLista, type Tarefa } from './CronogramaTarefas';
import type { EtapaEap } from '@/types/db';

type Visao = 'etapas' | 'tarefas' | 'gantt';

const VISOES: { valor: Visao; label: string }[] = [
  { valor: 'etapas',  label: 'Etapas' },
  { valor: 'tarefas', label: 'Tarefas' },
  { valor: 'gantt',   label: 'Gantt' },
];

export function CronogramaVisoes({
  empreendimentoId,
  etapas,
  tarefas,
  children,
}: {
  empreendimentoId: string;
  etapas: { etapa: string; data_inicio_prevista: string | null; data_fim_prevista: string | null }[];
  tarefas: Tarefa[];
  children: React.ReactNode;
}) {
  const [visao, setVisao] = useState<Visao>('etapas');
  const [importando, setImportando] = useState(false);

  const etapasSalvas = useMemo(() => {
    const mapa = new Map<string, EtapaEap | null>();
    for (const t of tarefas) {
      if (t.uid_msproject) mapa.set(t.uid_msproject, t.etapa);
    }
    return mapa;
  }, [tarefas]);

  const atual = tarefas.length > 0 ? visao : 'etapas';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {tarefas.length > 0 ? (
          <div role="tablist" aria-label="Visão do cronograma" className="inline-flex rounded-md border border-border p-0.5">
            {VISOES.map((v) => (
              <button
                key={v.valor}
                type="button"
                role="tab"
                aria-selected={atual === v.valor}
                onClick={() => setVisao(v.valor)}
                className={`min-h-[40px] rounded px-3 text-sm md:min-h-0 md:py-1 ${
                  atual === v.valor ? 'bg-primary font-medium text-bg' : 'text-text-dim hover:text-text'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}
        <button type="button" className="btn-ghost text-sm" onClick={() => setImportando(true)}>
          Importar MS Project
        </button>
      </div>

      {atual === 'etapas' && children}
      {atual === 'tarefas' && <TarefasLista tarefas={tarefas} />}
      {atual === 'gantt' && <TarefasGantt tarefas={tarefas} />}

      <ImportarMsProjectModal
        open={importando}
        onClose={() => setImportando(false)}
        empreendimentoId={empreendimentoId}
        etapas={etapas}
        etapasSalvas={etapasSalvas}
        totalTarefas={tarefas.length}
      />
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { ImportarMsProjectModal } from './ImportarMsProjectModal';
import { TarefasGantt, TarefasLista, type Tarefa } from './CronogramaTarefas';
import type { EtapaEap } from '@/types/db';

type Visao = 'tarefas' | 'gantt';

const VISOES: { valor: Visao; label: string }[] = [
  { valor: 'tarefas', label: 'Tarefas' },
  { valor: 'gantt',   label: 'Gantt' },
];

export function CronogramaVisoes({
  empreendimentoId,
  etapas,
  tarefas,
}: {
  empreendimentoId: string;
  etapas: {
    etapa: string;
    data_inicio_prevista: string | null;
    data_fim_prevista: string | null;
    percentual_fisico: number;
  }[];
  tarefas: Tarefa[];
}) {
  const [visao, setVisao] = useState<Visao>('tarefas');
  const [importando, setImportando] = useState(false);

  const { etapasSalvas, fisicoSalvo } = useMemo(() => {
    const etapasSalvas = new Map<string, EtapaEap | null>();
    const fisicoSalvo = new Map<string, number>();
    for (const t of tarefas) {
      if (!t.uid_msproject) continue;
      etapasSalvas.set(t.uid_msproject, t.etapa);
      if (!t.resumo && Number(t.percentual_fisico) > 0) {
        fisicoSalvo.set(t.uid_msproject, Number(t.percentual_fisico));
      }
    }
    return { etapasSalvas, fisicoSalvo };
  }, [tarefas]);

  const temTarefas = tarefas.length > 0;

  return (
    <div className="space-y-3">
      {temTarefas ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div role="tablist" aria-label="Visão do cronograma" className="inline-flex rounded-md border border-border p-0.5">
            {VISOES.map((v) => (
              <button
                key={v.valor}
                type="button"
                role="tab"
                aria-selected={visao === v.valor}
                onClick={() => setVisao(v.valor)}
                className={`min-h-[40px] rounded px-3 text-sm md:min-h-0 md:py-1 ${
                  visao === v.valor ? 'bg-primary font-medium text-bg' : 'text-text-dim hover:text-text'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn-ghost text-sm" onClick={() => setImportando(true)}>
            Importar MS Project
          </button>
        </div>
      ) : (
        <div className="card space-y-3 p-8 text-center">
          <p className="text-sm text-text-dim">Esta obra ainda não tem cronograma importado.</p>
          <button type="button" className="btn-primary mx-auto" onClick={() => setImportando(true)}>
            Importar MS Project
          </button>
        </div>
      )}

      {temTarefas && visao === 'tarefas' && <TarefasLista tarefas={tarefas} etapas={etapas} />}
      {temTarefas && visao === 'gantt' && <TarefasGantt tarefas={tarefas} />}

      <ImportarMsProjectModal
        open={importando}
        onClose={() => setImportando(false)}
        empreendimentoId={empreendimentoId}
        etapas={etapas}
        etapasSalvas={etapasSalvas}
        fisicoSalvo={fisicoSalvo}
        totalTarefas={tarefas.length}
      />
    </div>
  );
}

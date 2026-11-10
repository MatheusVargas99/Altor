import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/PageHeader';
import { CronogramaVisoes } from './CronogramaVisoes';
import type { Tarefa } from './CronogramaTarefas';
import type { Empreendimento } from '@/types/db';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  empreendimento_id: string;
  etapa: string;
  marco: string;
  descricao: string | null;
  ordem: number;
  data_inicio_prevista: string | null;
  data_fim_prevista: string | null;
  custo_orcado: number;
  custo_comprometido: number;
  custo_pago: number;
  percentual_fisico: number;
  peso: number;
  status: string;
};

export default async function CronogramaPage({
  searchParams,
}: {
  searchParams: { obra?: string };
}) {
  const supabase = createClient();
  await supabase.rpc('atualizar_status_atrasados');
  const { data: empreendimentos } = await supabase
    .from('empreendimentos')
    .select('id, nome, codigo_curto')
    .order('nome');

  const obras = (empreendimentos as Pick<Empreendimento, 'id' | 'nome' | 'codigo_curto'>[]) ?? [];
  const obraId = searchParams.obra ?? obras[0]?.id ?? null;

  let rows: Row[] = [];
  let tarefas: Tarefa[] = [];
  if (obraId) {
    const [etapasRes, tarefasRes] = await Promise.all([
      supabase
        .from('v_cronograma_obra')
        .select('*')
        .eq('empreendimento_id', obraId)
        .order('ordem'),
      supabase
        .from('cronograma_tarefas')
        .select('id, uid_msproject, ordem, wbs, nivel, resumo, marco, nome, data_inicio, data_fim, percentual_fisico, etapa')
        .eq('empreendimento_id', obraId)
        .order('ordem'),
    ]);
    rows = (etapasRes.data as Row[]) ?? [];
    tarefas = (tarefasRes.data as Tarefa[]) ?? [];
  }

  // Média das tarefas folha ponderada pela duração, como nos grupos e etapas.
  // Sem cronograma importado, vale o avanço das etapas.
  const folhas = tarefas
    .filter((t) => !t.resumo)
    .map((t) => ({
      pct: Number(t.percentual_fisico || 0),
      dias:
        t.data_inicio && t.data_fim
          ? Math.max((Date.parse(t.data_fim) - Date.parse(t.data_inicio)) / 86_400_000 + 1, 1)
          : 1,
    }));
  const diasTotais = folhas.reduce((s, t) => s + t.dias, 0);
  const pctFisico =
    diasTotais > 0
      ? folhas.reduce((s, t) => s + t.pct * t.dias, 0) / diasTotais
      : rows.reduce(
          (s, x) => s + Number(x.peso || 0) * Number(x.percentual_fisico || 0),
          0,
        );

  return (
    <div className="p-4 md:p-6 space-y-5">
      <PageHeader
        title="Cronograma físico-financeiro"
        description="Selecione a obra e importe o cronograma do MS Project."
      />

      <div className="flex flex-wrap gap-2 mb-2">
        {obras.map((o) => (
          <Link
            key={o.id}
            href={`/cronograma?obra=${o.id}`}
            className={`flex min-h-[40px] max-w-full items-center break-words rounded border px-3 py-2 text-sm md:min-h-0 md:py-1 ${
              o.id === obraId
                ? 'border-primary text-primary'
                : 'border-border text-text-dim hover:border-primary/50'
            }`}
          >
            {o.nome}
          </Link>
        ))}
        {obras.length === 0 && (
          <div className="text-text-dim text-sm">
            Nenhum empreendimento cadastrado. Crie um em{' '}
            <Link href="/empreendimentos" className="text-primary underline">
              Empreendimentos
            </Link>
            .
          </div>
        )}
      </div>

      {obraId && (
        <>
          <div className="card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase text-text-dim">Avanço físico</span>
              <span className="text-base font-semibold text-primary sm:text-xl">
                {pctFisico.toFixed(1)}%
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-bg-3">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, pctFisico)}%` }}
              />
            </div>
          </div>

          <CronogramaVisoes empreendimentoId={obraId} etapas={rows} tarefas={tarefas} />
        </>
      )}
    </div>
  );
}

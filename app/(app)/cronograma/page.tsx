import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/PageHeader';
import { fmtBRL } from '@/lib/utils';
import { CronogramaClient } from './CronogramaClient';
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
  const { data: empreendimentos } = await supabase
    .from('empreendimentos')
    .select('id, nome, codigo_curto')
    .order('nome');

  const obras = (empreendimentos as Pick<Empreendimento, 'id' | 'nome' | 'codigo_curto'>[]) ?? [];
  const obraId = searchParams.obra ?? obras[0]?.id ?? null;

  let rows: Row[] = [];
  if (obraId) {
    const { data } = await supabase
      .from('v_cronograma_obra')
      .select('*')
      .eq('empreendimento_id', obraId)
      .order('ordem');
    rows = (data as Row[]) ?? [];
  }

  const totalOrcado = rows.reduce((s, x) => s + Number(x.custo_orcado || 0), 0);
  const totalComprometido = rows.reduce(
    (s, x) => s + Number(x.custo_comprometido || 0),
    0,
  );
  const totalPago = rows.reduce((s, x) => s + Number(x.custo_pago || 0), 0);
  const pctFisico =
    rows.reduce(
      (s, x) => s + Number(x.peso || 0) * Number(x.percentual_fisico || 0),
      0,
    ) / 100;

  return (
    <div className="p-4 md:p-6 space-y-5">
      <PageHeader
        title="Cronograma físico-financeiro"
        description="EAP padrão criada automaticamente por empreendimento. Selecione a obra."
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
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <div className="card min-w-0 p-3 sm:p-4">
              <div className="text-xs uppercase text-text-dim">Orçado</div>
              <div className="mt-1 break-words text-base font-semibold text-text sm:text-xl">
                {fmtBRL(totalOrcado)}
              </div>
            </div>
            <div className="card min-w-0 p-3 sm:p-4">
              <div className="text-xs uppercase text-text-dim">Comprometido</div>
              <div className="mt-1 break-words text-base font-semibold text-info sm:text-xl">
                {fmtBRL(totalComprometido)}
              </div>
            </div>
            <div className="card min-w-0 p-3 sm:p-4">
              <div className="text-xs uppercase text-text-dim">Pago</div>
              <div className="mt-1 break-words text-base font-semibold text-success sm:text-xl">
                {fmtBRL(totalPago)}
              </div>
            </div>
            <div className="card min-w-0 p-3 sm:p-4">
              <div className="text-xs uppercase text-text-dim">Avanço físico</div>
              <div className="mt-1 break-words text-base font-semibold text-primary sm:text-xl">
                {pctFisico.toFixed(1)}%
              </div>
            </div>
          </div>

          <CronogramaClient rows={rows} empreendimentoId={obraId} />
        </>
      )}
    </div>
  );
}

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/PageHeader';
import { fmtBRL, fmtDate } from '@/lib/utils';
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

const statusColor = (s: string) =>
  s === 'CONCLUIDA'
    ? 'bg-success/20 text-success'
    : s === 'EM_ANDAMENTO'
      ? 'bg-info/20 text-info'
      : s === 'ATRASADA'
        ? 'bg-danger/20 text-danger'
        : s === 'PAUSADA'
          ? 'bg-warn/20 text-warn'
          : 'bg-bg-3 text-text-dim';

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
    <div className="p-6 space-y-5">
      <PageHeader
        title="Cronograma físico-financeiro"
        description="EAP padrão criada automaticamente por empreendimento. Selecione a obra."
      />

      <div className="flex flex-wrap gap-2 mb-2">
        {obras.map((o) => (
          <Link
            key={o.id}
            href={`/cronograma?obra=${o.id}`}
            className={`rounded px-3 py-1 text-sm border ${
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
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="card">
              <div className="text-xs uppercase text-text-dim">Orçado</div>
              <div className="text-xl font-semibold text-text mt-1">
                {fmtBRL(totalOrcado)}
              </div>
            </div>
            <div className="card">
              <div className="text-xs uppercase text-text-dim">Comprometido</div>
              <div className="text-xl font-semibold text-info mt-1">
                {fmtBRL(totalComprometido)}
              </div>
            </div>
            <div className="card">
              <div className="text-xs uppercase text-text-dim">Pago</div>
              <div className="text-xl font-semibold text-success mt-1">
                {fmtBRL(totalPago)}
              </div>
            </div>
            <div className="card">
              <div className="text-xs uppercase text-text-dim">Avanço físico</div>
              <div className="text-xl font-semibold text-primary mt-1">
                {pctFisico.toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-bg-3 text-text-dim">
                <tr>
                  <th className="px-3 py-2 text-left">Etapa</th>
                  <th className="px-3 py-2 text-left">Marco</th>
                  <th className="px-3 py-2 text-right">Peso</th>
                  <th className="px-3 py-2 text-right">% Físico</th>
                  <th className="px-3 py-2 text-left">Início prev.</th>
                  <th className="px-3 py-2 text-left">Fim prev.</th>
                  <th className="px-3 py-2 text-right">Orçado</th>
                  <th className="px-3 py-2 text-right">Compromet.</th>
                  <th className="px-3 py-2 text-right">Pago</th>
                  <th className="px-3 py-2 text-right">% Gasto</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const orcado = Number(r.custo_orcado) || 0;
                  const pago = Number(r.custo_pago) || 0;
                  const pct = orcado > 0 ? (pago / orcado) * 100 : 0;
                  const pctColor =
                    pct > 100
                      ? 'text-danger'
                      : pct >= 90
                        ? 'text-warn'
                        : 'text-success';
                  return (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-3 py-2 text-xs">
                        {r.etapa.replaceAll('_', ' ')}
                      </td>
                      <td className="px-3 py-2">{r.marco}</td>
                      <td className="px-3 py-2 text-right">
                        {(Number(r.peso) * 100).toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-right">
                        {Number(r.percentual_fisico).toFixed(0)}%
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {fmtDate(r.data_inicio_prevista) || '—'}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {fmtDate(r.data_fim_prevista) || '—'}
                      </td>
                      <td className="px-3 py-2 text-right">{fmtBRL(orcado)}</td>
                      <td className="px-3 py-2 text-right">
                        {fmtBRL(Number(r.custo_comprometido) || 0)}
                      </td>
                      <td className="px-3 py-2 text-right">{fmtBRL(pago)}</td>
                      <td className={`px-3 py-2 text-right ${pctColor}`}>
                        {orcado > 0 ? pct.toFixed(0) + '%' : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded px-2 py-0.5 text-xs ${statusColor(r.status)}`}
                        >
                          {r.status.replaceAll('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

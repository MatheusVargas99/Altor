import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/PageHeader';
import { fmtBRL, fmtDate } from '@/lib/utils';
import type { Cronograma, Empreendimento } from '@/types/db';

export const dynamic = 'force-dynamic';

type CronogramaView = Cronograma & {
  custo_comprometido?: number;
  custo_pago?: number;
};

export default async function EmpreendimentoDetalhe({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: empreendimento } = await supabase
    .from('empreendimentos')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!empreendimento) notFound();

  const e = empreendimento as Empreendimento;

  const { data: cronograma } = await supabase
    .from('v_cronograma_obra')
    .select('*')
    .eq('empreendimento_id', params.id)
    .order('ordem');

  const etapas = (cronograma as CronogramaView[]) ?? [];

  const totalOrcado = etapas.reduce((s, x) => s + (Number(x.custo_orcado) || 0), 0);
  const totalComprometido = etapas.reduce(
    (s, x) => s + (Number(x.custo_comprometido) || 0),
    0,
  );
  const totalPago = etapas.reduce((s, x) => s + (Number(x.custo_pago) || 0), 0);
  const percentualFisico =
    etapas.reduce(
      (s, x) => s + Number(x.peso || 0) * Number(x.percentual_fisico || 0),
      0,
    ) / 100;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={e.nome}
        description={
          [
            e.codigo_curto,
            [e.cidade, e.uf].filter(Boolean).join(' / '),
            e.status.replaceAll('_', ' '),
          ]
            .filter(Boolean)
            .join(' · ') || undefined
        }
        actions={
          <Link href="/empreendimentos" className="btn-ghost">
            ← Voltar
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="text-xs uppercase text-text-dim">VGV estimado</div>
          <div className="text-xl font-semibold text-primary mt-1">
            {fmtBRL(e.vgv_estimado)}
          </div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-text-dim">Custo total estimado</div>
          <div className="text-xl font-semibold text-text mt-1">
            {fmtBRL(e.custo_total_estimado)}
          </div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-text-dim">Entrega prevista</div>
          <div className="text-xl font-semibold text-text mt-1">
            {fmtDate(e.data_entrega_prevista) || '—'}
          </div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-text-dim">Avanço físico</div>
          <div className="text-xl font-semibold text-primary mt-1">
            {percentualFisico.toFixed(1)}%
          </div>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-medium mb-3">Cronograma (EAP)</h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-bg-3 text-text-dim">
              <tr>
                <th className="px-3 py-2 text-left">Etapa</th>
                <th className="px-3 py-2 text-left">Marco</th>
                <th className="px-3 py-2 text-right">Peso</th>
                <th className="px-3 py-2 text-right">% Físico</th>
                <th className="px-3 py-2 text-right">Orçado</th>
                <th className="px-3 py-2 text-right">Comprometido</th>
                <th className="px-3 py-2 text-right">Pago</th>
                <th className="px-3 py-2 text-right">% Gasto</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {etapas.map((x) => {
                const orcado = Number(x.custo_orcado) || 0;
                const pago = Number(x.custo_pago) || 0;
                const pct = orcado > 0 ? (pago / orcado) * 100 : 0;
                const pctColor =
                  pct > 100
                    ? 'text-danger'
                    : pct >= 90
                      ? 'text-warn'
                      : 'text-success';
                return (
                  <tr key={x.id} className="border-t border-border">
                    <td className="px-3 py-2 text-xs">{x.etapa.replaceAll('_', ' ')}</td>
                    <td className="px-3 py-2">{x.marco}</td>
                    <td className="px-3 py-2 text-right">
                      {(Number(x.peso) * 100).toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-right">
                      {Number(x.percentual_fisico).toFixed(0)}%
                    </td>
                    <td className="px-3 py-2 text-right">{fmtBRL(orcado)}</td>
                    <td className="px-3 py-2 text-right">
                      {fmtBRL(Number(x.custo_comprometido) || 0)}
                    </td>
                    <td className="px-3 py-2 text-right">{fmtBRL(pago)}</td>
                    <td className={`px-3 py-2 text-right ${pctColor}`}>
                      {orcado > 0 ? pct.toFixed(0) + '%' : '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-text-dim">
                      {x.status.replaceAll('_', ' ')}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-border bg-bg-3 font-medium">
                <td className="px-3 py-2" colSpan={4}>
                  Totais
                </td>
                <td className="px-3 py-2 text-right">{fmtBRL(totalOrcado)}</td>
                <td className="px-3 py-2 text-right">{fmtBRL(totalComprometido)}</td>
                <td className="px-3 py-2 text-right">{fmtBRL(totalPago)}</td>
                <td className="px-3 py-2 text-right" colSpan={2}>
                  {totalOrcado > 0
                    ? ((totalPago / totalOrcado) * 100).toFixed(1) + '%'
                    : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

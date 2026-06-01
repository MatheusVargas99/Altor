import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { OrcamentosClient } from './OrcamentosClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { fmtBRL } from '@/lib/utils';
import type { Empreendimento, Empresa, Orcamento } from '@/types/db';

export const dynamic = 'force-dynamic';

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams: { tab?: string; obra_filter?: string };
}) {
  const supabase = createClient();
  const tab = searchParams.tab ?? 'cotacoes';
  const obraFilterInit = searchParams.obra_filter ?? '';

  const [{ data: orcs, error }, { data: empreend }, { data: empresas }] =
    await Promise.all([
      supabase
        .from('orcamentos')
        .select('*')
        .order('empreendimento_id')
        .order('etapa')
        .order('grupo_cotacao')
        .order('valor_total', { ascending: true }),
      supabase.from('empreendimentos').select('id, nome, codigo_curto').order('nome'),
      supabase.from('empresas').select('id, razao_social, nome_fantasia').order('razao_social'),
    ]);

  const orcList = (orcs as Orcamento[]) ?? [];
  const obraList = (empreend as Pick<Empreendimento, 'id' | 'nome' | 'codigo_curto'>[]) ?? [];
  const empresaList = (empresas as Pick<Empresa, 'id' | 'razao_social' | 'nome_fantasia'>[]) ?? [];

  // Build allocation summary per obra
  type ObraResumo = {
    id: string;
    nome: string;
    codigo_curto: string | null;
    total: number;
    vencedores: number;
    pendentes: number;
    valorVencedor: number;
    valorPendente: number;
    etapas: Record<string, { vencedor: number; pendente: number }>;
  };

  const resumoMap: Record<string, ObraResumo> = {};
  for (const o of obraList) {
    resumoMap[o.id] = {
      id: o.id, nome: o.nome, codigo_curto: o.codigo_curto,
      total: 0, vencedores: 0, pendentes: 0, valorVencedor: 0, valorPendente: 0, etapas: {},
    };
  }
  for (const orc of orcList) {
    const obraId = orc.empreendimento_id ?? '__sem_obra__';
    if (!resumoMap[obraId]) {
      resumoMap[obraId] = {
        id: obraId, nome: 'Sem obra', codigo_curto: null,
        total: 0, vencedores: 0, pendentes: 0, valorVencedor: 0, valorPendente: 0, etapas: {},
      };
    }
    const r = resumoMap[obraId];
    r.total++;
    const val = Number(orc.valor_total) || 0;
    if (orc.status === 'VENCEDOR') {
      r.vencedores++;
      r.valorVencedor += val;
      if (!r.etapas[orc.etapa]) r.etapas[orc.etapa] = { vencedor: 0, pendente: 0 };
      r.etapas[orc.etapa].vencedor += val;
    } else if (orc.status !== 'CANCELADO' && orc.status !== 'PERDEDOR') {
      r.pendentes++;
      r.valorPendente += val;
      if (!r.etapas[orc.etapa]) r.etapas[orc.etapa] = { vencedor: 0, pendente: 0 };
      r.etapas[orc.etapa].pendente += val;
    }
  }
  const resumos = Object.values(resumoMap).filter((r) => r.total > 0).sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Orçamentos / Cotações"
        description="Compare propostas por etapa e grupo. Marcar vencedor gera Compra."
        actions={
          tab === 'cotacoes' ? (
            <Link href="/orcamentos?tab=alocacao" className="btn-ghost text-sm">
              Resumo por obra →
            </Link>
          ) : (
            <Link href="/orcamentos" className="btn-ghost text-sm">
              ← Ver cotações
            </Link>
          )
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-2">
        <Link
          href="/orcamentos"
          className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
            tab === 'cotacoes'
              ? 'border-primary text-primary font-medium'
              : 'border-transparent text-text-dim hover:text-text'
          }`}
        >
          Cotações
        </Link>
        <Link
          href="/orcamentos?tab=alocacao"
          className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
            tab === 'alocacao'
              ? 'border-primary text-primary font-medium'
              : 'border-transparent text-text-dim hover:text-text'
          }`}
        >
          Alocação por Obra
        </Link>
      </div>

      {tab === 'cotacoes' && (
        <OrcamentosClient
          initial={orcList}
          empreendimentos={obraList}
          empresas={empresaList}
          loadError={error?.message ?? null}
          initialObraFilter={obraFilterInit}
        />
      )}

      {tab === 'alocacao' && (
        <div className="space-y-5">
          {resumos.length === 0 && (
            <div className="card text-center text-text-dim py-12">
              Nenhum orçamento cadastrado.
            </div>
          )}
          {resumos.map((r) => (
            <div key={r.id} className="card space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <div className="text-xs text-text-dim uppercase tracking-wide">Empreendimento</div>
                  <h3 className="text-lg font-medium text-primary">{r.nome}</h3>
                  {r.codigo_curto && <div className="text-xs text-text-dim">{r.codigo_curto}</div>}
                </div>
                <div className="flex gap-3 text-sm">
                  <div className="text-center">
                    <div className="text-xs text-text-dim">Total orç.</div>
                    <div className="font-semibold text-text">{r.total}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-text-dim">Aprovados</div>
                    <div className="font-semibold text-success">{r.vencedores}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-text-dim">Pendentes</div>
                    <div className="font-semibold text-warn">{r.pendentes}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded border border-border bg-bg-3/50 p-3">
                  <div className="text-xs text-text-dim mb-1">Comprometido (aprovados)</div>
                  <div className="text-xl font-semibold text-success">{fmtBRL(r.valorVencedor)}</div>
                </div>
                <div className="rounded border border-border bg-bg-3/50 p-3">
                  <div className="text-xs text-text-dim mb-1">Em análise (pendentes)</div>
                  <div className="text-xl font-semibold text-warn">{fmtBRL(r.valorPendente)}</div>
                </div>
              </div>

              {Object.keys(r.etapas).length > 0 && (
                <div className="overflow-x-auto rounded border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-bg-3 text-text-dim">
                      <tr>
                        <th className="px-3 py-2 text-left">Etapa</th>
                        <th className="px-3 py-2 text-right">Aprovado</th>
                        <th className="px-3 py-2 text-right">Em análise</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(r.etapas)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([etapa, vals]) => (
                          <tr key={etapa} className="border-t border-border">
                            <td className="px-3 py-1.5">{etapa.replaceAll('_', ' ')}</td>
                            <td className="px-3 py-1.5 text-right text-success">{fmtBRL(vals.vencedor)}</td>
                            <td className="px-3 py-1.5 text-right text-warn">{fmtBRL(vals.pendente)}</td>
                            <td className="px-3 py-1.5 text-right font-medium">{fmtBRL(vals.vencedor + vals.pendente)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="text-right">
                <Link
                  href={`/orcamentos?obra_filter=${r.id}`}
                  className="text-xs text-info hover:underline"
                >
                  Ver todas as cotações desta obra →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

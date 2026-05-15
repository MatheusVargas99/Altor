'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toaster';
import { OrcamentoForm } from './OrcamentoForm';
import {
  deleteOrcamento,
  marcarVencedorOrcamento,
} from '@/lib/actions/orcamentos';
import { fmtBRL, fmtDate } from '@/lib/utils';
import {
  ETAPAS_EAP,
  type Empreendimento,
  type Empresa,
  type Orcamento,
  type OrcamentoStatus,
} from '@/types/db';

const statusColor = (s: string) =>
  s === 'VENCEDOR'
    ? 'bg-success/20 text-success'
    : s === 'PERDEDOR'
      ? 'bg-bg-3 text-text-dim'
      : s === 'EM_ANALISE'
        ? 'bg-info/20 text-info'
        : s === 'CANCELADO'
          ? 'bg-danger/20 text-danger'
          : 'bg-warn/20 text-warn';

export function OrcamentosClient({
  initial,
  empreendimentos,
  empresas,
  loadError,
}: {
  initial: Orcamento[];
  empreendimentos: Pick<Empreendimento, 'id' | 'nome' | 'codigo_curto'>[];
  empresas: Pick<Empresa, 'id' | 'razao_social' | 'nome_fantasia'>[];
  loadError: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Orcamento | null>(null);

  const [filterObra, setFilterObra] = useState('');
  const [filterEtapa, setFilterEtapa] = useState('');
  const [filterStatus, setFilterStatus] = useState<OrcamentoStatus | 'TODOS'>('TODOS');
  const [filterGrupo, setFilterGrupo] = useState('');

  const empreendNomes = useMemo(
    () => Object.fromEntries(empreendimentos.map((e) => [e.id, e.nome])),
    [empreendimentos],
  );
  const empresaNomes = useMemo(
    () =>
      Object.fromEntries(
        empresas.map((e) => [e.id, e.nome_fantasia ?? e.razao_social]),
      ),
    [empresas],
  );

  const filtered = useMemo(() => {
    const g = filterGrupo.trim().toLowerCase();
    return initial.filter((r) => {
      if (filterObra && r.empreendimento_id !== filterObra) return false;
      if (filterEtapa && r.etapa !== filterEtapa) return false;
      if (filterStatus !== 'TODOS' && r.status !== filterStatus) return false;
      if (g && !r.grupo_cotacao.toLowerCase().includes(g)) return false;
      return true;
    });
  }, [initial, filterObra, filterEtapa, filterStatus, filterGrupo]);

  const grupos = useMemo(() => {
    const map = new Map<string, Orcamento[]>();
    for (const o of filtered) {
      const k = `${o.empreendimento_id ?? '–'}|${o.etapa}|${o.grupo_cotacao}`;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(o);
    }
    map.forEach((arr) =>
      arr.sort((a, b) => Number(a.valor_total) - Number(b.valor_total)),
    );
    return Array.from(map.entries()).map(([key, items]) => ({ key, items }));
  }, [filtered]);

  const onDelete = (r: Orcamento) => {
    if (!confirm(`Excluir orçamento "${r.material_servico}"?`)) return;
    startTransition(async () => {
      const res = await deleteOrcamento(r.id);
      if (!res.ok) return toast({ kind: 'error', text: res.error });
      toast({ kind: 'success', text: 'Orçamento excluído.' });
      router.refresh();
    });
  };

  const onVencedor = (r: Orcamento) => {
    if (!confirm(`Marcar "${empresaNomes[r.empresa_id ?? ''] ?? '?'}" como vencedor? Gera uma Compra automaticamente.`)) return;
    startTransition(async () => {
      const res = await marcarVencedorOrcamento(r.id);
      if (!res.ok) return toast({ kind: 'error', text: res.error });
      toast({ kind: 'success', text: 'Vencedor marcado. Compra gerada.' });
      router.refresh();
    });
  };

  return (
    <>
      <PageHeader
        title="Orçamentos / Cotações"
        description="Compare propostas por etapa e grupo. Marcar vencedor gera Compra."
        actions={
          <button
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            + Novo orçamento
          </button>
        }
      />
      {loadError && (
        <div className="mb-4 rounded border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
          {loadError}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <select
          className="input max-w-xs"
          value={filterObra}
          onChange={(e) => setFilterObra(e.target.value)}
        >
          <option value="">Todas obras</option>
          {empreendimentos.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </select>
        <select
          className="input max-w-xs"
          value={filterEtapa}
          onChange={(e) => setFilterEtapa(e.target.value)}
        >
          <option value="">Todas etapas</option>
          {ETAPAS_EAP.map((e) => (
            <option key={e} value={e}>
              {e.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
        <select
          className="input max-w-xs"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as OrcamentoStatus | 'TODOS')}
        >
          <option value="TODOS">Todos status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="EM_ANALISE">Em análise</option>
          <option value="VENCEDOR">Vencedor</option>
          <option value="PERDEDOR">Perdedor</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
        <input
          className="input max-w-xs"
          placeholder="Filtrar por grupo de cotação…"
          value={filterGrupo}
          onChange={(e) => setFilterGrupo(e.target.value)}
        />
      </div>

      {grupos.length === 0 && (
        <div className="card text-center text-text-dim">
          Nenhum orçamento cadastrado.
        </div>
      )}

      <div className="space-y-5">
        {grupos.map((g) => {
          const first = g.items[0];
          const obraName = first.empreendimento_id
            ? empreendNomes[first.empreendimento_id] ?? '—'
            : '—';
          return (
            <section key={g.key} className="card">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <div className="text-xs text-text-dim uppercase tracking-wide">
                    {obraName} · {first.etapa.replaceAll('_', ' ')}
                  </div>
                  <h3 className="text-lg font-medium text-primary">
                    {first.grupo_cotacao}
                  </h3>
                  <div className="text-sm text-text-dim">
                    {first.material_servico}
                  </div>
                </div>
                <div className="text-xs text-text-dim">
                  {g.items.length} proposta(s)
                </div>
              </div>
              <div className="overflow-x-auto rounded border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-bg-3 text-text-dim">
                    <tr>
                      <th className="px-3 py-2 text-left">Empresa</th>
                      <th className="px-3 py-2 text-right">Qtd</th>
                      <th className="px-3 py-2 text-right">Unit.</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-left">Prazo</th>
                      <th className="px-3 py-2 text-left">Condição</th>
                      <th className="px-3 py-2 text-left">Validade</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((o) => (
                      <tr key={o.id} className="border-t border-border">
                        <td className="px-3 py-2">
                          {o.empresa_id ? empresaNomes[o.empresa_id] ?? '—' : '—'}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {Number(o.quantidade)} {o.unidade ?? ''}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {fmtBRL(Number(o.valor_unitario))}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {fmtBRL(Number(o.valor_total))}
                        </td>
                        <td className="px-3 py-2">
                          {o.prazo_entrega_dias != null
                            ? `${o.prazo_entrega_dias}d`
                            : '—'}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {o.condicao_pagamento ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {fmtDate(o.validade_proposta) || '—'}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded px-2 py-0.5 text-xs ${statusColor(o.status)}`}
                          >
                            {o.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-xs whitespace-nowrap">
                          {o.status !== 'VENCEDOR' && o.status !== 'CANCELADO' && (
                            <button
                              className="text-success hover:underline mr-2"
                              disabled={isPending}
                              onClick={() => onVencedor(o)}
                            >
                              Vencedor
                            </button>
                          )}
                          <button
                            className="text-info hover:underline mr-2"
                            onClick={() => {
                              setEditing(o);
                              setOpen(true);
                            }}
                          >
                            Editar
                          </button>
                          <button
                            className="text-danger hover:underline"
                            disabled={isPending}
                            onClick={() => onDelete(o)}
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Editar orçamento' : 'Novo orçamento'}
        size="lg"
      >
        <OrcamentoForm
          orcamento={editing}
          empreendimentos={empreendimentos}
          empresas={empresas}
          onDone={(msg) => {
            toast({ kind: 'success', text: msg });
            setOpen(false);
            router.refresh();
          }}
          onError={(msg) => toast({ kind: 'error', text: msg })}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}

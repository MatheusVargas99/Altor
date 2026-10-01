'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
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
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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
  initialObraFilter = '',
}: {
  initial: Orcamento[];
  empreendimentos: Pick<Empreendimento, 'id' | 'nome' | 'codigo_curto'>[];
  empresas: Pick<Empresa, 'id' | 'razao_social' | 'nome_fantasia'>[];
  loadError: string | null;
  initialObraFilter?: string;
}) {
  const CHART_COLORS = [
    '#C9A961', '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#06B6D4', '#F472B6', '#84CC16', '#94A3B8',
  ];

  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Orcamento | null>(null);

  const [filterObra, setFilterObra] = useState(initialObraFilter);
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
      <div className="mb-2 flex justify-end">
        <button
          className="btn-primary w-full sm:w-auto"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          + Novo orçamento
        </button>
      </div>
      {loadError && (
        <div className="mb-4 rounded border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
          {loadError}
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <select
          className="input col-span-2 min-w-0 sm:max-w-xs"
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
          className="input min-w-0 sm:max-w-xs"
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
          className="input min-w-0 sm:max-w-xs"
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
          type="search"
          enterKeyHint="search"
          className="input col-span-2 min-w-0 sm:max-w-xs"
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
            <section key={g.key} className="card min-w-0 p-3 sm:p-4">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <div className="min-w-0 break-words">
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
              {/* Celular: um cartão por proposta (do menor para o maior valor) */}
              <div className="space-y-2 md:hidden">
                {g.items.map((o, idx) => {
                  const podeVencer = o.status !== 'VENCEDOR' && o.status !== 'CANCELADO';
                  return (
                    <div
                      key={o.id}
                      className={`rounded-lg border p-3 text-sm ${
                        o.status === 'VENCEDOR' ? 'border-success bg-success/5' : 'border-border bg-bg'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 break-words font-medium text-text">
                          {o.empresa_id ? empresaNomes[o.empresa_id] ?? '—' : '—'}
                        </div>
                        <span
                          className={`shrink-0 rounded px-2 py-0.5 text-xs ${statusColor(o.status)}`}
                        >
                          {o.status.replaceAll('_', ' ')}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
                        <span className="text-lg font-semibold text-primary">
                          {fmtBRL(Number(o.valor_total))}
                        </span>
                        {idx === 0 && g.items.length > 1 && (
                          <span className="rounded bg-success/20 px-1.5 py-0.5 text-[11px] text-success">
                            Menor preço
                          </span>
                        )}
                      </div>
                      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                        <div>
                          <dt className="text-text-dim">Qtd × unit.</dt>
                          <dd className="break-words">
                            {Number(o.quantidade)} {o.unidade ?? ''} × {fmtBRL(Number(o.valor_unitario))}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-text-dim">Prazo</dt>
                          <dd>{o.prazo_entrega_dias != null ? `${o.prazo_entrega_dias} dias` : '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-text-dim">Condição</dt>
                          <dd className="break-words">{o.condicao_pagamento ?? '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-text-dim">Validade</dt>
                          <dd>{fmtDate(o.validade_proposta) || '—'}</dd>
                        </div>
                      </dl>
                      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
                        {podeVencer && (
                          <button
                            type="button"
                            className="col-span-2 min-h-[44px] rounded-md border border-success bg-success/15 px-3 py-2 text-sm font-medium text-success active:bg-success/25 disabled:opacity-50"
                            disabled={isPending}
                            onClick={() => onVencedor(o)}
                          >
                            Marcar vencedor
                          </button>
                        )}
                        <button
                          type="button"
                          className="min-h-[44px] rounded-md border border-border px-3 py-2 text-sm text-info active:bg-bg-3"
                          onClick={() => {
                            setEditing(o);
                            setOpen(true);
                          }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="min-h-[44px] rounded-md border border-border px-3 py-2 text-sm text-danger active:bg-bg-3 disabled:opacity-50"
                          disabled={isPending}
                          onClick={() => onDelete(o)}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto rounded border border-border md:block">
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
                              className="mr-2 py-2 text-success hover:underline lg:py-0"
                              disabled={isPending}
                              onClick={() => onVencedor(o)}
                            >
                              Vencedor
                            </button>
                          )}
                          <button
                            className="mr-2 py-2 text-info hover:underline lg:py-0"
                            onClick={() => {
                              setEditing(o);
                              setOpen(true);
                            }}
                          >
                            Editar
                          </button>
                          <button
                            className="py-2 text-danger hover:underline lg:py-0"
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
              {/* Comparative chart - only show when 2+ proposals exist */}
              {g.items.length >= 1 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="text-xs text-text-dim mb-2">Comparativo de preços por fornecedor</div>
                  <div style={{ width: '100%', height: 220 }}>
                    <ResponsiveContainer>
                      <BarChart
                        data={g.items.map((o, idx) => ({
                          empresa: o.empresa_id ? (empresaNomes[o.empresa_id] ?? '—') : '—',
                          total: Number(o.valor_total),
                          idx,
                        }))}
                        margin={{ top: 5, right: 4, left: 0, bottom: 40 }}
                      >
                        <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                        <XAxis
                          dataKey="empresa"
                          stroke="#94A3B8"
                          tick={{ fontSize: 11, fill: '#94A3B8' }}
                          angle={-25}
                          textAnchor="end"
                          interval={0}
                          tickFormatter={(v: string) =>
                            v.length > 14 ? `${v.slice(0, 13)}…` : v
                          }
                        />
                        <YAxis
                          stroke="#94A3B8"
                          tick={{ fontSize: 11, fill: '#94A3B8' }}
                          tickFormatter={(v: number) =>
                            v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                          }
                        />
                        <Tooltip
                          formatter={(v) =>
                            new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(Number(v ?? 0))
                          }
                          contentStyle={{
                            background: '#1E293B',
                            border: '1px solid #334155',
                            color: '#F1F5F9',
                            fontSize: 12,
                          }}
                        />
                        <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                          {g.items.map((o, idx) => (
                            <Cell
                              key={o.id}
                              fill={
                                o.status === 'VENCEDOR'
                                  ? '#10B981'
                                  : o.status === 'PERDEDOR'
                                    ? '#475569'
                                    : CHART_COLORS[idx % CHART_COLORS.length]
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {g.items.length > 1 && (() => {
                    const sorted = [...g.items].sort((a, b) => Number(a.valor_total) - Number(b.valor_total));
                    const min = sorted[0];
                    const max = sorted[sorted.length - 1];
                    const diff = Number(max.valor_total) - Number(min.valor_total);
                    const pct = Number(min.valor_total) > 0 ? (diff / Number(min.valor_total)) * 100 : 0;
                    return (
                      <div className="text-xs text-text-dim mt-1">
                        Menor: <strong className="text-success">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(min.valor_total))}
                        </strong>
                        {' '}({min.empresa_id ? (empresaNomes[min.empresa_id] ?? '—') : '—'})
                        {' · '}Diferença para maior: <strong className="text-warn">{pct.toFixed(1)}%</strong>
                      </div>
                    );
                  })()}
                </div>
              )}
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

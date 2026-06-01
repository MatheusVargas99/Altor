'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toaster';
import { CompraForm } from './CompraForm';
import { avancarCompra, deleteCompra } from '@/lib/actions/compras';
import { fmtBRL, fmtDate } from '@/lib/utils';
import type {
  Compra,
  CompraPrioridade,
  CompraStatus,
  Empreendimento,
  Empresa,
} from '@/types/db';

const prioColor = (p: CompraPrioridade) =>
  p === 'URGENTE'
    ? 'bg-danger/20 text-danger'
    : p === 'MODERADA'
      ? 'bg-warn/20 text-warn'
      : 'bg-bg-3 text-text-dim';

const statusColor = (s: CompraStatus) =>
  s === 'RECEBIDO'
    ? 'bg-success/20 text-success'
    : s === 'COMPRADO'
      ? 'bg-info/20 text-info'
      : s === 'EM_NEGOCIACAO'
        ? 'bg-info/20 text-info'
        : s === 'CANCELADO'
          ? 'bg-danger/20 text-danger'
          : 'bg-warn/20 text-warn';

export function ComprasClient({
  initial,
  empreendimentos,
  empresas,
  loadError,
}: {
  initial: Compra[];
  empreendimentos: Pick<Empreendimento, 'id' | 'nome' | 'codigo_curto'>[];
  empresas: Pick<Empresa, 'id' | 'razao_social' | 'nome_fantasia'>[];
  loadError: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Compra | null>(null);
  const [filterStatus, setFilterStatus] = useState<CompraStatus | 'TODOS'>('TODOS');
  const [filterPrio, setFilterPrio] = useState<CompraPrioridade | 'TODAS'>('TODAS');
  const [filterObra, setFilterObra] = useState('');

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
    return initial.filter((r) => {
      if (filterStatus !== 'TODOS' && r.status !== filterStatus) return false;
      if (filterPrio !== 'TODAS' && r.prioridade !== filterPrio) return false;
      if (filterObra && r.empreendimento_id !== filterObra) return false;
      return true;
    });
  }, [initial, filterStatus, filterPrio, filterObra]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      ABERTO: 0,
      EM_NEGOCIACAO: 0,
      COMPRADO: 0,
      RECEBIDO: 0,
    };
    for (const r of filtered) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [filtered]);

  const columns: Column<Compra>[] = [
    {
      key: 'data',
      header: 'Aprovação',
      cell: (r) => fmtDate(r.data_aprovacao),
      sortAccessor: (r) => r.data_aprovacao ?? '',
    },
    {
      key: 'material',
      header: 'Material/serviço',
      cell: (r) => (
        <div>
          <div className="text-text">{r.material_servico}</div>
          {r.etapa && (
            <div className="text-xs text-text-dim">{r.etapa.replaceAll('_', ' ')}</div>
          )}
        </div>
      ),
      searchAccessor: (r) =>
        `${r.material_servico} ${r.descricao_detalhada ?? ''} ${r.numero_pedido ?? ''}`,
    },
    {
      key: 'obra',
      header: 'Empreendimento',
      cell: (r) => empreendNomes[r.empreendimento_id] ?? '—',
    },
    {
      key: 'empresa',
      header: 'Fornecedor',
      cell: (r) =>
        r.empresa_nome ?? (r.empresa_id ? empresaNomes[r.empresa_id] ?? '—' : '—'),
    },
    {
      key: 'qtd',
      header: 'Qtd',
      cell: (r) => `${Number(r.quantidade)} ${r.unidade ?? ''}`,
    },
    {
      key: 'valor',
      header: 'Valor total',
      cell: (r) => fmtBRL(Number(r.valor_total)),
      sortAccessor: (r) => Number(r.valor_total),
      className: 'text-right',
    },
    {
      key: 'prio',
      header: 'Prioridade',
      cell: (r) => (
        <span className={`rounded px-2 py-0.5 text-xs ${prioColor(r.prioridade)}`}>
          {r.prioridade}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => (
        <span className={`rounded px-2 py-0.5 text-xs ${statusColor(r.status)}`}>
          {r.status.replaceAll('_', ' ')}
        </span>
      ),
    },
  ];

  const onDelete = (r: Compra) => {
    if (!confirm(`Excluir compra "${r.material_servico}"?`)) return;
    startTransition(async () => {
      const res = await deleteCompra(r.id);
      if (!res.ok) return toast({ kind: 'error', text: res.error });
      toast({ kind: 'success', text: 'Compra excluída.' });
      router.refresh();
    });
  };

  const onAvancar = (r: Compra, para: 'COMPRADO' | 'RECEBIDO') => {
    startTransition(async () => {
      const res = await avancarCompra(r.id, para);
      if (!res.ok) return toast({ kind: 'error', text: res.error });
      toast({ kind: 'success', text: `Status atualizado para ${para}.` });
      router.refresh();
    });
  };

  return (
    <>
      <PageHeader
        title="Compras"
        description="Gestão das compras aprovadas (geradas por orçamentos vencedores ou manuais)."
        actions={
          <button
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            + Nova compra
          </button>
        }
      />
      {loadError && (
        <div className="mb-4 rounded border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        {(['ABERTO', 'EM_NEGOCIACAO', 'COMPRADO', 'RECEBIDO'] as const).map((s) => (
          <div key={s} className="card">
            <div className="text-xs uppercase text-text-dim">{s.replaceAll('_', ' ')}</div>
            <div className="text-2xl font-semibold text-primary mt-1">
              {counts[s] ?? 0}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <select
          className="input max-w-xs"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as CompraStatus | 'TODOS')}
        >
          <option value="TODOS">Todos status</option>
          <option value="ABERTO">Aberto</option>
          <option value="EM_NEGOCIACAO">Em negociação</option>
          <option value="COMPRADO">Comprado</option>
          <option value="RECEBIDO">Recebido</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
        <select
          className="input max-w-xs"
          value={filterPrio}
          onChange={(e) => setFilterPrio(e.target.value as CompraPrioridade | 'TODAS')}
        >
          <option value="TODAS">Todas prioridades</option>
          <option value="URGENTE">Urgente</option>
          <option value="MODERADA">Moderada</option>
          <option value="NORMAL">Normal</option>
        </select>
        <select
          className="input max-w-xs"
          value={filterObra}
          onChange={(e) => setFilterObra(e.target.value)}
        >
          <option value="">Todos empreendimentos</option>
          {empreendimentos.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        rows={filtered}
        columns={[
          ...columns,
          {
            key: 'acoes',
            header: '',
            cell: (r) => (
              <div className="flex justify-end gap-2 text-xs">
                {(r.status === 'ABERTO' || r.status === 'EM_NEGOCIACAO') && (
                  <button
                    className="text-info hover:underline"
                    onClick={() => onAvancar(r, 'COMPRADO')}
                  >
                    Comprar
                  </button>
                )}
                {r.status === 'COMPRADO' && (
                  <button
                    className="text-success hover:underline"
                    onClick={() => onAvancar(r, 'RECEBIDO')}
                  >
                    Receber
                  </button>
                )}
                <button
                  className="text-info hover:underline"
                  onClick={() => {
                    setEditing(r);
                    setOpen(true);
                  }}
                >
                  Editar
                </button>
                <button
                  disabled={isPending}
                  className="text-danger hover:underline disabled:opacity-50"
                  onClick={() => onDelete(r)}
                >
                  Excluir
                </button>
              </div>
            ),
            className: 'text-right w-44',
          },
        ]}
        emptyText="Nenhuma compra registrada."
        searchPlaceholder="Buscar por material, pedido…"
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Editar compra' : 'Nova compra'}
        size="lg"
      >
        <CompraForm
          compra={editing}
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

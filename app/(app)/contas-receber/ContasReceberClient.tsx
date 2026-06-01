'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toaster';
import { CRForm } from './CRForm';
import {
  deleteContaReceber,
  marcarPagoContaReceber,
} from '@/lib/actions/contas-receber';
import { fmtBRL, fmtDate } from '@/lib/utils';
import type { Cliente, ContaReceber, CrStatus, Empreendimento } from '@/types/db';

export function ContasReceberClient({
  initial,
  empreendimentos,
  clientes,
  loadError,
}: {
  initial: ContaReceber[];
  empreendimentos: Pick<Empreendimento, 'id' | 'nome' | 'codigo_curto'>[];
  clientes: Pick<Cliente, 'id' | 'nome_completo'>[];
  loadError: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ContaReceber | null>(null);
  const [filterStatus, setFilterStatus] = useState<CrStatus | 'TODOS'>('TODOS');
  const [filterObra, setFilterObra] = useState<string>('');

  const empreendNomes = useMemo(
    () => Object.fromEntries(empreendimentos.map((e) => [e.id, e.nome])),
    [empreendimentos],
  );
  const clienteNomes = useMemo(
    () => Object.fromEntries(clientes.map((c) => [c.id, c.nome_completo])),
    [clientes],
  );

  const filtered = useMemo(() => {
    return initial.filter((r) => {
      if (filterStatus !== 'TODOS' && r.status !== filterStatus) return false;
      if (filterObra && r.empreendimento_id !== filterObra) return false;
      return true;
    });
  }, [initial, filterStatus, filterObra]);

  const totals = useMemo(() => {
    let aberto = 0;
    let pago = 0;
    let atrasado = 0;
    const hoje = new Date().toISOString().slice(0, 10);
    for (const r of filtered) {
      pago += Number(r.valor_pago) || 0;
      aberto += Number(r.valor_aberto) || 0;
      if (r.status !== 'PAGO' && r.status !== 'CANCELADO' && r.data_vencimento < hoje) {
        atrasado += Number(r.valor_aberto) || 0;
      }
    }
    return { aberto, pago, atrasado };
  }, [filtered]);

  const statusColor = (s: string) =>
    s === 'PAGO'
      ? 'bg-success/20 text-success'
      : s === 'PARCIAL'
        ? 'bg-info/20 text-info'
        : s === 'ATRASADO'
          ? 'bg-danger/20 text-danger'
          : s === 'CANCELADO'
            ? 'bg-bg-3 text-text-dim'
            : 'bg-warn/20 text-warn';

  const columns: Column<ContaReceber>[] = [
    {
      key: 'venc',
      header: 'Vencimento',
      cell: (r) => fmtDate(r.data_vencimento),
      sortAccessor: (r) => r.data_vencimento,
    },
    {
      key: 'descricao',
      header: 'Descrição',
      cell: (r) => (
        <div>
          <div className="text-text">{r.descricao}</div>
          {r.numero_parcela && (
            <div className="text-xs text-text-dim">{r.numero_parcela}</div>
          )}
        </div>
      ),
      searchAccessor: (r) => `${r.descricao} ${r.numero_parcela ?? ''}`,
    },
    {
      key: 'obra',
      header: 'Empreendimento',
      cell: (r) =>
        r.empreendimento_id ? empreendNomes[r.empreendimento_id] ?? '—' : '—',
      searchAccessor: (r) =>
        r.empreendimento_id ? empreendNomes[r.empreendimento_id] ?? '' : '',
    },
    {
      key: 'cliente',
      header: 'Cliente',
      cell: (r) =>
        r.cliente_id ? clienteNomes[r.cliente_id] ?? '—' : '—',
      searchAccessor: (r) => (r.cliente_id ? clienteNomes[r.cliente_id] ?? '' : ''),
    },
    {
      key: 'valor',
      header: 'Valor',
      cell: (r) => fmtBRL(r.valor_original),
      sortAccessor: (r) => r.valor_original,
      className: 'text-right',
    },
    {
      key: 'aberto',
      header: 'Em aberto',
      cell: (r) => (
        <span className={r.valor_aberto > 0 ? 'text-warn' : 'text-text-dim'}>
          {fmtBRL(r.valor_aberto)}
        </span>
      ),
      sortAccessor: (r) => r.valor_aberto,
      className: 'text-right',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => (
        <span className={`rounded px-2 py-0.5 text-xs ${statusColor(r.status)}`}>
          {r.status}
        </span>
      ),
      sortAccessor: (r) => r.status,
    },
  ];

  const onDelete = (r: ContaReceber) => {
    if (!confirm(`Excluir "${r.descricao}"?`)) return;
    startTransition(async () => {
      const res = await deleteContaReceber(r.id);
      if (!res.ok) {
        toast({ kind: 'error', text: res.error });
        return;
      }
      toast({ kind: 'success', text: 'Conta excluída.' });
      router.refresh();
    });
  };

  const onPagar = (r: ContaReceber) => {
    startTransition(async () => {
      const res = await marcarPagoContaReceber(r.id);
      if (!res.ok) {
        toast({ kind: 'error', text: res.error });
        return;
      }
      toast({ kind: 'success', text: 'Marcada como paga.' });
      router.refresh();
    });
  };

  return (
    <>
      <PageHeader
        title="Contas a Receber"
        description="Vendas de unidades, parcelas, aluguéis e outros recebíveis."
        actions={
          <button
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            + Nova conta / parcelar
          </button>
        }
      />
      {loadError && (
        <div className="mb-4 rounded border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="card">
          <div className="text-xs uppercase text-text-dim">Total em aberto</div>
          <div className="text-xl font-semibold text-warn mt-1">
            {fmtBRL(totals.aberto)}
          </div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-text-dim">Recebido</div>
          <div className="text-xl font-semibold text-success mt-1">
            {fmtBRL(totals.pago)}
          </div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-text-dim">Atrasado</div>
          <div className="text-xl font-semibold text-danger mt-1">
            {fmtBRL(totals.atrasado)}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <select
          className="input max-w-xs"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as CrStatus | 'TODOS')}
        >
          <option value="TODOS">Todos status</option>
          <option value="ABERTO">Aberto</option>
          <option value="PARCIAL">Parcial</option>
          <option value="PAGO">Pago</option>
          <option value="ATRASADO">Atrasado</option>
          <option value="CANCELADO">Cancelado</option>
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
                {r.status !== 'PAGO' && r.status !== 'CANCELADO' && (
                  <button
                    className="text-success hover:underline"
                    onClick={() => onPagar(r)}
                  >
                    Pagar
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
            className: 'text-right w-40',
          },
        ]}
        emptyText="Nenhuma conta a receber."
        searchPlaceholder="Buscar por descrição, parcela…"
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Editar conta a receber' : 'Nova conta a receber'}
        size="lg"
      >
        <CRForm
          conta={editing}
          empreendimentos={empreendimentos}
          clientes={clientes}
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

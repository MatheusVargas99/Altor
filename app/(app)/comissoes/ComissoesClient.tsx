'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toaster';
import { ComissaoForm } from './ComissaoForm';
import {
  deleteComissao,
  marcarPagaComissao,
} from '@/lib/actions/comissoes';
import { fmtBRL, fmtDate } from '@/lib/utils';
import type {
  Cliente,
  Comissao,
  ComissaoStatus,
  Empreendimento,
  Empresa,
} from '@/types/db';

export function ComissoesClient({
  initial,
  empreendimentos,
  clientes,
  empresas,
  loadError,
}: {
  initial: Comissao[];
  empreendimentos: Pick<Empreendimento, 'id' | 'nome'>[];
  clientes: Pick<Cliente, 'id' | 'nome_completo'>[];
  empresas: Pick<Empresa, 'id' | 'razao_social' | 'nome_fantasia'>[];
  loadError: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Comissao | null>(null);
  const [filterStatus, setFilterStatus] = useState<ComissaoStatus | 'TODOS'>('TODOS');
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
    let previsto = 0;
    let pago = 0;
    let retido = 0;
    for (const r of filtered) {
      const v = Number(r.valor_parcela) || 0;
      if (r.status === 'PREVISTA' || r.status === 'A_PAGAR') previsto += v;
      else if (r.status === 'PAGA') pago += v;
      else if (r.status === 'RETIDA') retido += v;
    }
    return { previsto, pago, retido };
  }, [filtered]);

  const statusColor = (s: ComissaoStatus) =>
    s === 'PAGA'
      ? 'bg-success/20 text-success'
      : s === 'A_PAGAR'
        ? 'bg-info/20 text-info'
        : s === 'PREVISTA'
          ? 'bg-warn/20 text-warn'
          : s === 'RETIDA'
            ? 'bg-bg-3 text-text-dim'
            : 'bg-danger/20 text-danger';

  const columns: Column<Comissao>[] = [
    {
      key: 'data_prevista',
      header: 'Data prevista',
      cell: (r) => (r.data_prevista ? fmtDate(r.data_prevista) : '—'),
      sortAccessor: (r) => r.data_prevista ?? '',
    },
    {
      key: 'beneficiario',
      header: 'Beneficiário',
      cell: (r) => (
        <div>
          <div className="text-text">{r.beneficiario_nome}</div>
          {r.beneficiario_tipo && (
            <div className="text-xs text-text-dim">
              {r.beneficiario_tipo.replaceAll('_', ' ')}
            </div>
          )}
        </div>
      ),
      searchAccessor: (r) =>
        `${r.beneficiario_nome} ${r.beneficiario_tipo ?? ''}`,
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
      cell: (r) => (r.cliente_id ? clienteNomes[r.cliente_id] ?? '—' : '—'),
      searchAccessor: (r) =>
        r.cliente_id ? clienteNomes[r.cliente_id] ?? '' : '',
    },
    {
      key: 'parcela',
      header: 'Parcela',
      cell: (r) => r.parcela ?? '—',
      sortAccessor: (r) => r.parcela ?? '',
    },
    {
      key: 'valor_parcela',
      header: 'Valor',
      cell: (r) => fmtBRL(r.valor_parcela),
      sortAccessor: (r) => r.valor_parcela,
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

  const onDelete = (r: Comissao) => {
    if (!confirm(`Excluir comissão de "${r.beneficiario_nome}"?`)) return;
    startTransition(async () => {
      const res = await deleteComissao(r.id);
      if (!res.ok) {
        toast({ kind: 'error', text: res.error });
        return;
      }
      toast({ kind: 'success', text: 'Comissão excluída.' });
      router.refresh();
    });
  };

  const onPagar = (r: Comissao) => {
    startTransition(async () => {
      const res = await marcarPagaComissao(r.id);
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
        title="Comissões"
        description="Comissões de venda por beneficiário, com previsão e pagamento."
        actions={
          <button
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            + Nova comissão / parcelar
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
          <div className="text-xs uppercase text-text-dim">Total previsto</div>
          <div className="text-xl font-semibold text-warn mt-1">
            {fmtBRL(totals.previsto)}
          </div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-text-dim">Pago</div>
          <div className="text-xl font-semibold text-success mt-1">
            {fmtBRL(totals.pago)}
          </div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-text-dim">Retido</div>
          <div className="text-xl font-semibold text-text-dim mt-1">
            {fmtBRL(totals.retido)}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <select
          className="input max-w-xs"
          value={filterStatus}
          onChange={(e) =>
            setFilterStatus(e.target.value as ComissaoStatus | 'TODOS')
          }
        >
          <option value="TODOS">Todos status</option>
          <option value="PREVISTA">Prevista</option>
          <option value="A_PAGAR">A pagar</option>
          <option value="PAGA">Paga</option>
          <option value="RETIDA">Retida</option>
          <option value="CANCELADA">Cancelada</option>
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
                {r.status !== 'PAGA' && r.status !== 'CANCELADA' && (
                  <button
                    className="text-success hover:underline"
                    onClick={() => onPagar(r)}
                  >
                    Marcar paga
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
            className: 'text-right w-48',
          },
        ]}
        emptyText="Nenhuma comissão."
        searchPlaceholder="Buscar por beneficiário, parcela…"
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Editar comissão' : 'Nova comissão'}
        size="lg"
      >
        <ComissaoForm
          comissao={editing}
          empreendimentos={empreendimentos}
          clientes={clientes}
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

'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toaster';
import { ContratoForm } from './ContratoForm';
import { deleteContrato, updateContratoStatus } from '@/lib/actions/contratos';
import { fmtBRL, fmtDate } from '@/lib/utils';
import type {
  Cliente,
  Contrato,
  ContratoStatus,
  Empreendimento,
  Empresa,
} from '@/types/db';

const statusColor = (s: ContratoStatus) =>
  s === 'ATIVO'
    ? 'bg-success/20 text-success'
    : s === 'EM_ELABORACAO'
      ? 'bg-warn/20 text-warn'
      : s === 'INADIMPLENTE'
        ? 'bg-danger/20 text-danger'
        : s === 'DISTRATADO' || s === 'ENCERRADO'
          ? 'bg-bg-3 text-text-dim'
          : 'bg-bg-3 text-text-dim';

export function ContratosClient({
  initial,
  empreendimentos,
  clientes,
  empresas,
  loadError,
}: {
  initial: Contrato[];
  empreendimentos: Pick<Empreendimento, 'id' | 'nome' | 'codigo_curto'>[];
  clientes: Pick<Cliente, 'id' | 'nome_completo'>[];
  empresas: Pick<Empresa, 'id' | 'razao_social' | 'nome_fantasia'>[];
  loadError: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contrato | null>(null);
  const [filterStatus, setFilterStatus] = useState<ContratoStatus | 'TODOS'>('TODOS');
  const [statusModal, setStatusModal] = useState<Contrato | null>(null);
  const [newStatus, setNewStatus] = useState<ContratoStatus>('EM_ELABORACAO');

  const empreendNomes = useMemo(
    () => Object.fromEntries(empreendimentos.map((e) => [e.id, e.nome])),
    [empreendimentos],
  );

  const filtered = useMemo(
    () =>
      initial.filter((r) => filterStatus === 'TODOS' || r.status === filterStatus),
    [initial, filterStatus],
  );

  const columns: Column<Contrato>[] = [
    {
      key: 'numero',
      header: 'Nº contrato',
      cell: (r) => <span className="font-medium text-text">{r.numero}</span>,
      sortAccessor: (r) => r.numero,
      searchAccessor: (r) => `${r.numero} ${r.parte_nome}`,
    },
    {
      key: 'tipo',
      header: 'Tipo',
      cell: (r) => r.tipo?.replaceAll('_', ' ') ?? '—',
    },
    {
      key: 'parte',
      header: 'Parte',
      cell: (r) => r.parte_nome,
      searchAccessor: (r) => r.parte_nome,
    },
    {
      key: 'obra',
      header: 'Empreendimento',
      cell: (r) =>
        r.empreendimento_id ? empreendNomes[r.empreendimento_id] ?? '—' : '—',
    },
    {
      key: 'valor',
      header: 'Valor',
      cell: (r) => fmtBRL(Number(r.valor_total) || 0),
      sortAccessor: (r) => Number(r.valor_total) || 0,
      className: 'text-right',
    },
    {
      key: 'assin',
      header: 'Assinatura',
      cell: (r) => fmtDate(r.data_assinatura) || '—',
      sortAccessor: (r) => r.data_assinatura ?? '',
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

  const onStatusSave = () => {
    if (!statusModal) return;
    startTransition(async () => {
      const res = await updateContratoStatus(statusModal.id, newStatus);
      if (!res.ok) return toast({ kind: 'error', text: res.error });
      toast({ kind: 'success', text: 'Status atualizado.' });
      setStatusModal(null);
      router.refresh();
    });
  };

  const onDelete = (r: Contrato) => {
    if (!confirm(`Excluir contrato "${r.numero}"?`)) return;
    startTransition(async () => {
      const res = await deleteContrato(r.id);
      if (!res.ok) return toast({ kind: 'error', text: res.error });
      toast({ kind: 'success', text: 'Contrato excluído.' });
      router.refresh();
    });
  };

  return (
    <>
      <PageHeader
        title="Contratos"
        description="Compra/venda, empreitada, fornecimento, prestação de serviço."
        actions={
          <button
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            + Novo contrato
          </button>
        }
      />
      {loadError && (
        <div className="mb-4 rounded border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
          {loadError}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        <select
          className="input max-w-xs"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as ContratoStatus | 'TODOS')}
        >
          <option value="TODOS">Todos status</option>
          <option value="EM_ELABORACAO">Em elaboração</option>
          <option value="ATIVO">Ativo</option>
          <option value="DISTRATADO">Distratado</option>
          <option value="ENCERRADO">Encerrado</option>
          <option value="INADIMPLENTE">Inadimplente</option>
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
                <button
                  className="text-warn hover:underline"
                  onClick={() => {
                    setNewStatus(r.status);
                    setStatusModal(r);
                  }}
                >
                  Status
                </button>
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
            className: 'text-right w-32',
          },
        ]}
        emptyText="Nenhum contrato."
        searchPlaceholder="Buscar por nº, parte…"
      />

      <Modal
        open={!!statusModal}
        onClose={() => setStatusModal(null)}
        title="Alterar status do contrato"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <div className="text-sm text-text-dim mb-1">
              Contrato: <strong className="text-text">{statusModal?.numero}</strong>
            </div>
          </div>
          <div>
            <label className="label">Novo status</label>
            <select
              className="input"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as ContratoStatus)}
            >
              <option value="EM_ELABORACAO">Em elaboração</option>
              <option value="ATIVO">Ativo</option>
              <option value="DISTRATADO">Distratado</option>
              <option value="ENCERRADO">Encerrado</option>
              <option value="INADIMPLENTE">Inadimplente</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setStatusModal(null)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={isPending}
              onClick={onStatusSave}
            >
              Salvar
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Editar contrato' : 'Novo contrato'}
        size="lg"
      >
        <ContratoForm
          contrato={editing}
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

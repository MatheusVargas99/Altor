'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toaster';
import { ClienteForm } from './ClienteForm';
import { deleteCliente } from '@/lib/actions/clientes';
import type { Cliente } from '@/types/db';

export function ClientesClient({
  initial,
  loadError,
}: {
  initial: Cliente[];
  loadError: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);

  const columns: Column<Cliente>[] = [
    {
      key: 'nome_completo',
      header: 'Nome',
      cell: (r) => (
        <div>
          <div className="font-medium text-text">{r.nome_completo}</div>
          {r.profissao && (
            <div className="text-xs text-text-dim">{r.profissao}</div>
          )}
        </div>
      ),
      sortAccessor: (r) => r.nome_completo.toLowerCase(),
      searchAccessor: (r) =>
        `${r.nome_completo} ${r.cpf_cnpj ?? ''} ${r.email ?? ''} ${r.telefone ?? ''}`,
    },
    {
      key: 'tipo',
      header: 'Tipo',
      cell: (r) => r.tipo_pessoa ?? '—',
      searchAccessor: (r) => r.tipo_pessoa ?? '',
    },
    {
      key: 'cpf_cnpj',
      header: 'CPF/CNPJ',
      cell: (r) => r.cpf_cnpj ?? '—',
      searchAccessor: (r) => r.cpf_cnpj ?? '',
    },
    {
      key: 'origem_lead',
      header: 'Origem',
      cell: (r) => r.origem_lead ?? '—',
      searchAccessor: (r) => r.origem_lead ?? '',
    },
    {
      key: 'classificacao',
      header: 'Classificação',
      cell: (r) => r.classificacao?.replaceAll('_', ' ') ?? '—',
      searchAccessor: (r) => r.classificacao ?? '',
    },
    {
      key: 'ativo',
      header: 'Status',
      cell: (r) => (
        <span
          className={
            'rounded px-2 py-0.5 text-xs ' +
            (r.ativo ? 'bg-success/20 text-success' : 'bg-bg-3 text-text-dim')
          }
        >
          {r.ativo ? 'Ativo' : 'Inativo'}
        </span>
      ),
      sortAccessor: (r) => (r.ativo ? 1 : 0),
    },
  ];

  const onDelete = (c: Cliente) => {
    if (!confirm(`Excluir "${c.nome_completo}"?`)) return;
    startTransition(async () => {
      const res = await deleteCliente(c.id);
      if (!res.ok) {
        toast({ kind: 'error', text: res.error });
        return;
      }
      toast({ kind: 'success', text: 'Cliente excluído.' });
      router.refresh();
    });
  };

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Compradores de unidades, investidores e leads."
        actions={
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            + Novo cliente
          </button>
        }
      />
      {loadError && (
        <div className="mb-4 rounded border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
          {loadError}
        </div>
      )}
      <DataTable
        rows={initial}
        columns={[
          ...columns,
          {
            key: 'acoes',
            header: '',
            cell: (r) => (
              <div className="flex justify-end gap-2 text-xs">
                <button
                  className="text-info hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing(r);
                    setOpen(true);
                  }}
                >
                  Editar
                </button>
                <button
                  disabled={isPending}
                  className="text-danger hover:underline disabled:opacity-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(r);
                  }}
                >
                  Excluir
                </button>
              </div>
            ),
            className: 'text-right w-32',
          },
        ]}
        emptyText="Nenhum cliente cadastrado."
        searchPlaceholder="Buscar por nome, CPF/CNPJ, e-mail…"
      />
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Editar cliente' : 'Novo cliente'}
        size="lg"
      >
        <ClienteForm
          cliente={editing}
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

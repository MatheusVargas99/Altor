'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toaster';
import { EmpresaForm } from './EmpresaForm';
import { deleteEmpresa } from '@/lib/actions/empresas';
import type { Empresa } from '@/types/db';

export function EmpresasClient({
  initial,
  loadError,
}: {
  initial: Empresa[];
  loadError: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Empresa | null>(null);

  const columns: Column<Empresa>[] = [
    {
      key: 'razao_social',
      header: 'Razão social',
      cell: (r) => (
        <div>
          <div className="font-medium text-text">{r.razao_social}</div>
          {r.nome_fantasia && (
            <div className="text-xs text-text-dim">{r.nome_fantasia}</div>
          )}
        </div>
      ),
      sortAccessor: (r) => r.razao_social.toLowerCase(),
      searchAccessor: (r) => `${r.razao_social} ${r.nome_fantasia ?? ''} ${r.cnpj ?? ''}`,
    },
    {
      key: 'categoria',
      header: 'Categoria',
      cell: (r) => (
        <span className="text-text-dim">{r.categoria ?? '—'}</span>
      ),
      sortAccessor: (r) => r.categoria ?? '',
      searchAccessor: (r) => r.categoria ?? '',
    },
    {
      key: 'cnpj',
      header: 'CNPJ',
      cell: (r) => r.cnpj ?? '—',
      searchAccessor: (r) => r.cnpj ?? '',
    },
    {
      key: 'cidade',
      header: 'Cidade/UF',
      cell: (r) => [r.cidade, r.uf].filter(Boolean).join(' / ') || '—',
      searchAccessor: (r) => `${r.cidade ?? ''} ${r.uf ?? ''}`,
    },
    {
      key: 'ativo',
      header: 'Status',
      cell: (r) => (
        <span
          className={
            'rounded px-2 py-0.5 text-xs ' +
            (r.ativo
              ? 'bg-success/20 text-success'
              : 'bg-bg-3 text-text-dim')
          }
        >
          {r.ativo ? 'Ativo' : 'Inativo'}
        </span>
      ),
      sortAccessor: (r) => (r.ativo ? 1 : 0),
    },
  ];

  const onDelete = (e: Empresa) => {
    if (!confirm(`Excluir "${e.razao_social}"? Esta ação não pode ser desfeita.`)) return;
    startTransition(async () => {
      const res = await deleteEmpresa(e.id);
      if (!res.ok) {
        toast({ kind: 'error', text: res.error });
        return;
      }
      toast({ kind: 'success', text: 'Empresa excluída.' });
      router.refresh();
    });
  };

  return (
    <>
      <PageHeader
        title="Empresas"
        description="Fornecedores, empreiteiras, projetistas e parceiros."
        actions={
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            + Nova empresa
          </button>
        }
      />

      {loadError && (
        <div className="mb-4 rounded border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
          Falha ao carregar: {loadError}
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
        emptyText="Nenhuma empresa cadastrada."
        searchPlaceholder="Buscar por razão social, fantasia ou CNPJ…"
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Editar empresa' : 'Nova empresa'}
        size="lg"
      >
        <EmpresaForm
          empresa={editing}
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

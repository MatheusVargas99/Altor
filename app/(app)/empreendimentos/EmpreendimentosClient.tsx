'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toaster';
import { EmpreendimentoForm } from './EmpreendimentoForm';
import { deleteEmpreendimento } from '@/lib/actions/empreendimentos';
import { fmtBRL, fmtDate } from '@/lib/utils';
import type { Empreendimento } from '@/types/db';

export function EmpreendimentosClient({
  initial,
  loadError,
}: {
  initial: Empreendimento[];
  loadError: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Empreendimento | null>(null);

  const statusColor = (s: string) =>
    s === 'EM_OBRA'
      ? 'bg-info/20 text-info'
      : s === 'ENTREGUE'
        ? 'bg-success/20 text-success'
        : s === 'PAUSADO'
          ? 'bg-warn/20 text-warn'
          : s === 'CANCELADO'
            ? 'bg-danger/20 text-danger'
            : 'bg-bg-3 text-text-dim';

  const columns: Column<Empreendimento>[] = [
    {
      key: 'nome',
      header: 'Nome',
      cell: (r) => (
        <Link
          href={`/empreendimentos/${r.id}`}
          className="font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {r.nome}
          {r.codigo_curto && (
            <span className="ml-2 text-xs text-text-dim">({r.codigo_curto})</span>
          )}
        </Link>
      ),
      sortAccessor: (r) => r.nome.toLowerCase(),
      searchAccessor: (r) => `${r.nome} ${r.codigo_curto ?? ''} ${r.cidade ?? ''}`,
    },
    {
      key: 'cidade',
      header: 'Cidade/UF',
      cell: (r) => [r.cidade, r.uf].filter(Boolean).join(' / ') || '—',
      searchAccessor: (r) => `${r.cidade ?? ''} ${r.uf ?? ''}`,
    },
    {
      key: 'n_unidades',
      header: 'Unidades',
      cell: (r) => r.n_unidades ?? '—',
      sortAccessor: (r) => r.n_unidades ?? -1,
    },
    {
      key: 'vgv',
      header: 'VGV estimado',
      cell: (r) => fmtBRL(r.vgv_estimado),
      sortAccessor: (r) => r.vgv_estimado ?? 0,
    },
    {
      key: 'entrega',
      header: 'Entrega prev.',
      cell: (r) => fmtDate(r.data_entrega_prevista) || '—',
      sortAccessor: (r) => r.data_entrega_prevista ?? '',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => (
        <span className={`rounded px-2 py-0.5 text-xs ${statusColor(r.status)}`}>
          {r.status.replaceAll('_', ' ')}
        </span>
      ),
      sortAccessor: (r) => r.status,
      searchAccessor: (r) => r.status,
    },
  ];

  const onDelete = (r: Empreendimento) => {
    if (!confirm(`Excluir "${r.nome}"?`)) return;
    startTransition(async () => {
      const res = await deleteEmpreendimento(r.id);
      if (!res.ok) {
        toast({ kind: 'error', text: res.error });
        return;
      }
      toast({ kind: 'success', text: 'Empreendimento excluído.' });
      router.refresh();
    });
  };

  return (
    <>
      <PageHeader
        title="Empreendimentos"
        description="Obras em planejamento, em andamento e entregues. Cria EAP padrão automaticamente."
        actions={
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            + Novo empreendimento
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
        emptyText="Nenhum empreendimento cadastrado."
        searchPlaceholder="Buscar por nome, código, cidade…"
      />
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Editar empreendimento' : 'Novo empreendimento'}
        size="lg"
      >
        <EmpreendimentoForm
          empreendimento={editing}
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

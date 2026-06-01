'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toaster';
import { MedicaoForm } from './MedicaoForm';
import { aprovarMedicao, deleteMedicao } from '@/lib/actions/medicoes';
import { fmtBRL, fmtDate } from '@/lib/utils';
import type {
  Empreendimento,
  Empresa,
  Medicao,
  MedicaoStatus,
} from '@/types/db';

const statusColor = (s: MedicaoStatus) =>
  s === 'PAGA'
    ? 'bg-success/20 text-success'
    : s === 'APROVADA'
      ? 'bg-info/20 text-info'
      : s === 'MEDIDA'
        ? 'bg-warn/20 text-warn'
        : s === 'CANCELADA'
          ? 'bg-danger/20 text-danger'
          : 'bg-bg-3 text-text-dim';

export function MedicoesClient({
  initial,
  empreendimentos,
  empresas,
  loadError,
}: {
  initial: Medicao[];
  empreendimentos: Pick<Empreendimento, 'id' | 'nome' | 'codigo_curto'>[];
  empresas: Pick<Empresa, 'id' | 'razao_social' | 'nome_fantasia'>[];
  loadError: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Medicao | null>(null);
  const [filterStatus, setFilterStatus] = useState<MedicaoStatus | 'TODAS'>('TODAS');
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
      if (filterStatus !== 'TODAS' && r.status !== filterStatus) return false;
      if (filterObra && r.empreendimento_id !== filterObra) return false;
      return true;
    });
  }, [initial, filterStatus, filterObra]);

  const totals = useMemo(() => {
    let orcado = 0,
      medido = 0,
      pago = 0;
    for (const r of filtered) {
      orcado += Number(r.valor_orcado) || 0;
      if (r.status !== 'CANCELADA') medido += Number(r.valor_medicao) || 0;
      if (r.status === 'PAGA') pago += Number(r.valor_medicao) || 0;
    }
    return { orcado, medido, pago };
  }, [filtered]);

  const columns: Column<Medicao>[] = [
    {
      key: 'data',
      header: 'Data',
      cell: (r) => fmtDate(r.data_medicao),
      sortAccessor: (r) => r.data_medicao ?? '',
    },
    {
      key: 'desc',
      header: 'Descrição',
      cell: (r) => (
        <div>
          <div className="text-text">{r.descricao}</div>
          {r.numero_medicao && (
            <div className="text-xs text-text-dim">{r.numero_medicao}</div>
          )}
        </div>
      ),
      searchAccessor: (r) => `${r.descricao} ${r.numero_medicao ?? ''}`,
    },
    {
      key: 'obra',
      header: 'Empreendimento',
      cell: (r) => empreendNomes[r.empreendimento_id] ?? '—',
    },
    {
      key: 'empresa',
      header: 'Empresa',
      cell: (r) => empresaNomes[r.empresa_id] ?? '—',
    },
    {
      key: 'orcado',
      header: 'Orçado',
      cell: (r) => fmtBRL(Number(r.valor_orcado)),
      className: 'text-right',
      sortAccessor: (r) => Number(r.valor_orcado),
    },
    {
      key: 'medido',
      header: 'Medido',
      cell: (r) => fmtBRL(Number(r.valor_medicao)),
      className: 'text-right',
      sortAccessor: (r) => Number(r.valor_medicao),
    },
    {
      key: 'pct',
      header: '%',
      cell: (r) => `${Number(r.percentual_medicao).toFixed(0)}%`,
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
    },
  ];

  const onDelete = (r: Medicao) => {
    if (!confirm(`Excluir medição "${r.descricao}"?`)) return;
    startTransition(async () => {
      const res = await deleteMedicao(r.id);
      if (!res.ok) return toast({ kind: 'error', text: res.error });
      toast({ kind: 'success', text: 'Medição excluída.' });
      router.refresh();
    });
  };

  const onAprovar = (r: Medicao) => {
    if (!confirm('Aprovar e gerar Conta a Pagar correspondente?')) return;
    startTransition(async () => {
      const res = await aprovarMedicao(r.id);
      if (!res.ok) return toast({ kind: 'error', text: res.error });
      toast({ kind: 'success', text: 'Medição aprovada. Conta a Pagar criada.' });
      router.refresh();
    });
  };

  return (
    <>
      <PageHeader
        title="Medições"
        description="Medições de empreiteiros. Aprovar gera Conta a Pagar."
        actions={
          <button
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            + Nova medição
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
          <div className="text-xs uppercase text-text-dim">Orçado total</div>
          <div className="text-xl font-semibold text-text mt-1">
            {fmtBRL(totals.orcado)}
          </div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-text-dim">Medido</div>
          <div className="text-xl font-semibold text-info mt-1">{fmtBRL(totals.medido)}</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-text-dim">Pago</div>
          <div className="text-xl font-semibold text-success mt-1">
            {fmtBRL(totals.pago)}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <select
          className="input max-w-xs"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as MedicaoStatus | 'TODAS')}
        >
          <option value="TODAS">Todas</option>
          <option value="PREVISTA">Prevista</option>
          <option value="MEDIDA">Medida</option>
          <option value="APROVADA">Aprovada</option>
          <option value="PAGA">Paga</option>
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
                {(r.status === 'MEDIDA' || r.status === 'PREVISTA') && (
                  <button
                    className="text-info hover:underline"
                    onClick={() => onAprovar(r)}
                  >
                    Aprovar
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
        emptyText="Nenhuma medição."
        searchPlaceholder="Buscar por descrição, nº…"
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Editar medição' : 'Nova medição'}
        size="lg"
      >
        <MedicaoForm
          medicao={editing}
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

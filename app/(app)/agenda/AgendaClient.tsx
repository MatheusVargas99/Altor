'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toaster';
import {
  atualizarStatusCR,
  atualizarStatusCP,
  atualizarStatusComissao,
  atualizarStatusContrato,
} from '@/lib/actions/agenda';
import { fmtBRL, fmtDate } from '@/lib/utils';
import type {
  CrStatus,
  CpStatus,
  ComissaoStatus,
  ContratoStatus,
  Empreendimento,
} from '@/types/db';

type ItemType = 'CR' | 'CP' | 'COMISSAO' | 'CONTRATO';

type AgendaItem = {
  id: string;
  tipo: ItemType;
  descricao: string;
  valor: number;
  data: string | null;
  status: string;
  empreendimento_id: string | null;
  extra?: string | null;
};

const CR_STATUSES: CrStatus[] = ['ABERTO', 'PARCIAL', 'PAGO', 'ATRASADO', 'CANCELADO'];
const CP_STATUSES: CpStatus[] = ['ABERTO', 'PARCIAL', 'PAGO', 'ATRASADO', 'CANCELADO'];
const COMISSAO_STATUSES: ComissaoStatus[] = ['PREVISTA', 'A_PAGAR', 'PAGA', 'RETIDA', 'CANCELADA'];
const CONTRATO_STATUSES: ContratoStatus[] = [
  'EM_ELABORACAO',
  'ATIVO',
  'DISTRATADO',
  'ENCERRADO',
  'INADIMPLENTE',
];

const tipoLabel: Record<ItemType, string> = {
  CR: 'A Receber',
  CP: 'A Pagar',
  COMISSAO: 'Comissão',
  CONTRATO: 'Contrato',
};

const tipoBadge: Record<ItemType, string> = {
  CR: 'bg-success/20 text-success',
  CP: 'bg-danger/20 text-danger',
  COMISSAO: 'bg-info/20 text-info',
  CONTRATO: 'bg-warn/20 text-warn',
};

const statusBadge = (s: string) => {
  if (s === 'PAGO' || s === 'PAGA') return 'bg-success/20 text-success';
  if (s === 'ATRASADO') return 'bg-danger/20 text-danger';
  if (s === 'CANCELADO' || s === 'CANCELADA') return 'bg-bg-3 text-text-dim';
  if (s === 'ATIVO') return 'bg-success/20 text-success';
  if (s === 'INADIMPLENTE') return 'bg-danger/20 text-danger';
  return 'bg-warn/20 text-warn';
};

type Periodo = 'HOJE' | '7D' | '30D' | 'ATRASADOS' | 'TODOS';

export function AgendaClient({
  obras,
  crRows,
  cpRows,
  comissoesRows,
  contratosRows,
}: {
  obras: Pick<Empreendimento, 'id' | 'nome' | 'codigo_curto'>[];
  crRows: {
    id: string;
    descricao: string;
    valor_original: number;
    valor_aberto: number;
    data_vencimento: string;
    status: string;
    empreendimento_id: string | null;
    numero_parcela: string | null;
  }[];
  cpRows: {
    id: string;
    descricao: string;
    valor_original: number;
    valor_aberto: number;
    data_vencimento: string;
    status: string;
    empreendimento_id: string | null;
  }[];
  comissoesRows: {
    id: string;
    beneficiario_nome: string;
    valor_parcela: number;
    data_prevista: string | null;
    status: string;
    empreendimento_id: string | null;
    parcela: string | null;
  }[];
  contratosRows: {
    id: string;
    numero: string;
    parte_nome: string;
    valor_total: number | null;
    data_vigencia_fim: string | null;
    status: string;
    empreendimento_id: string | null;
    tipo: string | null;
  }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [filterPeriodo, setFilterPeriodo] = useState<Periodo>('30D');
  const [filterTipo, setFilterTipo] = useState<ItemType | 'TODOS'>('TODOS');
  const [filterObra, setFilterObra] = useState('');
  const [statusModal, setStatusModal] = useState<AgendaItem | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [dataPagamento, setDataPagamento] = useState('');

  const hojeStr = new Date().toISOString().slice(0, 10);
  const em7 = new Date();
  em7.setDate(em7.getDate() + 7);
  const em7Str = em7.toISOString().slice(0, 10);
  const em30 = new Date();
  em30.setDate(em30.getDate() + 30);
  const em30Str = em30.toISOString().slice(0, 10);

  const allItems = useMemo<AgendaItem[]>(() => {
    const items: AgendaItem[] = [];
    for (const r of crRows) {
      items.push({
        id: r.id,
        tipo: 'CR',
        descricao: r.descricao + (r.numero_parcela ? ` (${r.numero_parcela})` : ''),
        valor: Number(r.valor_aberto) || Number(r.valor_original),
        data: r.data_vencimento,
        status: r.status,
        empreendimento_id: r.empreendimento_id,
      });
    }
    for (const r of cpRows) {
      items.push({
        id: r.id,
        tipo: 'CP',
        descricao: r.descricao,
        valor: Number(r.valor_aberto) || Number(r.valor_original),
        data: r.data_vencimento,
        status: r.status,
        empreendimento_id: r.empreendimento_id,
      });
    }
    for (const r of comissoesRows) {
      items.push({
        id: r.id,
        tipo: 'COMISSAO',
        descricao:
          `Comissão: ${r.beneficiario_nome}` + (r.parcela ? ` (${r.parcela})` : ''),
        valor: Number(r.valor_parcela),
        data: r.data_prevista,
        status: r.status,
        empreendimento_id: r.empreendimento_id,
      });
    }
    for (const r of contratosRows) {
      items.push({
        id: r.id,
        tipo: 'CONTRATO',
        descricao: `Contrato ${r.numero} — ${r.parte_nome}`,
        valor: Number(r.valor_total) || 0,
        data: r.data_vigencia_fim,
        status: r.status,
        empreendimento_id: r.empreendimento_id,
      });
    }
    return items;
  }, [crRows, cpRows, comissoesRows, contratosRows]);

  const filtered = useMemo(() => {
    return allItems.filter((item) => {
      if (filterTipo !== 'TODOS' && item.tipo !== filterTipo) return false;
      if (filterObra && item.empreendimento_id !== filterObra) return false;
      if (filterPeriodo === 'HOJE') {
        if (!item.data || item.data !== hojeStr) return false;
      } else if (filterPeriodo === '7D') {
        if (!item.data || item.data < hojeStr || item.data > em7Str) return false;
      } else if (filterPeriodo === '30D') {
        if (!item.data || item.data < hojeStr || item.data > em30Str) return false;
      } else if (filterPeriodo === 'ATRASADOS') {
        if (!item.data || item.data >= hojeStr) return false;
        if (
          item.status === 'PAGO' ||
          item.status === 'PAGA' ||
          item.status === 'CANCELADO' ||
          item.status === 'CANCELADA'
        )
          return false;
      }
      return true;
    });
  }, [allItems, filterTipo, filterObra, filterPeriodo, hojeStr, em7Str, em30Str]);

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();
    const noDate: AgendaItem[] = [];
    for (const item of filtered) {
      if (!item.data) {
        noDate.push(item);
        continue;
      }
      if (!map.has(item.data)) map.set(item.data, []);
      map.get(item.data)!.push(item);
    }
    const sorted = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    if (noDate.length > 0) sorted.push(['—', noDate]);
    return sorted;
  }, [filtered]);

  const obraNomes = useMemo(
    () => Object.fromEntries(obras.map((e) => [e.id, e.codigo_curto ?? e.nome])),
    [obras],
  );

  const openStatusModal = (item: AgendaItem) => {
    setStatusModal(item);
    setNewStatus(item.status);
    setDataPagamento(new Date().toISOString().slice(0, 10));
  };

  const onSaveStatus = () => {
    if (!statusModal) return;
    startTransition(async () => {
      let res: { ok: boolean; error?: string };
      if (statusModal.tipo === 'CR') {
        res = await atualizarStatusCR(
          statusModal.id,
          newStatus as CrStatus,
          dataPagamento || undefined,
        );
      } else if (statusModal.tipo === 'CP') {
        res = await atualizarStatusCP(
          statusModal.id,
          newStatus as CpStatus,
          dataPagamento || undefined,
        );
      } else if (statusModal.tipo === 'COMISSAO') {
        res = await atualizarStatusComissao(statusModal.id, newStatus as ComissaoStatus);
      } else {
        res = await atualizarStatusContrato(statusModal.id, newStatus as ContratoStatus);
      }
      if (!res.ok) return toast({ kind: 'error', text: (res as { ok: false; error: string }).error ?? 'Erro' });
      toast({ kind: 'success', text: 'Status atualizado.' });
      setStatusModal(null);
      router.refresh();
    });
  };

  const statusOptions = useMemo(() => {
    if (!statusModal) return [];
    if (statusModal.tipo === 'CR') return CR_STATUSES;
    if (statusModal.tipo === 'CP') return CP_STATUSES;
    if (statusModal.tipo === 'COMISSAO') return COMISSAO_STATUSES;
    return CONTRATO_STATUSES;
  }, [statusModal]);

  const totalPendente = filtered
    .filter(
      (i) =>
        !['PAGO', 'PAGA', 'CANCELADO', 'CANCELADA', 'ENCERRADO', 'DISTRATADO'].includes(
          i.status,
        ),
    )
    .reduce((s, i) => s + i.valor, 0);

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-2">
        {(['HOJE', '7D', '30D', 'ATRASADOS', 'TODOS'] as Periodo[]).map((p) => (
          <button
            key={p}
            onClick={() => setFilterPeriodo(p)}
            className={`rounded px-3 py-1 text-sm border ${
              filterPeriodo === p
                ? 'border-primary text-primary bg-primary/10'
                : 'border-border text-text-dim hover:border-primary/50'
            }`}
          >
            {p === 'HOJE'
              ? 'Hoje'
              : p === '7D'
                ? 'Próximos 7d'
                : p === '30D'
                  ? 'Próximos 30d'
                  : p === 'ATRASADOS'
                    ? 'Atrasados'
                    : 'Todos'}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          className="input max-w-xs"
          value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value as ItemType | 'TODOS')}
        >
          <option value="TODOS">Todos os tipos</option>
          <option value="CR">A Receber</option>
          <option value="CP">A Pagar</option>
          <option value="COMISSAO">Comissões</option>
          <option value="CONTRATO">Contratos</option>
        </select>
        <select
          className="input max-w-xs"
          value={filterObra}
          onChange={(e) => setFilterObra(e.target.value)}
        >
          <option value="">Todas obras</option>
          {obras.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nome}
            </option>
          ))}
        </select>
        <div className="flex-1 flex items-center justify-end">
          <span className="text-xs text-text-dim">
            {filtered.length} item(s) · Pendente:{' '}
            <strong className="text-warn">{fmtBRL(totalPendente)}</strong>
          </span>
        </div>
      </div>

      {grouped.length === 0 && (
        <div className="card text-center text-text-dim py-12">
          Nenhum item para o período/filtro selecionado.
        </div>
      )}

      <div className="space-y-4">
        {grouped.map(([date, items]) => (
          <div key={date}>
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  date < hojeStr
                    ? 'bg-danger/20 text-danger'
                    : date === hojeStr
                      ? 'bg-primary/20 text-primary'
                      : 'bg-bg-3 text-text-dim'
                }`}
              >
                {date === '—' ? 'Sem data' : fmtDate(date)}
                {date < hojeStr && date !== '—' ? ' — ATRASADO' : ''}
                {date === hojeStr ? ' — HOJE' : ''}
              </div>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="card flex flex-wrap items-center justify-between gap-2 py-2 px-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`text-xs rounded px-2 py-0.5 whitespace-nowrap ${tipoBadge[item.tipo]}`}
                    >
                      {tipoLabel[item.tipo]}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm text-text truncate">{item.descricao}</div>
                      {item.empreendimento_id && (
                        <div className="text-xs text-text-dim">
                          {obraNomes[item.empreendimento_id] ?? ''}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-medium text-text">
                      {fmtBRL(item.valor)}
                    </span>
                    <span className={`text-xs rounded px-2 py-0.5 ${statusBadge(item.status)}`}>
                      {item.status.replaceAll('_', ' ')}
                    </span>
                    <button
                      className="text-xs text-info hover:underline whitespace-nowrap"
                      disabled={isPending}
                      onClick={() => openStatusModal(item)}
                    >
                      Alterar status
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={!!statusModal}
        onClose={() => setStatusModal(null)}
        title={`Alterar status — ${statusModal ? tipoLabel[statusModal.tipo] : ''}`}
        size="sm"
      >
        <div className="space-y-4">
          {statusModal && (
            <div className="text-sm text-text-dim">
              <strong className="text-text">{statusModal.descricao}</strong>
              <div className="mt-0.5">
                {fmtBRL(statusModal.valor)} · venc. {fmtDate(statusModal.data)}
              </div>
            </div>
          )}
          <div>
            <label className="label">Novo status</label>
            <select
              className="input"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          {(statusModal?.tipo === 'CR' || statusModal?.tipo === 'CP') &&
            newStatus === 'PAGO' && (
              <div>
                <label className="label">Data de pagamento</label>
                <input
                  type="date"
                  className="input"
                  value={dataPagamento}
                  onChange={(e) => setDataPagamento(e.target.value)}
                />
              </div>
            )}
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
              disabled={isPending || newStatus === statusModal?.status}
              onClick={onSaveStatus}
            >
              Salvar
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

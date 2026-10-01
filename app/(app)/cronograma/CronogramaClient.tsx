'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toaster';
import { inicializarEAP, updateCronogramaEtapa } from '@/lib/actions/cronograma';
import { fmtBRL, fmtDate } from '@/lib/utils';
import type { CronogramaStatus } from '@/types/db';

type Row = {
  id: string;
  etapa: string;
  marco: string;
  descricao: string | null;
  ordem: number;
  data_inicio_prevista: string | null;
  data_fim_prevista: string | null;
  custo_orcado: number;
  custo_comprometido: number;
  custo_pago: number;
  percentual_fisico: number;
  peso: number;
  status: string;
};

const STATUS_OPTIONS: { value: CronogramaStatus; label: string }[] = [
  { value: 'NAO_INICIADA',  label: 'Não iniciada' },
  { value: 'EM_ANDAMENTO',  label: 'Em andamento' },
  { value: 'CONCLUIDA',     label: 'Concluída'    },
  { value: 'ATRASADA',      label: 'Atrasada'     },
  { value: 'PAUSADA',       label: 'Pausada'      },
];

const statusColor = (s: string) =>
  s === 'CONCLUIDA'    ? 'bg-success/20 text-success' :
  s === 'EM_ANDAMENTO' ? 'bg-info/20 text-info'       :
  s === 'ATRASADA'     ? 'bg-danger/20 text-danger'   :
  s === 'PAUSADA'      ? 'bg-warn/20 text-warn'       :
                         'bg-bg-3 text-text-dim';

export function CronogramaClient({
  rows,
  empreendimentoId,
}: {
  rows: Row[];
  empreendimentoId: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState({
    custo_orcado: 0,
    data_inicio_prevista: '',
    data_fim_prevista: '',
  });

  // Local overrides for optimistic UI on inline edits
  const [localStatus, setLocalStatus] = useState<Record<string, CronogramaStatus>>({});
  const [localPct, setLocalPct] = useState<Record<string, number>>({});

  const getStatus = (r: Row) => localStatus[r.id] ?? (r.status as CronogramaStatus);
  const getPct    = (r: Row) => localPct[r.id]    ?? Number(r.percentual_fisico);

  const saveField = (id: string, fields: Parameters<typeof updateCronogramaEtapa>[1]) => {
    setSavingId(id);
    startTransition(async () => {
      const res = await updateCronogramaEtapa(id, fields);
      setSavingId(null);
      if (!res.ok) {
        toast({ kind: 'error', text: res.error });
        // revert optimistic update
        setLocalStatus((p) => { const n = { ...p }; delete n[id]; return n; });
        setLocalPct((p)    => { const n = { ...p }; delete n[id]; return n; });
      } else {
        router.refresh();
      }
    });
  };

  const onStatusChange = (r: Row, val: CronogramaStatus) => {
    setLocalStatus((p) => ({ ...p, [r.id]: val }));
    saveField(r.id, { status: val });
  };

  const onPctBlur = (r: Row, val: number) => {
    const clamped = Math.min(100, Math.max(0, val));
    setLocalPct((p) => ({ ...p, [r.id]: clamped }));
    saveField(r.id, { percentual_fisico: clamped });
  };

  const openEdit = (r: Row) => {
    setEditing(r);
    setForm({
      custo_orcado: Number(r.custo_orcado) || 0,
      data_inicio_prevista: r.data_inicio_prevista ?? '',
      data_fim_prevista: r.data_fim_prevista ?? '',
    });
  };

  const onSave = () => {
    if (!editing) return;
    startTransition(async () => {
      const res = await updateCronogramaEtapa(editing.id, {
        custo_orcado: form.custo_orcado,
        data_inicio_prevista: form.data_inicio_prevista || null,
        data_fim_prevista: form.data_fim_prevista || null,
      });
      if (!res.ok) return toast({ kind: 'error', text: res.error });
      toast({ kind: 'success', text: 'Etapa atualizada.' });
      setEditing(null);
      router.refresh();
    });
  };

  const onInicializar = () => {
    if (!empreendimentoId) return;
    startTransition(async () => {
      const res = await inicializarEAP(empreendimentoId);
      if (!res.ok) return toast({ kind: 'error', text: res.error });
      toast({ kind: 'success', text: 'EAP inicializada com 14 etapas.' });
      router.refresh();
    });
  };

  const calc = (r: Row) => {
    const orcado       = Number(r.custo_orcado)       || 0;
    const comprometido = Number(r.custo_comprometido) || 0;
    const pago         = Number(r.custo_pago)         || 0;
    const pctGasto     = orcado > 0 ? (comprometido / orcado) * 100 : 0;
    const saldo        = orcado - comprometido;
    const pctColor     = pctGasto > 100 ? 'text-danger font-bold' : pctGasto >= 90 ? 'text-warn' : 'text-success';
    const pctGastoTxt  = orcado > 0 ? (pctGasto > 100 ? '+' : '') + pctGasto.toFixed(0) + '%' : '—';
    return { orcado, comprometido, pago, saldo, pctColor, pctGastoTxt };
  };

  const vazio = (
    <div className="px-3 py-8 text-center text-sm">
      {empreendimentoId ? (
        <div className="space-y-2">
          <div className="text-text-dim">Nenhuma etapa encontrada para este empreendimento.</div>
          <button
            className="btn-primary w-full text-xs sm:w-auto"
            disabled={isPending}
            onClick={onInicializar}
          >
            Inicializar EAP padrão (14 etapas)
          </button>
        </div>
      ) : (
        <span className="text-text-dim">Selecione um empreendimento.</span>
      )}
    </div>
  );

  return (
    <>
      {/* Celular: um cartão por etapa, com controles grandes para o dedo */}
      <div className="space-y-3 md:hidden">
        {rows.length === 0 && (
          <div className="rounded-lg border border-border">{vazio}</div>
        )}
        {rows.map((r) => {
          const { orcado, comprometido, pago, saldo, pctColor, pctGastoTxt } = calc(r);
          const status   = getStatus(r);
          const pct      = getPct(r);
          const isSaving = savingId === r.id;
          const nomeEtapa = r.etapa.replaceAll('_', ' ');

          return (
            <div
              key={r.id}
              className={`rounded-lg border border-border bg-bg-2 p-3 text-sm transition-opacity ${isSaving ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-primary">{r.marco}</div>
                  <div className="break-words text-xs text-text-dim">{nomeEtapa}</div>
                </div>
                <div className="shrink-0 text-right text-xs text-text-dim">
                  Peso {(Number(r.peso) * 100).toFixed(1)}%
                </div>
              </div>

              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-xs text-text-dim">
                  <span>% Físico</span>
                  <span className="font-medium text-text">{pct.toFixed(0)}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-bg-3">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={`Diminuir 5% em ${nomeEtapa}`}
                    disabled={isSaving || pct <= 0}
                    onClick={() => onPctBlur(r, pct - 5)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border text-lg text-text active:bg-bg-3 disabled:opacity-40"
                  >
                    −
                  </button>
                  <div className="relative min-w-0 flex-1">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={100}
                      step={5}
                      defaultValue={pct}
                      key={pct}
                      aria-label={`% físico de ${nomeEtapa}`}
                      onBlur={(e) => onPctBlur(r, Number(e.target.value))}
                      className="input pr-8 text-right"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-text-dim">%</span>
                  </div>
                  <button
                    type="button"
                    aria-label={`Aumentar 5% em ${nomeEtapa}`}
                    disabled={isSaving || pct >= 100}
                    onClick={() => onPctBlur(r, pct + 5)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border text-lg text-text active:bg-bg-3 disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <label className="mb-1 block text-xs text-text-dim">Status</label>
                <select
                  value={status}
                  onChange={(e) => onStatusChange(r, e.target.value as CronogramaStatus)}
                  disabled={isSaving}
                  className={`min-h-[44px] w-full rounded-md border-0 px-3 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary ${statusColor(status)}`}
                  style={{ appearance: 'auto' }}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border pt-3 text-xs">
                <div>
                  <dt className="text-text-dim">Início prev.</dt>
                  <dd>{fmtDate(r.data_inicio_prevista) || '—'}</dd>
                </div>
                <div>
                  <dt className="text-text-dim">Fim prev.</dt>
                  <dd>{fmtDate(r.data_fim_prevista) || '—'}</dd>
                </div>
                <div>
                  <dt className="text-text-dim">Orçado</dt>
                  <dd className="break-words">{fmtBRL(orcado)}</dd>
                </div>
                <div>
                  <dt className="text-text-dim">Comprometido</dt>
                  <dd className="break-words">{fmtBRL(comprometido)}</dd>
                </div>
                <div>
                  <dt className="text-text-dim">Pago</dt>
                  <dd className="break-words">{fmtBRL(pago)}</dd>
                </div>
                <div>
                  <dt className="text-text-dim">% Gasto</dt>
                  <dd className={pctColor}>{pctGastoTxt}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-text-dim">Saldo</dt>
                  <dd className={`break-words ${saldo < 0 ? 'text-danger' : ''}`}>
                    {orcado > 0 ? fmtBRL(saldo) : '—'}
                  </dd>
                </div>
              </dl>

              <button
                type="button"
                className="btn-ghost mt-3 w-full"
                onClick={() => openEdit(r)}
              >
                Valores / Datas
              </button>
            </div>
          );
        })}
      </div>

      {/* Tablet/desktop: tabela; abaixo de lg rola para o lado com a etapa fixa */}
      <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
        <table className="w-full whitespace-nowrap text-sm">
          <thead className="bg-bg-3 text-text-dim">
            <tr>
              <th className="sticky left-0 z-10 bg-bg-3 px-3 py-2 text-left">Etapa</th>
              <th className="px-3 py-2 text-left">Marco</th>
              <th className="px-3 py-2 text-right w-14">Peso</th>
              <th className="px-3 py-2 w-36">% Físico</th>
              <th className="px-3 py-2 text-left w-44">Status</th>
              <th className="px-3 py-2 text-left">Início prev.</th>
              <th className="px-3 py-2 text-left">Fim prev.</th>
              <th className="px-3 py-2 text-right">Orçado</th>
              <th className="px-3 py-2 text-right">Compromet.</th>
              <th className="px-3 py-2 text-right">Pago</th>
              <th className="px-3 py-2 text-right">% Gasto</th>
              <th className="px-3 py-2 text-right">Saldo</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const { orcado, comprometido, pago, saldo, pctColor, pctGastoTxt } = calc(r);
              const status      = getStatus(r);
              const pct         = getPct(r);
              const isSaving    = savingId === r.id;

              return (
                <tr key={r.id} className={`border-t border-border transition-colors ${isSaving ? 'opacity-60' : 'hover:bg-bg-3/30'}`}>
                  {/* Etapa */}
                  <td className="sticky left-0 z-10 bg-bg px-3 py-2 text-xs">{r.etapa.replaceAll('_', ' ')}</td>

                  {/* Marco */}
                  <td className="px-3 py-2 font-semibold text-primary">{r.marco}</td>

                  {/* Peso */}
                  <td className="px-3 py-2 text-right text-xs text-text-dim">
                    {(Number(r.peso) * 100).toFixed(1)}%
                  </td>

                  {/* % Físico — inline input (16px em tablet para o iOS não dar zoom) */}
                  <td className="px-3 py-2">
                    <div className="flex min-w-[8rem] items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-bg-3 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={100}
                        step={5}
                        defaultValue={pct}
                        key={pct}
                        onBlur={(e) => onPctBlur(r, Number(e.target.value))}
                        className="w-16 rounded border border-border bg-bg-2 px-1.5 py-1.5 text-right text-base focus:outline-none focus:border-primary lg:w-14 lg:py-0.5 lg:text-xs"
                      />
                      <span className="text-xs text-text-dim">%</span>
                    </div>
                  </td>

                  {/* Status — inline select */}
                  <td className="px-3 py-2">
                    <select
                      value={status}
                      onChange={(e) => onStatusChange(r, e.target.value as CronogramaStatus)}
                      disabled={isSaving}
                      className={`rounded px-2 py-1.5 text-base font-medium border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary lg:py-1 lg:text-xs ${statusColor(status)}`}
                      style={{ appearance: 'auto' }}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </td>

                  {/* Datas */}
                  <td className="px-3 py-2 text-xs">{fmtDate(r.data_inicio_prevista) || '—'}</td>
                  <td className="px-3 py-2 text-xs">{fmtDate(r.data_fim_prevista) || '—'}</td>

                  {/* Financeiro */}
                  <td className="px-3 py-2 text-right text-xs">{fmtBRL(orcado)}</td>
                  <td className="px-3 py-2 text-right text-xs">{fmtBRL(comprometido)}</td>
                  <td className="px-3 py-2 text-right text-xs">{fmtBRL(pago)}</td>
                  <td className={`px-3 py-2 text-right text-xs ${pctColor}`}>
                    {pctGastoTxt}
                  </td>
                  <td className={`px-3 py-2 text-right text-xs ${saldo < 0 ? 'text-danger' : 'text-text-dim'}`}>
                    {orcado > 0 ? fmtBRL(saldo) : '—'}
                  </td>

                  {/* Ação */}
                  <td className="px-3 py-2 text-right">
                    <button
                      className="px-2 py-2 text-xs text-text-dim hover:text-info hover:underline whitespace-nowrap lg:p-0"
                      onClick={() => openEdit(r)}
                    >
                      Valores/Datas
                    </button>
                  </td>
                </tr>
              );
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={13}>{vazio}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Valores e Datas */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Valores e Datas — ${editing?.etapa?.replaceAll('_', ' ')}`}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Valor orçado (R$)</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              className="input"
              value={form.custo_orcado}
              onChange={(e) => setForm((f) => ({ ...f, custo_orcado: Number(e.target.value) }))}
            />
            <div className="text-xs text-text-dim mt-1">Valor planejado/orçado para esta etapa</div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Início previsto</label>
              <input
                type="date"
                className="input"
                value={form.data_inicio_prevista}
                onChange={(e) => setForm((f) => ({ ...f, data_inicio_prevista: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Fim previsto</label>
              <input
                type="date"
                className="input"
                value={form.data_fim_prevista}
                onChange={(e) => setForm((f) => ({ ...f, data_fim_prevista: e.target.value }))}
              />
            </div>
          </div>

          {editing && (
            <div className="rounded border border-border bg-bg-3 p-3 text-xs text-text-dim space-y-1">
              <div>Orçamentos aprovados (comprometido): <strong className="text-text">{fmtBRL(Number(editing.custo_comprometido))}</strong></div>
              <div>Pago até agora: <strong className="text-text">{fmtBRL(Number(editing.custo_pago))}</strong></div>
              {Number(editing.custo_orcado) > 0 && (
                <div className={Number(editing.custo_comprometido) > Number(editing.custo_orcado) ? 'text-danger' : 'text-success'}>
                  Saldo disponível: {fmtBRL(Number(editing.custo_orcado) - Number(editing.custo_comprometido))}
                  {Number(editing.custo_comprometido) > Number(editing.custo_orcado) && ' ⚠ ORÇAMENTO ESTOURADO'}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-ghost w-full sm:w-auto" onClick={() => setEditing(null)}>Cancelar</button>
            <button type="button" className="btn-primary w-full sm:w-auto" disabled={isPending} onClick={onSave}>Salvar</button>
          </div>
        </div>
      </Modal>
    </>
  );
}

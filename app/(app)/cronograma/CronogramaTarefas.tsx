'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toaster';
import { atualizarFisicoTarefa } from '@/lib/actions/cronograma';
import { fmtDate } from '@/lib/utils';
import type { EtapaEap } from '@/types/db';

export type Tarefa = {
  id: string;
  uid_msproject: string | null;
  ordem: number;
  wbs: string | null;
  nivel: number;
  resumo: boolean;
  marco: boolean;
  nome: string;
  data_inicio: string | null;
  data_fim: string | null;
  percentual_fisico: number;
  etapa: EtapaEap | null;
};

type Situacao = { label: string; barra: string; fundo: string; texto: string };

const SITUACOES = {
  concluida: { label: 'Concluída',    barra: 'bg-success',  fundo: 'bg-success/20', texto: 'text-success' },
  andamento: { label: 'Em andamento', barra: 'bg-info',     fundo: 'bg-info/20',    texto: 'text-info' },
  atrasada:  { label: 'Atrasada',     barra: 'bg-danger',   fundo: 'bg-danger/20',  texto: 'text-danger' },
  aguardando:{ label: 'Não iniciada', barra: 'bg-text-dim', fundo: 'bg-bg-3',       texto: 'text-text-dim' },
} satisfies Record<string, Situacao>;

function situacao(t: Tarefa, hoje: string): Situacao {
  const pct = Number(t.percentual_fisico);
  if (pct >= 100) return SITUACOES.concluida;
  if (t.data_fim && t.data_fim < hoje) return SITUACOES.atrasada;
  return pct > 0 ? SITUACOES.andamento : SITUACOES.aguardando;
}

const hojeISO = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

/** Tarefas visíveis, escondendo o que está dentro de um grupo recolhido. */
function useArvore(tarefas: Tarefa[]) {
  const [recolhidos, setRecolhidos] = useState<ReadonlySet<string>>(new Set());

  const visiveis = useMemo(() => {
    const lista: Tarefa[] = [];
    let nivelRecolhido: number | null = null;
    for (const t of tarefas) {
      if (nivelRecolhido !== null && t.nivel > nivelRecolhido) continue;
      nivelRecolhido = recolhidos.has(t.id) ? t.nivel : null;
      lista.push(t);
    }
    return lista;
  }, [tarefas, recolhidos]);

  const alternar = (id: string) =>
    setRecolhidos((atual) => {
      const novo = new Set(atual);
      if (!novo.delete(id)) novo.add(id);
      return novo;
    });

  // O grupo raiz fica aberto: recolhê-lo deixaria uma linha só na tela.
  const nivelRaiz = Math.min(...tarefas.map((t) => t.nivel));
  const recolherTudo = () =>
    setRecolhidos(new Set(tarefas.filter((t) => t.resumo && t.nivel > nivelRaiz).map((t) => t.id)));
  const expandirTudo = () => setRecolhidos(new Set());

  return { visiveis, recolhidos, alternar, recolherTudo, expandirTudo };
}

function BotoesArvore({ onRecolher, onExpandir }: { onRecolher: () => void; onExpandir: () => void }) {
  return (
    <div className="flex gap-3 text-xs text-text-dim">
      <button type="button" className="py-1 hover:text-primary" onClick={onExpandir}>Expandir tudo</button>
      <button type="button" className="py-1 hover:text-primary" onClick={onRecolher}>Recolher grupos</button>
    </div>
  );
}

function NomeTarefa({
  t,
  recolhido,
  onAlternar,
}: {
  t: Tarefa;
  recolhido: boolean;
  onAlternar: (id: string) => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1" style={{ paddingLeft: `${(t.nivel - 1) * 14}px` }}>
      {t.resumo ? (
        <button
          type="button"
          aria-label={`${recolhido ? 'Expandir' : 'Recolher'} ${t.nome}`}
          aria-expanded={!recolhido}
          onClick={() => onAlternar(t.id)}
          className="flex h-6 w-6 shrink-0 items-center justify-center text-text-dim hover:text-primary"
        >
          <span className={`transition-transform ${recolhido ? '' : 'rotate-90'}`}>▸</span>
        </button>
      ) : (
        <span className="w-6 shrink-0 text-center text-primary">{t.marco ? '◆' : ''}</span>
      )}
      <span className={`truncate ${t.resumo ? 'font-semibold text-text' : ''}`} title={t.nome}>{t.nome}</span>
    </div>
  );
}

type EtapaFisico = { etapa: string; percentual_fisico: number };

type QuedaEtapa = { tarefa: Tarefa; valor: number; de: number; para: number };

const diasDe = (t: Tarefa) =>
  t.data_inicio && t.data_fim
    ? Math.max((utc(t.data_fim) - utc(t.data_inicio)) / DIA_MS + 1, 1)
    : 1;

/** Mesma conta do banco: média das tarefas da etapa, ponderada pela duração. */
function fisicoDaEtapa(tarefas: Tarefa[], editada: Tarefa, valor: number) {
  let soma = 0;
  let dias = 0;
  for (const t of tarefas) {
    if (t.resumo || t.etapa !== editada.etapa) continue;
    const d = diasDe(t);
    soma += (t.id === editada.id ? valor : Number(t.percentual_fisico)) * d;
    dias += d;
  }
  return dias > 0 ? Math.round((soma / dias) * 100) / 100 : 0;
}

export function TarefasLista({ tarefas, etapas }: { tarefas: Tarefa[]; etapas: EtapaFisico[] }) {
  const { visiveis, recolhidos, alternar, recolherTudo, expandirTudo } = useArvore(tarefas);
  const hoje = hojeISO();
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [locais, setLocais] = useState<Record<string, number>>({});
  const [queda, setQueda] = useState<QuedaEtapa | null>(null);

  const pctDe = (t: Tarefa) => locais[t.id] ?? Number(t.percentual_fisico);

  const desfazer = (id: string) =>
    setLocais((atual) => {
      const novo = { ...atual };
      delete novo[id];
      return novo;
    });

  const salvar = (t: Tarefa, valor: number, atualizarEtapa: boolean) => {
    setQueda(null);
    setLocais((atual) => ({ ...atual, [t.id]: valor }));
    startTransition(async () => {
      const res = await atualizarFisicoTarefa({ id: t.id, percentual: valor, atualizar_etapa: atualizarEtapa });
      if (!res.ok) {
        desfazer(t.id);
        toast({ kind: 'error', text: res.error });
        return;
      }
      router.refresh();
    });
  };

  const aoEditar = (t: Tarefa, digitado: number) => {
    const valor = Math.min(100, Math.max(0, Number.isFinite(digitado) ? digitado : 0));
    if (valor === pctDe(t)) return;

    const atual = etapas.find((e) => e.etapa === t.etapa);
    if (atual) {
      const de = Number(atual.percentual_fisico);
      const para = fisicoDaEtapa(tarefas, t, valor);
      if (para < de) {
        setLocais((l) => ({ ...l, [t.id]: valor }));
        setQueda({ tarefa: t, valor, de, para });
        return;
      }
    }
    salvar(t, valor, true);
  };

  const cancelarQueda = () => {
    if (queda) desfazer(queda.tarefa.id);
    setQueda(null);
  };

  return (
    <div className="space-y-2">
      <BotoesArvore onRecolher={recolherTudo} onExpandir={expandirTudo} />
      <Modal open={!!queda} onClose={cancelarQueda} title="O % da etapa vai diminuir" size="sm">
        {queda && (
          <div className="space-y-4 text-sm">
            <p className="text-text-dim">
              Com esta alteração, a etapa <strong className="text-text">{queda.tarefa.etapa?.replaceAll('_', ' ')}</strong> passa
              de <strong className="text-text">{queda.de.toFixed(0)}%</strong> para{' '}
              <strong className="text-warn">{queda.para.toFixed(0)}%</strong>, porque o % da etapa é a média das
              tarefas dela, ponderada pela duração.
            </p>
            <p className="text-text-dim">
              Se as outras tarefas ainda não foram lançadas, salve só a tarefa: o % da etapa fica como está.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="btn-ghost w-full sm:w-auto" onClick={cancelarQueda}>Cancelar</button>
              <button type="button" className="btn-ghost w-full sm:w-auto" onClick={() => salvar(queda.tarefa, queda.valor, true)}>
                Atualizar a etapa também
              </button>
              <button type="button" className="btn-primary w-full sm:w-auto" onClick={() => salvar(queda.tarefa, queda.valor, false)}>
                Salvar só a tarefa
              </button>
            </div>
          </div>
        )}
      </Modal>
      <div className="overflow-hidden rounded-lg border border-border text-sm">
        <div className="hidden grid-cols-[5rem_minmax(0,1fr)_11rem_9rem_10rem] gap-3 bg-bg-3 px-3 py-2 text-text-dim md:grid">
          <span>EAP</span>
          <span>Tarefa</span>
          <span>Período</span>
          <span>% físico</span>
          <span>Etapa</span>
        </div>
        {visiveis.map((t) => {
          const pct = Math.min(100, Math.max(0, pctDe(t)));
          const s = situacao({ ...t, percentual_fisico: pct }, hoje);
          return (
            <div
              key={t.id}
              className={`grid grid-cols-1 gap-x-3 gap-y-1 border-t border-border px-3 py-1.5 first:border-t-0 md:grid-cols-[5rem_minmax(0,1fr)_11rem_9rem_10rem] md:items-center md:first:border-t ${t.resumo ? 'bg-bg-2' : ''}`}
            >
              <span className="hidden font-mono text-xs text-text-dim md:block">{t.wbs || '—'}</span>
              <NomeTarefa t={t} recolhido={recolhidos.has(t.id)} onAlternar={alternar} />
              <span className="whitespace-nowrap pl-7 text-xs text-text-dim md:pl-0">
                {fmtDate(t.data_inicio) || '—'} → {fmtDate(t.data_fim) || '—'}
              </span>
              <span className="flex items-center gap-2 pl-7 md:pl-0">
                <span className={`h-1.5 flex-1 overflow-hidden rounded-full ${s.fundo}`}>
                  <span className={`block h-full rounded-full ${s.barra}`} style={{ width: `${pct}%` }} />
                </span>
                {t.resumo ? (
                  <span className={`w-16 text-right text-xs lg:w-14 ${s.texto}`}>{pct.toFixed(0)}%</span>
                ) : (
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    step={5}
                    defaultValue={pct}
                    key={pct}
                    aria-label={`% físico de ${t.nome}`}
                    onBlur={(e) => aoEditar(t, e.target.valueAsNumber)}
                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                    className="w-16 rounded border border-border bg-bg-2 px-1.5 py-1 text-right text-base focus:border-primary focus:outline-none lg:w-14 lg:py-0.5 lg:text-xs"
                  />
                )}
              </span>
              <span className="hidden truncate text-xs text-text-dim md:block">
                {t.etapa ? t.etapa.replaceAll('_', ' ') : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const DIA_MS = 86_400_000;
const LARGURA_MES = 72;
const utc = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number);
  return Date.UTC(a, m - 1, d);
};

export function TarefasGantt({ tarefas }: { tarefas: Tarefa[] }) {
  const { visiveis, recolhidos, alternar, recolherTudo, expandirTudo } = useArvore(tarefas);
  const hoje = hojeISO();

  const comData = tarefas.filter((t) => t.data_inicio && t.data_fim);
  if (comData.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-text-dim">
        Nenhuma tarefa tem datas para montar o Gantt.
      </div>
    );
  }

  const menor = new Date(Math.min(...comData.map((t) => utc(t.data_inicio!))));
  const maior = new Date(Math.max(...comData.map((t) => utc(t.data_fim!))));
  const ini = Date.UTC(menor.getUTCFullYear(), menor.getUTCMonth(), 1);
  const fim = Date.UTC(maior.getUTCFullYear(), maior.getUTCMonth() + 1, 1);
  const totalDias = (fim - ini) / DIA_MS;

  const meses: { chave: string; label: string; esquerda: number; largura: number }[] = [];
  for (let c = new Date(ini); c.getTime() < fim; ) {
    const prox = Date.UTC(c.getUTCFullYear(), c.getUTCMonth() + 1, 1);
    meses.push({
      chave: c.toISOString(),
      label: `${MESES[c.getUTCMonth()]}/${String(c.getUTCFullYear()).slice(2)}`,
      esquerda: ((c.getTime() - ini) / DIA_MS / totalDias) * 100,
      largura: ((prox - c.getTime()) / DIA_MS / totalDias) * 100,
    });
    c = new Date(prox);
  }

  const posicao = (iso: string) => ((utc(iso) - ini) / DIA_MS / totalDias) * 100;
  const hojeVisivel = utc(hoje) >= ini && utc(hoje) < fim;
  const larguraGrafico = Math.max(meses.length * LARGURA_MES, 480);

  return (
    <div className="space-y-2">
      <BotoesArvore onRecolher={recolherTudo} onExpandir={expandirTudo} />
      <div className="overflow-x-auto rounded-lg border border-border text-xs">
        <div className="w-max min-w-full">
          <div className="flex border-b border-border bg-bg-3">
            <div className="sticky left-0 z-20 w-44 shrink-0 bg-bg-3 px-3 py-2 text-text-dim md:w-80">Tarefa</div>
            <div className="relative h-8 flex-1" style={{ minWidth: larguraGrafico }}>
              {meses.map((m) => (
                <span
                  key={m.chave}
                  className="absolute top-2 border-l border-border pl-1 text-text-dim"
                  style={{ left: `${m.esquerda}%`, width: `${m.largura}%` }}
                >
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          {visiveis.map((t) => {
            const pct = Math.min(100, Math.max(0, Number(t.percentual_fisico)));
            const s = situacao(t, hoje);
            const temBarra = t.data_inicio && t.data_fim;
            const esquerda = temBarra ? posicao(t.data_inicio!) : 0;
            const largura = temBarra ? posicao(t.data_fim!) + 100 / totalDias - esquerda : 0;
            const legenda = `${t.nome}: ${fmtDate(t.data_inicio)} → ${fmtDate(t.data_fim)} · ${pct.toFixed(0)}% · ${s.label}`;
            return (
              <div key={t.id} className="flex border-b border-border last:border-b-0">
                <div className={`sticky left-0 z-20 w-44 shrink-0 px-2 py-1 md:w-80 ${t.resumo ? 'bg-bg-2' : 'bg-bg'}`}>
                  <NomeTarefa t={t} recolhido={recolhidos.has(t.id)} onAlternar={alternar} />
                </div>
                <div className="relative flex-1" style={{ minWidth: larguraGrafico }}>
                  {meses.map((m) => (
                    <span key={m.chave} className="absolute inset-y-0 border-l border-border/40" style={{ left: `${m.esquerda}%` }} />
                  ))}
                  {hojeVisivel && (
                    <span className="absolute inset-y-0 z-10 w-px bg-danger" style={{ left: `${posicao(hoje)}%` }} />
                  )}
                  {temBarra && t.marco && (
                    <span
                      title={legenda}
                      className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-primary"
                      style={{ left: `${esquerda}%` }}
                    />
                  )}
                  {temBarra && !t.marco && (
                    <span
                      title={legenda}
                      className={`absolute top-1/2 -translate-y-1/2 overflow-hidden rounded-sm ${t.resumo ? 'h-1.5 bg-text-dim/60' : `h-3.5 ${s.fundo}`}`}
                      style={{ left: `${esquerda}%`, width: `max(${largura}%, 3px)` }}
                    >
                      {!t.resumo && <span className={`block h-full ${s.barra}`} style={{ width: `${pct}%` }} />}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-dim">
        {Object.values(SITUACOES).map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ${s.barra}`} />{s.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rotate-45 bg-primary" />Marco</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-px bg-danger" />Hoje</span>
      </div>
    </div>
  );
}

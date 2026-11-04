'use client';

import { useMemo, useState } from 'react';
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

export function TarefasLista({ tarefas }: { tarefas: Tarefa[] }) {
  const { visiveis, recolhidos, alternar, recolherTudo, expandirTudo } = useArvore(tarefas);
  const hoje = hojeISO();

  return (
    <div className="space-y-2">
      <BotoesArvore onRecolher={recolherTudo} onExpandir={expandirTudo} />
      <div className="overflow-hidden rounded-lg border border-border text-sm">
        <div className="hidden grid-cols-[5rem_minmax(0,1fr)_11rem_9rem_10rem] gap-3 bg-bg-3 px-3 py-2 text-text-dim md:grid">
          <span>EAP</span>
          <span>Tarefa</span>
          <span>Período</span>
          <span>% físico</span>
          <span>Etapa</span>
        </div>
        {visiveis.map((t) => {
          const pct = Math.min(100, Math.max(0, Number(t.percentual_fisico)));
          const s = situacao(t, hoje);
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
                <span className={`w-9 text-right text-xs ${s.texto}`}>{pct.toFixed(0)}%</span>
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

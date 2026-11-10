'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export type TipoRelatorio = 'SEMANAL' | 'QUINZENAL' | 'MENSAL' | 'PERSONALIZADO' | 'TOTAL';

export type CRRow = {
  descricao: string;
  numero_parcela: string | null;
  valor_original: number;
  valor_pago: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
};

export type CPRow = {
  descricao: string;
  numero_documento: string | null;
  valor_original: number;
  valor_pago: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
  categoria: string | null;
};

export type CronoRow = {
  etapa: string;
  marco: string;
  descricao: string | null;
  ordem: number;
  peso: number;
  percentual_fisico: number;
  status: string;
  data_inicio_prevista: string | null;
  data_fim_prevista: string | null;
};

export type TarefaRow = {
  id: string;
  ordem: number;
  wbs: string | null;
  nivel: number;
  resumo: boolean;
  marco: boolean;
  nome: string;
  data_inicio: string | null;
  data_fim: string | null;
  percentual_fisico: number;
  etapa: string | null;
};

type Situacao = 'concluida' | 'andamento' | 'atrasada' | 'aguardando';

type TarefaCalc = TarefaRow & {
  pct: number;
  previsto: number;
  situacao: Situacao;
  caminho: string;
};

const SITUACAO_LABEL: Record<Situacao, string> = {
  concluida: 'Concluída',
  andamento: 'Em andamento',
  atrasada: 'Atrasada',
  aguardando: 'Não iniciada',
};

const SITUACAO_PDF: Record<Situacao, [string, string]> = {
  concluida: ['#e6f4ee', '#1a6b3c'],
  andamento: ['#e8f0fe', '#1a4bb5'],
  atrasada: ['#fde8e8', '#a31515'],
  aguardando: ['#f0f0f0', '#666'],
};

const SITUACAO_APP: Record<Situacao, string> = {
  concluida: 'bg-success/20 text-success',
  andamento: 'bg-info/20 text-info',
  atrasada: 'bg-danger/20 text-danger',
  aguardando: 'bg-bg-3 text-text-dim',
};

const TIPO_OPCOES: { value: TipoRelatorio; label: string }[] = [
  { value: 'SEMANAL', label: 'Semanal (últimos 7 dias)' },
  { value: 'QUINZENAL', label: 'Quinzenal (últimos 15 dias)' },
  { value: 'MENSAL', label: 'Mensal (últimos 30 dias)' },
  { value: 'PERSONALIZADO', label: 'Escolher período' },
  { value: 'TOTAL', label: 'Total da obra (desde o início)' },
];

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function esc(v: string | null | undefined) {
  return (v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** iPhone/iPad (inclusive iPadOS que se identifica como Mac) e Android. */
function ehCelularOuTablet() {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod|Android/i.test(ua)) return true;
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

/** Dias corridos entre duas datas, contando as duas pontas. */
function dias(a: string, b: string) {
  return Math.max((Date.parse(b) - Date.parse(a)) / 86_400_000 + 1, 1);
}

const duracao = (t: TarefaRow) => (t.data_inicio && t.data_fim ? dias(t.data_inicio, t.data_fim) : 1);

/** % que a tarefa deveria ter na data, supondo avanço linear entre início e término. */
function previstoFolha(t: TarefaRow, ref: string) {
  if (!t.data_inicio || !t.data_fim || ref < t.data_inicio) return 0;
  if (ref >= t.data_fim) return 100;
  return (dias(t.data_inicio, ref) / dias(t.data_inicio, t.data_fim)) * 100;
}

function situacaoDe(pct: number, dataFim: string | null, hoje: string): Situacao {
  if (pct >= 100) return 'concluida';
  if (dataFim && dataFim < hoje) return 'atrasada';
  return pct > 0 ? 'andamento' : 'aguardando';
}

function mediaPonderada(itens: { valor: number; peso: number }[]) {
  const peso = itens.reduce((s, x) => s + x.peso, 0);
  return peso > 0 ? itens.reduce((s, x) => s + x.valor * x.peso, 0) / peso : 0;
}

/**
 * Real, previsto e situação de cada tarefa. Grupos: previsto pela média das
 * folhas abaixo, ponderada pela duração (a mesma regra do % real no banco).
 * `caminho` são os grupos acima da tarefa, sem o grupo raiz do projeto.
 */
function calcularTarefas(tarefas: TarefaRow[], hoje: string): TarefaCalc[] {
  const nivelRaiz = Math.min(...tarefas.map((t) => t.nivel));
  const raizes = tarefas.filter((t) => t.nivel === nivelRaiz);
  const pularRaiz = raizes.length === 1 && raizes[0].resumo;

  const pilha: TarefaRow[] = [];
  return tarefas.map((t, i) => {
    while (pilha.length && pilha[pilha.length - 1].nivel >= t.nivel) pilha.pop();
    const caminho = pilha
      .filter((p) => !(pularRaiz && p.nivel === nivelRaiz))
      .map((p) => p.nome)
      .join(' › ');
    if (t.resumo) pilha.push(t);

    let previsto: number;
    if (t.resumo) {
      const folhas: TarefaRow[] = [];
      for (let j = i + 1; j < tarefas.length && tarefas[j].nivel > t.nivel; j++) {
        if (!tarefas[j].resumo) folhas.push(tarefas[j]);
      }
      previsto = mediaPonderada(folhas.map((f) => ({ valor: previstoFolha(f, hoje), peso: duracao(f) })));
    } else {
      previsto = previstoFolha(t, hoje);
    }
    const pct = Number(t.percentual_fisico) || 0;
    return { ...t, pct, previsto, situacao: situacaoDe(pct, t.data_fim, hoje), caminho };
  });
}

function primeiroDiaMes(iso: string, deslocamento = 0) {
  const [y, m] = iso.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + deslocamento, 1));
  return d.toISOString().slice(0, 10);
}

function ultimoDiaMes(iso: string, deslocamento = 0) {
  const [y, m] = iso.split('-').map(Number);
  const d = new Date(Date.UTC(y, m + deslocamento, 0));
  return d.toISOString().slice(0, 10);
}

export function RelatoriosClient({
  empreendimentos,
  obraAtual,
  tipoAtual,
  periodoInicio,
  periodoFim,
  hoje,
  obraInfo,
  crRows,
  cpRows,
  cronoRows,
  tarefas,
}: {
  empreendimentos: { id: string; nome: string; codigo_curto: string | null }[];
  obraAtual: string;
  tipoAtual: TipoRelatorio;
  periodoInicio: string | null;
  periodoFim: string | null;
  hoje: string;
  obraInfo: { nome: string } | null;
  crRows: CRRow[];
  cpRows: CPRow[];
  cronoRows: CronoRow[];
  tarefas: TarefaRow[];
}) {
  const router = useRouter();
  const total = tipoAtual === 'TOTAL';
  const [de, setDe] = useState(
    tipoAtual === 'PERSONALIZADO' && periodoInicio ? periodoInicio : primeiroDiaMes(hoje),
  );
  const [ate, setAte] = useState(tipoAtual === 'PERSONALIZADO' && periodoFim ? periodoFim : hoje);

  const ir = (tipo: TipoRelatorio, obra: string, periodo?: { de: string; ate: string }) => {
    const params = new URLSearchParams({ tipo });
    if (obra) params.set('obra', obra);
    if (tipo === 'PERSONALIZADO') {
      const p = periodo ?? { de, ate };
      params.set('de', p.de);
      params.set('ate', p.ate);
    }
    router.push(`/relatorios?${params.toString()}`);
  };

  const aplicarPeriodo = (p: { de: string; ate: string }) => {
    setDe(p.de);
    setAte(p.ate);
    ir('PERSONALIZADO', obraAtual, p);
  };

  // Financeiro
  const totalCROriginal = crRows.reduce((s, r) => s + Number(r.valor_original), 0);
  const totalCRPago = crRows.reduce((s, r) => s + Number(r.valor_pago), 0);
  const totalCPOriginal = cpRows.reduce((s, r) => s + Number(r.valor_original), 0);
  const totalCPPago = cpRows.reduce((s, r) => s + Number(r.valor_pago), 0);
  const saldo = totalCRPago - totalCPPago;

  const porCategoria = Object.entries(
    cpRows.reduce<Record<string, { original: number; pago: number; qtd: number }>>((acc, r) => {
      const k = r.categoria ?? 'SEM_CATEGORIA';
      acc[k] ??= { original: 0, pago: 0, qtd: 0 };
      acc[k].original += Number(r.valor_original);
      acc[k].pago += Number(r.valor_pago);
      acc[k].qtd += 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1].original - a[1].original);

  // Cronograma importado do MS Project. Sem ele, vale o avanço das etapas.
  const temTarefas = tarefas.length > 0;
  const calc = temTarefas ? calcularTarefas(tarefas, hoje) : [];
  const folhas = calc.filter((t) => !t.resumo);
  const avancoReal = temTarefas
    ? mediaPonderada(folhas.map((t) => ({ valor: t.pct, peso: duracao(t) })))
    : cronoRows.reduce((s, r) => s + Number(r.peso) * Number(r.percentual_fisico), 0);
  const avancoPrevisto = mediaPonderada(folhas.map((t) => ({ valor: t.previsto, peso: duracao(t) })));
  const desvio = avancoReal - avancoPrevisto;
  const concluidas = folhas.filter((t) => t.situacao === 'concluida').length;
  const atrasadas = folhas.filter((t) => t.situacao === 'atrasada').length;
  const noPeriodo =
    !total && periodoInicio && periodoFim
      ? folhas.filter(
          (t) => t.data_inicio && t.data_fim && t.data_inicio <= periodoFim && t.data_fim >= periodoInicio,
        )
      : [];

  const tituloRelatorio =
    tipoAtual === 'TOTAL'
      ? 'Relatório Total da Obra'
      : tipoAtual === 'PERSONALIZADO'
        ? 'Relatório do Período'
        : `Relatório ${{ SEMANAL: 'Semanal', QUINZENAL: 'Quinzenal', MENSAL: 'Mensal' }[tipoAtual]}`;
  const textoPeriodo = total
    ? periodoInicio && periodoFim
      ? `Obra completa: ${fmtDate(periodoInicio)} a ${fmtDate(periodoFim)}`
      : 'Obra completa'
    : `Período: ${fmtDate(periodoInicio)} a ${fmtDate(periodoFim)}`;

  const handleGerarPDF = () => {
    const obraLabel = obraInfo ? obraInfo.nome : 'Todas as obras';
    const geradoEm = new Date().toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' });

    const statusBadge = (s: string) => {
      const bg = s === 'PAGO' ? '#e6f4ee' : s === 'ATRASADO' ? '#fde8e8' : '#fef9e7';
      const color = s === 'PAGO' ? '#1a6b3c' : s === 'ATRASADO' ? '#a31515' : '#7a5c00';
      return `<span style="display:inline-block;padding:2px 7px;border-radius:3px;font-size:10px;font-weight:600;letter-spacing:.4px;background:${bg};color:${color}">${s}</span>`;
    };

    const situacaoBadge = (s: Situacao) => {
      const [bg, color] = SITUACAO_PDF[s];
      return `<span style="display:inline-block;padding:2px 7px;border-radius:3px;font-size:10px;font-weight:600;letter-spacing:.4px;white-space:nowrap;background:${bg};color:${color}">${SITUACAO_LABEL[s]}</span>`;
    };

    const statusCronoLabel: Record<string, string> = {
      NAO_INICIADA: 'Não iniciada',
      EM_ANDAMENTO: 'Em andamento',
      CONCLUIDA: 'Concluída',
      ATRASADA: 'Atrasada',
      PAUSADA: 'Pausada',
    };
    const statusCronoBadge = (s: string) => {
      const map: Record<string, [string, string]> = {
        CONCLUIDA:    ['#e6f4ee', '#1a6b3c'],
        EM_ANDAMENTO: ['#e8f0fe', '#1a4bb5'],
        ATRASADA:     ['#fde8e8', '#a31515'],
        PAUSADA:      ['#fef9e7', '#7a5c00'],
        NAO_INICIADA: ['#f0f0f0', '#666'],
      };
      const [bg, color] = map[s] ?? ['#f0f0f0', '#666'];
      return `<span style="display:inline-block;padding:2px 7px;border-radius:3px;font-size:10px;font-weight:600;letter-spacing:.4px;background:${bg};color:${color}">${statusCronoLabel[s] ?? s}</span>`;
    };

    const progBar = (pct: number) => {
      const w = Math.min(100, Math.max(0, pct));
      const color = w >= 100 ? '#1a6b3c' : w >= 50 ? '#B8923A' : '#4A4A4A';
      return `<div style="display:flex;align-items:center;gap:4px"><div style="background:#e8e4dc;border-radius:3px;height:7px;flex:1;min-width:50px">
        <div style="background:${color};height:7px;border-radius:3px;width:${w}%"></div>
      </div><span style="font-size:10px;color:#555;min-width:28px;text-align:right">${w.toFixed(0)}%</span></div>`;
    };

    const zebra = (i: number) => (i % 2 === 0 ? '#ffffff' : '#f9f7f3');

    const linhaTarefa = (t: TarefaCalc, i: number, comCaminho: boolean) => {
      const recuo = Math.max(0, t.nivel - 1) * 12;
      const nome = t.resumo ? `<strong>${esc(t.nome)}</strong>` : esc(t.nome);
      const caminho = comCaminho && t.caminho
        ? `<div style="font-size:10px;color:#888">${esc(t.caminho)}</div>`
        : '';
      return `<tr style="background:${t.resumo ? '#F5F1E8' : zebra(i)}">
        <td style="padding:5px 10px;font-size:10px;color:#888;white-space:nowrap">${esc(t.wbs)}</td>
        <td style="padding:5px 10px;padding-left:${10 + (comCaminho ? 0 : recuo)}px">${t.marco ? '◆ ' : ''}${nome}${caminho}</td>
        <td style="padding:5px 10px;font-size:11px;white-space:nowrap">${fmtDate(t.data_inicio)}</td>
        <td style="padding:5px 10px;font-size:11px;white-space:nowrap">${fmtDate(t.data_fim)}</td>
        <td style="padding:5px 10px;text-align:right;font-size:11px;color:#555;white-space:nowrap">${t.previsto.toFixed(0)}%</td>
        <td style="padding:5px 10px;min-width:100px">${progBar(t.pct)}</td>
        <td style="padding:5px 10px;text-align:center">${situacaoBadge(t.situacao)}</td>
      </tr>`;
    };

    const cabecalhoTarefas = `<thead>
      <tr>
        <th>EDT</th>
        <th>Atividade</th>
        <th>Início</th>
        <th>Término</th>
        <th class="right">Previsto</th>
        <th style="text-align:center">Real</th>
        <th style="text-align:center">Situação</th>
      </tr>
    </thead>`;

    const desvioCor = desvio >= -0.05 ? '#1a6b3c' : desvio >= -10 ? '#7a5c00' : '#a31515';

    const tarefasHtml = !temTarefas ? '' : `
  <div class="section-title" style="margin-top:32px">Andamento da Obra — Cronograma</div>

  <div style="background:#F5F1E8;border:1px solid #e0d8cc;border-radius:4px;padding:16px 20px;margin-bottom:8px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span style="font-family:Georgia,serif;font-size:13px;color:#0A0A0A">Avanço físico real</span>
      <span style="font-family:Georgia,serif;font-size:20px;font-weight:700;color:#B8923A">${avancoReal.toFixed(1)}%</span>
    </div>
    <div style="position:relative;background:#e0d8cc;border-radius:4px;height:10px">
      <div style="background:linear-gradient(90deg,#B8923A,#E8C97A);height:10px;border-radius:4px;width:${Math.min(100, avancoReal).toFixed(1)}%"></div>
      <div title="Previsto" style="position:absolute;top:-3px;left:${Math.min(100, avancoPrevisto).toFixed(1)}%;width:2px;height:16px;background:#0A0A0A"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;margin-top:12px">
      <div style="padding:0 16px 0 0;border-right:1px solid #e0d8cc">
        <div class="kpi-label">Previsto para ${fmtDate(hoje)}</div>
        <div class="kpi-value">${avancoPrevisto.toFixed(1)}%</div>
      </div>
      <div style="padding:0 16px;border-right:1px solid #e0d8cc">
        <div class="kpi-label">Desvio</div>
        <div class="kpi-value" style="color:${desvioCor}">${desvio >= 0 ? '+' : ''}${desvio.toFixed(1)} p.p.</div>
      </div>
      <div style="padding:0 0 0 16px">
        <div class="kpi-label">Atividades</div>
        <div class="kpi-value">${concluidas} de ${folhas.length} concluídas${atrasadas > 0 ? ` <span style="font-size:11px;color:#a31515">· ${atrasadas} atrasada(s)</span>` : ''}</div>
      </div>
    </div>
  </div>
  <div class="nota">Previsto: avanço linear de cada atividade entre início e término, ponderado pela duração. A barra preta marca o previsto.</div>

  ${total ? '' : `
  <div class="sub-title">Atividades programadas no período</div>
  <div class="table-count">${noPeriodo.length} atividade(s) entre ${fmtDate(periodoInicio)} e ${fmtDate(periodoFim)}</div>
  <table>
    ${cabecalhoTarefas}
    <tbody>
      ${noPeriodo.length === 0
        ? '<tr><td colspan="7" style="text-align:center;padding:12px;color:#888;font-style:italic">Nenhuma atividade programada no período</td></tr>'
        : noPeriodo.map((t, i) => linhaTarefa(t, i, true)).join('')}
    </tbody>
  </table>`}

  <div class="sub-title">Cronograma ${total ? 'da obra' : 'completo'}</div>
  <table>
    ${cabecalhoTarefas}
    <tbody>${calc.map((t, i) => linhaTarefa(t, i, false)).join('')}</tbody>
  </table>
`;

    // Obra sem cronograma importado: mantém a visão pelas 14 etapas.
    const etapasHtml = temTarefas || cronoRows.length === 0 ? '' : `
  <div class="section-title" style="margin-top:32px">Andamento da Obra — Etapas</div>

  <div style="background:#F5F1E8;border:1px solid #e0d8cc;border-radius:4px;padding:16px 20px;margin-bottom:16px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span style="font-family:Georgia,serif;font-size:13px;color:#0A0A0A">Progresso físico geral</span>
      <span style="font-family:Georgia,serif;font-size:20px;font-weight:700;color:#B8923A">${avancoReal.toFixed(1)}%</span>
    </div>
    <div style="background:#e0d8cc;border-radius:4px;height:10px">
      <div style="background:linear-gradient(90deg,#B8923A,#E8C97A);height:10px;border-radius:4px;width:${Math.min(100, avancoReal).toFixed(1)}%"></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Marco</th>
        <th>Etapa</th>
        <th style="text-align:center">% Físico</th>
        <th style="text-align:center">Status</th>
        <th>Prev. Fim</th>
      </tr>
    </thead>
    <tbody>
      ${cronoRows.map((r, i) => {
        return `<tr style="background:${zebra(i)}">
          <td style="padding:6px 10px;font-weight:600;color:#B8923A;white-space:nowrap">${esc(r.marco)}</td>
          <td style="padding:6px 10px;font-size:11px">${esc(r.etapa.replaceAll('_', ' '))}</td>
          <td style="padding:6px 10px;min-width:90px">${progBar(Number(r.percentual_fisico))}</td>
          <td style="padding:6px 10px;text-align:center">${statusCronoBadge(r.status)}</td>
          <td style="padding:6px 10px;font-size:11px;white-space:nowrap">${fmtDate(r.data_fim_prevista)}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;

    const semLancamento = total ? 'Nenhum lançamento' : 'Nenhum lançamento no período';

    const crHtml = crRows.length === 0
      ? `<tr><td colspan="5" style="text-align:center;padding:12px;color:#888;font-style:italic">${semLancamento}</td></tr>`
      : crRows.map((r, i) => `
        <tr style="background:${zebra(i)}">
          <td style="padding:6px 10px">${esc(r.descricao)}${r.numero_parcela ? ` <span style="color:#888;font-size:11px">(${esc(r.numero_parcela)})</span>` : ''}</td>
          <td style="padding:6px 10px;white-space:nowrap">${fmtDate(r.data_vencimento)}</td>
          <td style="padding:6px 10px;text-align:right;white-space:nowrap">${fmtBRL(Number(r.valor_original))}</td>
          <td style="padding:6px 10px;text-align:right;white-space:nowrap;font-weight:600;color:#1a6b3c">${fmtBRL(Number(r.valor_pago))}</td>
          <td style="padding:6px 10px">${statusBadge(r.status)}</td>
        </tr>`).join('');

    const cpHtml = cpRows.length === 0
      ? `<tr><td colspan="6" style="text-align:center;padding:12px;color:#888;font-style:italic">${semLancamento}</td></tr>`
      : cpRows.map((r, i) => `
        <tr style="background:${zebra(i)}">
          <td style="padding:6px 10px">${esc(r.descricao)}${r.numero_documento ? ` <span style="color:#888;font-size:11px">(${esc(r.numero_documento)})</span>` : ''}</td>
          <td style="padding:6px 10px;font-size:11px;color:#555">${esc(r.categoria?.replaceAll('_', ' ') ?? '—')}</td>
          <td style="padding:6px 10px;white-space:nowrap">${fmtDate(r.data_vencimento)}</td>
          <td style="padding:6px 10px;text-align:right;white-space:nowrap">${fmtBRL(Number(r.valor_original))}</td>
          <td style="padding:6px 10px;text-align:right;white-space:nowrap;font-weight:600;color:#a31515">${fmtBRL(Number(r.valor_pago))}</td>
          <td style="padding:6px 10px">${statusBadge(r.status)}</td>
        </tr>`).join('');

    const categoriasHtml = porCategoria.length < 2 ? '' : `
  <div class="sub-title">Despesas por categoria</div>
  <table>
    <thead>
      <tr>
        <th>Categoria</th>
        <th class="right">Lanç.</th>
        <th class="right">Valor</th>
        <th class="right">Pago</th>
        <th class="right">% do total</th>
      </tr>
    </thead>
    <tbody>
      ${porCategoria.map(([cat, v], i) => `<tr style="background:${zebra(i)}">
        <td style="padding:6px 10px">${esc(cat.replaceAll('_', ' '))}</td>
        <td style="padding:6px 10px;text-align:right">${v.qtd}</td>
        <td style="padding:6px 10px;text-align:right;white-space:nowrap">${fmtBRL(v.original)}</td>
        <td style="padding:6px 10px;text-align:right;white-space:nowrap">${fmtBRL(v.pago)}</td>
        <td style="padding:6px 10px;text-align:right">${totalCPOriginal > 0 ? ((v.original / totalCPOriginal) * 100).toFixed(1) : '0.0'}%</td>
      </tr>`).join('')}
    </tbody>
  </table>`;

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${tituloRelatorio} — ${esc(obraLabel)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #1a1a1a; background: #fff; }

  /* Cabeçalho */
  .header { background: #0A0A0A; color: #F5F1E8; padding: 28px 36px 20px; display: flex; align-items: center; justify-content: space-between; }
  .header-left { display: flex; align-items: center; gap: 16px; }
  .logo-mark { width: 44px; height: 44px; }
  .brand-name { font-family: Georgia, 'Times New Roman', serif; font-size: 22px; letter-spacing: 6px; color: #B8923A; text-transform: uppercase; line-height: 1; }
  .brand-sub { font-size: 9px; letter-spacing: 4px; color: #888; text-transform: uppercase; margin-top: 3px; }
  .header-right { text-align: right; font-size: 11px; color: #aaa; line-height: 1.6; }

  /* Linha dourada */
  .gold-rule { height: 2px; background: linear-gradient(90deg, #B8923A 0%, #E8C97A 50%, #B8923A 100%); }

  /* Metadados do relatório */
  .report-meta { padding: 18px 36px; background: #F5F1E8; border-bottom: 1px solid #e0d8cc; display: flex; justify-content: space-between; align-items: center; }
  .report-title { font-family: Georgia, serif; font-size: 16px; color: #0A0A0A; font-weight: normal; }
  .report-period { font-size: 11px; color: #4A4A4A; }
  .report-obra { font-size: 11px; color: #B8923A; font-weight: 600; margin-top: 2px; }

  /* Conteúdo */
  .content { padding: 24px 36px; }
  .section-title { font-family: Georgia, serif; font-size: 13px; font-weight: normal; color: #0A0A0A; text-transform: uppercase; letter-spacing: 2px; margin: 24px 0 8px; padding-bottom: 6px; border-bottom: 1.5px solid #B8923A; }
  .sub-title { font-size: 11px; font-weight: 600; color: #4A4A4A; text-transform: uppercase; letter-spacing: 1px; margin: 18px 0 6px; }
  .kpi-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: .5px; }
  .kpi-value { font-size: 14px; font-weight: 700; color: #0A0A0A; margin-top: 2px; }
  .nota { font-size: 10px; color: #888; margin-bottom: 8px; }

  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  thead { display: table-header-group; }
  thead tr { background: #0A0A0A; }
  thead th { padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: #F5F1E8; border: none; }
  thead th.right { text-align: right; }
  tbody tr { border-bottom: 1px solid #ece8e0; page-break-inside: avoid; }
  tbody td { font-size: 12px; color: #1a1a1a; border: none; }
  .table-count { font-size: 10px; color: #888; text-align: right; margin-bottom: 4px; }

  /* Resumo financeiro */
  .summary { background: #0A0A0A; color: #F5F1E8; border-radius: 4px; overflow: hidden; margin-top: 24px; page-break-inside: avoid; }
  .summary-title { padding: 12px 20px; font-family: Georgia, serif; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #B8923A; border-bottom: 1px solid #222; }
  .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
  .summary-item { padding: 14px 20px; border-bottom: 1px solid #1a1a1a; }
  .summary-item:nth-child(even) { border-left: 1px solid #1a1a1a; }
  .summary-label { font-size: 10px; color: #888; letter-spacing: .5px; text-transform: uppercase; margin-bottom: 4px; }
  .summary-value { font-size: 16px; font-weight: 700; }
  .summary-total { padding: 16px 20px; border-top: 2px solid #B8923A; display: flex; justify-content: space-between; align-items: center; }
  .summary-total-label { font-size: 11px; color: #aaa; letter-spacing: 1px; text-transform: uppercase; }
  .summary-total-value { font-family: Georgia, serif; font-size: 20px; font-weight: 700; }
  .pos { color: #4ade80; }
  .neg { color: #f87171; }
  .neutral { color: #F5F1E8; }

  /* Rodapé */
  .footer { margin-top: 32px; padding: 16px 36px; border-top: 1px solid #e0d8cc; display: flex; justify-content: space-between; align-items: center; }
  .footer-brand { font-family: Georgia, serif; font-size: 10px; letter-spacing: 3px; color: #B8923A; text-transform: uppercase; }
  .footer-meta { font-size: 10px; color: #aaa; text-align: right; }

  /* Barra só da aba aberta no celular — some na impressão */
  .mobile-bar { position: sticky; top: 0; z-index: 10; display: flex; gap: 16px; padding: 20px 36px; background: #F5F1E8; border-bottom: 1px solid #e0d8cc; }
  .mobile-bar button { flex: 1; font: 600 40px Arial, sans-serif; padding: 28px 16px; border-radius: 10px; border: 2px solid #B8923A; background: #fff; color: #0A0A0A; }
  .mobile-bar button.primary { background: #B8923A; color: #0A0A0A; }

  @media print {
    .mobile-bar { display: none !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .header { -webkit-print-color-adjust: exact; }
    .summary { -webkit-print-color-adjust: exact; }
  }
</style>
</head>
<body>
__MOBILE_BAR__
<!-- Cabeçalho Altor -->
<div class="header">
  <div class="header-left">
    <svg class="logo-mark" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M28 6 L50 50 H6 Z" fill="none" stroke="#B8923A" stroke-width="2.5" stroke-linejoin="round"/>
      <line x1="16.5" y1="37" x2="39.5" y2="37" stroke="#B8923A" stroke-width="2.5" stroke-linecap="round"/>
    </svg>
    <div>
      <div class="brand-name">Altor</div>
      <div class="brand-sub">Construtora e Incorporadora</div>
    </div>
  </div>
  <div class="header-right">
    <div>Relatório de Obra</div>
    <div>${total ? 'Total da obra' : tipoAtual === 'PERSONALIZADO' ? 'Período escolhido' : tituloRelatorio.replace('Relatório ', '')}</div>
    <div>${geradoEm}</div>
  </div>
</div>
<div class="gold-rule"></div>

<!-- Metadados -->
<div class="report-meta">
  <div>
    <div class="report-title">${tituloRelatorio}</div>
    <div class="report-obra">${esc(obraLabel)}</div>
  </div>
  <div class="report-period">${textoPeriodo}</div>
</div>

<div class="content">

  <!-- Contas a Receber -->
  <div class="section-title">Contas a Receber</div>
  <div class="table-count">${crRows.length} lançamento(s)</div>
  <table>
    <thead>
      <tr>
        <th>Descrição</th>
        <th>Vencimento</th>
        <th class="right">Valor</th>
        <th class="right">Recebido</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>${crHtml}</tbody>
  </table>

  <!-- Contas a Pagar -->
  <div class="section-title">Contas a Pagar</div>
  <div class="table-count">${cpRows.length} lançamento(s)</div>
  <table>
    <thead>
      <tr>
        <th>Descrição</th>
        <th>Categoria</th>
        <th>Vencimento</th>
        <th class="right">Valor</th>
        <th class="right">Pago</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>${cpHtml}</tbody>
  </table>

  ${categoriasHtml}

  ${tarefasHtml}
  ${etapasHtml}

  <!-- Resumo financeiro -->
  <div class="summary">
    <div class="summary-title">${total ? 'Resumo da Obra' : 'Resumo do Período'}</div>
    <div class="summary-grid">
      <div class="summary-item">
        <div class="summary-label">A receber (total)</div>
        <div class="summary-value neutral">${fmtBRL(totalCROriginal)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Recebido</div>
        <div class="summary-value pos">${fmtBRL(totalCRPago)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">A pagar (total)</div>
        <div class="summary-value neutral">${fmtBRL(totalCPOriginal)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Pago</div>
        <div class="summary-value neg">${fmtBRL(totalCPPago)}</div>
      </div>
    </div>
    <div class="summary-total">
      <div class="summary-total-label">${total ? 'Resultado acumulado' : 'Resultado do período'}</div>
      <div class="summary-total-value ${saldo >= 0 ? 'pos' : 'neg'}">${fmtBRL(saldo)}</div>
    </div>
  </div>

</div>

<!-- Rodapé -->
<div class="footer">
  <div class="footer-brand">Altor — Construtora e Incorporadora</div>
  <div class="footer-meta">Documento gerado em ${geradoEm}<br>Uso interno — confidencial</div>
</div>

</body>
</html>`;

    // Celular/tablet: Safari iOS (e alguns Chrome Android) ignora print() em iframe
    // oculto ou imprime a página de fora. Abre o relatório numa aba própria, com
    // botão de imprimir/salvar PDF, e dispara a impressão automaticamente lá.
    if (ehCelularOuTablet()) {
      const barra = `<div class="mobile-bar">
  <button type="button" onclick="window.close()">Fechar</button>
  <button type="button" class="primary" onclick="window.print()">Imprimir / Salvar PDF</button>
</div>
<script>(function(){var ok=false;function p(){if(ok)return;ok=true;setTimeout(function(){window.print()},400)}window.addEventListener('load',p);setTimeout(p,1500)})()</script>`;
      const w = window.open('', '_blank');
      if (w) {
        w.document.open();
        w.document.write(html.replace('__MOBILE_BAR__', barra));
        w.document.close();
        return;
      }
      // Pop-up bloqueado: segue para o iframe abaixo
    }

    // Desktop: iframe fora da tela, mas com tamanho real (iframe de 1px quebra em alguns navegadores)
    const existing = document.getElementById('__pdf_iframe__');
    if (existing) existing.remove();
    const iframe = document.createElement('iframe');
    iframe.id = '__pdf_iframe__';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText =
      'position:fixed;top:0;left:-10000px;width:900px;height:1200px;border:0;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html.replace('__MOBILE_BAR__', ''));
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 400);
  };

  const periodoInvalido = !de || !ate || de > ate;
  const tarefasPreview = total ? calc : noPeriodo;

  return (
    <div className="min-w-0 space-y-4 max-w-4xl">
      <div className="card space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Empreendimento</label>
            <select
              className="input"
              value={obraAtual}
              onChange={(e) => ir(tipoAtual, e.target.value)}
            >
              <option value="">Todos</option>
              {empreendimentos.map((e) => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Período</label>
            <select
              className="input"
              value={tipoAtual}
              onChange={(e) => ir(e.target.value as TipoRelatorio, obraAtual)}
            >
              {TIPO_OPCOES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              className="btn-primary w-full"
              onClick={handleGerarPDF}
            >
              Gerar PDF / Imprimir
            </button>
          </div>
        </div>

        {tipoAtual === 'PERSONALIZADO' && (
          <div className="space-y-3 border-t border-border pt-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div>
                <label className="label">De</label>
                <input type="date" className="input" value={de} max={ate || undefined} onChange={(e) => setDe(e.target.value)} />
              </div>
              <div>
                <label className="label">Até</label>
                <input type="date" className="input" value={ate} min={de || undefined} onChange={(e) => setAte(e.target.value)} />
              </div>
              <button
                type="button"
                className="btn-primary col-span-2 sm:col-span-1"
                disabled={periodoInvalido}
                onClick={() => aplicarPeriodo({ de, ate })}
              >
                Aplicar período
              </button>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                { label: 'Mês atual', de: primeiroDiaMes(hoje), ate: hoje },
                { label: 'Mês anterior', de: primeiroDiaMes(hoje, -1), ate: ultimoDiaMes(hoje, -1) },
                { label: 'Últimos 3 meses', de: primeiroDiaMes(hoje, -2), ate: hoje },
                { label: 'Ano atual', de: `${hoje.slice(0, 4)}-01-01`, ate: hoje },
              ].map((atalho) => (
                <button
                  key={atalho.label}
                  type="button"
                  className="rounded border border-border px-3 py-1.5 text-text-dim hover:border-primary/50 hover:text-primary"
                  onClick={() => aplicarPeriodo({ de: atalho.de, ate: atalho.ate })}
                >
                  {atalho.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="text-sm text-text-dim border-t border-border pt-3">
          {total ? (
            <>
              Obra completa
              {periodoInicio && periodoFim && (
                <>: <strong className="text-text">{fmtDate(periodoInicio)}</strong> a <strong className="text-text">{fmtDate(periodoFim)}</strong></>
              )}
            </>
          ) : (
            <>
              Período: <strong className="text-text">{fmtDate(periodoInicio)}</strong> a <strong className="text-text">{fmtDate(periodoFim)}</strong>
            </>
          )}
          {obraInfo && <> · Obra: <strong className="text-text">{obraInfo.nome}</strong></>}
        </div>
      </div>

      {/* Preview summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card min-w-0 p-3 sm:p-4">
          <div className="text-xs text-text-dim uppercase">{total ? 'CR da obra' : 'CR no período'}</div>
          <div className="text-lg font-semibold text-text mt-1">{crRows.length} lanç.</div>
          <div className="text-sm text-success tabular-nums break-words">{fmtBRL(totalCROriginal)}</div>
        </div>
        <div className="card min-w-0 p-3 sm:p-4">
          <div className="text-xs text-text-dim uppercase">{total ? 'CP da obra' : 'CP no período'}</div>
          <div className="text-lg font-semibold text-text mt-1">{cpRows.length} lanç.</div>
          <div className="text-sm text-warn tabular-nums break-words">{fmtBRL(totalCPOriginal)}</div>
        </div>
        <div className="card min-w-0 p-3 sm:p-4">
          <div className="text-xs text-text-dim uppercase">Recebido</div>
          <div className="text-base sm:text-lg font-semibold text-success mt-1 tabular-nums break-words">{fmtBRL(totalCRPago)}</div>
        </div>
        <div className="card min-w-0 p-3 sm:p-4">
          <div className="text-xs text-text-dim uppercase">Resultado</div>
          <div className={`text-base sm:text-lg font-semibold mt-1 tabular-nums break-words ${saldo >= 0 ? 'text-success' : 'text-danger'}`}>
            {fmtBRL(saldo)}
          </div>
        </div>
      </div>

      {/* CR preview table */}
      <div>
        <h3 className="text-sm font-medium text-text mb-2">Contas a Receber ({crRows.length})</h3>
        <div className="overflow-x-auto overscroll-x-contain rounded border border-border">
          <table className="w-full text-xs">
            <thead className="bg-bg-3 text-text-dim">
              <tr>
                <th className="px-3 py-2 text-left whitespace-nowrap">Descrição</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Vencimento</th>
                <th className="px-3 py-2 text-right whitespace-nowrap">Valor</th>
                <th className="px-3 py-2 text-right whitespace-nowrap">Pago</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody>
              {crRows.slice(0, 10).map((r, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-3 py-1.5 min-w-[160px]">{r.descricao}{r.numero_parcela ? ` (${r.numero_parcela})` : ''}</td>
                  <td className="px-3 py-1.5 whitespace-nowrap">{fmtDate(r.data_vencimento)}</td>
                  <td className="px-3 py-1.5 text-right whitespace-nowrap tabular-nums">{fmtBRL(Number(r.valor_original))}</td>
                  <td className="px-3 py-1.5 text-right whitespace-nowrap tabular-nums">{fmtBRL(Number(r.valor_pago))}</td>
                  <td className="px-3 py-1.5 whitespace-nowrap">{r.status}</td>
                </tr>
              ))}
              {crRows.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-4 text-center text-text-dim">{total ? 'Nenhum registro.' : 'Nenhum registro no período.'}</td></tr>
              )}
              {crRows.length > 10 && (
                <tr><td colSpan={5} className="px-3 py-2 text-center text-text-dim">... e mais {crRows.length - 10} registros no PDF</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CP preview table */}
      <div>
        <h3 className="text-sm font-medium text-text mb-2">Contas a Pagar ({cpRows.length})</h3>
        <div className="overflow-x-auto overscroll-x-contain rounded border border-border">
          <table className="w-full text-xs">
            <thead className="bg-bg-3 text-text-dim">
              <tr>
                <th className="px-3 py-2 text-left whitespace-nowrap">Descrição</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Categoria</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Vencimento</th>
                <th className="px-3 py-2 text-right whitespace-nowrap">Valor</th>
                <th className="px-3 py-2 text-right whitespace-nowrap">Pago</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody>
              {cpRows.slice(0, 10).map((r, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-3 py-1.5 min-w-[160px]">{r.descricao}{r.numero_documento ? ` (${r.numero_documento})` : ''}</td>
                  <td className="px-3 py-1.5 whitespace-nowrap">{r.categoria?.replaceAll('_', ' ') ?? '—'}</td>
                  <td className="px-3 py-1.5 whitespace-nowrap">{fmtDate(r.data_vencimento)}</td>
                  <td className="px-3 py-1.5 text-right whitespace-nowrap tabular-nums">{fmtBRL(Number(r.valor_original))}</td>
                  <td className="px-3 py-1.5 text-right whitespace-nowrap tabular-nums">{fmtBRL(Number(r.valor_pago))}</td>
                  <td className="px-3 py-1.5 whitespace-nowrap">{r.status}</td>
                </tr>
              ))}
              {cpRows.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-4 text-center text-text-dim">{total ? 'Nenhum registro.' : 'Nenhum registro no período.'}</td></tr>
              )}
              {cpRows.length > 10 && (
                <tr><td colSpan={6} className="px-3 py-2 text-center text-text-dim">... e mais {cpRows.length - 10} registros no PDF</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cronograma preview */}
      {!obraAtual && (
        <div className="rounded border border-border bg-bg-2 px-4 py-4 text-sm text-text-dim">
          Selecione um <strong className="text-text">empreendimento</strong> para incluir o cronograma da obra no relatório.
        </div>
      )}
      {obraAtual && !temTarefas && cronoRows.length === 0 && (
        <div className="rounded border border-border px-4 py-6 text-center text-sm text-text-dim">
          Nenhum cronograma encontrado para este empreendimento. Importe o MS Project na aba <strong>Cronograma</strong>.
        </div>
      )}
      {obraAtual && (temTarefas || cronoRows.length > 0) && (
        <div>
          <h3 className="text-sm font-medium text-text mb-2">Cronograma da Obra</h3>

          <div className="card mb-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-dim uppercase tracking-wide">Avanço físico real</span>
              <span className="text-lg font-bold text-primary">{avancoReal.toFixed(1)}%</span>
            </div>
            <div className="relative h-2.5 rounded-full bg-bg-3">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(100, avancoReal)}%` }}
              />
              {temTarefas && (
                <div
                  title="Previsto para hoje"
                  className="absolute -top-1 h-[18px] w-0.5 bg-text"
                  style={{ left: `${Math.min(100, avancoPrevisto)}%` }}
                />
              )}
            </div>
            {temTarefas && (
              <div className="grid grid-cols-1 gap-1.5 pt-2 border-t border-border sm:grid-cols-3 sm:gap-3 sm:pt-1">
                <div className="flex items-baseline justify-between gap-2 sm:block">
                  <div className="text-xs text-text-dim">Previsto para hoje</div>
                  <div className="text-sm font-semibold text-text tabular-nums">{avancoPrevisto.toFixed(1)}%</div>
                </div>
                <div className="flex items-baseline justify-between gap-2 sm:block">
                  <div className="text-xs text-text-dim">Desvio</div>
                  <div className={`text-sm font-semibold tabular-nums ${desvio >= -0.05 ? 'text-success' : desvio >= -10 ? 'text-warn' : 'text-danger'}`}>
                    {desvio >= 0 ? '+' : ''}{desvio.toFixed(1)} p.p.
                  </div>
                </div>
                <div className="flex items-baseline justify-between gap-2 sm:block">
                  <div className="text-xs text-text-dim">Atividades</div>
                  <div className="text-sm font-semibold text-text tabular-nums">
                    {concluidas} de {folhas.length} concluídas
                    {atrasadas > 0 && <span className="text-danger"> · {atrasadas} atrasada(s)</span>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {temTarefas ? (
            <>
              <h4 className="text-xs uppercase tracking-wide text-text-dim mb-2">
                {total
                  ? `Cronograma da obra (${calc.length} itens)`
                  : `Atividades programadas no período (${noPeriodo.length})`}
              </h4>
              <div className="overflow-x-auto overscroll-x-contain rounded border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-bg-3 text-text-dim">
                    <tr>
                      <th className="px-3 py-2 text-left whitespace-nowrap">EDT</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Atividade</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Início</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Término</th>
                      <th className="px-3 py-2 text-right whitespace-nowrap">Previsto</th>
                      <th className="px-3 py-2 text-center whitespace-nowrap">Real</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tarefasPreview.map((t) => (
                      <tr key={t.id} className={`border-t border-border ${t.resumo ? 'bg-bg-2 font-semibold' : ''}`}>
                        <td className="px-3 py-1.5 whitespace-nowrap text-text-dim">{t.wbs}</td>
                        <td
                          className="px-3 py-1.5 min-w-[180px]"
                          style={total ? { paddingLeft: `${12 + Math.max(0, t.nivel - 1) * 12}px` } : undefined}
                        >
                          {t.nome}
                          {!total && t.caminho && <div className="text-[10px] font-normal text-text-dim">{t.caminho}</div>}
                        </td>
                        <td className="px-3 py-1.5 whitespace-nowrap">{fmtDate(t.data_inicio)}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap">{fmtDate(t.data_fim)}</td>
                        <td className="px-3 py-1.5 text-right whitespace-nowrap tabular-nums text-text-dim">{t.previsto.toFixed(0)}%</td>
                        <td className="px-3 py-1.5 min-w-[110px]">
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 h-1.5 rounded-full bg-bg-3 overflow-hidden">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, t.pct)}%` }} />
                            </div>
                            <span className="w-8 text-right text-text-dim">{t.pct.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-1.5 whitespace-nowrap">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${SITUACAO_APP[t.situacao]}`}>
                            {SITUACAO_LABEL[t.situacao]}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {tarefasPreview.length === 0 && (
                      <tr><td colSpan={7} className="px-3 py-4 text-center text-text-dim">Nenhuma atividade programada no período.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {!total && (
                <p className="mt-2 text-xs text-text-dim">O PDF traz também o cronograma completo.</p>
              )}
            </>
          ) : (
            <div className="overflow-x-auto overscroll-x-contain rounded border border-border">
              <table className="w-full text-xs">
                <thead className="bg-bg-3 text-text-dim">
                  <tr>
                    <th className="px-3 py-2 text-left whitespace-nowrap">Marco</th>
                    <th className="px-3 py-2 text-left whitespace-nowrap">Etapa</th>
                    <th className="px-3 py-2 text-center whitespace-nowrap">% Físico</th>
                    <th className="px-3 py-2 text-left whitespace-nowrap">Prev. Fim</th>
                  </tr>
                </thead>
                <tbody>
                  {cronoRows.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-1.5 font-semibold text-primary whitespace-nowrap">{r.marco}</td>
                      <td className="px-3 py-1.5 min-w-[140px]">{r.etapa.replaceAll('_', ' ')}</td>
                      <td className="px-3 py-1.5 text-center tabular-nums">{Number(r.percentual_fisico).toFixed(0)}%</td>
                      <td className="px-3 py-1.5 whitespace-nowrap">{fmtDate(r.data_fim_prevista)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

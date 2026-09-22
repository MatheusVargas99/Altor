import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/PageHeader';
import { ToggleValores, VALORES_OCULTOS_KEY } from '@/components/ui/ToggleValores';
import { fmtBRL, valorEmAberto } from '@/lib/utils';
import { DashboardCharts } from './DashboardCharts';
import type { ContaPagar, ContaReceber, Empreendimento } from '@/types/db';

export const dynamic = 'force-dynamic';

const PERIODOS = {
  semana: { dias: 7, label: 'Semana', sufixo: '7d' },
  quinzena: { dias: 15, label: 'Quinzena', sufixo: '15d' },
  mes: { dias: 30, label: 'Mês', sufixo: '30d' },
  total: { dias: null, label: 'Total', sufixo: 'total' },
} as const;
type Periodo = keyof typeof PERIODOS;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { obra?: string; periodo?: string };
}) {
  const supabase = createClient();
  const hoje = new Date();
  const inicio6m = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1)
    .toISOString()
    .slice(0, 10);
  const fim6m = new Date(hoje.getFullYear(), hoje.getMonth() + 6, 0)
    .toISOString()
    .slice(0, 10);

  const { data: empreendimentos } = await supabase
    .from('empreendimentos')
    .select('*')
    .order('nome');

  const empreendList = (empreendimentos as Empreendimento[]) ?? [];
  const obraId = searchParams.obra ?? null;
  const periodo: Periodo =
    searchParams.periodo && searchParams.periodo in PERIODOS
      ? (searchParams.periodo as Periodo)
      : 'mes';
  const per = PERIODOS[periodo];
  const hrefDash = (o: string | null, p: Periodo) => {
    const q = new URLSearchParams();
    if (o) q.set('obra', o);
    if (p !== 'mes') q.set('periodo', p);
    const qs = q.toString();
    return qs ? `/dashboard?${qs}` : '/dashboard';
  };

  // Queries for 6-month window
  let crQuery = supabase
    .from('contas_receber')
    .select('*')
    .gte('data_vencimento', inicio6m)
    .lte('data_vencimento', fim6m);
  let cpQuery = supabase
    .from('contas_pagar')
    .select('*')
    .gte('data_vencimento', inicio6m)
    .lte('data_vencimento', fim6m);
  if (obraId) {
    crQuery = crQuery.eq('empreendimento_id', obraId);
    cpQuery = cpQuery.eq('empreendimento_id', obraId);
  }

  // Queries for totals (all time, no date filter)
  let crTotalQuery = supabase.from('contas_receber').select('valor_pago').eq('status', 'PAGO');
  let cpTotalQuery = supabase.from('contas_pagar').select('valor_pago').eq('status', 'PAGO');
  if (obraId) {
    crTotalQuery = crTotalQuery.eq('empreendimento_id', obraId);
    cpTotalQuery = cpTotalQuery.eq('empreendimento_id', obraId);
  }

  // Contas em aberto (qualquer data) — base dos cards de previsão e atrasados
  let crAbertoQuery = supabase
    .from('contas_receber')
    .select('*')
    .not('status', 'in', '("PAGO","CANCELADO")');
  let cpAbertoQuery = supabase
    .from('contas_pagar')
    .select('*')
    .not('status', 'in', '("PAGO","CANCELADO")');
  if (obraId) {
    crAbertoQuery = crAbertoQuery.eq('empreendimento_id', obraId);
    cpAbertoQuery = cpAbertoQuery.eq('empreendimento_id', obraId);
  }

  const [
    { data: cr },
    { data: cp },
    { data: crTotal },
    { data: cpTotal },
    { data: crAberto },
    { data: cpAberto },
  ] = await Promise.all([
    crQuery,
    cpQuery,
    crTotalQuery,
    cpTotalQuery,
    crAbertoQuery,
    cpAbertoQuery,
  ]);

  const crList = (cr as ContaReceber[]) ?? [];
  const cpList = (cp as ContaPagar[]) ?? [];
  const crAbertoList = (crAberto as ContaReceber[]) ?? [];
  const cpAbertoList = (cpAberto as ContaPagar[]) ?? [];

  const empreendAtivos = empreendList.filter(
    (e) => e.status === 'PLANEJAMENTO' || e.status === 'EM_OBRA' || e.status === 'PAUSADO',
  ).length;

  const hojeStr = hoje.toISOString().slice(0, 10);
  let fimPeriodoStr: string | null = null;
  if (per.dias !== null) {
    const fim = new Date(hoje);
    fim.setDate(fim.getDate() + per.dias);
    fimPeriodoStr = fim.toISOString().slice(0, 10);
  }
  const noPeriodo = (r: { data_vencimento: string }) =>
    r.data_vencimento >= hojeStr &&
    (fimPeriodoStr === null || r.data_vencimento <= fimPeriodoStr);

  let aReceber30 = 0;
  for (const r of crAbertoList) {
    if (noPeriodo(r)) aReceber30 += valorEmAberto(r);
  }
  let aPagar30 = 0;
  for (const r of cpAbertoList) {
    if (noPeriodo(r)) aPagar30 += valorEmAberto(r);
  }
  const saldo30 = aReceber30 - aPagar30;

  let atrasadoCR = 0;
  for (const r of crAbertoList) {
    if (r.data_vencimento < hojeStr) atrasadoCR += valorEmAberto(r);
  }
  let atrasadoCP = 0;
  for (const r of cpAbertoList) {
    if (r.data_vencimento < hojeStr) atrasadoCP += valorEmAberto(r);
  }

  // Total recebido e pago (all time)
  const totalRecebido = (crTotal ?? []).reduce(
    (s: number, r: { valor_pago: number }) => s + (Number(r.valor_pago) || 0),
    0,
  );
  const totalPago = (cpTotal ?? []).reduce(
    (s: number, r: { valor_pago: number }) => s + (Number(r.valor_pago) || 0),
    0,
  );
  const saldoCaixa = totalRecebido - totalPago;

  // Caixa de hoje + o que ainda entra/sai no período escolhido
  const saldoTotalPrevisto = saldoCaixa + saldo30;

  // 6-month flow
  const monthKey = (d: string) => d.slice(0, 7);
  const monthsArr: string[] = [];
  for (let i = -5; i <= 0; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    monthsArr.push(d.toISOString().slice(0, 7));
  }
  const fluxoMap: Record<string, { mes: string; receber: number; pagar: number }> = {};
  for (const m of monthsArr) fluxoMap[m] = { mes: m, receber: 0, pagar: 0 };
  for (const r of crList) {
    const k = monthKey(r.data_vencimento);
    if (fluxoMap[k]) fluxoMap[k].receber += Number(r.valor_original) || 0;
  }
  for (const r of cpList) {
    const k = monthKey(r.data_vencimento);
    if (fluxoMap[k]) fluxoMap[k].pagar += Number(r.valor_original) || 0;
  }
  const fluxo = monthsArr.map((m) => fluxoMap[m]);

  // CP by category (for category donut - keep this)
  const catMap: Record<string, number> = {};
  for (const r of cpList) {
    const k = r.categoria ?? 'OUTROS';
    catMap[k] = (catMap[k] ?? 0) + (Number(r.valor_original) || 0);
  }
  const categorias = Object.entries(catMap)
    .map(([nome, valor]) => ({ nome, valor }))
    .filter((x) => x.valor > 0)
    .sort((a, b) => b.valor - a.valor);

  // CP by empreendimento (bar + pie by obra)
  // Fetch all CP (not date-filtered) for obra pie
  let cpAllQuery = supabase.from('contas_pagar').select('empreendimento_id, valor_original');
  if (obraId) cpAllQuery = cpAllQuery.eq('empreendimento_id', obraId);
  const { data: cpAll } = await cpAllQuery;
  const obraMap: Record<string, number> = {};
  for (const r of cpAll ?? []) {
    if (!r.empreendimento_id) continue;
    obraMap[r.empreendimento_id] =
      (obraMap[r.empreendimento_id] ?? 0) + (Number(r.valor_original) || 0);
  }
  const obras = empreendList
    .map((e) => ({ id: e.id, nome: e.codigo_curto ?? e.nome, valor: obraMap[e.id] ?? 0 }))
    .filter((x) => x.valor > 0)
    .sort((a, b) => b.valor - a.valor);

  return (
    <div className="p-6 space-y-6">
      {/* Aplica o modo oculto antes da primeira pintura, evitando piscar os valores */}
      <script
        dangerouslySetInnerHTML={{
          __html: `try{if(localStorage.getItem('${VALORES_OCULTOS_KEY}')==='1')document.documentElement.classList.add('valores-ocultos')}catch(e){}`,
        }}
      />
      <PageHeader
        title="Dashboard"
        description="Visão geral físico-financeira."
        actions={<ToggleValores />}
      />

      {/* Obra filter */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={hrefDash(null, periodo)}
          className={`rounded px-3 py-1 text-sm border ${
            !obraId
              ? 'border-primary text-primary bg-primary/10'
              : 'border-border text-text-dim hover:border-primary/50'
          }`}
        >
          Todas obras
        </Link>
        {empreendList.map((o) => (
          <Link
            key={o.id}
            href={hrefDash(o.id, periodo)}
            className={`rounded px-3 py-1 text-sm border ${
              obraId === o.id
                ? 'border-primary text-primary bg-primary/10'
                : 'border-border text-text-dim hover:border-primary/50'
            }`}
          >
            {o.codigo_curto ?? o.nome}
          </Link>
        ))}
      </div>

      {/* Período filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase text-text-dim mr-1">Período</span>
        {(Object.keys(PERIODOS) as Periodo[]).map((p) => (
          <Link
            key={p}
            href={hrefDash(obraId, p)}
            className={`rounded px-3 py-1 text-sm border ${
              periodo === p
                ? 'border-primary text-primary bg-primary/10'
                : 'border-border text-text-dim hover:border-primary/50'
            }`}
          >
            {PERIODOS[p].label}
          </Link>
        ))}
        <span className="text-xs text-text-dim ml-1">
          {fimPeriodoStr
            ? `vencimentos de hoje até ${fimPeriodoStr.split('-').reverse().join('/')}`
            : 'todos os vencimentos a partir de hoje'}
        </span>
      </div>

      {/* Row 1: period widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="text-xs uppercase text-text-dim">Empreendimentos ativos</div>
          <div className="text-2xl font-semibold text-primary mt-1 valor-sensivel">{empreendAtivos}</div>
          <Link href="/empreendimentos" className="text-xs text-info hover:underline mt-1 inline-block">
            ver obras →
          </Link>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-text-dim">A receber ({per.sufixo})</div>
          <div className="text-2xl font-semibold text-success mt-1 valor-sensivel">{fmtBRL(aReceber30)}</div>
          <Link href="/contas-receber" className="text-xs text-info hover:underline mt-1 inline-block">
            CR →
          </Link>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-text-dim">A pagar ({per.sufixo})</div>
          <div className="text-2xl font-semibold text-warn mt-1 valor-sensivel">{fmtBRL(aPagar30)}</div>
          <Link href="/contas-pagar" className="text-xs text-info hover:underline mt-1 inline-block">
            CP →
          </Link>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-text-dim">Saldo previsto ({per.sufixo})</div>
          <div className={`text-2xl font-semibold mt-1 valor-sensivel ${saldo30 >= 0 ? 'text-success' : 'text-danger'}`}>
            {fmtBRL(saldo30)}
          </div>
        </div>
      </div>

      {/* Row 2: Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="text-xs uppercase text-text-dim">Total recebido (período total)</div>
          <div className="text-xl font-semibold text-success mt-1 valor-sensivel">{fmtBRL(totalRecebido)}</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-text-dim">Total pago (período total)</div>
          <div className="text-xl font-semibold text-warn mt-1 valor-sensivel">{fmtBRL(totalPago)}</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-text-dim">Saldo em caixa</div>
          <div className={`text-xl font-semibold mt-1 valor-sensivel ${saldoCaixa >= 0 ? 'text-success' : 'text-danger'}`}>
            {fmtBRL(saldoCaixa)}
          </div>
        </div>
        <div className="card border-primary/40">
          <div className="text-xs uppercase text-text-dim">
            Saldo total previsto em caixa
          </div>
          <div
            className={`text-xl font-semibold mt-1 valor-sensivel ${
              saldoTotalPrevisto >= 0 ? 'text-success' : 'text-danger'
            }`}
          >
            {fmtBRL(saldoTotalPrevisto)}
          </div>
          <div className="text-xs text-text-dim mt-1">
            caixa + saldo previsto ({per.sufixo})
          </div>
        </div>
      </div>

      {/* Row 3: Atrasados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card">
          <div className="text-xs uppercase text-text-dim">Atrasado a receber</div>
          <div className="text-xl font-semibold text-danger mt-1 valor-sensivel">{fmtBRL(atrasadoCR)}</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-text-dim">Atrasado a pagar</div>
          <div className="text-xl font-semibold text-danger mt-1 valor-sensivel">{fmtBRL(atrasadoCP)}</div>
        </div>
      </div>

      <div className="valor-sensivel">
        <DashboardCharts
          fluxo={fluxo}
          categorias={categorias}
          obras={obras}
          empreendimentos={empreendList.map((e) => ({ id: e.id, nome: e.codigo_curto ?? e.nome }))}
        />
      </div>
    </div>
  );
}

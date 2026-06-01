import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/PageHeader';
import { fmtBRL } from '@/lib/utils';
import { DashboardCharts } from './DashboardCharts';
import type { ContaPagar, ContaReceber, Empreendimento } from '@/types/db';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { obra?: string };
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

  const [{ data: cr }, { data: cp }, { data: crTotal }, { data: cpTotal }] =
    await Promise.all([crQuery, cpQuery, crTotalQuery, cpTotalQuery]);

  const crList = (cr as ContaReceber[]) ?? [];
  const cpList = (cp as ContaPagar[]) ?? [];

  const empreendAtivos = empreendList.filter(
    (e) => e.status === 'PLANEJAMENTO' || e.status === 'EM_OBRA' || e.status === 'PAUSADO',
  ).length;

  const hojeStr = hoje.toISOString().slice(0, 10);
  const em30 = new Date(hoje);
  em30.setDate(em30.getDate() + 30);
  const em30Str = em30.toISOString().slice(0, 10);

  let aReceber30 = 0;
  for (const r of crList) {
    if (
      r.status !== 'PAGO' &&
      r.status !== 'CANCELADO' &&
      r.data_vencimento >= hojeStr &&
      r.data_vencimento <= em30Str
    ) {
      aReceber30 += Number(r.valor_aberto) || 0;
    }
  }
  let aPagar30 = 0;
  for (const r of cpList) {
    if (
      r.status !== 'PAGO' &&
      r.status !== 'CANCELADO' &&
      r.data_vencimento >= hojeStr &&
      r.data_vencimento <= em30Str
    ) {
      aPagar30 += Number(r.valor_aberto) || 0;
    }
  }
  const saldo30 = aReceber30 - aPagar30;

  let atrasadoCR = 0;
  for (const r of crList) {
    if (r.status !== 'PAGO' && r.status !== 'CANCELADO' && r.data_vencimento < hojeStr)
      atrasadoCR += Number(r.valor_aberto) || 0;
  }
  let atrasadoCP = 0;
  for (const r of cpList) {
    if (r.status !== 'PAGO' && r.status !== 'CANCELADO' && r.data_vencimento < hojeStr)
      atrasadoCP += Number(r.valor_aberto) || 0;
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
      <PageHeader
        title="Dashboard"
        description="Visão geral físico-financeira."
      />

      {/* Obra filter */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/dashboard"
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
            href={`/dashboard?obra=${o.id}`}
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

      {/* Row 1: 30-day widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="text-xs uppercase text-text-dim">Empreendimentos ativos</div>
          <div className="text-2xl font-semibold text-primary mt-1">{empreendAtivos}</div>
          <Link href="/empreendimentos" className="text-xs text-info hover:underline mt-1 inline-block">
            ver obras →
          </Link>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-text-dim">A receber (30d)</div>
          <div className="text-2xl font-semibold text-success mt-1">{fmtBRL(aReceber30)}</div>
          <Link href="/contas-receber" className="text-xs text-info hover:underline mt-1 inline-block">
            CR →
          </Link>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-text-dim">A pagar (30d)</div>
          <div className="text-2xl font-semibold text-warn mt-1">{fmtBRL(aPagar30)}</div>
          <Link href="/contas-pagar" className="text-xs text-info hover:underline mt-1 inline-block">
            CP →
          </Link>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-text-dim">Saldo previsto (30d)</div>
          <div className={`text-2xl font-semibold mt-1 ${saldo30 >= 0 ? 'text-success' : 'text-danger'}`}>
            {fmtBRL(saldo30)}
          </div>
        </div>
      </div>

      {/* Row 2: Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-xs uppercase text-text-dim">Total recebido (período total)</div>
          <div className="text-xl font-semibold text-success mt-1">{fmtBRL(totalRecebido)}</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-text-dim">Total pago (período total)</div>
          <div className="text-xl font-semibold text-warn mt-1">{fmtBRL(totalPago)}</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-text-dim">Saldo em caixa</div>
          <div className={`text-xl font-semibold mt-1 ${saldoCaixa >= 0 ? 'text-success' : 'text-danger'}`}>
            {fmtBRL(saldoCaixa)}
          </div>
        </div>
      </div>

      {/* Row 3: Atrasados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card">
          <div className="text-xs uppercase text-text-dim">Atrasado a receber</div>
          <div className="text-xl font-semibold text-danger mt-1">{fmtBRL(atrasadoCR)}</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-text-dim">Atrasado a pagar</div>
          <div className="text-xl font-semibold text-danger mt-1">{fmtBRL(atrasadoCP)}</div>
        </div>
      </div>

      <DashboardCharts
        fluxo={fluxo}
        categorias={categorias}
        obras={obras}
        empreendimentos={empreendList.map((e) => ({ id: e.id, nome: e.codigo_curto ?? e.nome }))}
      />
    </div>
  );
}

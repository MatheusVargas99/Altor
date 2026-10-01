'use client';

import { useSyncExternalStore } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fmtBRL } from '@/lib/utils';

// Stable colors for obras — each obra gets a fixed color by its index
const OBRA_COLORS = [
  '#C9A961',
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#06B6D4',
  '#F472B6',
  '#84CC16',
  '#94A3B8',
];

const CAT_COLORS = [
  '#EF4444',
  '#F59E0B',
  '#8B5CF6',
  '#06B6D4',
  '#F472B6',
  '#84CC16',
  '#C9A961',
  '#3B82F6',
  '#10B981',
  '#94A3B8',
];

// Eixo Y curto ("12k", "1,2M") para não roubar largura no celular
const fmtCurto = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (a >= 1000) return `${Math.round(v / 1000)}k`;
  return String(v);
};

const TICK = { fontSize: 11 };
const TOOLTIP_STYLE = { background: '#1E293B', border: '1px solid #334155', color: '#F1F5F9' };
const LEGEND_STYLE = { fontSize: 12 };
const ALTURA = 'h-[240px] sm:h-[280px]';

const QUERY_SM = '(min-width: 640px)';
const assinarSm = (cb: () => void) => {
  const mq = window.matchMedia(QUERY_SM);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};

/** true a partir de `sm`. No servidor assume desktop, mantendo o HTML de antes. */
function useTelaGrande() {
  return useSyncExternalStore(
    assinarSm,
    () => window.matchMedia(QUERY_SM).matches,
    () => true,
  );
}

const monthLabel = (yyyymm: string) => {
  const [y, m] = yyyymm.split('-');
  return `${m}/${y.slice(2)}`;
};

export function DashboardCharts({
  fluxo,
  categorias,
  obras,
  empreendimentos,
}: {
  fluxo: { mes: string; receber: number; pagar: number }[];
  categorias: { nome: string; valor: number }[];
  obras: { id: string; nome: string; valor: number }[];
  empreendimentos: { id: string; nome: string }[];
}) {
  const telaGrande = useTelaGrande();
  const fluxoData = fluxo.map((f) => ({
    mes: monthLabel(f.mes),
    Receber: f.receber,
    Pagar: f.pagar,
  }));

  // Map obra id → stable color index
  const obraColorMap = Object.fromEntries(
    empreendimentos.map((e, i) => [e.id, OBRA_COLORS[i % OBRA_COLORS.length]]),
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
      {/* 6-month flow */}
      <div className="card min-w-0 p-3 sm:p-4 lg:col-span-2">
        <div className="text-sm text-text-dim mb-2">Fluxo previsto — 6 meses</div>
        <div className={`w-full ${ALTURA}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={fluxoData} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
              <XAxis dataKey="mes" stroke="#94A3B8" tick={TICK} interval="preserveStartEnd" />
              <YAxis
                stroke="#94A3B8"
                tick={TICK}
                width={44}
                tickFormatter={(v) => fmtCurto(Number(v))}
              />
              <Tooltip formatter={(v) => fmtBRL(Number(v))} contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={LEGEND_STYLE} />
              <Line type="monotone" dataKey="Receber" stroke="#10B981" strokeWidth={2} />
              <Line type="monotone" dataKey="Pagar" stroke="#EF4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie: spending by obra with distinct colors */}
      <div className="card min-w-0 p-3 sm:p-4">
        <div className="text-sm text-text-dim mb-2">Gasto por obra</div>
        {obras.length === 0 ? (
          <div className="text-text-dim text-sm py-12 text-center">Sem dados.</div>
        ) : (
          <div className={`w-full ${ALTURA}`}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                {/* No celular os rótulos externos estouram a largura — fica só a legenda */}
                <Pie
                  data={obras}
                  dataKey="valor"
                  nameKey="nome"
                  outerRadius={telaGrande ? 100 : '75%'}
                  label={telaGrande ? ({ name }) => String(name ?? '') : false}
                  labelLine={telaGrande}
                >
                  {obras.map((o) => (
                    <Cell
                      key={o.id}
                      fill={obraColorMap[o.id] ?? OBRA_COLORS[0]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmtBRL(Number(v))} contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={LEGEND_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Pie: expenses by category */}
      <div className="card min-w-0 p-3 sm:p-4">
        <div className="text-sm text-text-dim mb-2">Despesas por categoria</div>
        {categorias.length === 0 ? (
          <div className="text-text-dim text-sm py-12 text-center">Sem dados.</div>
        ) : (
          <div className="h-[320px] w-full sm:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categorias}
                  dataKey="valor"
                  nameKey="nome"
                  outerRadius={telaGrande ? 100 : '70%'}
                  label={
                    telaGrande ? ({ name }) => String(name ?? '').replaceAll('_', ' ') : false
                  }
                  labelLine={telaGrande}
                >
                  {categorias.map((_, i) => (
                    <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmtBRL(Number(v))} contentStyle={TOOLTIP_STYLE} />
                {!telaGrande && (
                  <Legend
                    wrapperStyle={LEGEND_STYLE}
                    formatter={(v) => String(v ?? '').replaceAll('_', ' ')}
                  />
                )}
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Bar: total spent per obra */}
      <div className="card min-w-0 p-3 sm:p-4 lg:col-span-2">
        <div className="text-sm text-text-dim mb-2">Gasto total por empreendimento</div>
        {obras.length === 0 ? (
          <div className="text-text-dim text-sm py-12 text-center">Sem dados.</div>
        ) : (
          <div className={`w-full ${ALTURA}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={obras} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                {/* No celular os nomes inclinam para caber todas as obras */}
                <XAxis
                  dataKey="nome"
                  stroke="#94A3B8"
                  tick={{ fontSize: telaGrande ? 11 : 10 }}
                  interval={0}
                  angle={telaGrande ? 0 : -35}
                  textAnchor={telaGrande ? 'middle' : 'end'}
                  height={telaGrande ? 30 : 56}
                />
                <YAxis
                  stroke="#94A3B8"
                  tick={TICK}
                  width={44}
                  tickFormatter={(v) => fmtCurto(Number(v))}
                />
                <Tooltip
                  formatter={(v) => fmtBRL(Number(v))}
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: 'rgba(148,163,184,0.12)' }}
                />
                <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                  {obras.map((o) => (
                    <Cell
                      key={o.id}
                      fill={obraColorMap[o.id] ?? OBRA_COLORS[0]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

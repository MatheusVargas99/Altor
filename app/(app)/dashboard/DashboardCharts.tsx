'use client';

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 6-month flow */}
      <div className="card lg:col-span-2">
        <div className="text-sm text-text-dim mb-2">Fluxo previsto — 6 meses</div>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={fluxoData}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
              <XAxis dataKey="mes" stroke="#94A3B8" />
              <YAxis
                stroke="#94A3B8"
                tickFormatter={(v) =>
                  Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(0)}k` : String(v)
                }
              />
              <Tooltip
                formatter={(v) => fmtBRL(Number(v))}
                contentStyle={{ background: '#1E293B', border: '1px solid #334155', color: '#F1F5F9' }}
              />
              <Legend />
              <Line type="monotone" dataKey="Receber" stroke="#10B981" strokeWidth={2} />
              <Line type="monotone" dataKey="Pagar" stroke="#EF4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie: spending by obra with distinct colors */}
      <div className="card">
        <div className="text-sm text-text-dim mb-2">Gasto por obra</div>
        {obras.length === 0 ? (
          <div className="text-text-dim text-sm py-12 text-center">Sem dados.</div>
        ) : (
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={obras}
                  dataKey="valor"
                  nameKey="nome"
                  outerRadius={100}
                  label={({ name }) => String(name ?? '')}
                >
                  {obras.map((o) => (
                    <Cell
                      key={o.id}
                      fill={obraColorMap[o.id] ?? OBRA_COLORS[0]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => fmtBRL(Number(v))}
                  contentStyle={{ background: '#1E293B', border: '1px solid #334155', color: '#F1F5F9' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Pie: expenses by category */}
      <div className="card">
        <div className="text-sm text-text-dim mb-2">Despesas por categoria</div>
        {categorias.length === 0 ? (
          <div className="text-text-dim text-sm py-12 text-center">Sem dados.</div>
        ) : (
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={categorias}
                  dataKey="valor"
                  nameKey="nome"
                  outerRadius={100}
                  label={({ name }) => String(name ?? '').replaceAll('_', ' ')}
                >
                  {categorias.map((_, i) => (
                    <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => fmtBRL(Number(v))}
                  contentStyle={{ background: '#1E293B', border: '1px solid #334155', color: '#F1F5F9' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Bar: total spent per obra */}
      <div className="card lg:col-span-2">
        <div className="text-sm text-text-dim mb-2">Gasto total por empreendimento</div>
        {obras.length === 0 ? (
          <div className="text-text-dim text-sm py-12 text-center">Sem dados.</div>
        ) : (
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={obras}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis dataKey="nome" stroke="#94A3B8" />
                <YAxis
                  stroke="#94A3B8"
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                />
                <Tooltip
                  formatter={(v) => fmtBRL(Number(v))}
                  contentStyle={{ background: '#1E293B', border: '1px solid #334155', color: '#F1F5F9' }}
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

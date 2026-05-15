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

const COLORS = [
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

const monthLabel = (yyyymm: string) => {
  const [y, m] = yyyymm.split('-');
  return `${m}/${y.slice(2)}`;
};

export function DashboardCharts({
  fluxo,
  categorias,
  obras,
}: {
  fluxo: { mes: string; receber: number; pagar: number }[];
  categorias: { nome: string; valor: number }[];
  obras: { nome: string; valor: number }[];
}) {
  const fluxoData = fluxo.map((f) => ({
    mes: monthLabel(f.mes),
    Receber: f.receber,
    Pagar: f.pagar,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                contentStyle={{
                  background: '#1E293B',
                  border: '1px solid #334155',
                  color: '#F1F5F9',
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="Receber" stroke="#10B981" strokeWidth={2} />
              <Line type="monotone" dataKey="Pagar" stroke="#EF4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

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
                  label={({ name }) =>
                    String(name ?? '').replaceAll('_', ' ')
                  }
                >
                  {categorias.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => fmtBRL(Number(v))}
                  contentStyle={{
                    background: '#1E293B',
                    border: '1px solid #334155',
                    color: '#F1F5F9',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card">
        <div className="text-sm text-text-dim mb-2">Gasto por empreendimento</div>
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
                  contentStyle={{
                    background: '#1E293B',
                    border: '1px solid #334155',
                    color: '#F1F5F9',
                  }}
                />
                <Bar dataKey="valor" fill="#C9A961" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

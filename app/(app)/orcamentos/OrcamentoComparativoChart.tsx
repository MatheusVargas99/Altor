'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Orcamento } from '@/types/db';

const CHART_COLORS = [
  '#C9A961', '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#06B6D4', '#F472B6', '#84CC16', '#94A3B8',
];

export function OrcamentoComparativoChart({
  items,
  empresaNomes,
}: {
  items: Orcamento[];
  empresaNomes: Record<string, string>;
}) {
  return (
    <div style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer>
        <BarChart
          data={items.map((o, idx) => ({
            empresa: o.empresa_id ? (empresaNomes[o.empresa_id] ?? '—') : '—',
            total: Number(o.valor_total),
            idx,
          }))}
          margin={{ top: 5, right: 10, left: 10, bottom: 40 }}
        >
          <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
          <XAxis
            dataKey="empresa"
            stroke="#94A3B8"
            tick={{ fontSize: 11, fill: '#94A3B8' }}
            angle={-25}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            stroke="#94A3B8"
            tick={{ fontSize: 11, fill: '#94A3B8' }}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
            }
          />
          <Tooltip
            formatter={(v) =>
              new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(Number(v ?? 0))
            }
            contentStyle={{
              background: '#1E293B',
              border: '1px solid #334155',
              color: '#F1F5F9',
              fontSize: 12,
            }}
          />
          <Bar dataKey="total" radius={[4, 4, 0, 0]}>
            {items.map((o, idx) => (
              <Cell
                key={o.id}
                fill={
                  o.status === 'VENCEDOR'
                    ? '#10B981'
                    : o.status === 'PERDEDOR'
                      ? '#475569'
                      : CHART_COLORS[idx % CHART_COLORS.length]
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

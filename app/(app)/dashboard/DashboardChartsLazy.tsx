'use client';

import dynamic from 'next/dynamic';

const ChartSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
    <div className="card h-72 animate-pulse bg-bg-2" />
    <div className="card h-72 animate-pulse bg-bg-2" />
    <div className="card h-72 animate-pulse bg-bg-2" />
    <div className="card h-72 animate-pulse bg-bg-2" />
  </div>
);

export const DashboardCharts = dynamic(
  () => import('./DashboardCharts').then((m) => ({ default: m.DashboardCharts })),
  {
    ssr: false,
    loading: () => <ChartSkeleton />,
  },
);

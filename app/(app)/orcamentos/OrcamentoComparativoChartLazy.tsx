'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/Skeleton';

export const OrcamentoComparativoChart = dynamic(
  () =>
    import('./OrcamentoComparativoChart').then((m) => ({
      default: m.OrcamentoComparativoChart,
    })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[220px] w-full" />,
  },
);

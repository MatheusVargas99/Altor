import { createClient } from '@/lib/supabase/server';
import { EmpresasClient } from './EmpresasClient';
import type { Empresa } from '@/types/db';

export const dynamic = 'force-dynamic';

export default async function EmpresasPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('empresas')
    .select('*')
    .order('razao_social');

  return (
    <div className="p-6">
      <EmpresasClient
        initial={(data as Empresa[]) ?? []}
        loadError={error?.message ?? null}
      />
    </div>
  );
}

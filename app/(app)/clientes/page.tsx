import { createClient } from '@/lib/supabase/server';
import { ClientesClient } from './ClientesClient';
import type { Cliente } from '@/types/db';

export const dynamic = 'force-dynamic';

export default async function ClientesPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('nome_completo');

  return (
    <div className="p-6">
      <ClientesClient
        initial={(data as Cliente[]) ?? []}
        loadError={error?.message ?? null}
      />
    </div>
  );
}

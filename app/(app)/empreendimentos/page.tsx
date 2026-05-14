import { createClient } from '@/lib/supabase/server';
import { EmpreendimentosClient } from './EmpreendimentosClient';
import type { Empreendimento } from '@/types/db';

export const dynamic = 'force-dynamic';

export default async function EmpreendimentosPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('empreendimentos')
    .select('*')
    .order('nome');

  return (
    <div className="p-6">
      <EmpreendimentosClient
        initial={(data as Empreendimento[]) ?? []}
        loadError={error?.message ?? null}
      />
    </div>
  );
}

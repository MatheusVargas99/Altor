import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/PageHeader';
import { RelatoriosClient } from './RelatoriosClient';
import type { Empreendimento } from '@/types/db';

export const dynamic = 'force-dynamic';

export default async function RelatoriosPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from('empreendimentos')
    .select('id, nome, codigo_curto')
    .order('nome');

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title="Relatórios"
        description="Geração de relatórios financeiros e de obra em PDF."
      />
      <RelatoriosClient
        empreendimentos={
          (data as Pick<Empreendimento, 'id' | 'nome' | 'codigo_curto'>[]) ?? []
        }
      />
    </div>
  );
}

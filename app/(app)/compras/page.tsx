import { createClient } from '@/lib/supabase/server';
import { ComprasClient } from './ComprasClient';
import type { Compra, Empreendimento, Empresa } from '@/types/db';

export const dynamic = 'force-dynamic';

export default async function ComprasPage() {
  const supabase = createClient();
  const [{ data, error }, { data: empreend }, { data: empresas }] = await Promise.all([
    supabase
      .from('compras')
      .select('*')
      .order('data_aprovacao', { ascending: false }),
    supabase.from('empreendimentos').select('id, nome, codigo_curto').order('nome'),
    supabase
      .from('empresas')
      .select('id, razao_social, nome_fantasia')
      .order('razao_social'),
  ]);

  return (
    <div className="p-6">
      <ComprasClient
        initial={(data as Compra[]) ?? []}
        empreendimentos={(empreend as Pick<Empreendimento, 'id' | 'nome' | 'codigo_curto'>[]) ?? []}
        empresas={(empresas as Pick<Empresa, 'id' | 'razao_social' | 'nome_fantasia'>[]) ?? []}
        loadError={error?.message ?? null}
      />
    </div>
  );
}

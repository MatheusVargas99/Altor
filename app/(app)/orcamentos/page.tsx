import { createClient } from '@/lib/supabase/server';
import { OrcamentosClient } from './OrcamentosClient';
import type { Empreendimento, Empresa, Orcamento } from '@/types/db';

export const dynamic = 'force-dynamic';

export default async function OrcamentosPage() {
  const supabase = createClient();
  const [{ data: orcs, error }, { data: empreend }, { data: empresas }] =
    await Promise.all([
      supabase
        .from('orcamentos')
        .select('*')
        .order('empreendimento_id')
        .order('etapa')
        .order('grupo_cotacao')
        .order('valor_total', { ascending: true }),
      supabase.from('empreendimentos').select('id, nome, codigo_curto').order('nome'),
      supabase
        .from('empresas')
        .select('id, razao_social, nome_fantasia')
        .order('razao_social'),
    ]);

  return (
    <div className="p-6">
      <OrcamentosClient
        initial={(orcs as Orcamento[]) ?? []}
        empreendimentos={(empreend as Pick<Empreendimento, 'id' | 'nome' | 'codigo_curto'>[]) ?? []}
        empresas={(empresas as Pick<Empresa, 'id' | 'razao_social' | 'nome_fantasia'>[]) ?? []}
        loadError={error?.message ?? null}
      />
    </div>
  );
}

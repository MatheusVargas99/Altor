import { createClient } from '@/lib/supabase/server';
import { ComissoesClient } from './ComissoesClient';
import type { Cliente, Comissao, Empreendimento, Empresa } from '@/types/db';

export const dynamic = 'force-dynamic';

export default async function ComissoesPage() {
  const supabase = createClient();
  const [
    { data: comissoes, error },
    { data: empreend },
    { data: clientes },
    { data: empresas },
  ] = await Promise.all([
    supabase
      .from('comissoes')
      .select('*')
      .order('data_prevista', { ascending: false }),
    supabase.from('empreendimentos').select('id, nome').order('nome'),
    supabase.from('clientes').select('id, nome_completo').order('nome_completo'),
    supabase
      .from('empresas')
      .select('id, razao_social, nome_fantasia')
      .order('razao_social'),
  ]);

  return (
    <div className="p-6">
      <ComissoesClient
        initial={(comissoes as Comissao[]) ?? []}
        empreendimentos={(empreend as Pick<Empreendimento, 'id' | 'nome'>[]) ?? []}
        clientes={(clientes as Pick<Cliente, 'id' | 'nome_completo'>[]) ?? []}
        empresas={
          (empresas as Pick<Empresa, 'id' | 'razao_social' | 'nome_fantasia'>[]) ?? []
        }
        loadError={error?.message ?? null}
      />
    </div>
  );
}

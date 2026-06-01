import { createClient } from '@/lib/supabase/server';
import { ContratosClient } from './ContratosClient';
import type { Cliente, Contrato, Empreendimento, Empresa } from '@/types/db';

export const dynamic = 'force-dynamic';

export default async function ContratosPage() {
  const supabase = createClient();
  const [{ data, error }, { data: empreend }, { data: clientes }, { data: empresas }] =
    await Promise.all([
      supabase
        .from('contratos')
        .select('*')
        .order('data_assinatura', { ascending: false }),
      supabase.from('empreendimentos').select('id, nome, codigo_curto').order('nome'),
      supabase.from('clientes').select('id, nome_completo').order('nome_completo'),
      supabase
        .from('empresas')
        .select('id, razao_social, nome_fantasia')
        .order('razao_social'),
    ]);

  return (
    <div className="p-6">
      <ContratosClient
        initial={(data as Contrato[]) ?? []}
        empreendimentos={(empreend as Pick<Empreendimento, 'id' | 'nome' | 'codigo_curto'>[]) ?? []}
        clientes={(clientes as Pick<Cliente, 'id' | 'nome_completo'>[]) ?? []}
        empresas={(empresas as Pick<Empresa, 'id' | 'razao_social' | 'nome_fantasia'>[]) ?? []}
        loadError={error?.message ?? null}
      />
    </div>
  );
}

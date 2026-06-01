import { createClient } from '@/lib/supabase/server';
import { ContasPagarClient } from './ContasPagarClient';
import type { ContaPagar, Empreendimento, Empresa } from '@/types/db';

export const dynamic = 'force-dynamic';

export default async function CPPage() {
  const supabase = createClient();
  const [{ data: contas, error }, { data: empreend }, { data: empresas }] =
    await Promise.all([
      supabase
        .from('contas_pagar')
        .select('*')
        .order('data_vencimento', { ascending: false }),
      supabase.from('empreendimentos').select('id, nome, codigo_curto').order('nome'),
      supabase.from('empresas').select('id, razao_social, nome_fantasia').order('razao_social'),
    ]);

  return (
    <div className="p-6">
      <ContasPagarClient
        initial={(contas as ContaPagar[]) ?? []}
        empreendimentos={(empreend as Pick<Empreendimento, 'id' | 'nome' | 'codigo_curto'>[]) ?? []}
        empresas={(empresas as Pick<Empresa, 'id' | 'razao_social' | 'nome_fantasia'>[]) ?? []}
        loadError={error?.message ?? null}
      />
    </div>
  );
}

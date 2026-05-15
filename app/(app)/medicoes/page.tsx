import { createClient } from '@/lib/supabase/server';
import { MedicoesClient } from './MedicoesClient';
import type { Empreendimento, Empresa, Medicao } from '@/types/db';

export const dynamic = 'force-dynamic';

export default async function MedicoesPage() {
  const supabase = createClient();
  const [{ data, error }, { data: empreend }, { data: empresas }] = await Promise.all([
    supabase
      .from('medicoes')
      .select('*')
      .order('data_medicao', { ascending: false }),
    supabase.from('empreendimentos').select('id, nome, codigo_curto').order('nome'),
    supabase
      .from('empresas')
      .select('id, razao_social, nome_fantasia')
      .order('razao_social'),
  ]);

  return (
    <div className="p-6">
      <MedicoesClient
        initial={(data as Medicao[]) ?? []}
        empreendimentos={(empreend as Pick<Empreendimento, 'id' | 'nome' | 'codigo_curto'>[]) ?? []}
        empresas={(empresas as Pick<Empresa, 'id' | 'razao_social' | 'nome_fantasia'>[]) ?? []}
        loadError={error?.message ?? null}
      />
    </div>
  );
}

import { createClient } from '@/lib/supabase/server';
import { ContasReceberClient } from './ContasReceberClient';
import type { Cliente, ContaReceber, Empreendimento } from '@/types/db';

export const dynamic = 'force-dynamic';

export default async function CRPage() {
  const supabase = createClient();
  const [{ data: contas, error }, { data: empreend }, { data: clientes }] =
    await Promise.all([
      supabase
        .from('contas_receber')
        .select('*')
        .order('data_vencimento', { ascending: false }),
      supabase
        .from('empreendimentos')
        .select('id, nome, codigo_curto')
        .order('nome'),
      supabase.from('clientes').select('id, nome_completo').order('nome_completo'),
    ]);

  return (
    <div className="p-6">
      <ContasReceberClient
        initial={(contas as ContaReceber[]) ?? []}
        empreendimentos={(empreend as Pick<Empreendimento, 'id' | 'nome' | 'codigo_curto'>[]) ?? []}
        clientes={(clientes as Pick<Cliente, 'id' | 'nome_completo'>[]) ?? []}
        loadError={error?.message ?? null}
      />
    </div>
  );
}

import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/PageHeader';
import { AgendaClient } from './AgendaClient';
import type { Empreendimento } from '@/types/db';

export const dynamic = 'force-dynamic';

export default async function AgendaPage() {
  const supabase = createClient();

  // 12 months back (catches all overdue) + 3 months forward
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear() - 1, hoje.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 3, 0)
    .toISOString()
    .slice(0, 10);

  const [
    { data: empreendimentos },
    { data: crRows },
    { data: cpRows },
    { data: comissoesRows },
    { data: contratosRows },
  ] = await Promise.all([
    supabase.from('empreendimentos').select('id, nome, codigo_curto').order('nome'),
    supabase
      .from('contas_receber')
      .select(
        'id, descricao, valor_original, valor_aberto, data_vencimento, status, empreendimento_id, numero_parcela',
      )
      .gte('data_vencimento', inicio)
      .lte('data_vencimento', fim)
      .neq('status', 'CANCELADO')
      .order('data_vencimento'),
    supabase
      .from('contas_pagar')
      .select(
        'id, descricao, valor_original, valor_aberto, data_vencimento, status, empreendimento_id',
      )
      .gte('data_vencimento', inicio)
      .lte('data_vencimento', fim)
      .neq('status', 'CANCELADO')
      .order('data_vencimento'),
    supabase
      .from('comissoes')
      .select(
        'id, beneficiario_nome, valor_parcela, data_prevista, status, empreendimento_id, parcela',
      )
      .gte('data_prevista', inicio)
      .lte('data_prevista', fim)
      .neq('status', 'CANCELADA')
      .order('data_prevista'),
    supabase
      .from('contratos')
      .select(
        'id, numero, parte_nome, valor_total, data_vigencia_fim, status, empreendimento_id, tipo',
      )
      .in('status', ['EM_ELABORACAO', 'ATIVO', 'INADIMPLENTE'])
      .order('data_vigencia_fim'),
  ]);

  const obras =
    (empreendimentos as Pick<Empreendimento, 'id' | 'nome' | 'codigo_curto'>[]) ?? [];

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title="Agenda"
        description="Visão consolidada de vencimentos e pendências. Atualize status diretamente aqui."
      />
      <AgendaClient
        obras={obras}
        crRows={crRows ?? []}
        cpRows={cpRows ?? []}
        comissoesRows={comissoesRows ?? []}
        contratosRows={contratosRows ?? []}
      />
    </div>
  );
}

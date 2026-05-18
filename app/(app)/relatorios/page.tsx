import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/PageHeader';
import { RelatoriosClient } from './RelatoriosClient';
import type { Empreendimento } from '@/types/db';

export const dynamic = 'force-dynamic';

function getPeriodDates(tipo: string) {
  const hoje = new Date();
  const fim = hoje.toISOString().slice(0, 10);
  let inicio: string;
  if (tipo === 'SEMANAL') {
    const d = new Date(hoje); d.setDate(d.getDate() - 7);
    inicio = d.toISOString().slice(0, 10);
  } else if (tipo === 'QUINZENAL') {
    const d = new Date(hoje); d.setDate(d.getDate() - 15);
    inicio = d.toISOString().slice(0, 10);
  } else {
    const d = new Date(hoje); d.setDate(d.getDate() - 30);
    inicio = d.toISOString().slice(0, 10);
  }
  return { inicio, fim };
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: { obra?: string; tipo?: string };
}) {
  const supabase = createClient();
  const tipo = searchParams.tipo ?? 'MENSAL';
  const obraId = searchParams.obra ?? '';
  const { inicio, fim } = getPeriodDates(tipo);

  const { data: empreendimentos } = await supabase
    .from('empreendimentos')
    .select('id, nome, codigo_curto')
    .order('nome');

  const obras = (empreendimentos as Pick<Empreendimento, 'id' | 'nome' | 'codigo_curto'>[]) ?? [];
  const obraInfo = obraId ? obras.find((o) => o.id === obraId) : null;

  let crQuery = supabase
    .from('contas_receber')
    .select('descricao, numero_parcela, valor_original, valor_pago, data_vencimento, data_pagamento, status')
    .gte('data_vencimento', inicio)
    .lte('data_vencimento', fim)
    .order('data_vencimento');
  let cpQuery = supabase
    .from('contas_pagar')
    .select('descricao, numero_documento, valor_original, valor_pago, data_vencimento, data_pagamento, status, categoria')
    .gte('data_vencimento', inicio)
    .lte('data_vencimento', fim)
    .order('data_vencimento');

  if (obraId) {
    crQuery = crQuery.eq('empreendimento_id', obraId);
    cpQuery = cpQuery.eq('empreendimento_id', obraId);
  }

  const [{ data: crRows }, { data: cpRows }] = await Promise.all([crQuery, cpQuery]);

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title="Relatórios"
        description="Gere relatórios financeiros em PDF."
      />
      <RelatoriosClient
        empreendimentos={obras}
        obraAtual={obraId}
        tipoAtual={tipo as 'SEMANAL' | 'QUINZENAL' | 'MENSAL'}
        periodoInicio={inicio}
        periodoFim={fim}
        obraInfo={obraInfo ? { nome: obraInfo.nome } : null}
        crRows={(crRows ?? []) as { descricao: string; numero_parcela: string | null; valor_original: number; valor_pago: number; data_vencimento: string; data_pagamento: string | null; status: string }[]}
        cpRows={(cpRows ?? []) as { descricao: string; numero_documento: string | null; valor_original: number; valor_pago: number; data_vencimento: string; data_pagamento: string | null; status: string; categoria: string | null }[]}
      />
    </div>
  );
}

import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/PageHeader';
import { RelatoriosClient, type TipoRelatorio, type CRRow, type CPRow, type CronoRow, type TarefaRow } from './RelatoriosClient';
import type { Empreendimento } from '@/types/db';

export const dynamic = 'force-dynamic';

const TIPOS: TipoRelatorio[] = ['SEMANAL', 'QUINZENAL', 'MENSAL', 'PERSONALIZADO', 'TOTAL'];
const DIAS: Partial<Record<TipoRelatorio, number>> = { SEMANAL: 7, QUINZENAL: 15, MENSAL: 30 };

const hojeISO = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

function menosDias(iso: string, dias: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

const dataValida = (v: string | undefined): v is string =>
  !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

function getPeriodo(tipo: TipoRelatorio, de?: string, ate?: string) {
  const hoje = hojeISO();
  if (tipo === 'TOTAL') return { inicio: null, fim: null };
  if (tipo === 'PERSONALIZADO') {
    const fim = dataValida(ate) ? ate : hoje;
    const inicio = dataValida(de) ? de : `${hoje.slice(0, 8)}01`;
    return inicio <= fim ? { inicio, fim } : { inicio: fim, fim: inicio };
  }
  return { inicio: menosDias(hoje, DIAS[tipo] ?? 30), fim: hoje };
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: { obra?: string; tipo?: string; de?: string; ate?: string };
}) {
  const supabase = createClient();
  const tipo: TipoRelatorio = TIPOS.includes(searchParams.tipo as TipoRelatorio)
    ? (searchParams.tipo as TipoRelatorio)
    : 'MENSAL';
  const obraId = searchParams.obra ?? '';
  const { inicio, fim } = getPeriodo(tipo, searchParams.de, searchParams.ate);

  const { data: empreendimentos } = await supabase
    .from('empreendimentos')
    .select('id, nome, codigo_curto')
    .order('nome');

  const obras = (empreendimentos as Pick<Empreendimento, 'id' | 'nome' | 'codigo_curto'>[]) ?? [];
  const obraInfo = obraId ? obras.find((o) => o.id === obraId) : null;

  let crQuery = supabase
    .from('contas_receber')
    .select('descricao, numero_parcela, valor_original, valor_pago, data_vencimento, data_pagamento, status')
    .order('data_vencimento');
  let cpQuery = supabase
    .from('contas_pagar')
    .select('descricao, numero_documento, valor_original, valor_pago, data_vencimento, data_pagamento, status, categoria')
    .order('data_vencimento');

  if (inicio && fim) {
    crQuery = crQuery.gte('data_vencimento', inicio).lte('data_vencimento', fim);
    cpQuery = cpQuery.gte('data_vencimento', inicio).lte('data_vencimento', fim);
  }
  if (obraId) {
    crQuery = crQuery.eq('empreendimento_id', obraId);
    cpQuery = cpQuery.eq('empreendimento_id', obraId);
  }

  const vazio = Promise.resolve({ data: [] as unknown[] });
  const cronoQuery = obraId
    ? supabase
        .from('v_cronograma_obra')
        .select('etapa, marco, descricao, ordem, peso, percentual_fisico, status, custo_orcado, custo_comprometido, custo_pago, data_inicio_prevista, data_fim_prevista')
        .eq('empreendimento_id', obraId)
        .order('ordem')
    : vazio;
  const tarefasQuery = obraId
    ? supabase
        .from('cronograma_tarefas')
        .select('id, ordem, wbs, nivel, resumo, marco, nome, data_inicio, data_fim, percentual_fisico, etapa')
        .eq('empreendimento_id', obraId)
        .order('ordem')
    : vazio;

  const [{ data: crRows }, { data: cpRows }, { data: cronoRows }, { data: tarefas }] = await Promise.all([
    crQuery,
    cpQuery,
    cronoQuery,
    tarefasQuery,
  ]);

  const cr = (crRows ?? []) as CRRow[];
  const cp = (cpRows ?? []) as CPRow[];
  const tf = (tarefas ?? []) as TarefaRow[];

  // Relatório total: o período mostrado vai da primeira à última data da obra.
  let periodoInicio = inicio;
  let periodoFim = fim;
  if (tipo === 'TOTAL') {
    const datas = [
      ...cr.map((r) => r.data_vencimento),
      ...cp.map((r) => r.data_vencimento),
      ...tf.flatMap((t) => [t.data_inicio, t.data_fim]),
    ].filter((d): d is string => !!d).sort();
    periodoInicio = datas[0] ?? null;
    periodoFim = datas[datas.length - 1] ?? null;
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <PageHeader
        title="Relatórios"
        description="Relatórios da obra em PDF: financeiro e andamento do cronograma."
      />
      <RelatoriosClient
        empreendimentos={obras}
        obraAtual={obraId}
        tipoAtual={tipo}
        periodoInicio={periodoInicio}
        periodoFim={periodoFim}
        hoje={hojeISO()}
        obraInfo={obraInfo ? { nome: obraInfo.nome } : null}
        crRows={cr}
        cpRows={cp}
        cronoRows={(cronoRows ?? []) as CronoRow[]}
        tarefas={tf}
      />
    </div>
  );
}

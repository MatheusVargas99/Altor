'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  contaReceberSchema,
  parcelamentoSchema,
  type ContaReceberInput,
  type ParcelamentoInput,
} from '@/lib/schemas/contas';
import { gerarParcelas, type Periodicidade } from '@/lib/parcelamento';

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  return { supabase, user };
}

function aplicarAutoFillPago(input: ContaReceberInput): ContaReceberInput {
  if (input.status === 'PAGO') {
    const valor_pago =
      input.valor_pago && input.valor_pago > 0
        ? input.valor_pago
        : input.valor_original;
    const data_pagamento =
      input.data_pagamento ?? new Date().toISOString().slice(0, 10);
    return { ...input, valor_pago, data_pagamento };
  }
  return input;
}

export async function createContaReceber(
  input: ContaReceberInput,
): Promise<Result<{ id: string }>> {
  const parsed = contaReceberSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Inválido' };
  const final = aplicarAutoFillPago(parsed.data);
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from('contas_receber')
    .insert({ ...final, criado_por: user.id, atualizado_por: user.id })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath('/contas-receber');
  return { ok: true, data: { id: data.id } };
}

export async function updateContaReceber(
  id: string,
  input: ContaReceberInput,
): Promise<Result> {
  const parsed = contaReceberSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Inválido' };
  const final = aplicarAutoFillPago(parsed.data);
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from('contas_receber')
    .update({ ...final, atualizado_por: user.id })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/contas-receber');
  return { ok: true };
}

export async function deleteContaReceber(id: string): Promise<Result> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from('contas_receber').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/contas-receber');
  return { ok: true };
}

export async function marcarPagoContaReceber(id: string): Promise<Result> {
  const { supabase, user } = await requireUser();
  const { data: row } = await supabase
    .from('contas_receber')
    .select('valor_original')
    .eq('id', id)
    .single();
  if (!row) return { ok: false, error: 'Conta não encontrada' };
  const { error } = await supabase
    .from('contas_receber')
    .update({
      status: 'PAGO',
      valor_pago: row.valor_original,
      data_pagamento: new Date().toISOString().slice(0, 10),
      atualizado_por: user.id,
    })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/contas-receber');
  return { ok: true };
}

export async function criarContasReceberParceladas(
  base: ContaReceberInput,
  parc: ParcelamentoInput,
): Promise<Result<{ count: number }>> {
  const baseParsed = contaReceberSchema.safeParse(base);
  if (!baseParsed.success)
    return { ok: false, error: baseParsed.error.issues[0]?.message ?? 'Base inválida' };
  const parcParsed = parcelamentoSchema.safeParse(parc);
  if (!parcParsed.success)
    return { ok: false, error: parcParsed.error.issues[0]?.message ?? 'Parcelamento inválido' };

  let parcelas;
  try {
    parcelas = gerarParcelas({
      valorTotal: baseParsed.data.valor_original,
      qtdParcelas: parcParsed.data.qtd_parcelas,
      periodicidade: parcParsed.data.periodicidade as Periodicidade,
      primeiroVencimento: parcParsed.data.primeiro_vencimento,
    });
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const { supabase, user } = await requireUser();
  const rows = parcelas.map((p) => ({
    ...baseParsed.data,
    valor_original: p.valor,
    valor_pago: 0,
    status: 'ABERTO' as const,
    numero_parcela: p.numero,
    data_vencimento: p.data_vencimento,
    data_pagamento: null,
    criado_por: user.id,
    atualizado_por: user.id,
  }));

  const { error, count } = await supabase
    .from('contas_receber')
    .insert(rows, { count: 'exact' });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/contas-receber');
  return { ok: true, data: { count: count ?? rows.length } };
}

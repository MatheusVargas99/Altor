'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  comissaoSchema,
  parcelamentoComissaoSchema,
  type ComissaoInput,
  type ParcelamentoComissaoInput,
} from '@/lib/schemas/comissao';
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

function aplicarAutoFillPaga(input: ComissaoInput): ComissaoInput {
  if (input.status === 'PAGA' && !input.data_paga) {
    return { ...input, data_paga: new Date().toISOString().slice(0, 10) };
  }
  return input;
}

export async function createComissao(
  input: ComissaoInput,
): Promise<Result<{ id: string }>> {
  const parsed = comissaoSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Inválido' };
  const final = aplicarAutoFillPaga(parsed.data);
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from('comissoes')
    .insert({ ...final, criado_por: user.id, atualizado_por: user.id })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath('/comissoes');
  return { ok: true, data: { id: data.id } };
}

export async function updateComissao(
  id: string,
  input: ComissaoInput,
): Promise<Result> {
  const parsed = comissaoSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Inválido' };
  const final = aplicarAutoFillPaga(parsed.data);
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from('comissoes')
    .update({ ...final, atualizado_por: user.id })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/comissoes');
  return { ok: true };
}

export async function deleteComissao(id: string): Promise<Result> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from('comissoes').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/comissoes');
  return { ok: true };
}

export async function marcarPagaComissao(id: string): Promise<Result> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from('comissoes')
    .update({
      status: 'PAGA',
      data_paga: new Date().toISOString().slice(0, 10),
      atualizado_por: user.id,
    })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/comissoes');
  return { ok: true };
}

export async function criarComissoesParceladas(
  base: ComissaoInput,
  parc: ParcelamentoComissaoInput,
): Promise<Result<{ count: number }>> {
  const baseParsed = comissaoSchema.safeParse(base);
  if (!baseParsed.success)
    return { ok: false, error: baseParsed.error.issues[0]?.message ?? 'Base inválida' };
  const parcParsed = parcelamentoComissaoSchema.safeParse(parc);
  if (!parcParsed.success)
    return { ok: false, error: parcParsed.error.issues[0]?.message ?? 'Parcelamento inválido' };

  const valorTotalParcelar = baseParsed.data.valor_parcela;

  let parcelas;
  try {
    parcelas = gerarParcelas({
      valorTotal: valorTotalParcelar,
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
    parcela: p.numero,
    valor_parcela: p.valor,
    data_prevista: p.data_vencimento,
    data_paga: null,
    status: 'PREVISTA' as const,
    criado_por: user.id,
    atualizado_por: user.id,
  }));

  const { error, count } = await supabase
    .from('comissoes')
    .insert(rows, { count: 'exact' });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/comissoes');
  return { ok: true, data: { count: count ?? rows.length } };
}

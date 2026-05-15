'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { medicaoSchema, type MedicaoInput } from '@/lib/schemas/medicao';

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  return { supabase, user };
}

export async function createMedicao(input: MedicaoInput): Promise<Result<{ id: string }>> {
  const parsed = medicaoSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Inválido' };
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from('medicoes')
    .insert({ ...parsed.data, criado_por: user.id, atualizado_por: user.id })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath('/medicoes');
  return { ok: true, data: { id: data.id } };
}

export async function updateMedicao(id: string, input: MedicaoInput): Promise<Result> {
  const parsed = medicaoSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Inválido' };
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from('medicoes')
    .update({ ...parsed.data, atualizado_por: user.id })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/medicoes');
  return { ok: true };
}

export async function deleteMedicao(id: string): Promise<Result> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from('medicoes').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/medicoes');
  return { ok: true };
}

export async function aprovarMedicao(
  id: string,
): Promise<Result<{ conta_pagar_id: string | null }>> {
  const { supabase, user } = await requireUser();

  const { data: m, error: errSel } = await supabase
    .from('medicoes')
    .select('*')
    .eq('id', id)
    .single();
  if (errSel || !m) return { ok: false, error: errSel?.message ?? 'Não encontrada' };

  if (m.status === 'APROVADA' || m.status === 'PAGA') {
    return { ok: false, error: 'Medição já aprovada/paga.' };
  }

  let conta_pagar_id: string | null = m.conta_pagar_id ?? null;
  if (!conta_pagar_id) {
    const { data: cp, error: errCp } = await supabase
      .from('contas_pagar')
      .insert({
        empreendimento_id: m.empreendimento_id,
        empresa_id: m.empresa_id,
        descricao: `Medição: ${m.descricao}${m.numero_medicao ? ' (' + m.numero_medicao + ')' : ''}`,
        categoria: 'EMPREITADA',
        etapa_eap: m.etapa,
        valor_original: m.valor_medicao,
        valor_pago: 0,
        status: 'ABERTO',
        origem: 'MANUAL',
        data_emissao: new Date().toISOString().slice(0, 10),
        data_vencimento: new Date().toISOString().slice(0, 10),
        criado_por: user.id,
        atualizado_por: user.id,
      })
      .select('id')
      .single();
    if (errCp) return { ok: false, error: errCp.message };
    conta_pagar_id = cp.id;
  }

  const { error } = await supabase
    .from('medicoes')
    .update({
      status: 'APROVADA',
      conta_pagar_id,
      atualizado_por: user.id,
    })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/medicoes');
  revalidatePath('/contas-pagar');
  return { ok: true, data: { conta_pagar_id } };
}

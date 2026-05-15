'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { orcamentoSchema, type OrcamentoInput } from '@/lib/schemas/orcamento';

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  return { supabase, user };
}

export async function createOrcamento(
  input: OrcamentoInput,
): Promise<Result<{ id: string }>> {
  const parsed = orcamentoSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Inválido' };
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from('orcamentos')
    .insert({ ...parsed.data, criado_por: user.id, atualizado_por: user.id })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath('/orcamentos');
  return { ok: true, data: { id: data.id } };
}

export async function updateOrcamento(
  id: string,
  input: OrcamentoInput,
): Promise<Result> {
  const parsed = orcamentoSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Inválido' };
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from('orcamentos')
    .update({ ...parsed.data, atualizado_por: user.id })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/orcamentos');
  return { ok: true };
}

export async function deleteOrcamento(id: string): Promise<Result> {
  const { supabase } = await requireUser();
  const { data: bloqueios } = await supabase.rpc('verificar_vinculos', {
    p_entidade: 'orcamentos',
    p_id: id,
  });
  if (Array.isArray(bloqueios) && bloqueios.length > 0) {
    return { ok: false, error: `Vinculado a: ${(bloqueios as string[]).join('; ')}` };
  }
  const { error } = await supabase.from('orcamentos').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/orcamentos');
  return { ok: true };
}

export async function marcarVencedorOrcamento(
  id: string,
): Promise<Result<{ compra_id: string | null }>> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc('marcar_vencedor_orcamento', {
    p_orc_id: id,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/orcamentos');
  revalidatePath('/compras');
  return { ok: true, data: { compra_id: (data as string | null) ?? null } };
}

'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { compraSchema, type CompraInput } from '@/lib/schemas/compra';

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  return { supabase, user };
}

export async function createCompra(input: CompraInput): Promise<Result<{ id: string }>> {
  const parsed = compraSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Inválido' };
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from('compras')
    .insert({ ...parsed.data, criado_por: user.id, atualizado_por: user.id })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath('/compras');
  return { ok: true, data: { id: data.id } };
}

export async function updateCompra(id: string, input: CompraInput): Promise<Result> {
  const parsed = compraSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Inválido' };
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from('compras')
    .update({ ...parsed.data, atualizado_por: user.id })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/compras');
  return { ok: true };
}

export async function deleteCompra(id: string): Promise<Result> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from('compras').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/compras');
  return { ok: true };
}

export async function avancarCompra(
  id: string,
  para: 'COMPRADO' | 'RECEBIDO',
): Promise<Result> {
  const { supabase, user } = await requireUser();
  const hoje = new Date().toISOString().slice(0, 10);
  const patch =
    para === 'COMPRADO'
      ? { status: 'COMPRADO' as const, data_compra: hoje }
      : { status: 'RECEBIDO' as const, data_recebimento: hoje };
  const { error } = await supabase
    .from('compras')
    .update({ ...patch, atualizado_por: user.id })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/compras');
  return { ok: true };
}

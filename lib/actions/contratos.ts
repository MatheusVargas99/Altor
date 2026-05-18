'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { contratoSchema, type ContratoInput } from '@/lib/schemas/contrato';
import type { ContratoStatus } from '@/types/db';

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  return { supabase, user };
}

export async function createContrato(input: ContratoInput): Promise<Result<{ id: string }>> {
  const parsed = contratoSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Inválido' };
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from('contratos')
    .insert({ ...parsed.data, criado_por: user.id, atualizado_por: user.id })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath('/contratos');
  return { ok: true, data: { id: data.id } };
}

export async function updateContrato(id: string, input: ContratoInput): Promise<Result> {
  const parsed = contratoSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Inválido' };
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from('contratos')
    .update({ ...parsed.data, atualizado_por: user.id })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/contratos');
  return { ok: true };
}

export async function deleteContrato(id: string): Promise<Result> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from('contratos').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/contratos');
  return { ok: true };
}

export async function updateContratoStatus(id: string, status: ContratoStatus): Promise<Result> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from('contratos')
    .update({ status, atualizado_por: user.id })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/contratos');
  return { ok: true };
}

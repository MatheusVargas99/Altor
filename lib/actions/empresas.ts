'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { empresaSchema, type EmpresaInput } from '@/lib/schemas/empresa';

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  return { supabase, user };
}

export async function createEmpresa(input: EmpresaInput): Promise<Result<{ id: string }>> {
  const parsed = empresaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Inválido' };

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from('empresas')
    .insert({ ...parsed.data, criado_por: user.id, atualizado_por: user.id })
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath('/empresas');
  return { ok: true, data: { id: data.id } };
}

export async function updateEmpresa(
  id: string,
  input: EmpresaInput,
): Promise<Result> {
  const parsed = empresaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Inválido' };

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from('empresas')
    .update({ ...parsed.data, atualizado_por: user.id })
    .eq('id', id);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/empresas');
  return { ok: true };
}

export async function deleteEmpresa(id: string): Promise<Result> {
  const { supabase } = await requireUser();
  const { data: bloqueios } = await supabase.rpc('verificar_vinculos', {
    p_entidade: 'empresas',
    p_id: id,
  });
  if (Array.isArray(bloqueios) && bloqueios.length > 0) {
    return { ok: false, error: `Vinculada a: ${(bloqueios as string[]).join('; ')}` };
  }
  const { error } = await supabase.from('empresas').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/empresas');
  return { ok: true };
}

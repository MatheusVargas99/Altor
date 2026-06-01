'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/supabase/auth';
import type { UserRole } from '@/types/db';

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export async function criarUsuario(
  nome: string,
  email: string,
  senha: string,
  role: UserRole,
): Promise<Result> {
  const { service } = await requireAdmin();
  const { data, error } = await service.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  });
  if (error) return { ok: false, error: error.message };
  if (data.user && role === 'ADMIN') {
    await service.from('profiles').update({ role: 'ADMIN' }).eq('id', data.user.id);
  }
  revalidatePath('/usuarios');
  return { ok: true };
}

export async function atualizarUsuario(
  id: string,
  nome: string,
  role: UserRole,
  ativo: boolean,
): Promise<Result> {
  const { service } = await requireAdmin();
  const { error } = await service
    .from('profiles')
    .update({ nome, role, ativo })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/usuarios');
  return { ok: true };
}

export async function redefinirSenha(id: string, novaSenha: string): Promise<Result> {
  const { service } = await requireAdmin();
  const { error } = await service.auth.admin.updateUserById(id, { password: novaSenha });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function excluirUsuario(id: string): Promise<Result> {
  const { service } = await requireAdmin();
  const { error } = await service.auth.admin.deleteUser(id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/usuarios');
  return { ok: true };
}

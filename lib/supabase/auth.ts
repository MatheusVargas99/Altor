import { cache } from 'react';
import { createClient } from './server';
import { createServiceClient } from './service';

export type CurrentUser = {
  id: string;
  email: string | null;
  nome: string | null;
  role: 'ADMIN' | 'OPERACIONAL' | null;
};

/**
 * Dedupe user+profile lookup within a single request. Useful when both the
 * layout and a page need the same info — React `cache` guarantees one
 * Supabase round-trip per render pass.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, role')
    .eq('id', user.id)
    .single<{ nome: string | null; role: 'ADMIN' | 'OPERACIONAL' | null }>();

  return {
    id: user.id,
    email: user.email ?? null,
    nome: profile?.nome ?? null,
    role: profile?.role ?? null,
  };
});

export async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  return { supabase, user };
}

export async function requireAdmin() {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'ADMIN') throw new Error('Acesso restrito a administradores');
  return { supabase, user, service: createServiceClient() };
}

import { cache } from 'react';
import { createClient } from './server';

export type CurrentUser = {
  id: string;
  email: string | null;
  nome: string | null;
  role: string | null;
};

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
    .single();

  return {
    id: user.id,
    email: user.email ?? null,
    nome: profile?.nome ?? null,
    role: profile?.role ?? null,
  };
});

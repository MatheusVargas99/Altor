import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/PageHeader';
import { UsuariosClient } from './UsuariosClient';
import type { UserRole } from '@/types/db';

export const dynamic = 'force-dynamic';

type Profile = {
  id: string;
  nome: string;
  role: UserRole;
  ativo: boolean;
  ultimo_login: string | null;
  created_at: string;
};

export default async function UsuariosPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (myProfile?.role !== 'ADMIN') redirect('/dashboard');

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nome, role, ativo, ultimo_login, created_at')
    .order('created_at');

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Usuários"
        description="Gerencie os acessos ao sistema. Somente administradores podem criar e editar usuários."
      />
      <UsuariosClient
        profiles={(profiles as Profile[]) ?? []}
        currentUserId={user.id}
      />
    </div>
  );
}

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ToasterProvider } from '@/components/ui/Toaster';
import { MobileNav, Sidebar } from '@/components/layout/AppNav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'ADMIN';
  const displayName = profile?.nome ?? user.email ?? '';

  return (
    <div className="flex min-h-screen min-h-[100dvh]">
      <Sidebar displayName={displayName} isAdmin={isAdmin} />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav displayName={displayName} isAdmin={isAdmin} />
        <main className="min-w-0 flex-1 overflow-x-hidden pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] md:pl-0">
          <ToasterProvider>{children}</ToasterProvider>
        </main>
      </div>
    </div>
  );
}

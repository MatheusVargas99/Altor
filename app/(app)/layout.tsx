import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/app/login/actions';
import { ToasterProvider } from '@/components/ui/Toaster';

const nav = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/agenda', label: 'Agenda' },
  { href: '/empreendimentos', label: 'Empreendimentos' },
  { href: '/empresas', label: 'Empresas' },
  { href: '/clientes', label: 'Clientes' },
  { href: '/contas-receber', label: 'Contas a Receber' },
  { href: '/contas-pagar', label: 'Contas a Pagar' },
  { href: '/comissoes', label: 'Comissões' },
  { href: '/orcamentos', label: 'Orçamentos' },
  { href: '/compras', label: 'Compras' },
  { href: '/medicoes', label: 'Medições' },
  { href: '/cronograma', label: 'Cronograma' },
  { href: '/contratos', label: 'Contratos' },
  { href: '/relatorios', label: 'Relatórios' },
];

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
    <div className="flex min-h-screen">
      <aside className="hidden md:flex md:flex-col w-60 border-r border-border bg-bg-2">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-border flex items-center gap-3">
          <Image src="/logo.svg" alt="Altor" width={36} height={36} priority />
          <div>
            <div className="text-primary font-semibold tracking-widest text-sm uppercase">Altor</div>
            <div className="text-text-dim text-[10px] uppercase tracking-widest">Construtora</div>
          </div>
        </div>

        {/* Navegação */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded px-3 py-2 text-sm text-text hover:bg-bg-3 hover:text-primary transition-colors"
            >
              {item.label}
            </Link>
          ))}

          {isAdmin && (
            <>
              <div className="pt-3 pb-1 px-3">
                <div className="text-[10px] uppercase tracking-widest text-text-dim">Administração</div>
              </div>
              <Link
                href="/usuarios"
                className="block rounded px-3 py-2 text-sm text-text hover:bg-bg-3 hover:text-primary transition-colors"
              >
                Usuários
              </Link>
            </>
          )}
        </nav>

        {/* Rodapé: usuário + sair */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-text truncate">{displayName}</div>
              {isAdmin && <div className="text-[10px] text-primary">Admin</div>}
            </div>
          </div>
          <form action={logout}>
            <button type="submit" className="btn-ghost w-full text-xs">Sair</button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <ToasterProvider>{children}</ToasterProvider>
      </main>
    </div>
  );
}

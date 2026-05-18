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

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:flex md:flex-col w-60 border-r border-border bg-bg-2">
        <div className="px-4 py-5 border-b border-border">
          <div className="text-primary font-semibold text-lg">Altor</div>
          <div className="text-text-dim text-xs">Gestão</div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded px-3 py-2 text-sm text-text hover:bg-bg-3"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={logout} className="p-3 border-t border-border">
          <div className="text-xs text-text-dim mb-2 truncate">{user.email}</div>
          <button type="submit" className="btn-ghost w-full">
            Sair
          </button>
        </form>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <ToasterProvider>{children}</ToasterProvider>
      </main>
    </div>
  );
}

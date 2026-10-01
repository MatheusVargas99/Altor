'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  Building2,
  Briefcase,
  Users,
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgePercent,
  FileText,
  ShoppingCart,
  Ruler,
  GanttChart,
  ScrollText,
  BarChart2,
  UserCog,
  Menu,
  X,
} from 'lucide-react';
import { logout } from '@/app/login/actions';

const nav = [
  { href: '/dashboard',      label: 'Dashboard',        icon: LayoutDashboard },
  { href: '/agenda',         label: 'Agenda',           icon: CalendarDays },
  { href: '/empreendimentos',label: 'Empreendimentos',  icon: Building2 },
  { href: '/empresas',       label: 'Empresas',         icon: Briefcase },
  { href: '/clientes',       label: 'Clientes',         icon: Users },
  { href: '/contas-receber', label: 'Contas a Receber', icon: ArrowDownToLine },
  { href: '/contas-pagar',   label: 'Contas a Pagar',   icon: ArrowUpFromLine },
  { href: '/comissoes',      label: 'Comissões',        icon: BadgePercent },
  { href: '/orcamentos',     label: 'Orçamentos',       icon: FileText },
  { href: '/compras',        label: 'Compras',          icon: ShoppingCart },
  { href: '/medicoes',       label: 'Medições',         icon: Ruler },
  { href: '/cronograma',     label: 'Cronograma',       icon: GanttChart },
  { href: '/contratos',      label: 'Contratos',        icon: ScrollText },
  { href: '/relatorios',     label: 'Relatórios',       icon: BarChart2 },
];

type Props = { displayName: string; isAdmin: boolean };

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <Image src="/logo.svg" alt="Altor" width={36} height={36} priority />
      <div>
        <div className="text-primary font-semibold tracking-widest text-sm uppercase">Altor</div>
        <div className="text-text-dim text-[10px] uppercase tracking-widest">Construtora</div>
      </div>
    </div>
  );
}

/** Lista de links + rodapé com usuário/sair — a mesma na sidebar e no menu mobile. */
function NavBody({ displayName, isAdmin }: Props) {
  const pathname = usePathname();
  const linkCls = (href: string) => {
    const ativo = pathname === href || pathname.startsWith(href + '/');
    return (
      'flex items-center gap-2.5 rounded px-3 py-2.5 md:py-2 text-sm transition-colors ' +
      (ativo ? 'bg-bg-3 text-primary' : 'text-text hover:bg-bg-3 hover:text-primary')
    );
  };

  return (
    <>
      <nav className="flex-1 overflow-y-auto overscroll-contain px-2 py-3 space-y-0.5">
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={linkCls(item.href)}>
              <Icon size={15} className="shrink-0 opacity-60" />
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="pt-3 pb-1 px-3">
              <div className="text-[10px] uppercase tracking-widest text-text-dim">Administração</div>
            </div>
            <Link href="/usuarios" className={linkCls('/usuarios')}>
              <UserCog size={15} className="shrink-0 opacity-60" />
              Usuários
            </Link>
          </>
        )}
      </nav>

      <div className="p-3 border-t border-border pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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
    </>
  );
}

export function Sidebar(props: Props) {
  return (
    <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-border bg-bg-2 sticky top-0 h-screen">
      <div className="px-4 py-4 border-b border-border">
        <Logo />
      </div>
      <NavBody {...props} />
    </aside>
  );
}

/** Barra superior + gaveta de navegação, só abaixo de `md` (celular/tablet em pé). */
export function MobileNav(props: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const atual = nav.find((n) => pathname === n.href || pathname.startsWith(n.href + '/'));
  const titulo = atual?.label ?? (pathname.startsWith('/usuarios') ? 'Usuários' : 'Altor');

  // Fecha a gaveta ao navegar
  useEffect(() => setOpen(false), [pathname]);

  // Trava o scroll do fundo enquanto a gaveta está aberta (iOS rola o body por trás)
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <header className="md:hidden sticky top-0 z-30 border-b border-border bg-bg-2/95 backdrop-blur pt-[env(safe-area-inset-top)]">
        <div className="flex h-14 items-center gap-3 px-2 pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))]">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
            aria-expanded={open}
            className="flex h-11 w-11 items-center justify-center rounded-md text-text hover:bg-bg-3"
          >
            <Menu size={22} />
          </button>
          <Image src="/logo.svg" alt="" width={26} height={26} />
          <div className="min-w-0 flex-1 truncate text-sm font-medium text-text">{titulo}</div>
        </div>
      </header>

      {open && (
        <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col border-r border-border bg-bg-2 shadow-xl pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <Logo />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
                className="flex h-11 w-11 items-center justify-center rounded-md text-text-dim hover:text-text"
              >
                <X size={20} />
              </button>
            </div>
            <NavBody {...props} />
          </aside>
        </div>
      )}
    </>
  );
}

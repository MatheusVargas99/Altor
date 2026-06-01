import { revalidatePath } from 'next/cache';

const FINANCEIRO_PATHS = [
  '/dashboard',
  '/contas-pagar',
  '/contas-receber',
  '/relatorios',
  '/agenda',
  '/comissoes',
  '/medicoes',
  '/empreendimentos',
] as const;

export function revalidateFinanceiro() {
  for (const p of FINANCEIRO_PATHS) revalidatePath(p);
  revalidatePath('/empreendimentos/[id]', 'page');
}

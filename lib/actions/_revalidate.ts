import { revalidatePath } from 'next/cache';

/**
 * Invalida só as páginas onde os números financeiros aparecem.
 * Substitui `revalidatePath('/', 'layout')` (que invalida a app inteira
 * e dispara o bug vercel/next.js#66426 quando combinado com loading.tsx
 * + useTransition). Mantém os `router.refresh()` redundantes nos clients
 * como segunda linha de defesa contra o mesmo bug — ver docs/AUDIT_REPORT.md.
 */
export function revalidateFinanceiro() {
  revalidatePath('/dashboard');
  revalidatePath('/agenda');
  revalidatePath('/contas-pagar');
  revalidatePath('/contas-receber');
  revalidatePath('/comissoes');
  revalidatePath('/medicoes');
  revalidatePath('/relatorios');
  revalidatePath('/empreendimentos');
}

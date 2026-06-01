import { revalidatePath } from 'next/cache';

export function revalidateFinanceiro() {
  revalidatePath('/dashboard');
  revalidatePath('/agenda');
  revalidatePath('/contas-pagar');
  revalidatePath('/contas-receber');
  revalidatePath('/comissoes');
  revalidatePath('/medicoes');
}

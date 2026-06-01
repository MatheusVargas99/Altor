import { revalidatePath } from 'next/cache';

export function revalidateFinanceiro() {
  revalidatePath('/', 'layout');
}

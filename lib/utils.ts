import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fmtBRL = (n: number | null | undefined) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    n ?? 0,
  );

export const fmtDate = (d: string | Date | null | undefined) => {
  if (!d) return '';
  // Datas "puras" (YYYY-MM-DD, colunas `date` do Postgres) não têm fuso:
  // formatar em UTC evita o dia anterior aparecer em America/Sao_Paulo.
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(d));
  }
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(
    typeof d === 'string' ? new Date(d) : d,
  );
};

/**
 * Valor ainda em aberto de uma CR/CP, respeitando o `status` como fonte da
 * verdade. `valor_aberto` é coluna gerada (valor_original - valor_pago); se um
 * lançamento ABERTO/ATRASADO tiver `valor_pago` preenchido por engano,
 * `valor_aberto` vira 0 e a conta some dos indicadores — aqui caímos em
 * `valor_original` nesse caso.
 */
export const valorEmAberto = (r: {
  status: string;
  valor_original: number;
  valor_aberto: number;
}) => {
  if (r.status === 'PAGO' || r.status === 'CANCELADO') return 0;
  return Number(r.valor_aberto) || Number(r.valor_original) || 0;
};

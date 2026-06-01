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
  // ISO date-only (YYYY-MM-DD): formatar sem construir Date, evitando o shift
  // de timezone que faz "2026-06-01" virar "2026-05-31" em America/Sao_Paulo.
  if (typeof d === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
    }).format(new Date(d));
  }
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
  }).format(d);
};

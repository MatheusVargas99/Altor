export type Periodicidade =
  | 'MENSAL'
  | 'QUINZENAL'
  | 'SEMANAL'
  | 'BIMESTRAL'
  | 'TRIMESTRAL'
  | 'SEMESTRAL'
  | 'ANUAL';

export const PERIODICIDADES: Periodicidade[] = [
  'MENSAL',
  'QUINZENAL',
  'SEMANAL',
  'BIMESTRAL',
  'TRIMESTRAL',
  'SEMESTRAL',
  'ANUAL',
];

const stepDays = (p: Periodicidade): number => {
  switch (p) {
    case 'SEMANAL':
      return 7;
    case 'QUINZENAL':
      return 15;
    default:
      return 0;
  }
};

const stepMonths = (p: Periodicidade): number => {
  switch (p) {
    case 'MENSAL':
      return 1;
    case 'BIMESTRAL':
      return 2;
    case 'TRIMESTRAL':
      return 3;
    case 'SEMESTRAL':
      return 6;
    case 'ANUAL':
      return 12;
    default:
      return 0;
  }
};

function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toISODate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addInterval(base: Date, p: Periodicidade, i: number): Date {
  const out = new Date(base);
  const dDays = stepDays(p);
  if (dDays > 0) {
    out.setUTCDate(out.getUTCDate() + dDays * i);
    return out;
  }
  const dMonths = stepMonths(p);
  if (dMonths > 0) {
    const targetMonth = out.getUTCMonth() + dMonths * i;
    out.setUTCMonth(targetMonth);
  }
  return out;
}

export type Parcela = {
  numero: string;
  valor: number;
  data_vencimento: string;
};

export function gerarParcelas({
  valorTotal,
  qtdParcelas,
  periodicidade,
  primeiroVencimento,
}: {
  valorTotal: number;
  qtdParcelas: number;
  periodicidade: Periodicidade;
  primeiroVencimento: string;
}): Parcela[] {
  if (!Number.isFinite(valorTotal) || valorTotal <= 0) {
    throw new Error('Valor total inválido');
  }
  if (!Number.isInteger(qtdParcelas) || qtdParcelas < 2 || qtdParcelas > 240) {
    throw new Error('Número de parcelas deve ser entre 2 e 240');
  }
  const base = parseISODate(primeiroVencimento);
  if (Number.isNaN(base.getTime())) throw new Error('Data inválida');

  const totalCents = Math.round(valorTotal * 100);
  const baseCents = Math.floor(totalCents / qtdParcelas);
  const lastCents = totalCents - baseCents * (qtdParcelas - 1);

  const parcelas: Parcela[] = [];
  for (let i = 0; i < qtdParcelas; i++) {
    const cents = i === qtdParcelas - 1 ? lastCents : baseCents;
    parcelas.push({
      numero: `${i + 1}/${qtdParcelas}`,
      valor: cents / 100,
      data_vencimento: toISODate(addInterval(base, periodicidade, i)),
    });
  }
  return parcelas;
}

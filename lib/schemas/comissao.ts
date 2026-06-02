import { z } from 'zod';
import { PERIODICIDADES } from '@/lib/parcelamento';
import { optEnum, optNum, optStr, optUuid } from './_helpers';

const reqNumPos = z
  .union([z.string(), z.number()])
  .transform((v) => Number(typeof v === 'string' ? v.replace(',', '.') : v))
  .refine((n) => Number.isFinite(n) && n > 0, 'Valor obrigatório > 0');

const reqNumNonNeg = z
  .union([z.string(), z.number()])
  .transform((v) => Number(typeof v === 'string' ? v.replace(',', '.') : v))
  .refine((n) => Number.isFinite(n) && n >= 0, 'Valor inválido');

const comissao_status = z.enum([
  'PREVISTA',
  'A_PAGAR',
  'PAGA',
  'RETIDA',
  'CANCELADA',
] as const);

export const comissaoSchema = z.object({
  empreendimento_id: optUuid.optional(),
  cliente_id: optUuid.optional(),
  beneficiario_tipo: optEnum([
    'CORRETOR_AUTONOMO',
    'IMOBILIARIA',
    'FUNCIONARIO_INTERNO',
    'INDICADOR',
  ] as const),
  beneficiario_id: optUuid.optional(),
  beneficiario_nome: z.string().min(2, 'Beneficiário obrigatório').max(300),
  valor_venda: reqNumNonNeg,
  percentual: optNum.transform((v) => v ?? 0).optional(),
  parcela: optStr.optional(),
  valor_parcela: reqNumPos,
  evento_gatilho: optEnum([
    'ASSINATURA',
    'HABITE_SE',
    'ENTREGA_CHAVES',
    'PERSONALIZADO',
  ] as const),
  data_prevista: optStr.optional(),
  data_paga: optStr.optional(),
  status: comissao_status.default('PREVISTA'),
  observacoes: optStr.optional(),
});

export const parcelamentoComissaoSchema = z.object({
  qtd_parcelas: z.coerce.number().int().min(2).max(240),
  periodicidade: z.enum(PERIODICIDADES as [string, ...string[]]),
  primeiro_vencimento: z.string().min(8, 'Primeiro vencimento obrigatório'),
});

export type ComissaoInput = z.infer<typeof comissaoSchema>;
export type ParcelamentoComissaoInput = z.infer<typeof parcelamentoComissaoSchema>;

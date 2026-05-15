import { z } from 'zod';
import { PERIODICIDADES } from '@/lib/parcelamento';

const optStr = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (v == null || v === '' ? null : String(v).trim()));

const optUuid = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (v == null || v === '' ? null : String(v)))
  .refine((v) => v == null || /^[0-9a-f-]{36}$/i.test(v), 'UUID inválido');

const optNum = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === '' || v == null) return null;
    const n = Number(typeof v === 'string' ? v.replace(',', '.') : v);
    return Number.isFinite(n) ? n : null;
  });

const reqNumPos = z
  .union([z.string(), z.number()])
  .transform((v) => Number(typeof v === 'string' ? v.replace(',', '.') : v))
  .refine((n) => Number.isFinite(n) && n > 0, 'Valor obrigatório > 0');

const reqNumNonNeg = z
  .union([z.string(), z.number()])
  .transform((v) => Number(typeof v === 'string' ? v.replace(',', '.') : v))
  .refine((n) => Number.isFinite(n) && n >= 0, 'Valor inválido');

const comissao_benef = z.enum([
  'CORRETOR_AUTONOMO',
  'IMOBILIARIA',
  'FUNCIONARIO_INTERNO',
  'INDICADOR',
] as const);

const comissao_gatilho = z.enum([
  'ASSINATURA',
  'HABITE_SE',
  'ENTREGA_CHAVES',
  'PERSONALIZADO',
] as const);

const comissao_status = z.enum([
  'PREVISTA',
  'A_PAGAR',
  'PAGA',
  'RETIDA',
  'CANCELADA',
] as const);

export const comissaoSchema = z.object({
  empreendimento_id: optUuid,
  cliente_id: optUuid,
  beneficiario_tipo: comissao_benef.nullable().optional(),
  beneficiario_id: optUuid,
  beneficiario_nome: z.string().min(2, 'Beneficiário obrigatório').max(300),
  valor_venda: reqNumNonNeg,
  percentual: optNum.transform((v) => v ?? 0),
  parcela: optStr,
  valor_parcela: reqNumPos,
  evento_gatilho: comissao_gatilho.nullable().optional(),
  data_prevista: optStr,
  data_paga: optStr,
  status: comissao_status.default('PREVISTA'),
  observacoes: optStr,
});

export const parcelamentoComissaoSchema = z.object({
  qtd_parcelas: z.coerce.number().int().min(2).max(240),
  periodicidade: z.enum(PERIODICIDADES as [string, ...string[]]),
  primeiro_vencimento: z.string().min(8, 'Primeiro vencimento obrigatório'),
});

export type ComissaoInput = z.infer<typeof comissaoSchema>;
export type ParcelamentoComissaoInput = z.infer<typeof parcelamentoComissaoSchema>;

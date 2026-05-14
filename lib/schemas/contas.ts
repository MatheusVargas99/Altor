import { z } from 'zod';
import {
  CP_CATEGORIAS,
  CP_FORMAS,
  CR_CATEGORIAS,
  CR_FORMAS,
  ETAPAS_EAP,
} from '@/types/db';
import { PERIODICIDADES } from '@/lib/parcelamento';

const optStr = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (v == null || v === '' ? null : String(v).trim()));

const optUuid = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (v == null || v === '' ? null : String(v)))
  .refine((v) => v == null || /^[0-9a-f-]{36}$/i.test(v), 'UUID inválido');

const reqNum = z
  .union([z.string(), z.number()])
  .transform((v) => Number(typeof v === 'string' ? v.replace(',', '.') : v))
  .refine((n) => Number.isFinite(n) && n > 0, 'Valor obrigatório > 0');

const optNum = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === '' || v == null) return null;
    const n = Number(typeof v === 'string' ? v.replace(',', '.') : v);
    return Number.isFinite(n) ? n : null;
  });

const cr_status = z.enum([
  'ABERTO',
  'PARCIAL',
  'PAGO',
  'ATRASADO',
  'CANCELADO',
] as const);
const cp_status = cr_status;

export const contaReceberSchema = z.object({
  empreendimento_id: optUuid,
  cliente_id: optUuid,
  descricao: z.string().min(2, 'Descrição obrigatória').max(300),
  categoria: z.enum(CR_CATEGORIAS as [string, ...string[]]).nullable().optional(),
  numero_parcela: optStr,
  valor_original: reqNum,
  valor_pago: optNum.transform((v) => v ?? 0),
  data_emissao: optStr,
  data_vencimento: z.string().min(8, 'Vencimento obrigatório'),
  data_pagamento: optStr,
  forma_recebimento: z.enum(CR_FORMAS as [string, ...string[]]).nullable().optional(),
  status: cr_status.default('ABERTO'),
  juros_multa: optNum.transform((v) => v ?? 0),
  observacoes: optStr,
});

export const contaPagarSchema = z.object({
  empreendimento_id: optUuid,
  empresa_id: optUuid,
  descricao: z.string().min(2, 'Descrição obrigatória').max(300),
  categoria: z.enum(CP_CATEGORIAS as [string, ...string[]]).nullable().optional(),
  etapa_eap: z.enum(ETAPAS_EAP as [string, ...string[]]).nullable().optional(),
  numero_documento: optStr,
  valor_original: reqNum,
  valor_pago: optNum.transform((v) => v ?? 0),
  data_emissao: optStr,
  data_vencimento: z.string().min(8, 'Vencimento obrigatório'),
  data_pagamento: optStr,
  forma_pagamento: z.enum(CP_FORMAS as [string, ...string[]]).nullable().optional(),
  status: cp_status.default('ABERTO'),
  linha_digitavel: optStr,
  anexo_url: optStr,
  observacoes: optStr,
});

export const parcelamentoSchema = z.object({
  qtd_parcelas: z.coerce.number().int().min(2).max(240),
  periodicidade: z.enum(PERIODICIDADES as [string, ...string[]]),
  primeiro_vencimento: z.string().min(8, 'Primeiro vencimento obrigatório'),
});

export type ContaReceberInput = z.infer<typeof contaReceberSchema>;
export type ContaPagarInput = z.infer<typeof contaPagarSchema>;
export type ParcelamentoInput = z.infer<typeof parcelamentoSchema>;

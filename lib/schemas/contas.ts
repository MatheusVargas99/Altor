import { z } from 'zod';
import {
  CP_CATEGORIAS,
  CP_FORMAS,
  CR_CATEGORIAS,
  CR_FORMAS,
  ETAPAS_EAP,
} from '@/types/db';
import { PERIODICIDADES } from '@/lib/parcelamento';
import { optEnum, optNum, optStr, optUuid } from './_helpers';

const reqNum = z
  .union([z.string(), z.number()])
  .transform((v) => Number(typeof v === 'string' ? v.replace(',', '.') : v))
  .refine((n) => Number.isFinite(n) && n > 0, 'Valor obrigatório > 0');

const cr_status = z.enum([
  'ABERTO',
  'PARCIAL',
  'PAGO',
  'ATRASADO',
  'CANCELADO',
] as const);
const cp_status = cr_status;

export const contaReceberSchema = z.object({
  empreendimento_id: optUuid.optional(),
  cliente_id: optUuid.optional(),
  descricao: z.string().min(2, 'Descrição obrigatória').max(300),
  categoria: optEnum(CR_CATEGORIAS as [string, ...string[]]),
  numero_parcela: optStr.optional(),
  valor_original: reqNum,
  valor_pago: optNum.transform((v) => v ?? 0).optional(),
  data_emissao: optStr.optional(),
  data_vencimento: z.string().min(8, 'Vencimento obrigatório'),
  data_pagamento: optStr.optional(),
  forma_recebimento: optEnum(CR_FORMAS as [string, ...string[]]),
  status: cp_status.default('ABERTO'),
  juros_multa: optNum.transform((v) => v ?? 0).optional(),
  observacoes: optStr.optional(),
});

export const contaPagarSchema = z.object({
  empreendimento_id: optUuid.optional(),
  empresa_id: optUuid.optional(),
  descricao: z.string().min(2, 'Descrição obrigatória').max(300),
  categoria: optEnum(CP_CATEGORIAS as [string, ...string[]]),
  etapa_eap: optEnum(ETAPAS_EAP as [string, ...string[]]),
  numero_documento: optStr.optional(),
  valor_original: reqNum,
  valor_pago: optNum.transform((v) => v ?? 0).optional(),
  data_emissao: optStr.optional(),
  data_vencimento: z.string().min(8, 'Vencimento obrigatório'),
  data_pagamento: optStr.optional(),
  forma_pagamento: optEnum(CP_FORMAS as [string, ...string[]]),
  status: cp_status.default('ABERTO'),
  linha_digitavel: optStr.optional(),
  anexo_url: optStr.optional(),
  observacoes: optStr.optional(),
});

export const parcelamentoSchema = z.object({
  qtd_parcelas: z.coerce.number().int().min(2).max(240),
  periodicidade: z.enum(PERIODICIDADES as [string, ...string[]]),
  primeiro_vencimento: z.string().min(8, 'Primeiro vencimento obrigatório'),
});

export type ContaReceberInput = z.infer<typeof contaReceberSchema>;
export type ContaPagarInput = z.infer<typeof contaPagarSchema>;
export type ParcelamentoInput = z.infer<typeof parcelamentoSchema>;

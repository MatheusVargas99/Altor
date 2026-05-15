import { z } from 'zod';
import { ETAPAS_EAP } from '@/types/db';

const optStr = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (v == null || v === '' ? null : String(v).trim()));

const reqUuid = z
  .string()
  .min(36)
  .refine((v) => /^[0-9a-f-]{36}$/i.test(v), 'UUID inválido');

const reqNum = z
  .union([z.string(), z.number()])
  .transform((v) => Number(typeof v === 'string' ? v.replace(',', '.') : v))
  .refine((n) => Number.isFinite(n) && n >= 0, 'Valor inválido');

const optPct = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === '' || v == null) return 0;
    const n = Number(typeof v === 'string' ? v.replace(',', '.') : v);
    return Number.isFinite(n) ? n : 0;
  });

export const medicaoSchema = z.object({
  empreendimento_id: reqUuid,
  empresa_id: reqUuid,
  etapa: z.enum(ETAPAS_EAP as [string, ...string[]]).nullable().optional(),
  descricao: z.string().min(2, 'Descrição obrigatória').max(300),
  valor_orcado: reqNum,
  numero_medicao: optStr,
  valor_medicao: reqNum,
  percentual_medicao: optPct,
  data_medicao: optStr,
  data_pagamento: optStr,
  status: z
    .enum(['PREVISTA', 'MEDIDA', 'APROVADA', 'PAGA', 'CANCELADA'] as const)
    .default('PREVISTA'),
  observacoes: optStr,
});

export type MedicaoInput = z.infer<typeof medicaoSchema>;

import { z } from 'zod';
import { ETAPAS_EAP } from '@/types/db';
import { num0, optEnum, optStr } from './_helpers';

const reqUuid = z
  .string()
  .min(36)
  .refine((v) => /^[0-9a-f-]{36}$/i.test(v), 'UUID inválido');

const reqNum = z
  .union([z.string(), z.number()])
  .transform((v) => Number(typeof v === 'string' ? v.replace(',', '.') : v))
  .refine((n) => Number.isFinite(n) && n >= 0, 'Valor inválido');

export const medicaoSchema = z.object({
  empreendimento_id: reqUuid,
  empresa_id: reqUuid,
  etapa: optEnum(ETAPAS_EAP as [string, ...string[]]),
  descricao: z.string().min(2, 'Descrição obrigatória').max(300),
  valor_orcado: reqNum,
  numero_medicao: optStr.optional(),
  valor_medicao: reqNum,
  percentual_medicao: num0,
  data_medicao: optStr.optional(),
  data_pagamento: optStr.optional(),
  status: z
    .enum(['PREVISTA', 'MEDIDA', 'APROVADA', 'PAGA', 'CANCELADA'] as const)
    .default('PREVISTA'),
  observacoes: optStr.optional(),
});

export type MedicaoInput = z.infer<typeof medicaoSchema>;

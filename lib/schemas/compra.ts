import { z } from 'zod';
import { ETAPAS_EAP } from '@/types/db';

const optStr = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (v == null || v === '' ? null : String(v).trim()));

const optUuid = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (v == null || v === '' ? null : String(v)))
  .refine((v) => v == null || /^[0-9a-f-]{36}$/i.test(v), 'UUID inválido');

const reqUuid = z
  .string()
  .min(36, 'Empreendimento obrigatório')
  .refine((v) => /^[0-9a-f-]{36}$/i.test(v), 'UUID inválido');

const num0 = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === '' || v == null) return 0;
    const n = Number(typeof v === 'string' ? v.replace(',', '.') : v);
    return Number.isFinite(n) ? n : 0;
  });

const optInt = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === '' || v == null) return null;
    const n = parseInt(String(v), 10);
    return Number.isFinite(n) ? n : null;
  });

export const compraSchema = z.object({
  empreendimento_id: reqUuid,
  etapa: z.enum(ETAPAS_EAP as [string, ...string[]]).nullable().optional(),
  material_servico: z.string().min(2, 'Material/serviço obrigatório').max(200),
  descricao_detalhada: optStr,
  unidade: z
    .enum(['UN', 'KG', 'M2', 'M3', 'VB', 'MES', 'H'] as const)
    .nullable()
    .optional(),
  quantidade: num0,
  empresa_id: optUuid,
  empresa_nome: optStr,
  valor_total: num0,
  condicao_pagamento: optStr,
  prazo_entrega_dias: optInt,
  prioridade: z.enum(['URGENTE', 'MODERADA', 'NORMAL'] as const).default('NORMAL'),
  status: z
    .enum(['ABERTO', 'EM_NEGOCIACAO', 'COMPRADO', 'RECEBIDO', 'CANCELADO'] as const)
    .default('ABERTO'),
  data_aprovacao: optStr,
  data_compra: optStr,
  data_recebimento: optStr,
  numero_pedido: optStr,
  orcamento_id: optUuid,
  observacoes: optStr,
});

export type CompraInput = z.infer<typeof compraSchema>;

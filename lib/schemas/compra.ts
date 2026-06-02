import { z } from 'zod';
import { ETAPAS_EAP } from '@/types/db';
import { num0, optEnum, optInt, optStr, optUuid } from './_helpers';

const reqUuid = z
  .string()
  .min(36, 'Empreendimento obrigatório')
  .refine((v) => /^[0-9a-f-]{36}$/i.test(v), 'UUID inválido');

export const compraSchema = z.object({
  empreendimento_id: reqUuid,
  etapa: optEnum(ETAPAS_EAP as [string, ...string[]]),
  material_servico: z.string().min(2, 'Material/serviço obrigatório').max(200),
  descricao_detalhada: optStr.optional(),
  unidade: optEnum(['UN', 'KG', 'M2', 'M3', 'VB', 'MES', 'H'] as const),
  quantidade: num0,
  empresa_id: optUuid.optional(),
  empresa_nome: optStr.optional(),
  valor_total: num0,
  condicao_pagamento: optStr.optional(),
  prazo_entrega_dias: optInt.optional(),
  prioridade: z.enum(['URGENTE', 'MODERADA', 'NORMAL'] as const).default('NORMAL'),
  status: z
    .enum(['ABERTO', 'EM_NEGOCIACAO', 'COMPRADO', 'RECEBIDO', 'CANCELADO'] as const)
    .default('ABERTO'),
  data_aprovacao: optStr.optional(),
  data_compra: optStr.optional(),
  data_recebimento: optStr.optional(),
  numero_pedido: optStr.optional(),
  orcamento_id: optUuid.optional(),
  observacoes: optStr.optional(),
});

export type CompraInput = z.infer<typeof compraSchema>;

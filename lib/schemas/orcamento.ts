import { z } from 'zod';
import { ETAPAS_EAP } from '@/types/db';
import { num0, optEnum, optInt, optStr, optUuid } from './_helpers';

export const orcamentoSchema = z.object({
  empreendimento_id: optUuid.optional(),
  etapa: z.enum(ETAPAS_EAP as [string, ...string[]]),
  grupo_cotacao: z.string().min(1, 'Grupo de cotação obrigatório').max(120),
  material_servico: z.string().min(2, 'Material/serviço obrigatório').max(200),
  descricao_detalhada: optStr.optional(),
  unidade: optEnum(['UN', 'KG', 'M2', 'M3', 'VB', 'MES', 'H'] as const),
  quantidade: num0,
  valor_unitario: num0,
  empresa_id: optUuid.optional(),
  prazo_entrega_dias: optInt.optional(),
  condicao_pagamento: optStr.optional(),
  data_cotacao: optStr.optional(),
  validade_proposta: optStr.optional(),
  status: z
    .enum(['PENDENTE', 'VENCEDOR', 'PERDEDOR', 'EM_ANALISE', 'CANCELADO'] as const)
    .default('PENDENTE'),
  observacoes: optStr.optional(),
  anexo_url: optStr.optional(),
});

export type OrcamentoInput = z.infer<typeof orcamentoSchema>;

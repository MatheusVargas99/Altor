import { z } from 'zod';
import { ETAPAS_EAP } from '@/types/db';

const optStr = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (v == null || v === '' ? null : String(v).trim()));

const optUuid = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (v == null || v === '' ? null : String(v)))
  .refine((v) => v == null || /^[0-9a-f-]{36}$/i.test(v), 'UUID inválido');

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

export const orcamentoSchema = z.object({
  empreendimento_id: optUuid,
  etapa: z.enum(ETAPAS_EAP as [string, ...string[]]),
  grupo_cotacao: z.string().min(1, 'Grupo de cotação obrigatório').max(120),
  material_servico: z.string().min(2, 'Material/serviço obrigatório').max(200),
  descricao_detalhada: optStr,
  unidade: z
    .enum(['UN', 'KG', 'M2', 'M3', 'VB', 'MES', 'H'] as const)
    .nullable()
    .optional(),
  quantidade: num0,
  valor_unitario: num0,
  empresa_id: optUuid,
  prazo_entrega_dias: optInt,
  condicao_pagamento: optStr,
  data_cotacao: optStr,
  validade_proposta: optStr,
  status: z
    .enum(['PENDENTE', 'VENCEDOR', 'PERDEDOR', 'EM_ANALISE', 'CANCELADO'] as const)
    .default('PENDENTE'),
  observacoes: optStr,
  anexo_url: optStr,
});

export type OrcamentoInput = z.infer<typeof orcamentoSchema>;

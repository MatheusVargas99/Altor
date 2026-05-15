import { z } from 'zod';

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

export const contratoSchema = z
  .object({
    numero: z.string().min(1, 'Número obrigatório').max(120),
    tipo: z
      .enum([
        'COMPRA_VENDA',
        'EMPREITADA',
        'FORNECIMENTO',
        'PRESTACAO_SERVICO',
        'INVESTIMENTO',
        'LOCACAO',
        'OUTROS',
      ] as const)
      .nullable()
      .optional(),
    empreendimento_id: optUuid,
    parte_tipo: z.enum(['CLIENTE', 'EMPRESA'] as const).nullable().optional(),
    parte_cliente_id: optUuid,
    parte_empresa_id: optUuid,
    parte_nome: z.string().min(2, 'Nome da parte obrigatório'),
    objeto: optStr,
    valor_total: optNum,
    forma_pagamento: optStr,
    data_assinatura: optStr,
    data_vigencia_inicio: optStr,
    data_vigencia_fim: optStr,
    status: z
      .enum([
        'EM_ELABORACAO',
        'ATIVO',
        'DISTRATADO',
        'ENCERRADO',
        'INADIMPLENTE',
      ] as const)
      .default('EM_ELABORACAO'),
    arquivo_url: optStr,
    observacoes: optStr,
  })
  .refine(
    (v) =>
      !(v.parte_cliente_id && v.parte_empresa_id),
    { message: 'Selecione cliente OU empresa, não ambos', path: ['parte_cliente_id'] },
  );

export type ContratoInput = z.infer<typeof contratoSchema>;

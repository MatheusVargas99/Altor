import { z } from 'zod';
import { optEnum, optNum, optStr, optUuid } from './_helpers';

export const contratoSchema = z
  .object({
    numero: z.string().min(1, 'Número obrigatório').max(120),
    tipo: optEnum([
      'COMPRA_VENDA',
      'EMPREITADA',
      'FORNECIMENTO',
      'PRESTACAO_SERVICO',
      'INVESTIMENTO',
      'LOCACAO',
      'OUTROS',
    ] as const),
    empreendimento_id: optUuid.optional(),
    parte_tipo: optEnum(['CLIENTE', 'EMPRESA'] as const),
    parte_cliente_id: optUuid.optional(),
    parte_empresa_id: optUuid.optional(),
    parte_nome: z.string().min(2, 'Nome da parte obrigatório'),
    objeto: optStr.optional(),
    valor_total: optNum.optional(),
    forma_pagamento: optStr.optional(),
    data_assinatura: optStr.optional(),
    data_vigencia_inicio: optStr.optional(),
    data_vigencia_fim: optStr.optional(),
    status: z
      .enum([
        'EM_ELABORACAO',
        'ATIVO',
        'DISTRATADO',
        'ENCERRADO',
        'INADIMPLENTE',
      ] as const)
      .default('EM_ELABORACAO'),
    arquivo_url: optStr.optional(),
    observacoes: optStr.optional(),
  })
  .refine(
    (v) => !(v.parte_cliente_id && v.parte_empresa_id),
    { message: 'Selecione cliente OU empresa, não ambos', path: ['parte_cliente_id'] },
  );

export type ContratoInput = z.infer<typeof contratoSchema>;

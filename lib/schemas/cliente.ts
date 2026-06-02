import { z } from 'zod';
import { CLIENTE_CLASSIFS, CLIENTE_ORIGENS } from '@/types/db';
import { optEnum, optStr } from './_helpers';

export const clienteSchema = z.object({
  nome_completo: z.string().min(2, 'Nome obrigatório').max(200),
  tipo_pessoa: optEnum(['PF', 'PJ'] as const),
  cpf_cnpj: optStr.optional(),
  rg: optStr.optional(),
  data_nascimento: optStr.optional(),
  estado_civil: optStr.optional(),
  profissao: optStr.optional(),
  email: optStr
    .refine(
      (v) => !v || z.string().email().safeParse(v).success,
      'E-mail inválido',
    )
    .optional(),
  telefone: optStr.optional(),
  endereco: optStr.optional(),
  cidade: optStr.optional(),
  uf: optStr.optional(),
  origem_lead: optEnum(CLIENTE_ORIGENS as [string, ...string[]]),
  classificacao: optEnum(CLIENTE_CLASSIFS as [string, ...string[]]),
  observacoes: optStr.optional(),
  ativo: z.coerce.boolean().default(true),
});

export type ClienteInput = z.infer<typeof clienteSchema>;

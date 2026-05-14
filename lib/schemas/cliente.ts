import { z } from 'zod';
import { CLIENTE_CLASSIFS, CLIENTE_ORIGENS } from '@/types/db';

const optStr = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (v == null || v === '' ? null : v.trim()));

export const clienteSchema = z.object({
  nome_completo: z.string().min(2, 'Nome obrigatório').max(200),
  tipo_pessoa: z.enum(['PF', 'PJ']).nullable().optional(),
  cpf_cnpj: optStr,
  rg: optStr,
  data_nascimento: optStr,
  estado_civil: optStr,
  profissao: optStr,
  email: optStr.refine(
    (v) => !v || z.string().email().safeParse(v).success,
    'E-mail inválido',
  ),
  telefone: optStr,
  endereco: optStr,
  cidade: optStr,
  uf: optStr,
  origem_lead: z.enum(CLIENTE_ORIGENS as [string, ...string[]]).nullable().optional(),
  classificacao: z.enum(CLIENTE_CLASSIFS as [string, ...string[]]).nullable().optional(),
  observacoes: optStr,
  ativo: z.coerce.boolean().default(true),
});

export type ClienteInput = z.infer<typeof clienteSchema>;

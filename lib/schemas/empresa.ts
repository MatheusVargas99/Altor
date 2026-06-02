import { z } from 'zod';
import { EMPRESA_CATEGORIAS } from '@/types/db';
import { optEnum, optStr } from './_helpers';

const ufList = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
  'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

export const empresaSchema = z.object({
  razao_social: z.string().min(2, 'Razão social obrigatória').max(200),
  nome_fantasia: optStr.optional(),
  cnpj: optStr
    .refine(
      (v) => !v || /^\d{14}$/.test(v.replace(/\D/g, '')),
      'CNPJ inválido (14 dígitos)',
    )
    .optional(),
  inscricao_estadual: optStr.optional(),
  categoria: optEnum(EMPRESA_CATEGORIAS as [string, ...string[]]),
  email: optStr
    .refine(
      (v) => !v || z.string().email().safeParse(v).success,
      'E-mail inválido',
    )
    .optional(),
  telefone: optStr.optional(),
  contato_responsavel: optStr.optional(),
  endereco: optStr.optional(),
  cidade: optStr.optional(),
  uf: optStr
    .refine((v) => !v || ufList.includes(v.toUpperCase()), 'UF inválida')
    .optional(),
  chave_pix: optStr.optional(),
  banco: optStr.optional(),
  agencia: optStr.optional(),
  conta: optStr.optional(),
  observacoes: optStr.optional(),
  ativo: z.coerce.boolean().default(true),
});

export type EmpresaInput = z.infer<typeof empresaSchema>;

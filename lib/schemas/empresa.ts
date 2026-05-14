import { z } from 'zod';
import { EMPRESA_CATEGORIAS } from '@/types/db';

const ufList = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
  'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

const optStr = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (v == null || v === '' ? null : v.trim()));

export const empresaSchema = z.object({
  razao_social: z.string().min(2, 'Razão social obrigatória').max(200),
  nome_fantasia: optStr,
  cnpj: optStr.refine(
    (v) => !v || /^\d{14}$/.test(v.replace(/\D/g, '')),
    'CNPJ inválido (14 dígitos)',
  ),
  inscricao_estadual: optStr,
  categoria: z.enum(EMPRESA_CATEGORIAS as [string, ...string[]]).nullable().optional(),
  email: optStr.refine(
    (v) => !v || z.string().email().safeParse(v).success,
    'E-mail inválido',
  ),
  telefone: optStr,
  contato_responsavel: optStr,
  endereco: optStr,
  cidade: optStr,
  uf: optStr.refine((v) => !v || ufList.includes(v.toUpperCase()), 'UF inválida'),
  chave_pix: optStr,
  banco: optStr,
  agencia: optStr,
  conta: optStr,
  observacoes: optStr,
  ativo: z.coerce.boolean().default(true),
});

export type EmpresaInput = z.infer<typeof empresaSchema>;

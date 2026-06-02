import { z } from 'zod';
import { EMPREEND_STATUS } from '@/types/db';
import { optInt, optNum, optStr } from './_helpers';

export const empreendimentoSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório').max(200),
  codigo_curto: optStr.optional(),
  endereco: optStr.optional(),
  cidade: optStr.optional(),
  uf: optStr.optional(),
  area_terreno: optNum.optional(),
  area_construida: optNum.optional(),
  n_unidades: optInt.optional(),
  vgv_estimado: optNum.optional(),
  custo_total_estimado: optNum.optional(),
  data_inicio_prevista: optStr.optional(),
  data_entrega_prevista: optStr.optional(),
  data_inicio_real: optStr.optional(),
  data_entrega_real: optStr.optional(),
  status: z.enum(EMPREEND_STATUS as [string, ...string[]]).default('PLANEJAMENTO'),
  observacoes: optStr.optional(),
});

export type EmpreendimentoInput = z.infer<typeof empreendimentoSchema>;

import { z } from 'zod';
import { EMPREEND_STATUS } from '@/types/db';

const optStr = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (v == null || v === '' ? null : String(v).trim()));

const optNum = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === '' || v == null) return null;
    const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  });

const optInt = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === '' || v == null) return null;
    const n = parseInt(String(v), 10);
    return Number.isFinite(n) ? n : null;
  });

export const empreendimentoSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório').max(200),
  codigo_curto: optStr,
  endereco: optStr,
  cidade: optStr,
  uf: optStr,
  area_terreno: optNum,
  area_construida: optNum,
  n_unidades: optInt,
  vgv_estimado: optNum,
  custo_total_estimado: optNum,
  data_inicio_prevista: optStr,
  data_entrega_prevista: optStr,
  data_inicio_real: optStr,
  data_entrega_real: optStr,
  status: z.enum(EMPREEND_STATUS as [string, ...string[]]).default('PLANEJAMENTO'),
  observacoes: optStr,
});

export type EmpreendimentoInput = z.infer<typeof empreendimentoSchema>;

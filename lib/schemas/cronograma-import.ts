import { z } from 'zod';
import { ETAPAS_EAP } from '@/types/db';

const data = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida')
  .nullable();

export const tarefaImportSchema = z.object({
  ordem: z.number().int().min(1),
  uid_msproject: z.string().max(40).nullable(),
  wbs: z.string().max(60).nullable(),
  nivel: z.number().int().min(1).max(50),
  resumo: z.boolean(),
  marco: z.boolean(),
  nome: z.string().min(1).max(500),
  data_inicio: data,
  data_fim: data,
  percentual_fisico: z.number().min(0).max(100),
  custo_orcado: z.number().min(0),
  etapa: z.enum(ETAPAS_EAP as [string, ...string[]]).nullable(),
});

export const importCronogramaSchema = z.object({
  empreendimento_id: z.string().regex(/^[0-9a-f-]{36}$/i, 'Empreendimento inválido'),
  tarefas: z.array(tarefaImportSchema).min(1, 'Nenhuma tarefa para importar').max(3000, 'Máximo de 3.000 tarefas por arquivo'),
  atualizar_datas: z.boolean(),
  atualizar_fisico: z.boolean(),
  atualizar_custo: z.boolean(),
});

export type TarefaImport = z.infer<typeof tarefaImportSchema>;
export type ImportCronogramaInput = z.infer<typeof importCronogramaSchema>;

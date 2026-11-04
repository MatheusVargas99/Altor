'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  fisicoTarefaSchema,
  importCronogramaSchema,
  type FisicoTarefaInput,
  type ImportCronogramaInput,
} from '@/lib/schemas/cronograma-import';

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  return { supabase, user };
}

export async function importarCronogramaMsProject(
  input: ImportCronogramaInput,
): Promise<Result<{ tarefas: number; etapas: number }>> {
  const { supabase } = await requireUser();
  const parsed = importCronogramaSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }
  const v = parsed.data;
  const { data, error } = await supabase.rpc('importar_cronograma_msproject', {
    p_empreendimento_id: v.empreendimento_id,
    p_tarefas: v.tarefas,
    p_atualizar_datas: v.atualizar_datas,
    p_atualizar_fisico: v.atualizar_fisico,
    p_atualizar_custo: v.atualizar_custo,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/cronograma');
  return { ok: true, data: data as { tarefas: number; etapas: number } };
}

export async function atualizarFisicoTarefa(input: FisicoTarefaInput): Promise<Result> {
  const { supabase } = await requireUser();
  const parsed = fisicoTarefaSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }
  const { error } = await supabase.rpc('atualizar_fisico_tarefa', {
    p_tarefa_id: parsed.data.id,
    p_percentual: parsed.data.percentual,
    p_atualizar_etapa: parsed.data.atualizar_etapa,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/cronograma');
  return { ok: true };
}

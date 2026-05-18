'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { CronogramaStatus } from '@/types/db';

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  return { supabase, user };
}

export async function updateCronogramaEtapa(
  id: string,
  fields: {
    custo_orcado?: number;
    percentual_fisico?: number;
    status?: CronogramaStatus;
    data_inicio_prevista?: string | null;
    data_fim_prevista?: string | null;
  },
): Promise<Result> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from('cronograma')
    .update({ ...fields, atualizado_por: user.id })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/cronograma');
  return { ok: true };
}

const EAP_PADRAO = [
  { etapa: 'M0_PRELIMINARES',            marco: 'M0', descricao: 'Serviços preliminares e canteiro',      ordem: 1,  peso: 0.03 },
  { etapa: 'M0_TERRAPLENAGEM',           marco: 'M0', descricao: 'Movimento de terra e contenções',       ordem: 2,  peso: 0.04 },
  { etapa: 'M1_FUNDACAO',                marco: 'M1', descricao: 'Estacas, blocos, baldrames',            ordem: 3,  peso: 0.10 },
  { etapa: 'M2_ESTRUTURA',               marco: 'M2', descricao: 'Pilares, vigas, lajes (até cobertura)', ordem: 4,  peso: 0.18 },
  { etapa: 'M3_ALVENARIA',               marco: 'M3', descricao: 'Vedação interna e externa',             ordem: 5,  peso: 0.08 },
  { etapa: 'M3_INSTALACOES_HIDRAULICAS', marco: 'M3', descricao: 'Hidrossanitário e gás',                 ordem: 6,  peso: 0.06 },
  { etapa: 'M3_INSTALACOES_ELETRICAS',   marco: 'M3', descricao: 'Elétrica e dados',                      ordem: 7,  peso: 0.06 },
  { etapa: 'M4_REVESTIMENTO',            marco: 'M4', descricao: 'Reboco, contrapiso, cerâmica',          ordem: 8,  peso: 0.10 },
  { etapa: 'M4_ESQUADRIAS',              marco: 'M4', descricao: 'Portas, janelas, vidros',               ordem: 9,  peso: 0.06 },
  { etapa: 'M4_PINTURA',                 marco: 'M4', descricao: 'Massa, selador, tinta',                 ordem: 10, peso: 0.05 },
  { etapa: 'M4_LOUCAS_METAIS',           marco: 'M4', descricao: 'Bancadas, louças, metais',              ordem: 11, peso: 0.04 },
  { etapa: 'M5_AREA_COMUM',              marco: 'M5', descricao: 'Hall, garagem, fachada, paisagismo',    ordem: 12, peso: 0.10 },
  { etapa: 'M6_HABITESE',                marco: 'M6', descricao: 'Vistorias e habite-se',                 ordem: 13, peso: 0.06 },
  { etapa: 'M7_ENTREGA',                 marco: 'M7', descricao: 'Entrega das chaves',                    ordem: 14, peso: 0.04 },
] as const;

export async function inicializarEAP(empreendimentoId: string): Promise<Result> {
  const { supabase, user } = await requireUser();
  const rows = EAP_PADRAO.map((e) => ({
    empreendimento_id: empreendimentoId,
    etapa: e.etapa,
    marco: e.marco,
    descricao: e.descricao,
    ordem: e.ordem,
    peso: e.peso,
    status: 'NAO_INICIADA' as CronogramaStatus,
    criado_por: user.id,
    atualizado_por: user.id,
  }));
  const { error } = await supabase
    .from('cronograma')
    .upsert(rows, { onConflict: 'empreendimento_id,etapa', ignoreDuplicates: true });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/cronograma');
  return { ok: true };
}

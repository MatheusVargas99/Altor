'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { CrStatus, CpStatus, ComissaoStatus, ContratoStatus } from '@/types/db';

type Result = { ok: true } | { ok: false; error: string };

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  return { supabase, user };
}

export async function atualizarStatusCR(
  id: string,
  status: CrStatus,
  data_pagamento?: string,
): Promise<Result> {
  const { supabase, user } = await requireUser();
  const updates: Record<string, unknown> = { status, atualizado_por: user.id };
  if (status === 'PAGO') {
    updates.data_pagamento = data_pagamento ?? new Date().toISOString().slice(0, 10);
  }
  const { error } = await supabase.from('contas_receber').update(updates).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/agenda');
  revalidatePath('/contas-receber');
  return { ok: true };
}

export async function atualizarStatusCP(
  id: string,
  status: CpStatus,
  data_pagamento?: string,
): Promise<Result> {
  const { supabase, user } = await requireUser();
  const updates: Record<string, unknown> = { status, atualizado_por: user.id };
  if (status === 'PAGO') {
    updates.data_pagamento = data_pagamento ?? new Date().toISOString().slice(0, 10);
  }
  const { error } = await supabase.from('contas_pagar').update(updates).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/agenda');
  revalidatePath('/contas-pagar');
  return { ok: true };
}

export async function atualizarStatusComissao(
  id: string,
  status: ComissaoStatus,
): Promise<Result> {
  const { supabase, user } = await requireUser();
  const updates: Record<string, unknown> = { status, atualizado_por: user.id };
  if (status === 'PAGA') {
    updates.data_paga = new Date().toISOString().slice(0, 10);
  }
  const { error } = await supabase.from('comissoes').update(updates).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/agenda');
  revalidatePath('/comissoes');
  return { ok: true };
}

export async function atualizarStatusContrato(
  id: string,
  status: ContratoStatus,
): Promise<Result> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from('contratos')
    .update({ status, atualizado_por: user.id })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/agenda');
  revalidatePath('/contratos');
  return { ok: true };
}

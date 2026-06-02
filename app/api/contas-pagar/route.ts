import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { contaPagarSchema } from '@/lib/schemas/contas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Bypass route para criar conta a pagar via fetch direto, sem passar pelo
 * mecanismo de Server Actions do Next.js (que está travando para o usuário —
 * fetch direto à mesma origem retorna 200 normalmente, mas o action proxy
 * do Next.js client runtime não está nem fazendo o POST).
 *
 * Mantém exatamente a mesma lógica de validação, auth e insert do server
 * action `createContaPagar` em lib/actions/contas-pagar.ts.
 */
export async function POST(req: Request) {
  console.log('[API cp] POST recebido');
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = contaPagarSchema.safeParse(raw);
  if (!parsed.success) {
    console.log('[API cp] zod fail', parsed.error.issues[0]);
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? 'Inválido' },
      { status: 400 },
    );
  }

  // aplicarAutoFillPago — réplica do server action
  const input = parsed.data;
  const final =
    input.status === 'PAGO'
      ? {
          ...input,
          valor_pago:
            input.valor_pago && input.valor_pago > 0
              ? input.valor_pago
              : input.valor_original,
          data_pagamento:
            input.data_pagamento ?? new Date().toISOString().slice(0, 10),
        }
      : input;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 });
  }
  console.log('[API cp] user ok', user.id);

  const { data, error } = await supabase
    .from('contas_pagar')
    .insert({ ...final, criado_por: user.id, atualizado_por: user.id })
    .select('id')
    .single();

  if (error) {
    console.log('[API cp] insert error', error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  console.log('[API cp] insert ok', data.id);
  revalidatePath('/contas-pagar');
  revalidatePath('/dashboard');
  revalidatePath('/agenda');
  return NextResponse.json({ ok: true, data: { id: data.id } });
}

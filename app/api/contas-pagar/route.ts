import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { contaPagarSchema } from '@/lib/schemas/contas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Rota POST de criar conta a pagar via fetch direto, alternativa ao Server
 * Action. Mantida em produção como safety net porque o Server Action client
 * runtime do Next.js 14.2 mostrou comportamento intermitente para o usuário
 * (button stuck em "Salvando..." sem POST chegando ao Vercel).
 * Mantém a mesma lógica de validação, auth e insert de `createContaPagar`.
 */
export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = contaPagarSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { ok: false, error: first?.message ?? 'Inválido' },
      { status: 400 },
    );
  }

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

  const { data, error } = await supabase
    .from('contas_pagar')
    .insert({ ...final, criado_por: user.id, atualizado_por: user.id })
    .select('id')
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  revalidatePath('/contas-pagar');
  revalidatePath('/dashboard');
  revalidatePath('/agenda');
  return NextResponse.json({ ok: true, data: { id: data.id } });
}

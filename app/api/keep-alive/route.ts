import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from('empresas')
    .select('id', { head: true, count: 'exact' })
    .limit(1);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}

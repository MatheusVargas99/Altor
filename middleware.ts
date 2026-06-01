import { updateSession } from '@/lib/supabase/middleware';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_next/data|api|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|css|js|ico|map)$).*)',
  ],
};

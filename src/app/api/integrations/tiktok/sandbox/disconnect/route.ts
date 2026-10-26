import { NextRequest, NextResponse } from 'next/server';
import { allowedOrigin, clearSandboxCookie, jsonForbidden, sandboxAdmin, sandboxUrl, SB_SESSION, SB_STATE } from '@/lib/tiktokSandbox';

export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  const user = await sandboxAdmin();
  if (!user) return jsonForbidden();
  if (!allowedOrigin(request)) return NextResponse.json({ error: 'Origem inválida.' }, { status: 403 });
  const response = NextResponse.redirect(sandboxUrl('desconectado'), { status: 303 });
  clearSandboxCookie(response, SB_SESSION);
  clearSandboxCookie(response, SB_STATE);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

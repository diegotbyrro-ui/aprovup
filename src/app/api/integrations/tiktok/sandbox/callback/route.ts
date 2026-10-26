import { NextRequest, NextResponse } from 'next/server';
import {
  clearSandboxCookie, getSandboxState, sandboxAdmin, sandboxConfig, sandboxUrl,
  SB_STATE, setSandboxSession, type SandboxSession,
} from '@/lib/tiktokSandbox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TokenPayload = {
  access_token?: string; refresh_token?: string; expires_in?: number;
  open_id?: string; scope?: string; error?: string;
};

export async function GET(request: NextRequest) {
  const user = await sandboxAdmin();
  if (!user) return NextResponse.redirect(sandboxUrl('acesso-negado'));
  const state = getSandboxState(request, user);
  const config = sandboxConfig();
  const fallback = (status: string) => {
    const response = NextResponse.redirect(sandboxUrl(status));
    clearSandboxCookie(response, SB_STATE);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  };
  if (!state || !config.ready) return fallback('sessao-invalida');
  if (request.nextUrl.searchParams.has('error')) return fallback('acesso-cancelado');
  const code = request.nextUrl.searchParams.get('code') || '';
  const returnedState = request.nextUrl.searchParams.get('state') || '';
  if (!code || returnedState !== state.state) return fallback('sessao-invalida');
  try {
    const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_key: config.key, client_secret: config.secret, code,
        grant_type: 'authorization_code', redirect_uri: config.redirectUri }),
      cache: 'no-store', signal: AbortSignal.timeout(15000),
    });
    const token = await response.json() as TokenPayload;
    if (!response.ok || !token.access_token || !token.open_id) return fallback('autorizacao-falhou');
    const session: SandboxSession = {
      userId: user.id, agencyId: user.agencyId, accessToken: token.access_token,
      refreshToken: token.refresh_token || null,
      openId: token.open_id, scopes: token.scope || '',
      tokenExpiresAt: Date.now() + Math.max(60, Number(token.expires_in) || 86400) * 1000,
      sessionExpiresAt: Date.now() + 3 * 24 * 60 * 60 * 1000,
    };
    const result = fallback('conectado');
    setSandboxSession(result, session);
    return result;
  } catch {
    return fallback('autorizacao-falhou');
  }
}

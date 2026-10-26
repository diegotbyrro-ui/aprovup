import { NextRequest, NextResponse } from 'next/server';
import { newSandboxState, sandboxAdmin, sandboxConfig, sandboxUrl, setSandboxState } from '@/lib/tiktokSandbox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  const user = await sandboxAdmin();
  if (!user) return NextResponse.redirect(sandboxUrl('acesso-negado'));
  const config = sandboxConfig();
  if (!config.ready) return NextResponse.redirect(sandboxUrl('configuracao-pendente'));
  const state = newSandboxState(user);
  const url = new URL('https://www.tiktok.com/v2/auth/authorize/');
  url.searchParams.set('client_key', config.key);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'user.info.basic,video.list,user.info.stats,video.publish');
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('state', state.state);
  const response = NextResponse.redirect(url);
  response.headers.set('Cache-Control', 'no-store');
  setSandboxState(response, state);
  return response;
}

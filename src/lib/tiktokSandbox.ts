import 'server-only';
import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { decryptSocialSecret, encryptSocialSecret, socialAppOrigin } from '@/lib/socialOAuth';

export const SB_STATE = 'aprovup_tiktok_sb_oauth_v1';
export const SB_SESSION = 'aprovup_tiktok_sb_session_v1';
export const SB_PAGE = '/configuracoes/integracoes/tiktok-sandbox';
const COOKIE_MAX = 3650;

export type SandboxUser = { id: string; agencyId: string };
export type SandboxState = { userId: string; agencyId: string; state: string; expiresAt: number };
export type SandboxSession = {
  userId: string;
  agencyId: string;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: number;
  sessionExpiresAt: number;
  scopes: string;
  openId: string;
};

export function sandboxConfig() {
  const key = (process.env.TIKTOK_SANDBOX_CLIENT_KEY || '').trim();
  const secret = (process.env.TIKTOK_SANDBOX_CLIENT_SECRET || '').trim();
  const origin = socialAppOrigin();
  const redirectUri = origin + '/api/integrations/tiktok/sandbox/callback';
  // Sandbox must use distinct credentials; never accidentally use production app's key.
  const safe = Boolean(key && secret && key !== process.env.TIKTOK_CLIENT_KEY);
  return { key, secret, origin, redirectUri, ready: safe };
}

export function sandboxUrl(status?: string) {
  const url = new URL(SB_PAGE, sandboxConfig().origin);
  if (status) url.searchParams.set('status', status);
  return url;
}

export async function sandboxAdmin(): Promise<SandboxUser | null> {
  const user = await getCurrentUser();
  if (!user || user.status !== 'APROVADO' || user.role !== 'DIRECTOR' || !user.agencyId) return null;
  return { id: user.id, agencyId: user.agencyId };
}

export function jsonForbidden() {
  return NextResponse.json({ error: 'Acesso permitido apenas à diretoria.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
}

export function newSandboxState(user: SandboxUser): SandboxState {
  return { userId: user.id, agencyId: user.agencyId, state: randomBytes(32).toString('base64url'), expiresAt: Date.now() + 600_000 };
}

function parseEncrypted<T>(input: string | undefined): T | null {
  if (!input) return null;
  try { return JSON.parse(decryptSocialSecret(input)) as T; }
  catch { return null; }
}

export function getSandboxState(request: NextRequest, user: SandboxUser): SandboxState | null {
  const s = parseEncrypted<SandboxState>(request.cookies.get(SB_STATE)?.value);
  return s && s.userId === user.id && s.agencyId === user.agencyId && s.expiresAt > Date.now() ? s : null;
}

export function getSandboxSession(request: NextRequest, user: SandboxUser): SandboxSession | null {
  const s = parseEncrypted<SandboxSession>(request.cookies.get(SB_SESSION)?.value);
  return s && s.userId === user.id && s.agencyId === user.agencyId && s.sessionExpiresAt > Date.now() && Boolean(s.accessToken) ? s : null;
}

function setEncryptedCookie(response: NextResponse, name: string, payload: object, maxAge: number) {
  const value = encryptSocialSecret(JSON.stringify(payload));
  // Cookies have a 4KB per-cookie browser limit. Never silently truncate encrypted tokens.
  if (value.length > COOKIE_MAX) throw new Error('Credencial de teste excede o limite seguro da sessão.');
  response.cookies.set(name, value, {
    httpOnly: true, secure: sandboxConfig().origin.startsWith('https://'), sameSite: 'lax',
    path: '/', maxAge,
  });
}

export function setSandboxState(response: NextResponse, payload: SandboxState) {
  setEncryptedCookie(response, SB_STATE, payload, 600);
}
export function setSandboxSession(response: NextResponse, payload: SandboxSession) {
  const seconds = Math.max(1, Math.floor((payload.sessionExpiresAt - Date.now()) / 1000));
  setEncryptedCookie(response, SB_SESSION, payload, seconds);
}
export function clearSandboxCookie(response: NextResponse, name: string) {
  response.cookies.set(name, '', { httpOnly: true, secure: sandboxConfig().origin.startsWith('https://'), sameSite: 'lax', path: '/', maxAge: 0 });
}

export type TikTokResult<T> = { data?: T; error?: { code?: string; message?: string } };
export async function tiktokFetch<T>(url: string, token: string, body?: object): Promise<T> {
  const response = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store', signal: AbortSignal.timeout(15000),
  });
  const payload = await response.json() as TikTokResult<T>;
  if (!response.ok || (payload.error?.code && payload.error.code !== 'ok')) {
    // Only provider error code: avoid leaking tokens or provider payloads.
    throw new Error(`TikTok API recusou a consulta (${String(payload.error?.code || response.status)}).`);
  }
  if (!payload.data) throw new Error('TikTok não retornou dados para a consulta.');
  return payload.data;
}

export async function maybeRefresh(session: SandboxSession): Promise<{ session: SandboxSession; changed: boolean }> {
  if (session.tokenExpiresAt > Date.now() + 120000) return { session, changed: false };
  if (!session.refreshToken) throw new Error('Sessão TikTok de testes expirada. Reconecte o Sandbox.');
  const config = sandboxConfig();
  if (!config.ready) throw new Error('Credenciais do Sandbox não configuradas.');
  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_key: config.key, client_secret: config.secret,
      grant_type: 'refresh_token', refresh_token: session.refreshToken }),
    cache: 'no-store', signal: AbortSignal.timeout(15000),
  });
  const payload = await res.json() as {
    access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; error?: string;
  };
  if (!res.ok || !payload.access_token) throw new Error('Não foi possível renovar a sessão de teste. Reconecte o Sandbox.');
  return { changed: true, session: {
    ...session, accessToken: payload.access_token,
    refreshToken: payload.refresh_token || session.refreshToken,
    tokenExpiresAt: Date.now() + Math.max(60, Number(payload.expires_in) || 86400) * 1000,
    scopes: payload.scope || session.scopes,
  } };
}

export function allowedOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  return Boolean(origin && origin === sandboxConfig().origin);
}

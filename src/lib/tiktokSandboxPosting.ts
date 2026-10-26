import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { decryptSocialSecret, encryptSocialSecret } from '@/lib/socialOAuth';
import { sandboxConfig, type SandboxUser } from '@/lib/tiktokSandbox';

export const SB_POST = 'aprovup_tiktok_sb_post_v1';
const SESSION_TTL = 3600;

export type SandboxPost = {
  userId: string;
  agencyId: string;
  contentId: string;
  publishId: string;
  createdAt: number;
  expiresAt: number;
};

export type CreatorInfo = {
  creator_username?: string;
  creator_nickname?: string;
  privacy_level_options?: string[];
  comment_disabled?: boolean;
  duet_disabled?: boolean;
  stitch_disabled?: boolean;
  max_video_post_duration_sec?: number;
};

export function readSandboxPost(request: NextRequest, user: SandboxUser): SandboxPost | null {
  const value = request.cookies.get(SB_POST)?.value;
  if (!value) return null;
  try {
    const data = JSON.parse(decryptSocialSecret(value)) as SandboxPost;
    if (data.userId !== user.id || data.agencyId !== user.agencyId || data.expiresAt <= Date.now()) return null;
    if (!data.publishId || !data.contentId) return null;
    return data;
  } catch { return null; }
}

export function setSandboxPost(response: NextResponse, post: SandboxPost) {
  response.cookies.set(SB_POST, encryptSocialSecret(JSON.stringify(post)), {
    httpOnly: true, secure: sandboxConfig().origin.startsWith('https://'), sameSite: 'lax',
    path: '/', maxAge: SESSION_TTL,
  });
}

export function clearSandboxPost(response: NextResponse) {
  response.cookies.set(SB_POST, '', { httpOnly: true, secure: sandboxConfig().origin.startsWith('https://'),
    sameSite: 'lax', path: '/', maxAge: 0 });
}

export function publicPostStatus(status: string): string {
  if (status === 'PUBLISH_COMPLETE') return 'PUBLICADO_PRIVADO';
  if (status === 'FAILED') return 'ERRO';
  if (status === 'SEND_TO_USER_INBOX') return 'ENVIADO_COMO_RASCUNHO';
  return 'PROCESSANDO';
}

export function validVideoSource(value: string): URL {
  const configured = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  if (!configured) throw new Error('Storage do APROVUP não configurado.');
  const root = new URL(configured);
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.origin !== root.origin || url.username || url.password || url.search || url.hash ||
    !url.pathname.startsWith('/storage/v1/object/public/')) {
    throw new Error('Vídeo precisa estar no Storage público autorizado do APROVUP.');
  }
  return url;
}

export async function downloadSandboxVideo(value: string): Promise<Buffer> {
  const url = validVideoSource(value);
  const response = await fetch(url.toString(), { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(90000) });
  if (!response.ok || !response.body) throw new Error('Não foi possível ler o vídeo final no Storage.');
  const max = 50 * 1024 * 1024;
  const length = Number(response.headers.get('content-length') || 0);
  if (length > max) throw new Error('Para o teste, use vídeo MP4 de até 50 MB.');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      total += item.value.byteLength;
      if (total > max) throw new Error('Vídeo excede o limite de 50 MB para o teste.');
      chunks.push(item.value);
    }
  } finally { reader.releaseLock(); }
  if (total < 100) throw new Error('O arquivo de vídeo está vazio ou incompleto.');
  const result = Buffer.concat(chunks.map(v => Buffer.from(v)), total);
  // Detect ISO base media format, not a renamed arbitrary file.
  if (result.toString('ascii', 4, 8) !== 'ftyp') throw new Error('O arquivo final não parece ser um MP4 válido.');
  return result;
}

export function safeTikTokCode(error: unknown) {
  const msg = error instanceof Error ? error.message : 'Falha inesperada na publicação TikTok.';
  // No secrets, response bodies or URLs to the browser.
  return msg.slice(0, 250);
}

export function noStoreJson(data: object, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}

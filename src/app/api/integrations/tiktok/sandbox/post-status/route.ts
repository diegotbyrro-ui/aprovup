import { NextRequest } from 'next/server';
import { sandboxAdmin, sandboxConfig, getSandboxSession, maybeRefresh, setSandboxSession, tiktokFetch } from '@/lib/tiktokSandbox';
import { readSandboxPost, publicPostStatus, noStoreJson, safeTikTokCode } from '@/lib/tiktokSandboxPosting';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type StatusData = { status?: string; fail_reason?: string; publicaly_available_post_id?: string[] };
export async function GET(request: NextRequest) {
  const user = await sandboxAdmin();
  if (!user) return noStoreJson({ error: 'Acesso negado.' }, 403);
  if (!sandboxConfig().ready) return noStoreJson({ error: 'Sandbox não configurado.' }, 503);
  const initial = getSandboxSession(request, user);
  if (!initial) return noStoreJson({ error: 'Reconecte o Sandbox.' }, 401);
  const post = readSandboxPost(request, user);
  const contentId = request.nextUrl.searchParams.get('contentId');
  if (!post || !contentId || post.contentId !== contentId) return noStoreJson({ status: 'NENHUM_ENVIO' });
  try {
    const { session, changed } = await maybeRefresh(initial);
    const result = await tiktokFetch<StatusData>('https://open.tiktokapis.com/v2/post/publish/status/fetch/',
      session.accessToken, { publish_id: post.publishId });
    const mapped = publicPostStatus(result.status || '');
    const response = noStoreJson({ status: mapped, providerStatus: result.status || 'INDEFINIDO',
      failReason: result.status === 'FAILED' ? String(result.fail_reason || 'Erro de processamento') : undefined,
      publishId: post.publishId, complete: mapped === 'PUBLICADO_PRIVADO' });
    if (changed) setSandboxSession(response, session);
    return response;
  } catch (error) { return noStoreJson({ error: safeTikTokCode(error) }, 502); }
}

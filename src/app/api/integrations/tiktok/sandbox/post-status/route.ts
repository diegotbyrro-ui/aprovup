import { NextRequest } from 'next/server';
import { sandboxAdmin, sandboxConfig, getSandboxSession, maybeRefresh, setSandboxSession, tiktokFetch } from '@/lib/tiktokSandbox';
import { readSandboxPost, publicPostStatus, noStoreJson, safeTikTokCode } from '@/lib/tiktokSandboxPosting';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type StatusData = { status?: string; fail_reason?: string; publicaly_available_post_id?: string[]; uploaded_bytes?: number };
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
    const transferFailed = post.upload?.phase === 'ARQUIVO_NAO_CONFIRMADO';
    const uploadPendingZero = result.status === 'PROCESSING_UPLOAD' && result.uploaded_bytes === 0;
    // O TikTok pode manter PROCESSING_UPLOAD mesmo quando o servidor falhou no PUT.
    const statusForUser = transferFailed && uploadPendingZero ? 'FALHA_NA_TRANSFERENCIA' : mapped;
    const response = noStoreJson({ status: statusForUser, providerStatus: result.status || 'INDEFINIDO',
      failReason: result.status === 'FAILED' ? String(result.fail_reason || 'Erro de processamento') : undefined,
      publishId: post.publishId, complete: mapped === 'PUBLICADO_PRIVADO',
      uploadedBytes: typeof result.uploaded_bytes === 'number' && Number.isFinite(result.uploaded_bytes) ? result.uploaded_bytes : null,
      elapsedSeconds: Math.max(0, Math.floor((Date.now() - post.createdAt) / 1000)),
      uploadDiagnostic: post.upload ? {
        phase: post.upload.phase,
        httpStatus: post.upload.httpStatus ?? null,
        diagnosticCode: post.upload.diagnosticCode || null,
        sizeBytes: post.upload.sizeBytes ?? null,
      } : null,
      canAbandon: result.status === 'PROCESSING_UPLOAD' && result.uploaded_bytes === 0 && Date.now() - post.createdAt >= 30 * 60_000 });
    if (changed) setSandboxSession(response, session);
    return response;
  } catch (error) { return noStoreJson({ error: safeTikTokCode(error) }, 502); }
}

import { NextRequest } from 'next/server';
import { sandboxAdmin, sandboxConfig, allowedOrigin, getSandboxSession, maybeRefresh, setSandboxSession, tiktokFetch } from '@/lib/tiktokSandbox';
import { clearSandboxPost, noStoreJson, readSandboxPost, safeTikTokCode } from '@/lib/tiktokSandboxPosting';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type StatusData = { status?: string; uploaded_bytes?: number };
type Input = { contentId?: string; confirm?: string };

export async function POST(request: NextRequest) {
  const user = await sandboxAdmin();
  if (!user) return noStoreJson({ error: 'Somente a diretoria pode encerrar o rastreamento.' }, 403);
  if (!allowedOrigin(request)) return noStoreJson({ error: 'Origem nao autorizada.' }, 403);
  if (!sandboxConfig().ready) return noStoreJson({ error: 'Sandbox nao configurado.' }, 503);
  const initial = getSandboxSession(request, user);
  if (!initial) return noStoreJson({ error: 'Reconecte o Sandbox.' }, 401);
  let body: Input;
  try { body = await request.json() as Input; }
  catch { return noStoreJson({ error: 'Requisicao invalida.' }, 400); }
  if (body.confirm !== 'DESCARTAR_RASTREAMENTO' || !body.contentId || typeof body.contentId !== 'string') {
    return noStoreJson({ error: 'Confirme explicitamente a operacao.' }, 400);
  }
  const post = readSandboxPost(request, user);
  if (!post || post.contentId !== body.contentId) return noStoreJson({ error: 'Nenhum envio correspondente nesta sessao.' }, 409);
  if (Date.now() - post.createdAt < 30 * 60_000) {
    return noStoreJson({ error: 'A consulta ainda nao completou 30 minutos. Mantenha o rastreamento.' }, 409);
  }
  try {
    const { session, changed } = await maybeRefresh(initial);
    const result = await tiktokFetch<StatusData>('https://open.tiktokapis.com/v2/post/publish/status/fetch/',
      session.accessToken, { publish_id: post.publishId });
    if (result.status !== 'PROCESSING_UPLOAD' || result.uploaded_bytes !== 0) {
      return noStoreJson({ error: 'O TikTok nao confirmou zero bytes pendentes. Rastreamento mantido. Atualize o status.' }, 409);
    }
    const response = noStoreJson({ ok: true, status: 'NENHUM_ENVIO',
      message: 'Rastreamento local encerrado apos nova consulta confirmar zero bytes. Nenhum novo envio foi iniciado. Confira o perfil privado antes de tentar novamente.' });
    clearSandboxPost(response);
    if (changed) setSandboxSession(response, session);
    return response;
  } catch (error) {
    return noStoreJson({ error: safeTikTokCode(error) }, 502);
  }
}

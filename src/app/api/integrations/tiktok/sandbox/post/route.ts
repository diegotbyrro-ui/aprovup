import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sandboxAdmin, sandboxConfig, allowedOrigin, getSandboxSession, maybeRefresh, setSandboxSession, tiktokFetch } from '@/lib/tiktokSandbox';
import { type CreatorInfo, downloadSandboxVideo, noStoreJson, readSandboxPost, setSandboxPost, safeTikTokCode } from '@/lib/tiktokSandboxPosting';
import { sendTikTokUpload, TikTokUploadFailure } from '@/lib/tiktokSandboxTransport';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type InitResult = { publish_id?: string; upload_url?: string };
type Input = { contentId?: string; title?: string; consent?: boolean; privacy?: string };

export async function POST(request: NextRequest) {
  const user = await sandboxAdmin();
  if (!user) return noStoreJson({ error: 'Somente a diretoria pode testar publicações.' }, 403);
  if (!allowedOrigin(request)) return noStoreJson({ error: 'Origem não autorizada.' }, 403);
  if (!sandboxConfig().ready) return noStoreJson({ error: 'Sandbox não configurado.' }, 503);
  const original = getSandboxSession(request, user);
  if (!original) return noStoreJson({ error: 'Conecte o TikTok Sandbox antes de publicar.' }, 401);
  let body: Input;
  try { body = await request.json() as Input; } catch { return noStoreJson({ error: 'Requisição inválida.' }, 400); }
  if (!body.consent || body.privacy !== 'SELF_ONLY' || !body.contentId || typeof body.contentId !== 'string')
    return noStoreJson({ error: 'Confirme o envio privado e a autorização explícita.' }, 400);
  const title = String(body.title || '').trim();
  if (!title || title.length > 2200) return noStoreJson({ error: 'Informe uma legenda de até 2.200 caracteres.' }, 400);
  const pending = readSandboxPost(request, user);
  if (pending) return noStoreJson({ error: 'Há um envio anterior nesta sessão. Consulte o status antes de iniciar outro.' }, 409);
  const content = await prisma.content.findFirst({ where: { id: body.contentId, status: 'PRONTO_PARA_POSTAR',
    client: { agencyId: user.agencyId, name: { equals: 'Level UP', mode: 'insensitive' } } },
    select: { id: true, finalMediaUrl: true, finalMediaType: true, socialPublications: { where: { platform: 'TIKTOK', selected: true }, select: { id: true } } } });
  if (!content) return noStoreJson({ error: 'Selecione um conteúdo pronto para postar da Level UP.' }, 404);
  if (!content.socialPublications.length) return noStoreJson({ error: 'Marque TikTok como destino no conteúdo antes do teste.' }, 400);
  if (!content.finalMediaUrl || !String(content.finalMediaType || '').startsWith('video/'))
    return noStoreJson({ error: 'O TikTok exige um vídeo final. Imagens não são aceitas neste teste.' }, 400);
  let publishId: string | undefined;
  let videoSize: number | undefined;
  let uploadHttpStatus: number | undefined;
  let uploadPhase: 'ARQUIVO_CONFIRMADO' | 'ARQUIVO_NAO_CONFIRMADO' = 'ARQUIVO_NAO_CONFIRMADO';
  let uploadDiagnostic: string | undefined;
  try {
    const { session, changed } = await maybeRefresh(original);
    if (!session.scopes.split(/[\s,]+/).includes('video.publish'))
      return noStoreJson({ error: 'Reconecte o Sandbox autorizando video.publish.' }, 403);
    const creator = await tiktokFetch<CreatorInfo>('https://open.tiktokapis.com/v2/post/publish/creator_info/query/', session.accessToken, {});
    if (!(creator.privacy_level_options || []).includes('SELF_ONLY'))
      return noStoreJson({ error: 'O TikTok não autorizou a privacidade Somente eu para esta conta.' }, 400);
    const bytes = await downloadSandboxVideo(content.finalMediaUrl);
    videoSize = bytes.length;
    const init = await tiktokFetch<InitResult>('https://open.tiktokapis.com/v2/post/publish/video/init/', session.accessToken, {
      post_info: { title, privacy_level: 'SELF_ONLY', disable_comment: true, disable_duet: true, disable_stitch: true },
      source_info: { source: 'FILE_UPLOAD', video_size: bytes.length, chunk_size: bytes.length, total_chunk_count: 1 },
    });
    if (!init.publish_id || !init.upload_url) throw new Error('TikTok não forneceu dados para o upload.');
    publishId = init.publish_id;
    const target = new URL(init.upload_url);
    // A documentacao oficial tambem usa enderecos regionais como upload.us.tiktokapis.com.
    // Nao aceitar redirecionamentos, credenciais na URL ou dominios fora do TikTok.
    const host = target.hostname.toLowerCase();
    const allowedUploadHost = host === 'open-upload.tiktokapis.com' || /^upload\.[a-z0-9-]+\.tiktokapis\.com$/.test(host);
    if (target.protocol !== 'https:' || !allowedUploadHost || target.username || target.password)
      throw new Error('O TikTok retornou um destino de upload nao reconhecido. O arquivo nao foi enviado; consulte o rastreamento.');
    // HTTPS Node envia os bytes diretamente, com Content-Length exato e sem seguir redirects.
    // Qualquer status diferente de 201 e uma transferencia NAO confirmada.
    const upload = await sendTikTokUpload(target, bytes);
    uploadHttpStatus = upload.httpStatus;
    if (upload.httpStatus !== 201) {
      uploadDiagnostic = `HTTP_${upload.httpStatus}`;
      throw new Error(`TikTok nao confirmou a transferencia completa (HTTP ${upload.httpStatus}; esperado 201).`);
    }
    uploadPhase = 'ARQUIVO_CONFIRMADO';
    const response = noStoreJson({ ok: true, status: 'PROCESSANDO', publishId,
      message: 'Vídeo enviado ao TikTok para processamento privado. Aguardando confirmação.' });
    setSandboxPost(response, { userId: user.id, agencyId: user.agencyId, contentId: content.id,
      publishId, upload: { phase: uploadPhase, httpStatus: uploadHttpStatus, sizeBytes: videoSize },
      createdAt: Date.now(), expiresAt: Date.now() + 3600_000 });
    if (changed) setSandboxSession(response, session);
    return response;
  } catch (error) {
    // Nao confundir publish_id criado com arquivo transferido. Preservar o diagnostico
    // no cookie criptografado; sem registrar URLs, tokens ou corpo da resposta.
    if (error instanceof TikTokUploadFailure) uploadDiagnostic = error.diagnosticCode;
    if (publishId && !uploadDiagnostic) uploadDiagnostic = uploadHttpStatus ? `HTTP_${uploadHttpStatus}` : 'UPLOAD_NAO_CONFIRMADO';
    const response = noStoreJson({ error: safeTikTokCode(error),
      status: publishId ? 'VERIFICAR_STATUS' : 'NAO_INICIADO' }, 502);
    if (publishId) setSandboxPost(response, { userId: user.id, agencyId: user.agencyId, contentId: body.contentId,
      publishId, upload: { phase: uploadPhase, httpStatus: uploadHttpStatus,
        diagnosticCode: uploadDiagnostic, sizeBytes: videoSize },
      createdAt: Date.now(), expiresAt: Date.now() + 3600_000 });
    return response;
  }
}

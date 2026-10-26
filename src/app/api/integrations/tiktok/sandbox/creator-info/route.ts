import { NextRequest } from 'next/server';
import { sandboxAdmin, sandboxConfig, getSandboxSession, maybeRefresh, setSandboxSession, tiktokFetch } from '@/lib/tiktokSandbox';
import { type CreatorInfo, noStoreJson, safeTikTokCode } from '@/lib/tiktokSandboxPosting';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const admin = await sandboxAdmin();
  if (!admin) return noStoreJson({ error: 'Somente a diretoria pode testar o TikTok.' }, 403);
  if (!sandboxConfig().ready) return noStoreJson({ error: 'Configuração do Sandbox indisponível.' }, 503);
  const original = getSandboxSession(request, admin);
  if (!original) return noStoreJson({ error: 'Conecte a conta no TikTok Sandbox antes do teste.', reconnect: true }, 401);
  try {
    const { session, changed } = await maybeRefresh(original);
    if (!session.scopes.split(/[\s,]+/).includes('video.publish'))
      return noStoreJson({ error: 'A sessão de teste não autorizou video.publish. Reconecte o Sandbox.', reconnect: true }, 403);
    const info = await tiktokFetch<CreatorInfo>('https://open.tiktokapis.com/v2/post/publish/creator_info/query/', session.accessToken, {});
    const privacy = Array.isArray(info.privacy_level_options) ? info.privacy_level_options : [];
    const result = noStoreJson({
      account: info.creator_username || info.creator_nickname || 'Conta autorizada',
      privacyOptions: privacy,
      canTest: privacy.includes('SELF_ONLY'),
      maxDuration: info.max_video_post_duration_sec ?? null,
      commentsDisabled: Boolean(info.comment_disabled),
      duetDisabled: Boolean(info.duet_disabled),
      stitchDisabled: Boolean(info.stitch_disabled),
      sandbox: true,
    });
    if (changed) setSandboxSession(result, session);
    return result;
  } catch (error) {
    return noStoreJson({ error: safeTikTokCode(error) }, 502);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSandboxSession, jsonForbidden, maybeRefresh, sandboxAdmin, sandboxConfig, setSandboxSession, tiktokFetch } from '@/lib/tiktokSandbox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'private, no-store, max-age=0' };
type Profile = { user?: { display_name?: string; follower_count?: number; likes_count?: number; video_count?: number } };
type Video = {
  id?: string; title?: string; video_description?: string; create_time?: number;
  share_url?: string; view_count?: number; like_count?: number; comment_count?: number; share_count?: number;
};
type Videos = { videos?: Video[]; cursor?: number; has_more?: boolean };

export async function GET(request: NextRequest) {
  const user = await sandboxAdmin();
  if (!user) return jsonForbidden();
  if (!sandboxConfig().ready) return NextResponse.json({ connected: false, error: 'Credenciais do Sandbox ainda não configuradas.' }, { headers: noStore });
  const current = getSandboxSession(request, user);
  if (!current) return NextResponse.json({ connected: false }, { headers: noStore });
  try {
    const { session, changed } = await maybeRefresh(current);
    const scopes = session.scopes.split(/[\s,]+/).filter(Boolean);
    const canList = scopes.includes('video.list');
    const canStats = scopes.includes('user.info.stats');
    const profileFields = ['open_id', 'display_name', ...(canStats ? ['follower_count', 'likes_count', 'video_count'] : [])];
    const profileUrl = new URL('https://open.tiktokapis.com/v2/user/info/');
    profileUrl.searchParams.set('fields', profileFields.join(','));
    const profile = await tiktokFetch<Profile>(profileUrl.toString(), session.accessToken);
    let videoRows: Video[] = [];
    let hasMore = false;
    if (canList) {
      const url = new URL('https://open.tiktokapis.com/v2/video/list/');
      url.searchParams.set('fields', 'id,title,video_description,create_time,share_url,view_count,like_count,comment_count,share_count');
      const payload = await tiktokFetch<Videos>(url.toString(), session.accessToken, { max_count: 20 });
      videoRows = (payload.videos || []).slice(0, 20);
      hasMore = Boolean(payload.has_more);
    }
    const videos = videoRows.filter(v => typeof v.id === 'string').map(v => ({
      id: v.id as string, title: v.title || v.video_description || 'Vídeo sem título',
      publishedAt: typeof v.create_time === 'number' ? v.create_time : null,
      shareUrl: v.share_url?.startsWith('https://www.tiktok.com/') || v.share_url?.startsWith('https://tiktok.com/') ? v.share_url : null,
      views: Number(v.view_count || 0), likes: Number(v.like_count || 0),
      comments: Number(v.comment_count || 0), shares: Number(v.share_count || 0),
    }));
    const result = NextResponse.json({ connected: true, account: profile.user?.display_name || 'Conta TikTok de teste',
      scopes, canList, canStats, stats: canStats ? {
        followers: profile.user?.follower_count ?? null,
        likes: profile.user?.likes_count ?? null,
        videos: profile.user?.video_count ?? null,
      } : null, videos, hasMore,
      note: 'Os contadores exibem totais atuais dos vídeos recentes, não tendências históricas.' }, { headers: noStore });
    if (changed) setSandboxSession(result, session);
    return result;
  } catch (error) {
    return NextResponse.json({ connected: true, error: error instanceof Error ? error.message : 'Erro na consulta TikTok.' }, { status: 502, headers: noStore });
  }
}

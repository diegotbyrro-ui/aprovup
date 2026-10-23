import { prisma } from '@/lib/prisma';
import { socialPresetRange, tiktokPublicationDay, type SocialDateRange } from '@/lib/socialAnalyticsPeriod';
import { decryptSocialSecret, encryptSocialSecret, tiktokOauthConfig } from '@/lib/socialOAuth';
import { hasTikTokScope, numberFromProvider, aggregateTikTokVideos } from '@/lib/tiktokAnalyticsMath';

export type TikTokVideo = {
  id: string;
  title: string;
  description: string;
  createdAt: number;
  coverUrl: string | null;
  shareUrl: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  duration: number;
};

type TikTokConnection = {
  id: string;
  encryptedAccessToken: string | null;
  encryptedRefreshToken: string | null;
  tokenExpiresAt: Date | null;
  scopes: string | null;
  status: string;
};

async function refreshTikTokToken(connection: TikTokConnection): Promise<string> {
  if (!connection.encryptedRefreshToken) throw new Error('Token de renovação não disponível. Reconecte a conta TikTok.');
  const config = tiktokOauthConfig();
  if (!config.ready) throw new Error('Credenciais do TikTok não configuradas no servidor.');
  const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: config.clientKey,
      client_secret: config.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: decryptSocialSecret(connection.encryptedRefreshToken),
    }).toString(),
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  const payload = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; error?: string; error_description?: string };
  if (!response.ok || !payload.access_token) throw new Error(payload.error_description || payload.error || 'O TikTok não renovou a conexão. Reconecte a conta.');
  await prisma.socialConnection.update({
    where: { id: connection.id },
    data: {
      encryptedAccessToken: encryptSocialSecret(payload.access_token),
      ...(payload.refresh_token ? { encryptedRefreshToken: encryptSocialSecret(payload.refresh_token) } : {}),
      ...(payload.scope ? { scopes: payload.scope } : {}),
      tokenExpiresAt: new Date(Date.now() + Math.max(60, Number(payload.expires_in) || 86400) * 1000),
      lastSyncAt: new Date(),
      status: 'ATIVO',
    },
  });
  return payload.access_token;
}

async function accessToken(connection: TikTokConnection): Promise<string> {
  if (!connection.encryptedAccessToken) throw new Error('Token TikTok ausente. Reconecte a conta.');
  if (connection.tokenExpiresAt && connection.tokenExpiresAt.getTime() <= Date.now() + 5 * 60 * 1000) {
    return refreshTikTokToken(connection);
  }
  return decryptSocialSecret(connection.encryptedAccessToken);
}

async function tiktokRequest<T>(connection: TikTokConnection, path: string, body?: object): Promise<T> {
  let token = await accessToken(connection);
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch('https://open.tiktokapis.com' + path, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });
    const payload = await response.json() as T & { error?: { code?: string; message?: string } };
    if (response.status === 401 && attempt === 0) {
      token = await refreshTikTokToken(connection);
      continue;
    }
    if (!response.ok || (payload.error?.code && payload.error.code !== 'ok')) {
      const code = payload.error?.code || String(response.status);
      throw new Error(`TikTok: ${code}. ${payload.error?.message || 'Verifique os escopos autorizados e a conexão.'}`);
    }
    return payload;
  }
  throw new Error('Falha ao validar a conexão TikTok.');
}

export async function getTikTokDashboard(clientId: string, days: number = 30, customRange?: SocialDateRange) {
  const connection = await prisma.socialConnection.findUnique({
    where: { clientId_platform: { clientId, platform: 'TIKTOK' } },
    select: { id: true, status: true, encryptedAccessToken: true, encryptedRefreshToken: true, tokenExpiresAt: true, scopes: true, accountName: true, accountUsername: true },
  });
  if (!connection || connection.status !== 'ATIVO') return { connected: false as const, scopeReady: false, videos: [] as TikTokVideo[], periodVideos: [] as TikTokVideo[], profile: null, totals: aggregateTikTokVideos([]), accountName: '', hasMore: false, days };
  const scopeReady = hasTikTokScope(connection.scopes, 'video.list');
  const accountName = connection.accountName || connection.accountUsername || 'Conta TikTok';
  if (!scopeReady) return { connected: true as const, scopeReady: false, videos: [] as TikTokVideo[], periodVideos: [] as TikTokVideo[], profile: null, totals: aggregateTikTokVideos([]), accountName, hasMore: false, days };

  type ProviderVideo = { id?: string; title?: string; video_description?: string; create_time?: number; cover_image_url?: string; share_url?: string; view_count?: number; like_count?: number; comment_count?: number; share_count?: number; duration?: number };
  type ListResponse = { data?: { videos?: ProviderVideo[]; cursor?: number; has_more?: boolean } };
  const videos: TikTokVideo[] = [];
  let cursor: number | undefined;
  let hasMore = false;
  // Limite consciente: 100 videos, para evitar consultas ilimitadas na API.
  for (let page = 0; page < 5; page++) {
    const payload = await tiktokRequest<ListResponse>(
      connection,
      '/v2/video/list/?fields=id,title,video_description,create_time,cover_image_url,share_url,view_count,like_count,comment_count,share_count,duration',
      { max_count: 20, ...(cursor ? { cursor } : {}) },
    );
    for (const v of payload.data?.videos || []) {
      if (!v.id) continue;
      videos.push({
        id: String(v.id), title: String(v.title || v.video_description || 'Vídeo sem título'),
        description: String(v.video_description || ''), createdAt: numberFromProvider(v.create_time),
        coverUrl: v.cover_image_url || null, shareUrl: v.share_url || null,
        views: numberFromProvider(v.view_count), likes: numberFromProvider(v.like_count),
        comments: numberFromProvider(v.comment_count), shares: numberFromProvider(v.share_count),
        duration: numberFromProvider(v.duration),
      });
    }
    hasMore = Boolean(payload.data?.has_more);
    if (!hasMore || !payload.data?.cursor) break;
    cursor = payload.data.cursor;
  }
  const range = customRange || socialPresetRange(days);
  const periodVideos = videos.filter(video => {
    const date = tiktokPublicationDay(video.createdAt);
    return date >= range.startDate && date <= range.endDate;
  });
  let profile: { followers: number | null; likes: number | null; videoCount: number | null } | null = null;
  if (hasTikTokScope(connection.scopes, 'user.info.stats')) {
    type ProfileResponse = { data?: { user?: { follower_count?: number; likes_count?: number; video_count?: number } } };
    try {
      const data = await tiktokRequest<ProfileResponse>(connection, '/v2/user/info/?fields=follower_count,likes_count,video_count');
      profile = { followers: data.data?.user?.follower_count ?? null, likes: data.data?.user?.likes_count ?? null, videoCount: data.data?.user?.video_count ?? null };
    } catch (error) { console.error('TIKTOK_PROFILE_STATS_ERROR', error instanceof Error ? error.message : 'erro'); }
  }
  return { connected: true as const, scopeReady: true, videos, periodVideos, profile, totals: aggregateTikTokVideos(periodVideos), accountName, hasMore, days };
}

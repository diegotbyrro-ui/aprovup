export function hasTikTokScope(scopes: string | null | undefined, scope: string) {
  return new Set(String(scopes || '').split(/[\s,]+/).filter(Boolean)).has(scope);
}

export function numberFromProvider(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function aggregateTikTokVideos<T extends { views: number; likes: number; comments: number; shares: number }>(videos: T[]) {
  return videos.reduce((total, video) => ({
    views: total.views + video.views,
    likes: total.likes + video.likes,
    comments: total.comments + video.comments,
    shares: total.shares + video.shares,
  }), { views: 0, likes: 0, comments: 0, shares: 0 });
}

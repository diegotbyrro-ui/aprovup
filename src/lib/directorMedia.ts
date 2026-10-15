/** Materiais finais da producao ja vinculados ao conteudo. Nao consulta Storage. */
export type DirectorMediaSource = {
  finalMediaUrl?: string | null;
  finalCoverUrl?: string | null;
  finalMediaType?: string | null;
  finalExternalUrl?: string | null;
  finalUploadedAt?: Date | null;
  storyMediaUrl?: string | null;
  storyCoverUrl?: string | null;
  storyMediaType?: string | null;
  storyMediaItems?: unknown;
  instagramMediaAssets?: Array<{ url: string; mimeType: string; position: number }>;
};

export type DirectorMediaItem = {
  url: string;
  label: string;
  kind: "image" | "video" | "link";
  poster: string | null;
};

/** Evita URLs de protocolos ativos em src/href. Nenhuma requisicao feita no servidor. */
function publicHttpsUrl(input: unknown): string | null {
  if (typeof input !== "string" || input.length > 2048) return null;
  try {
    const url = new URL(input.trim());
    if (url.protocol !== "https:" || !url.hostname.includes(".") || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

function mediaKind(url: string, mime: string | null | undefined): "image" | "video" | "link" {
  const type = String(mime || "").toLowerCase();
  if (type.startsWith("video/") || /\.(mp4|mov|m4v|webm)(?:\?|$)/i.test(url)) return "video";
  if (type.startsWith("image/") || /\.(png|jpg|jpeg|webp|gif|avif)(?:\?|$)/i.test(url)) return "image";
  return "link";
}

export function getDirectorMediaItems(source: DirectorMediaSource): DirectorMediaItem[] {
  const result: DirectorMediaItem[] = [];
  const seen = new Set<string>();
  function add(raw: unknown, label: string, mime?: string | null, posterRaw?: unknown) {
    const url = publicHttpsUrl(raw);
    if (!url || seen.has(url) || result.length >= 8) return;
    seen.add(url);
    result.push({ url, label, kind: mediaKind(url, mime), poster: publicHttpsUrl(posterRaw) });
  }

  const carousel = [...(source.instagramMediaAssets || [])]
    .filter(item => item && typeof item.url === "string")
    .sort((a, b) => a.position - b.position);
  if (carousel.length > 0) {
    carousel.forEach((item, index) => add(item.url, `Carrossel ${index + 1}`, item.mimeType));
  }

  add(source.finalMediaUrl, "Material final", source.finalMediaType, source.finalCoverUrl);
  if (!source.finalMediaUrl && carousel.length === 0) add(source.finalCoverUrl, "Imagem final", "image/*");

  if (Array.isArray(source.storyMediaItems) && source.storyMediaItems.length > 1) {
    source.storyMediaItems.forEach((value, index) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return;
      const item = value as Record<string, unknown>;
      add(item.url, `Story ${index + 1}`, typeof item.mimeType === "string" ? item.mimeType : null);
    });
  }
  add(source.storyMediaUrl, "Story", source.storyMediaType, source.storyCoverUrl);
  add(source.finalExternalUrl, "Material externo");
  return result;
}

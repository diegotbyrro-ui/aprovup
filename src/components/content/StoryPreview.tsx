"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Smartphone } from "lucide-react";

type StoryAsset = {
  url: string;
  mimeType: string;
  position: number;
};

function getStoryAssets(value: unknown, fallbackUrl?: string | null, fallbackType?: string | null): StoryAsset[] {
  const items = Array.isArray(value) ? value : [];
  const assets: StoryAsset[] = [];

  items.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const record = item as Record<string, unknown>;
    const url = typeof record.url === "string" ? record.url.trim() : "";
    if (!url) return;
    assets.push({
      url,
      mimeType: typeof record.mimeType === "string" ? record.mimeType : "",
      position: typeof record.position === "number" && Number.isFinite(record.position)
        ? record.position
        : index,
    });
  });

  if (assets.length) return assets.sort((a, b) => a.position - b.position);
  return fallbackUrl?.trim()
    ? [{ url: fallbackUrl.trim(), mimeType: fallbackType || "", position: 0 }]
    : [];
}

export function StoryPreview({
  clientName,
  storyMediaUrl,
  storyMediaType,
  storyCoverUrl,
  storyMediaItems,
}: {
  clientName: string;
  storyMediaUrl?: string | null;
  storyMediaType?: string | null;
  storyCoverUrl?: string | null;
  storyMediaItems?: unknown;
}) {
  const assets = getStoryAssets(storyMediaItems, storyMediaUrl, storyMediaType);
  const [selected, setSelected] = useState(0);
  const index = selected < assets.length ? selected : 0;
  const current = assets[index];
  const initials = clientName.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((word) => word[0]).join("").toUpperCase();
  const isVideo = current
    ? current.mimeType.toLowerCase().startsWith("video/") || /\.(mp4|mov|webm)(?:$|\?)/i.test(current.url)
    : false;

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700">
          <Smartphone size={16} className="text-violet-600" />
          PrÃ©via dos Stories
        </h3>
        <span className={assets.length
          ? "rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-emerald-600"
          : "rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-400"}>
          {assets.length ? `${assets.length} ${assets.length === 1 ? "Story" : "Stories"}` : "Aguardando criaÃ§Ã£o"}
        </span>
      </div>

      <div className="p-4">
        <div className="mx-auto w-full max-w-[310px] overflow-hidden rounded-[26px] border-[5px] border-slate-900 bg-slate-950 shadow-lg">
          <div className="relative aspect-[9/16] overflow-hidden bg-slate-950">
            {current ? (
              isVideo ? (
                <video
                  key={current.url}
                  src={current.url}
                  poster={storyCoverUrl || undefined}
                  playsInline
                  controls
                  preload="metadata"
                  className="h-full w-full object-contain"
                  aria-label={`VÃ­deo do Story ${index + 1}`}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={current.url}
                  src={current.url}
                  alt={`PrÃ©via do Story ${index + 1}`}
                  className="h-full w-full object-contain"
                />
              )
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-slate-700 via-slate-800 to-slate-950 px-6 text-center text-white">
                <Smartphone size={38} className="mb-3 text-violet-300" />
                <p className="text-sm font-bold">Aguardando arte dos Stories</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">
                  Assim que o Design enviar a versÃ£o vertical, a prÃ©via aparecerÃ¡ aqui.
                </p>
              </div>
            )}

            {current && (
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/75 via-black/25 to-transparent px-3 pb-7 pt-3 text-white">
                <div className="flex gap-1" aria-label={`Story ${index + 1} de ${assets.length}`}>
                  {assets.map((asset, itemIndex) => (
                    <div key={`${asset.url}-${itemIndex}`} className="h-0.5 flex-1 rounded-full bg-white/35">
                      <div className={`h-full rounded-full ${itemIndex <= index ? "bg-white" : "bg-transparent"}`} />
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/70 bg-gradient-to-tr from-indigo-500 to-pink-500 text-[10px] font-bold">
                    {initials || "IG"}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-bold">{clientName}</span>
                  <span className="text-[10px] text-white/80">PrÃ©via</span>
                </div>
              </div>
            )}

            {assets.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setSelected((value) => (value - 1 + assets.length) % assets.length)}
                  aria-label="Ver Story anterior"
                  className="absolute left-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-violet-400"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => setSelected((value) => (value + 1) % assets.length)}
                  aria-label="Ver prÃ³ximo Story"
                  className="absolute right-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-violet-400"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}

            {current && (
              <span className="absolute bottom-3 right-3 rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-bold text-white">
                {index + 1} / {assets.length}
              </span>
            )}
          </div>
        </div>

        <p className="mt-3 text-center text-[11px] text-slate-500">
          VisualizaÃ§Ã£o vertical 9:16 â€¢ {assets.length ? "Arquivos enviados pelo Design" : "Nenhum Story enviado"}
        </p>
      </div>
    </section>
  );
}
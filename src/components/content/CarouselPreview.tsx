'use client';

import { useState } from "react";

import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";


type CarouselAsset = {
  id?: string | null;
  url: string;
  mimeType?: string | null;
};


export function CarouselPreview({
  assets,
  compact = false,
}: {
  assets: CarouselAsset[];
  compact?: boolean;
}) {

  const [
    activeIndex,
    setActiveIndex,
  ] = useState(0);


  if (
    !assets.length
  ) {
    return null;
  }


  const safeIndex =
    Math.min(
      activeIndex,
      assets.length - 1
    );


  const activeAsset =
    assets[
      safeIndex
    ];


  const mimeType =
    String(
      activeAsset.mimeType ||
      ""
    ).toLowerCase();


  const isVideo =
    mimeType.startsWith(
      "video/"
    ) ||
    /\.(mp4|mov|webm)(?:$|\?)/i.test(
      activeAsset.url
    );


  function showPrevious() {

    setActiveIndex(
      (
        current
      ) =>
        current === 0
          ? assets.length - 1
          : current - 1
    );

  }


  function showNext() {

    setActiveIndex(
      (
        current
      ) =>
        current ===
        assets.length - 1
          ? 0
          : current + 1
    );

  }


  const buttonSize =
    compact
      ? "h-7 w-7"
      : "h-9 w-9";


  const iconSize =
    compact
      ? 14
      : 18;


  return (
    <div className="relative h-full w-full overflow-hidden bg-black">

      {isVideo ? (
        <video
          key={
            activeAsset.url
          }
          src={
            activeAsset.url
          }
          controls
          playsInline
          preload="metadata"
          className="h-full w-full object-contain"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={
            activeAsset.url
          }
          src={
            activeAsset.url
          }
          alt={
            `Card ${safeIndex + 1} do carrossel`
          }
          className="h-full w-full object-contain"
        />
      )}


      {assets.length > 1 ? (
        <>

          <button
            type="button"
            onClick={
              showPrevious
            }
            aria-label="Ver card anterior"
            className={[
              "absolute left-2 top-1/2 z-20 -translate-y-1/2",
              "flex items-center justify-center rounded-full",
              "border border-white/70 bg-white/90 text-slate-800",
              "shadow-lg backdrop-blur transition hover:scale-105 hover:bg-white",
              "focus:outline-none focus:ring-2 focus:ring-blue-500",
              buttonSize,
            ].join(" ")}
          >
            <ChevronLeft
              size={
                iconSize
              }
              strokeWidth={
                2.5
              }
            />
          </button>


          <button
            type="button"
            onClick={
              showNext
            }
            aria-label="Ver proximo card"
            className={[
              "absolute right-2 top-1/2 z-20 -translate-y-1/2",
              "flex items-center justify-center rounded-full",
              "border border-white/70 bg-white/90 text-slate-800",
              "shadow-lg backdrop-blur transition hover:scale-105 hover:bg-white",
              "focus:outline-none focus:ring-2 focus:ring-blue-500",
              buttonSize,
            ].join(" ")}
          >
            <ChevronRight
              size={
                iconSize
              }
              strokeWidth={
                2.5
              }
            />
          </button>


          <span
            className={[
              "absolute right-2 top-2 z-20 rounded-full",
              "bg-black/75 font-black text-white shadow-sm",
              compact
                ? "px-1.5 py-0.5 text-[7px]"
                : "px-2.5 py-1 text-[10px]",
            ].join(" ")}
          >
            {
              safeIndex + 1
            }/{assets.length}
          </span>


          <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/55 px-2 py-1 backdrop-blur">

            {assets.map(
              (
                asset,
                index
              ) => (
                <button
                  key={
                    asset.id ||
                    `${asset.url}-${index}`
                  }
                  type="button"
                  onClick={() =>
                    setActiveIndex(
                      index
                    )
                  }
                  aria-label={
                    `Ir para o card ${index + 1}`
                  }
                  aria-pressed={
                    safeIndex ===
                    index
                  }
                  className={[
                    "rounded-full transition-all",
                    safeIndex ===
                    index
                      ? "h-1.5 w-4 bg-white"
                      : "h-1.5 w-1.5 bg-white/55 hover:bg-white/80",
                  ].join(" ")}
                />
              )
            )}

          </div>

        </>
      ) : null}

    </div>
  );
}
export function InstagramPreview({
  clientName,
  caption,
  format,
  platform,
  imageUrl,
  mediaUrl,
  mediaType,
  coverUrl,
  carouselAssets = [],
}: {
  clientName: string;
  caption?: string | null;
  format?: string | null;
  platform?: string | null;
  imageUrl?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  coverUrl?: string | null;
  carouselAssets?: Array<{
    url: string;
    mimeType?: string | null;
  }>;
}) {
  const initials =
    clientName
      .split(' ')
      .slice(0, 2)
      .map(
        (word) =>
          word[0]
      )
      .join('')
      .toUpperCase();


  const firstCarouselAsset =
    carouselAssets[0] ||
    null;


  const resolvedMediaUrl =
    mediaUrl ||
    firstCarouselAsset?.url ||
    coverUrl ||
    imageUrl ||
    '';


  const resolvedMediaType =
    mediaUrl
      ? (
          mediaType ||
          ''
        )
      : firstCarouselAsset
        ? (
            firstCarouselAsset.mimeType ||
            ''
          )
        : resolvedMediaUrl
          ? 'image/*'
          : '';


  const isVideo =
    resolvedMediaType
      .toLowerCase()
      .startsWith(
        'video/'
      ) ||
    /\.(mp4|mov|webm)(?:$|\?)/i.test(
      resolvedMediaUrl
    );


  const posterUrl =
    coverUrl ||
    imageUrl ||
    undefined;


  const hasFinalMaterial =
    Boolean(
      mediaUrl ||
      firstCarouselAsset?.url ||
      coverUrl
    );


  const carouselCount =
    carouselAssets.length;


  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
          Prévia do Post
        </h3>

        {hasFinalMaterial ? (
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-emerald-600">
            Material final
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
            Aguardando criação
          </span>
        )}
      </div>


      <div className="p-4">
        <div
          className="mx-auto overflow-hidden rounded-xl shadow-md"
          style={{
            maxWidth:
              360,

            border:
              '1px solid #dbdbdb',

            background:
              '#fff',
          }}
        >
          <div className="flex items-center gap-3 border-b border-slate-100 px-3 py-2.5">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-pink-500 text-xs font-bold text-white">
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-900">
                {clientName}
              </p>

              {platform ? (
                <p className="truncate text-[11px] text-slate-400">
                  {platform}
                </p>
              ) : null}
            </div>

            <span className="text-lg leading-none text-slate-300">
              •••
            </span>
          </div>


          <div
            className="relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200"
            style={{
              aspectRatio:
                '1 / 1',
            }}
          >
            {resolvedMediaUrl ? (
              <>
                {isVideo ? (
                  <video
                    src={resolvedMediaUrl}
                    poster={posterUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="h-full w-full bg-black object-contain"
                    aria-label="Prévia do vídeo final"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolvedMediaUrl}
                    alt="Prévia do material final"
                    className="h-full w-full object-contain"
                  />
                )}

                {carouselCount > 1 ? (
                  <span className="absolute right-3 top-3 rounded-full bg-slate-950/70 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm backdrop-blur">
                    1 / {carouselCount}
                  </span>
                ) : null}
              </>
            ) : (
              <div className="px-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-300/60">
                  <svg
                    className="h-6 w-6 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>

                <p className="text-sm font-medium text-slate-400">
                  Aguardando material final
                </p>

                <p className="mt-1 text-[11px] text-slate-400">
                  Quando Design ou Filmmaker enviar o arquivo, ele aparecerá aqui.
                </p>

                {format ? (
                  <span className="mt-2 inline-block rounded-full border border-slate-200 bg-white/70 px-2 py-0.5 text-[11px] text-slate-500">
                    {format}
                  </span>
                ) : null}
              </div>
            )}
          </div>


          <div className="px-3 pb-1 pt-2.5">
            <div className="mb-2 flex items-center gap-3">
              <svg
                className="h-6 w-6 text-slate-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>

              <svg
                className="h-6 w-6 text-slate-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>

              <svg
                className="h-6 w-6 text-slate-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>

              <div className="flex-1" />

              <svg
                className="h-6 w-6 text-slate-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
            </div>


            {caption ? (
              <p className="text-sm leading-snug text-slate-800">
                <span className="mr-1 font-bold">
                  {
                    clientName
                      .split(' ')[0]
                      .toLowerCase()
                      .replace(
                        /\s/g,
                        ''
                      )
                  }
                </span>

                {caption}
              </p>
            ) : (
              <p className="text-sm italic text-slate-400">
                Nenhuma legenda definida ainda.
              </p>
            )}

            <p className="mb-1 mt-1.5 text-[11px] text-slate-400">
              Ver todos os comentários
            </p>
          </div>
        </div>


        {carouselCount > 1 ? (
          <div className="mx-auto mt-3 flex max-w-[360px] gap-2 overflow-x-auto pb-1">
            {carouselAssets.map(
              (
                asset,
                index
              ) => (
                <div
                  key={`${asset.url}-${index}`}
                  className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                >
                  {
                    (
                      asset.mimeType ||
                      ''
                    )
                      .toLowerCase()
                      .startsWith(
                        'video/'
                      )
                      ? (
                        <div className="flex h-full w-full items-center justify-center bg-slate-900 text-[9px] font-bold text-white">
                          VÍDEO
                        </div>
                      )
                      : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={asset.url}
                          alt={`Slide ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      )
                  }

                  <span className="absolute bottom-0 right-0 rounded-tl bg-slate-950/70 px-1 text-[8px] font-bold text-white">
                    {index + 1}
                  </span>
                </div>
              )
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

'use client';

import {
  createPortal,
} from 'react-dom';

import {
  useEffect,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';

import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
} from 'lucide-react';


export type MediaLightboxAsset = {
  id?:
    string |
    null;

  url:
    string;

  mimeType?:
    string |
    null;
};


function isVideo(
  asset:
    MediaLightboxAsset
) {
  const mime =
    String(
      asset.mimeType ||
      ''
    ).toLowerCase();

  return (
    mime.startsWith(
      'video/'
    ) ||
    /\.(mp4|mov|webm|m4v|avi|mkv)(?:$|\?)/i.test(
      asset.url
    )
  );
}


export function MediaLightbox({
  assets,
  children,
  initialIndex = 0,
  title = 'Prévia do conteúdo',
  subtitle = 'Visualização ampliada',
}: {
  assets:
    MediaLightboxAsset[];

  children:
    ReactNode;

  initialIndex?:
    number;

  title?:
    string;

  subtitle?:
    string;
}) {

  const [
    open,
    setOpen,
  ] =
    useState(
      false
    );


  const [
    mounted,
    setMounted,
  ] =
    useState(
      false
    );


  const [
    activeIndex,
    setActiveIndex,
  ] =
    useState(
      Math.max(
        0,
        initialIndex
      )
    );


  useEffect(
    () => {
      setMounted(
        true
      );
    },
    []
  );


  useEffect(
    () => {

      if (!open) {
        return;
      }


      const previousOverflow =
        document.body.style.overflow;


      document.body.style.overflow =
        'hidden';


      function handleKeyDown(
        event:
          KeyboardEvent
      ) {

        if (
          event.key ===
          'Escape'
        ) {

          setOpen(
            false
          );

          return;
        }


        if (
          assets.length <=
          1
        ) {
          return;
        }


        if (
          event.key ===
          'ArrowLeft'
        ) {

          setActiveIndex(
            (
              current
            ) =>
              current ===
              0
                ? assets.length - 1
                : current - 1
          );
        }


        if (
          event.key ===
          'ArrowRight'
        ) {

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

      }


      window.addEventListener(
        'keydown',
        handleKeyDown
      );


      return () => {

        document.body.style.overflow =
          previousOverflow;


        window.removeEventListener(
          'keydown',
          handleKeyDown
        );

      };

    },
    [
      open,
      assets.length,
    ]
  );


  if (
    !assets.length
  ) {

    return (
      <>
        {children}
      </>
    );
  }


  const safeIndex =
    Math.min(
      Math.max(
        activeIndex,
        0
      ),
      assets.length - 1
    );


  const activeAsset =
    assets[
      safeIndex
    ];


  function previous() {

    setActiveIndex(
      (
        current
      ) =>
        current ===
        0
          ? assets.length - 1
          : current - 1
    );

  }


  function next() {

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


  function openLightbox(
    event:
      MouseEvent<HTMLDivElement>
  ) {

    const target =
      event.target;


    if (
      target instanceof
      Element
    ) {

      const interactive =
        target.closest(
          'button, a, input, select, textarea'
        );


      if (
        interactive
      ) {
        return;
      }

    }


    setActiveIndex(
      Math.min(
        Math.max(
          initialIndex,
          0
        ),
        assets.length - 1
      )
    );


    setOpen(
      true
    );

  }


  function renderMedia() {

    if (
      isVideo(
        activeAsset
      )
    ) {

      return (
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
          className="max-h-[78vh] max-w-[90vw] object-contain"
        >
          Seu navegador não conseguiu reproduzir este vídeo.
        </video>
      );

    }


    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={
          activeAsset.url
        }
        alt={
          `Prévia ${safeIndex + 1}`
        }
        className="max-h-[78vh] max-w-[90vw] object-contain"
      />
    );

  }


  return (
    <>
      <div
        className="group relative h-full w-full cursor-zoom-in"
        onClick={
          openLightbox
        }
      >

        {children}


        <button
          type="button"
          aria-label="Ampliar prévia"
          title="Ampliar prévia"
          onClick={
            (
              event
            ) => {

              event.stopPropagation();


              setActiveIndex(
                Math.min(
                  Math.max(
                    initialIndex,
                    0
                  ),
                  assets.length - 1
                )
              );


              setOpen(
                true
              );

            }
          }
          className="absolute right-3 top-3 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-slate-950/80 text-white shadow-lg backdrop-blur transition hover:scale-105 hover:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >

          <Maximize2
            size={16}
            strokeWidth={2.5}
          />

        </button>

      </div>


      {mounted &&
      open
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Prévia ampliada"
              className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/90 p-3 backdrop-blur-sm md:p-6"
              onMouseDown={
                (
                  event
                ) => {

                  if (
                    event.target ===
                    event.currentTarget
                  ) {

                    setOpen(
                      false
                    );

                  }

                }
              }
            >

              <div
                className="relative flex max-h-[96vh] max-w-[96vw] flex-col overflow-hidden rounded-2xl bg-slate-950 shadow-2xl ring-1 ring-white/10"
                onMouseDown={
                  (
                    event
                  ) => {
                    event.stopPropagation();
                  }
                }
              >

                <div className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-slate-950 px-4 py-3 text-white">

                  <div className="min-w-0 flex-1">

                    <p className="truncate text-sm font-black">
                      {title}
                    </p>

                    <p className="truncate text-[10px] text-white/50">
                      {subtitle}
                    </p>

                  </div>


                  <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black text-white">
                    {safeIndex + 1}/{assets.length}
                  </span>


                  <button
                    type="button"
                    onClick={
                      () =>
                        setOpen(
                          false
                        )
                    }
                    aria-label="Fechar"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >

                    <X
                      size={18}
                    />

                  </button>

                </div>


                <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black p-2 md:p-4">

                  {renderMedia()}


                  {assets.length >
                  1 ? (
                    <>

                      <button
                        type="button"
                        onClick={
                          previous
                        }
                        aria-label="Card anterior"
                        className="absolute left-3 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white text-slate-900 shadow-xl transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >

                        <ChevronLeft
                          size={22}
                          strokeWidth={2.5}
                        />

                      </button>


                      <button
                        type="button"
                        onClick={
                          next
                        }
                        aria-label="Próximo card"
                        className="absolute right-3 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white text-slate-900 shadow-xl transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >

                        <ChevronRight
                          size={22}
                          strokeWidth={2.5}
                        />

                      </button>

                    </>
                  ) : null}

                </div>


                {assets.length >
                1 ? (

                  <div className="flex shrink-0 gap-2 overflow-x-auto border-t border-white/10 bg-slate-950 px-3 py-3">

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
                          className={[
                            'relative h-16 w-14 shrink-0 overflow-hidden rounded-lg border-2 bg-black',
                            safeIndex ===
                            index
                              ? 'border-blue-500 ring-2 ring-blue-500/30'
                              : 'border-white/10 hover:border-white/40',
                          ].join(
                            ' '
                          )}
                        >

                          {isVideo(
                            asset
                          ) ? (

                            <video
                              src={
                                asset.url
                              }
                              muted
                              playsInline
                              preload="metadata"
                              className="h-full w-full object-cover"
                            />

                          ) : (

                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={
                                asset.url
                              }
                              alt=""
                              className="h-full w-full object-cover"
                            />

                          )}


                          <span className="absolute bottom-1 right-1 rounded-full bg-black/75 px-1.5 py-0.5 text-[8px] font-black text-white">
                            {index + 1}
                          </span>

                        </button>

                      )
                    )}

                  </div>

                ) : null}

              </div>

            </div>,
            document.body
          )
        : null}
    </>
  );
}
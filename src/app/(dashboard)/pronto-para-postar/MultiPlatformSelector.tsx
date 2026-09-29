'use client';

import {
  useRouter,
} from 'next/navigation';

import {
  useState,
  useTransition,
} from 'react';

import {
  updateSocialPlatformSelection,
} from './actions';


type Platform =
  | 'INSTAGRAM'
  | 'TIKTOK'
  | 'YOUTUBE';


type PublicationState = {
  platform:
    string;

  selected:
    boolean;

  status:
    string;

  lastError:
    string | null;
};


const platforms:
  Array<{
    id:
      Platform;

    short:
      string;

    label:
      string;

    description:
      string;
  }> = [

    {
      id:
        'INSTAGRAM',

      short:
        'IG',

      label:
        'Instagram',

      description:
        'Feed ou Reel',
    },

    {
      id:
        'TIKTOK',

      short:
        'TK',

      label:
        'TikTok',

      description:
        'Publicação TikTok',
    },

    {
      id:
        'YOUTUBE',

      short:
        'YT',

      label:
        'YouTube',

      description:
        'Vídeo ou Short',
    },
  ];


function readableStatus(
  value:
    string
) {

  const normalized =
    String(
      value ||
      ''
    )
      .trim()
      .toUpperCase();


  const labels:
    Record<
      string,
      string
    > = {

    NAO_PREPARADO:
      'Não preparado',

    NAO_SELECIONADO:
      'Não selecionado',

    SELECIONADO:
      'Selecionado',

    PRONTO:
      'Pronto',

    AGENDADO:
      'Agendado',

    PUBLICANDO:
      'Publicando',

    PROCESSANDO:
      'Processando',

    PUBLICADO:
      'Publicado',

    ERRO:
      'Erro',
  };


  return (
    labels[
      normalized
    ] ||
    value ||
    'Selecionado'
  );
}


export function MultiPlatformSelector({
  contentId,
  hasVideo,
  publications,
  instagramLegacyStatus,
}: {
  contentId:
    string;

  hasVideo:
    boolean;

  publications:
    PublicationState[];

  instagramLegacyStatus:
    string;
}) {

  const router =
    useRouter();


  const [
    pending,
    startTransition,
  ] =
    useTransition();


  const rowFor =
    (
      platform:
        Platform
    ) =>
      publications.find(
        (
          publication
        ) =>
          publication.platform ===
          platform
      );


  const initialSelected:
    Record<
      Platform,
      boolean
    > = {

    INSTAGRAM:
      rowFor(
        'INSTAGRAM'
      )
        ? Boolean(
            rowFor(
              'INSTAGRAM'
            )?.selected
          )
        : true,

    TIKTOK:
      Boolean(
        rowFor(
          'TIKTOK'
        )?.selected
      ),

    YOUTUBE:
      Boolean(
        rowFor(
          'YOUTUBE'
        )?.selected
      ),
  };


  const [
    selected,
    setSelected,
  ] =
    useState(
      initialSelected
    );


  const [
    error,
    setError,
  ] =
    useState(
      ''
    );


  function togglePlatform(
    platform:
      Platform
  ) {

    const next =
      !selected[
        platform
      ];


    if (
      platform ===
        'YOUTUBE' &&
      next &&
      !hasVideo
    ) {

      setError(
        'Para selecionar YouTube, este conteúdo precisa possuir um vídeo final.'
      );

      return;
    }


    const previous =
      selected[
        platform
      ];


    setError(
      ''
    );


    setSelected(
      (
        current
      ) => ({
        ...current,

        [platform]:
          next,
      })
    );


    startTransition(
      async () => {

        try {

          await updateSocialPlatformSelection(
            contentId,
            platform,
            next
          );


          router.refresh();

        }
        catch (
          requestError
        ) {

          setSelected(
            (
              current
            ) => ({
              ...current,

              [platform]:
                previous,
            })
          );


          setError(
            requestError instanceof
              Error
              ? requestError.message
              : 'Não foi possível alterar a plataforma.'
          );
        }
      }
    );
  }


  function statusFor(
    platform:
      Platform
  ) {

    if (
      !selected[
        platform
      ]
    ) {
      return 'Não selecionado';
    }


    if (
      platform ===
        'INSTAGRAM' &&
      instagramLegacyStatus &&
      instagramLegacyStatus !==
        'NAO_PREPARADO'
    ) {

      return readableStatus(
        instagramLegacyStatus
      );
    }


    return readableStatus(
      rowFor(
        platform
      )?.status ||
      'SELECIONADO'
    );
  }


  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">

      <div className="flex items-start justify-between gap-3">

        <div>

          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
            Onde publicar?
          </p>

          <p className="mt-1 text-sm font-black text-slate-950">
            Escolha as plataformas
          </p>

          <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
            Marque uma ou mais redes. Somente as selecionadas receberão este conteúdo.
          </p>

        </div>


        {
          pending
            ? (
              <span className="text-[10px] font-black text-slate-400">
                Salvando...
              </span>
            )
            : null
        }

      </div>


      <div className="mt-4 grid grid-cols-1 gap-2">

        {
          platforms.map(
            (
              platform
            ) => {

              const active =
                selected[
                  platform.id
                ];


              const youtubeUnavailable =
                platform.id ===
                  'YOUTUBE' &&
                !hasVideo;


              const publication =
                rowFor(
                  platform.id
                );


              const hasError =
                Boolean(
                  publication
                    ?.lastError
                );


              return (
                <button
                  key={
                    platform.id
                  }
                  type="button"
                  disabled={
                    pending ||
                    (
                      youtubeUnavailable &&
                      !active
                    )
                  }
                  onClick={
                    () =>
                      togglePlatform(
                        platform.id
                      )
                  }
                  className={[
                    'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition',

                    active
                      ? 'border-slate-900 bg-white shadow-sm'
                      : 'border-slate-200 bg-white/70 hover:border-slate-300',

                    youtubeUnavailable &&
                    !active
                      ? 'cursor-not-allowed opacity-50'
                      : '',
                  ].join(
                    ' '
                  )}
                >

                  <span
                    className={[
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-black',

                      platform.id ===
                        'INSTAGRAM'
                        ? 'bg-pink-50 text-pink-600'
                        : platform.id ===
                            'TIKTOK'
                          ? 'bg-slate-900 text-white'
                          : 'bg-red-50 text-red-600',
                    ].join(
                      ' '
                    )}
                  >
                    {platform.short}
                  </span>


                  <span className="min-w-0 flex-1">

                    <span className="block text-xs font-black text-slate-900">
                      {platform.label}
                    </span>

                    <span className="mt-0.5 block text-[9px] text-slate-500">
                      {
                        youtubeUnavailable
                          ? 'Precisa de vídeo final'
                          : statusFor(
                              platform.id
                            )
                      }
                    </span>

                    {
                      hasError
                        ? (
                          <span className="mt-1 block text-[9px] font-bold text-red-600">
                            ⚠ {
                              publication
                                ?.lastError
                            }
                          </span>
                        )
                        : null
                    }

                  </span>


                  <span
                    className={[
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-sm font-black transition',

                      active
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-300 bg-white text-transparent',
                    ].join(
                      ' '
                    )}
                    aria-hidden="true"
                  >
                    ✓
                  </span>

                </button>
              );
            }
          )
        }

      </div>


      {
        error
          ? (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">

              <p className="text-[10px] font-bold leading-relaxed text-red-700">
                ⚠ {error}
              </p>

            </div>
          )
          : null
      }

    </section>
  );
}
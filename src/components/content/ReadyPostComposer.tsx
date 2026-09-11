'use client';

import {
  Bookmark,
  CheckCircle2,
  Heart,
  Layers3,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Save,
  Send,
} from 'lucide-react';

import {
  useRouter,
} from 'next/navigation';

import {
  useMemo,
  useState,
} from 'react';

import {
  updateReadyCaption,
} from '@/app/(dashboard)/pronto-para-postar/actions';

import {
  CopyCaptionButton,
} from '@/components/content/CopyCaptionButton';

import {
  DownloadContentButton,
} from '@/components/content/DownloadContentButton';


type PreviewAsset = {
  id:
    string;

  url:
    string;

  mimeType:
    string;

  position:
    number;
};


function profileInitials(
  value:
    string
) {
  const parts =
    value
      .trim()
      .split(
        /\s+/
      )
      .filter(
        Boolean
      )
      .slice(
        0,
        2
      );

  const initials =
    parts
      .map(
        (
          part
        ) =>
          part
            .charAt(
              0
            )
            .toUpperCase()
      )
      .join(
        ''
      );

  return (
    initials ||
    'IG'
  );
}


function instagramName(
  username:
    string | null,
  clientName:
    string
) {
  const clean =
    String(
      username ||
      ''
    )
      .trim()
      .replace(
        /^@+/,
        ''
      );

  if (clean) {
    return clean;
  }

  return clientName
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      '_'
    )
    .replace(
      /^_+|_+$/g,
      ''
    ) ||
    'instagram';
}


export function ReadyPostComposer({
  contentId,
  clientName,
  username,
  format,
  initialCaption,
  isCarousel,
  assets,
  previewImageUrl,
  previewVideoUrl,
  hasFinalMedia,
}: {
  contentId:
    string;

  clientName:
    string;

  username:
    string | null;

  format:
    string;

  initialCaption:
    string;

  isCarousel:
    boolean;

  assets:
    PreviewAsset[];

  previewImageUrl:
    string | null;

  previewVideoUrl:
    string | null;

  hasFinalMedia:
    boolean;
}) {
  const router =
    useRouter();

  const [
    caption,
    setCaption,
  ] =
    useState(
      initialCaption
    );

  const [
    savedCaption,
    setSavedCaption,
  ] =
    useState(
      initialCaption
    );

  const [
    saving,
    setSaving,
  ] =
    useState(
      false
    );

  const [
    feedback,
    setFeedback,
  ] =
    useState(
      ''
    );


  const profileName =
    useMemo(
      () =>
        instagramName(
          username,
          clientName
        ),
      [
        username,
        clientName,
      ]
    );


  const dirty =
    caption !==
    savedCaption;

  const carouselPreview =
    isCarousel
      ? assets[0]?.url ||
        previewImageUrl
      : null;


  async function saveCaption() {
    if (saving) {
      return;
    }


    setSaving(
      true
    );

    setFeedback(
      ''
    );


    try {
      const result =
        await updateReadyCaption(
          contentId,
          caption
        );


      setCaption(
        result.caption
      );

      setSavedCaption(
        result.caption
      );

      setFeedback(
        'Legenda salva.'
      );

      router.refresh();
    }
    catch (
      error
    ) {
      console.error(
        error
      );

      setFeedback(
        error instanceof
          Error
          ? error.message
          : 'Não foi possível salvar a legenda.'
      );
    }
    finally {
      setSaving(
        false
      );
    }
  }


  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
      <div className="space-y-3">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 px-3 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 via-violet-500 to-orange-400 text-[11px] font-black text-white">
              {profileInitials(
                clientName
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-black text-slate-950">
                {profileName}
              </p>

              <p className="truncate text-[10px] text-slate-400">
                {clientName}
              </p>
            </div>

            <MoreHorizontal
              size={18}
              className="text-slate-600"
            />
          </div>

          <div className="relative flex min-h-[300px] items-center justify-center bg-black">
            {isCarousel &&
            carouselPreview ? (
              <>
                <img
                  src={
                    carouselPreview
                  }
                  alt="Primeira página do carrossel"
                  className="max-h-[480px] w-full object-contain"
                />

                <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/75 px-2.5 py-1 text-[10px] font-black text-white">
                  <Layers3
                    size={13}
                  />

                  1/{Math.max(
                    assets.length,
                    1
                  )}
                </div>
              </>
            ) : previewVideoUrl ? (
              <video
                src={
                  previewVideoUrl
                }
                controls
                preload="metadata"
                className="max-h-[480px] w-full object-contain"
              >
                Seu navegador não conseguiu reproduzir este vídeo.
              </video>
            ) : previewImageUrl ? (
              <img
                src={
                  previewImageUrl
                }
                alt="Prévia da publicação"
                className="max-h-[480px] w-full object-contain"
              />
            ) : (
              <div className="flex min-h-[300px] items-center justify-center px-6 text-center text-xs font-bold text-slate-400">
                A prévia aparecerá quando houver material final.
              </div>
            )}
          </div>

          <div className="px-3 pb-4 pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-slate-900">
                <Heart
                  size={20}
                />

                <MessageCircle
                  size={20}
                />

                <Send
                  size={20}
                />
              </div>

              <Bookmark
                size={20}
              />
            </div>

            <div className="mt-3 max-h-24 overflow-hidden text-xs leading-5 text-slate-700">
              <span className="mr-1 font-black text-slate-950">
                {profileName}
              </span>

              {caption.trim()
                ? caption
                : (
                  <span className="text-slate-400">
                    Sua legenda aparecerá aqui.
                  </span>
                )}
            </div>

            {isCarousel &&
            assets.length >
              1 ? (
              <div className="mt-3 flex justify-center gap-1">
                {assets
                  .slice(
                    0,
                    8
                  )
                  .map(
                    (
                      asset,
                      index
                    ) => (
                      <span
                        key={
                          asset.id
                        }
                        className={
                          index ===
                          0
                            ? 'h-1.5 w-1.5 rounded-full bg-blue-500'
                            : 'h-1.5 w-1.5 rounded-full bg-slate-300'
                        }
                      />
                    )
                  )}
              </div>
            ) : null}
          </div>
        </div>

        {hasFinalMedia ? (
          <DownloadContentButton
            contentId={
              contentId
            }
            isCarousel={
              isCarousel
            }
            compact
          />
        ) : null}

        <p className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Prévia aproximada do feed do Instagram
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Legenda
            </p>

            <p className="mt-1 text-sm font-black text-slate-900">
              Edite antes de publicar
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <CopyCaptionButton
              text={
                caption
              }
            />

            <button
              type="button"
              onClick={
                saveCaption
              }
              disabled={
                saving ||
                !dirty
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? (
                <Loader2
                  size={14}
                  className="animate-spin"
                />
              ) : dirty ? (
                <Save
                  size={14}
                />
              ) : (
                <CheckCircle2
                  size={14}
                />
              )}

              {saving
                ? 'Salvando...'
                : dirty
                  ? 'Salvar legenda'
                  : 'Legenda salva'}
            </button>
          </div>
        </div>

        <textarea
          value={
            caption
          }
          onChange={
            (
              event
            ) => {
              setCaption(
                event.target.value
              );

              setFeedback(
                ''
              );
            }
          }
          rows={14}
          placeholder="Escreva a legenda da publicação..."
          className="mt-4 min-h-80 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
        />

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-slate-400">
            {caption.length.toLocaleString(
              'pt-BR'
            )} caracteres
          </p>

          {feedback ? (
            <p
              className={
                feedback ===
                'Legenda salva.'
                  ? 'text-xs font-bold text-emerald-600'
                  : 'text-xs font-bold text-red-600'
              }
            >
              {feedback}
            </p>
          ) : dirty ? (
            <p className="text-xs font-bold text-amber-600">
              Existem alterações não salvas.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

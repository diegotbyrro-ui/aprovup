'use client';

import {
  useRouter,
} from 'next/navigation';

import {
  useState,
} from 'react';

import {
  LayoutTemplate,
  Smartphone,
  UploadCloud,
} from 'lucide-react';

import {
  createClient,
} from '@supabase/supabase-js';


type UploadKind =
  | 'final'
  | 'cover'
  | 'story'
  | 'storyCover';


type PreparedUpload = {
  ok: boolean;

  bucket: string;

  path: string;

  token: string;

  message?: string;
};


type FinalUploadFormProps = {
  contentId: string;

  area?: string | null;

  feedMode?:
    | 'single'
    | 'carousel';

  currentFinalMediaUrl?: string | null;

  currentFinalCoverUrl?: string | null;

  currentFinalMediaType?: string | null;

  currentStoryMediaUrl?: string | null;

  currentStoryCoverUrl?: string | null;

  currentStoryMediaType?: string | null;
};


function browserStorageClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;


  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;


  if (
    !url ||
    !key
  ) {
    throw new Error(
      'Storage do AprovUp não está configurado.'
    );
  }


  return createClient(
    url,
    key,
    {
      auth: {
        persistSession:
          false,

        autoRefreshToken:
          false,

        detectSessionInUrl:
          false,
      },
    }
  );
}


function CurrentAsset({
  title,
  mediaUrl,
  coverUrl,
  mediaType,
  story,
}: {
  title: string;

  mediaUrl?: string | null;

  coverUrl?: string | null;

  mediaType?: string | null;

  story?: boolean;
}) {
  const type =
    String(
      mediaType ||
      ''
    ).toLowerCase();


  const imageUrl =
    coverUrl ||
    (
      type.startsWith(
        'image/'
      )
        ? mediaUrl
        : ''
    );


  const videoUrl =
    !coverUrl &&
    type.startsWith(
      'video/'
    )
      ? mediaUrl
      : '';


  if (
    !mediaUrl &&
    !coverUrl
  ) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 px-3 py-3 text-xs font-semibold text-slate-400">
        Nenhum {title.toLowerCase()} enviado ainda.
      </div>
    );
  }


  return (
    <div className="space-y-2">

      {imageUrl ? (
        <div
          className={[
            'overflow-hidden',
            'rounded-xl',
            'border',
            'border-slate-200',
            'bg-slate-100',
            story
              ? 'mx-auto max-w-[150px]'
              : '',
          ].join(
            ' '
          )}
        >
          <img
            src={
              imageUrl
            }
            alt={
              title
            }
            className={[
              'w-full',
              'object-cover',
              story
                ? 'aspect-[9/16]'
                : 'aspect-[4/5]',
            ].join(
              ' '
            )}
          />
        </div>
      ) : null}


      {videoUrl ? (
        <video
          src={
            videoUrl
          }
          controls
          preload="metadata"
          className={[
            'w-full',
            'rounded-xl',
            'bg-black',
            story
              ? 'mx-auto aspect-[9/16] max-w-[150px]'
              : 'aspect-video',
          ].join(
            ' '
          )}
        />
      ) : null}


      {mediaUrl ? (
        <a
          href={
            mediaUrl
          }
          target="_blank"
          rel="noreferrer"
          className="block text-center text-xs font-bold text-blue-700 hover:underline"
        >
          Abrir arquivo atual
        </a>
      ) : null}

    </div>
  );
}


export default function FinalUploadForm({
  contentId,
  area,
  feedMode =
    'single',
  currentFinalMediaUrl,
  currentFinalCoverUrl,
  currentFinalMediaType,
  currentStoryMediaUrl,
  currentStoryCoverUrl,
  currentStoryMediaType,
}: FinalUploadFormProps) {
  const router =
    useRouter();


  const [
    isUploading,
    setIsUploading,
  ] =
    useState(
      false
    );


  const [
    message,
    setMessage,
  ] =
    useState(
      ''
    );


  const normalizedArea =
    String(
      area ||
      ''
    ).toUpperCase();


  const isDesign =
    normalizedArea ===
      'DESIGN' ||
    normalizedArea ===
      'SOCIAL_DESIGN';


  async function prepareUpload(
    file: File,
    kind: UploadKind
  ) {
    const response =
      await fetch(
        `/api/conteudos/${contentId}/upload-final`,
        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              action:
                'prepare',

              kind,

              fileName:
                file.name,

              contentType:
                file.type,

              fileSize:
                file.size,
            }),
        }
      );


    const result =
      await response.json();


    if (
      !response.ok ||
      !result.ok
    ) {
      throw new Error(
        result.message ||
        'Não foi possível preparar o upload.'
      );
    }


    return result as
      PreparedUpload;
  }


  async function uploadSignedFile(
    file: File,
    kind: UploadKind
  ) {
    const prepared =
      await prepareUpload(
        file,
        kind
      );


    const supabase =
      browserStorageClient();


    const {
      error,
    } =
      await supabase.storage
        .from(
          prepared.bucket
        )
        .uploadToSignedUrl(
          prepared.path,
          prepared.token,
          file,
          {
            contentType:
              file.type ||
              'application/octet-stream',

            cacheControl:
              '3600',
          }
        );


    if (error) {
      console.error(
        'AprovUp signed upload:',
        error
      );


      throw new Error(
        error.message ||
        'Não foi possível enviar o arquivo.'
      );
    }


    return prepared.path;
  }


  function getFile(
    formData: FormData,
    name: string
  ) {
    const value =
      formData.get(
        name
      );


    return (
      value instanceof File &&
      value.size > 0
    )
      ? value
      : null;
  }


  async function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();


    const form =
      event.currentTarget;


    const formData =
      new FormData(
        form
      );


    const finalFile =
      getFile(
        formData,
        'finalFile'
      );


    const coverFile =
      getFile(
        formData,
        'coverFile'
      );


    const storyFile =
      getFile(
        formData,
        'storyFile'
      );


    const storyCoverFile =
      getFile(
        formData,
        'storyCoverFile'
      );


    if (
      !finalFile &&
      !coverFile &&
      !storyFile &&
      !storyCoverFile
    ) {
      setMessage(
        'Selecione pelo menos um arquivo para enviar.'
      );

      return;
    }


    setIsUploading(
      true
    );


    setMessage(
      'Preparando envio...'
    );


    try {
      let finalPath =
        '';

      let coverPath =
        '';

      let storyPath =
        '';

      let storyCoverPath =
        '';


      if (finalFile) {
        setMessage(
          'Enviando arquivo final do Feed... Não feche esta página.'
        );


        finalPath =
          await uploadSignedFile(
            finalFile,
            'final'
          );
      }


      if (coverFile) {
        setMessage(
          'Enviando thumbnail do Feed...'
        );


        coverPath =
          await uploadSignedFile(
            coverFile,
            'cover'
          );
      }


      if (storyFile) {
        setMessage(
          'Enviando arquivo final dos Stories... Não feche esta página.'
        );


        storyPath =
          await uploadSignedFile(
            storyFile,
            'story'
          );
      }


      if (storyCoverFile) {
        setMessage(
          'Enviando thumbnail dos Stories...'
        );


        storyCoverPath =
          await uploadSignedFile(
            storyCoverFile,
            'storyCover'
          );
      }


      setMessage(
        'Finalizando envio...'
      );


      const response =
        await fetch(
          `/api/conteudos/${contentId}/upload-final`,
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                action:
                  'complete',

                finalPath,

                coverPath,

                storyPath,

                storyCoverPath,

                finalMediaType:
                  finalFile?.type ||
                  '',

                storyMediaType:
                  storyFile?.type ||
                  '',
              }),
          }
        );


      const result =
        await response.json();


      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.message ||
          'Não foi possível finalizar o envio.'
        );
      }


      form.reset();


      setMessage(
        'Materiais enviados para conferência interna com sucesso.'
      );


      router.refresh();
    }
    catch (error) {
      console.error(
        error
      );


      setMessage(
        error instanceof Error
          ? error.message
          : 'Erro ao enviar arquivo. Tente novamente.'
      );
    }
    finally {
      setIsUploading(
        false
      );
    }
  }


  if (!isDesign) {
    return (
      <form
        onSubmit={
          handleSubmit
        }
        className="mt-5 space-y-4"
      >

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-blue-700">
            Arquivo final
          </label>

          <input
            type="file"
            name="finalFile"
            accept="image/*,video/*,.pdf"
            disabled={
              isUploading
            }
            className="block w-full cursor-pointer rounded-2xl border border-blue-100 bg-white text-sm font-medium text-slate-700 file:mr-4 file:border-0 file:bg-blue-600 file:px-4 file:py-3 file:text-sm file:font-bold file:text-white hover:file:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>


        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-blue-700">
            Capa / thumbnail
          </label>

          <input
            type="file"
            name="coverFile"
            accept="image/*"
            disabled={
              isUploading
            }
            className="block w-full cursor-pointer rounded-2xl border border-blue-100 bg-white text-sm font-medium text-slate-700 file:mr-4 file:border-0 file:bg-slate-900 file:px-4 file:py-3 file:text-sm file:font-bold file:text-white hover:file:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>


        {message ? (
          <div className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-blue-700">
            {message}
          </div>
        ) : null}


        <button
          type="submit"
          disabled={
            isUploading
          }
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <UploadCloud
            size={18}
          />

          {isUploading
            ? 'Enviando material...'
            : 'Enviar para conferência'}
        </button>

      </form>
    );
  }


  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="mt-5 space-y-5"
    >

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

        {feedMode ===
        'carousel' ? (

          <section className="rounded-2xl border border-blue-200 bg-white/80 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <LayoutTemplate
                  size={18}
                />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">
                  Feed
                </p>

                <h3 className="text-sm font-black text-slate-900">
                  Carrossel
                </h3>
              </div>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              As páginas do Feed são gerenciadas no editor de carrossel acima.
            </p>
          </section>

        ) : (

          <section className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm">

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <LayoutTemplate
                  size={18}
                />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">
                  Feed
                </p>

                <h3 className="text-sm font-black text-slate-900">
                  Material principal
                </h3>
              </div>
            </div>


            <div className="mt-4">
              <CurrentAsset
                title="Feed"
                mediaUrl={
                  currentFinalMediaUrl
                }
                coverUrl={
                  currentFinalCoverUrl
                }
                mediaType={
                  currentFinalMediaType
                }
              />
            </div>


            <div className="mt-4 space-y-3">

              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">
                  Arquivo final do Feed
                </label>

                <input
                  type="file"
                  name="finalFile"
                  accept="image/*,video/*,.pdf"
                  disabled={
                    isUploading
                  }
                  className="block w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 file:mr-3 file:border-0 file:bg-blue-600 file:px-3 file:py-2.5 file:text-xs file:font-bold file:text-white hover:file:bg-blue-700 disabled:opacity-60"
                />
              </div>


              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">
                  Thumbnail do Feed
                </label>

                <input
                  type="file"
                  name="coverFile"
                  accept="image/*"
                  disabled={
                    isUploading
                  }
                  className="block w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 file:mr-3 file:border-0 file:bg-slate-900 file:px-3 file:py-2.5 file:text-xs file:font-bold file:text-white hover:file:bg-slate-800 disabled:opacity-60"
                />
              </div>

            </div>

          </section>

        )}


        <section className="rounded-2xl border border-violet-200 bg-white p-4 shadow-sm">

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <Smartphone
                size={18}
              />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-500">
                Stories
              </p>

              <h3 className="text-sm font-black text-slate-900">
                Versão vertical
              </h3>
            </div>
          </div>


          <div className="mt-4">
            <CurrentAsset
              title="Stories"
              mediaUrl={
                currentStoryMediaUrl
              }
              coverUrl={
                currentStoryCoverUrl
              }
              mediaType={
                currentStoryMediaType
              }
              story
            />
          </div>


          <div className="mt-4 space-y-3">

            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">
                Arquivo final dos Stories
              </label>

              <input
                type="file"
                name="storyFile"
                accept="image/*,video/*"
                disabled={
                  isUploading
                }
                className="block w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 file:mr-3 file:border-0 file:bg-violet-600 file:px-3 file:py-2.5 file:text-xs file:font-bold file:text-white hover:file:bg-violet-700 disabled:opacity-60"
              />
            </div>


            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">
                Thumbnail dos Stories
              </label>

              <input
                type="file"
                name="storyCoverFile"
                accept="image/*"
                disabled={
                  isUploading
                }
                className="block w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 file:mr-3 file:border-0 file:bg-slate-900 file:px-3 file:py-2.5 file:text-xs file:font-bold file:text-white hover:file:bg-slate-800 disabled:opacity-60"
              />
            </div>

          </div>

        </section>

      </div>


      <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-medium leading-relaxed text-blue-700">
        Você pode enviar Feed e Stories juntos ou atualizar apenas um deles. Campos sem novo arquivo mantêm o material que já está salvo.
      </p>


      {message ? (
        <div className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-bold text-blue-700">
          {message}
        </div>
      ) : null}


      <button
        type="submit"
        disabled={
          isUploading
        }
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <UploadCloud
          size={18}
        />

        {isUploading
          ? 'Enviando materiais...'
          : feedMode === 'carousel'
            ? 'Enviar Stories para conferência'
            : 'Enviar materiais para conferência'}
      </button>

    </form>
  );
}
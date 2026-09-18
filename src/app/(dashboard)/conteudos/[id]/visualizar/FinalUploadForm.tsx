'use client';

import {
  useRouter,
} from 'next/navigation';

import {
  useState,
} from 'react';

import {
  ExternalLink,
  LayoutTemplate,
  Link2,
  Smartphone,
  UploadCloud,
  X,
} from 'lucide-react';

import {
  createClient,
} from '@supabase/supabase-js';


type UploadKind =
  | 'final'
  | 'cover'
  | 'story'
  | 'storyCover';


type DeleteKind =
  | UploadKind
  | 'external';


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

  currentFinalExternalUrl?: string | null;

  currentStoryMediaUrl?: string | null;

  currentStoryCoverUrl?: string | null;

  currentStoryMediaType?: string | null;

  currentStoryMediaItems?: Array<{
    url: string;
    mimeType: string;
    position: number;
  }>;
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
  mediaKind,
  coverKind,
  deletingKind,
  onDelete,
}: {
  title: string;

  mediaUrl?: string | null;

  coverUrl?: string | null;

  mediaType?: string | null;

  story?: boolean;

  mediaKind: UploadKind;

  coverKind: UploadKind;

  deletingKind:
    | DeleteKind
    | null;

  onDelete: (
    kind: UploadKind
  ) => void;
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


  const separateCover =
    Boolean(
      coverUrl &&
      coverUrl !==
        mediaUrl
    );


  if (
    !mediaUrl &&
    !coverUrl
  ) {
    return (
      <div className="flex min-h-14 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-3 py-2.5 text-center text-[10px] font-bold text-slate-400">
        Nenhum {title.toLowerCase()} enviado ainda.
      </div>
    );
  }


  return (
    <div className="space-y-2">

      <div
        className={[
          'relative',
          'overflow-hidden',
          'rounded-xl',
          'border',
          'border-slate-200',
          'bg-slate-100',
          story
            ? 'mx-auto max-w-[170px]'
            : '',
        ].join(
          ' '
        )}
      >

        {imageUrl ? (
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
        ) : videoUrl ? (
          <video
            src={
              videoUrl
            }
            controls
            preload="metadata"
            className={[
              'w-full',
              'bg-black',
              story
                ? 'aspect-[9/16]'
                : 'aspect-video',
            ].join(
              ' '
            )}
          />
        ) : (
          <div className="flex min-h-[130px] items-center justify-center px-5 text-center text-xs font-bold text-slate-400">
            Arquivo enviado. Use o link abaixo para abrir.
          </div>
        )}


        <div className="absolute right-2 top-2 flex flex-col items-end gap-1">

          {mediaUrl ? (
            <button
              type="button"
              title={
                'Excluir arquivo atual de ' +
                title
              }
              aria-label={
                'Excluir arquivo atual de ' +
                title
              }
              disabled={
                deletingKind !==
                null
              }
              onClick={
                () =>
                  onDelete(
                    mediaKind
                  )
              }
              className="inline-flex h-7 items-center gap-1 rounded-full border border-red-100 bg-white/95 px-2 text-[9px] font-black text-red-600 shadow-md backdrop-blur transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X
                size={11}
                strokeWidth={2.8}
              />

              {deletingKind ===
              mediaKind
                ? 'Excluindo...'
                : 'Arquivo'}
            </button>
          ) : null}


          {separateCover ? (
            <button
              type="button"
              title="Excluir thumbnail atual"
              aria-label="Excluir thumbnail atual"
              disabled={
                deletingKind !==
                null
              }
              onClick={
                () =>
                  onDelete(
                    coverKind
                  )
              }
              className="inline-flex h-7 items-center gap-1 rounded-full border border-red-100 bg-white/95 px-2 text-[9px] font-black text-red-600 shadow-md backdrop-blur transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X
                size={11}
                strokeWidth={2.8}
              />

              {deletingKind ===
              coverKind
                ? 'Excluindo...'
                : 'Thumbnail'}
            </button>
          ) : null}

        </div>

      </div>


      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">

        {mediaUrl ? (
          <a
            href={
              mediaUrl
            }
            target="_blank"
            rel="noreferrer"
            className="text-center text-xs font-bold text-blue-700 hover:underline"
          >
            Abrir arquivo atual
          </a>
        ) : null}


        {separateCover ? (
          <a
            href={
              coverUrl ||
              ''
            }
            target="_blank"
            rel="noreferrer"
            className="text-center text-xs font-bold text-slate-500 hover:underline"
          >
            Abrir thumbnail
          </a>
        ) : null}

      </div>

    </div>
  );
}




function ExternalDeliveryField({
  currentUrl,
  disabled,
  deleting,
  onDelete,
}: {
  currentUrl?: string | null;

  disabled: boolean;

  deleting: boolean;

  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">

      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm ring-1 ring-slate-200">
          <Link2
            size={17}
          />
        </div>

        <div className="min-w-0">
          <label
            htmlFor="finalExternalUrl"
            className="block text-[10px] font-black uppercase tracking-[0.1em] text-slate-700"
          >
            Link do Google Drive / arquivo externo
          </label>

          <p className="mt-1 text-[10px] leading-4 text-slate-500">
            Para arquivos muito pesados, envie pelo Google Drive e cole aqui o link compartilhado.
          </p>
        </div>
      </div>


      {currentUrl ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-3">

          <a
            href={
              currentUrl
            }
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 text-xs font-black text-emerald-700 hover:underline"
          >
            <ExternalLink
              size={14}
            />

            Abrir link atual
          </a>


          <button
            type="button"
            disabled={
              disabled
            }
            onClick={
              onDelete
            }
            className="inline-flex items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5 text-[10px] font-black text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X
              size={12}
              strokeWidth={2.8}
            />

            {deleting
              ? 'Removendo...'
              : 'Remover link'}
          </button>

        </div>
      ) : null}


      <input
        key={
          currentUrl ||
          'external-empty'
        }
        id="finalExternalUrl"
        type="url"
        name="externalUrl"
        defaultValue={
          currentUrl ||
          ''
        }
        placeholder="https://drive.google.com/..."
        disabled={
          disabled
        }
        className="mt-3 block h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
      />

      <p className="mt-2 text-[9px] font-medium leading-4 text-slate-400">
        Antes de enviar, confira se o arquivo está liberado para visualização pelo link.
      </p>

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
  currentFinalExternalUrl,
  currentStoryMediaUrl,
  currentStoryCoverUrl,
  currentStoryMediaType,
  currentStoryMediaItems =
    [],
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
    deletingKind,
    setDeletingKind,
  ] =
    useState<
      DeleteKind |
      null
    >(
      null
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
      'SOCIAL_DESIGN' ||
    normalizedArea ===
      'SOCIAL_MEDIA';


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


  function getFiles(
    formData: FormData,
    name: string
  ) {
    return formData
      .getAll(
        name
      )
      .filter(
        (
          value
        ): value is File =>
          value instanceof File &&
          value.size >
            0
      );
  }


  async function handleDelete(
    kind: DeleteKind
  ) {
    const copy:
      Record<
        DeleteKind,
        {
          question: string;
          progress: string;
          success: string;
        }
      > = {
        final: isDesign
          ? {
              question:
                'o arquivo final do Feed',
              progress:
                'Excluindo arquivo final do Feed...',
              success:
                'Arquivo final do Feed removido com sucesso.',
            }
          : {
              question:
                'o arquivo final',
              progress:
                'Excluindo arquivo final...',
              success:
                'Arquivo final removido com sucesso.',
            },

        cover: isDesign
          ? {
              question:
                'a thumbnail do Feed',
              progress:
                'Excluindo thumbnail do Feed...',
              success:
                'Thumbnail do Feed removida com sucesso.',
            }
          : {
              question:
                'a capa / thumbnail',
              progress:
                'Excluindo capa / thumbnail...',
              success:
                'Capa / thumbnail removida com sucesso.',
            },

        story: {
          question:
            'o arquivo final dos Stories',
          progress:
            'Excluindo arquivo final dos Stories...',
          success:
            'Arquivo final dos Stories removido com sucesso.',
        },

        storyCover: {
          question:
            'a thumbnail dos Stories',
          progress:
            'Excluindo thumbnail dos Stories...',
          success:
            'Thumbnail dos Stories removida com sucesso.',
        },

        external: {
          question:
            'o link externo do material final',
          progress:
            'Removendo link externo...',
          success:
            'Link externo removido com sucesso.',
        },
      };


    const selected =
      copy[
        kind
      ];


    const confirmed =
      window.confirm(
        'Excluir ' +
        selected.question +
        '? Esta acao remove somente este material.'
      );


    if (!confirmed) {
      return;
    }


    setDeletingKind(
      kind
    );

    setMessage(
      selected.progress
    );


    try {
      const response =
        await fetch(
          '/api/conteudos/' +
            contentId +
            '/upload-final',
          {
            method:
              'DELETE',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                kind,
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
          'Nao foi possivel excluir o arquivo.'
        );
      }


      setMessage(
        result.message ||
        selected.success
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
          : 'Erro ao excluir arquivo. Tente novamente.'
      );
    }
    finally {
      setDeletingKind(
        null
      );
    }
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


    const finalFiles =
      getFiles(
        formData,
        'finalFile'
      );


    const finalFile =
      finalFiles[0] ||
      null;


    const coverFile =
      getFile(
        formData,
        'coverFile'
      );


    const storyFiles =
      getFiles(
        formData,
        'storyFile'
      );


    const storyFile =
      storyFiles[0] ||
      null;


    const storyCoverFile =
      getFile(
        formData,
        'storyCoverFile'
      );


    const externalUrl =
      String(
        formData.get(
          'externalUrl'
        ) ||
        ''
      ).trim();


    if (
      finalFiles.length >
        10
    ) {
      setMessage(
        'Selecione no maximo 10 imagens para o Feed.'
      );

      return;
    }


    if (
      finalFiles.length >
        1 &&
      !isDesign
    ) {
      setMessage(
        'O envio de varios arquivos esta disponivel somente para o Design.'
      );

      return;
    }


    if (
      finalFiles.length >
        1 &&
      finalFiles.some(
        (
          file
        ) =>
          !file.type.startsWith(
            'image/'
          )
      )
    ) {
      setMessage(
        'Para enviar varios arquivos juntos, todos precisam ser imagens.'
      );

      return;
    }


    if (
      storyFiles.length >
        10
    ) {
      setMessage(
        'Selecione no maximo 10 imagens para os Stories.'
      );

      return;
    }


    if (
      storyFiles.length >
        1 &&
      !isDesign
    ) {
      setMessage(
        'O envio de varios Stories esta disponivel somente para o Design.'
      );

      return;
    }


    if (
      storyFiles.length >
        1 &&
      storyFiles.some(
        (
          file
        ) =>
          !file.type.startsWith(
            'image/'
          )
      )
    ) {
      setMessage(
        'Para enviar varios Stories juntos, todos precisam ser imagens.'
      );

      return;
    }


    if (
      !finalFile &&
      !coverFile &&
      !storyFile &&
      !storyCoverFile &&
      !externalUrl
    ) {
      setMessage(
        'Selecione pelo menos um arquivo ou informe um link externo.'
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


      const finalItems:
        Array<{
          path: string;
          mimeType: string;
        }> =
        [];


      const storyItems:
        Array<{
          path: string;
          mimeType: string;
        }> =
        [];


      if (
        finalFiles.length >
          1
      ) {
        for (
          let index =
            0;
          index <
            finalFiles.length;
          index++
        ) {
          const file =
            finalFiles[
              index
            ];


          setMessage(
            'Enviando imagem ' +
            String(
              index +
                1
            ) +
            ' de ' +
            String(
              finalFiles.length
            ) +
            '...'
          );


          const path =
            await uploadSignedFile(
              file,
              'final'
            );


          finalItems.push({
            path,

            mimeType:
              file.type,
          });
        }
      }
      else if (
        finalFile
      ) {
        setMessage(
          'Enviando arquivo final do Feed...'
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


      if (
        storyFiles.length >
          1
      ) {
        for (
          let index =
            0;
          index <
            storyFiles.length;
          index++
        ) {
          const file =
            storyFiles[
              index
            ];


          setMessage(
            'Enviando Story ' +
            String(
              index +
                1
            ) +
            ' de ' +
            String(
              storyFiles.length
            ) +
            '...'
          );


          const uploadedPath =
            await uploadSignedFile(
              file,
              'story'
            );


          storyItems.push({
            path:
              uploadedPath,

            mimeType:
              file.type,
          });
        }
      }
      else if (
        storyFile
      ) {
        setMessage(
          'Enviando arquivo final dos Stories...'
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

                finalItems,

                coverPath,

                storyPath,

                storyItems,

                storyCoverPath,

                externalUrl,

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
        className="space-y-3"
      >

        <CurrentAsset
          title="Arquivo final"
          mediaUrl={
            currentFinalMediaUrl
          }
          coverUrl={
            currentFinalCoverUrl
          }
          mediaType={
            currentFinalMediaType
          }
          mediaKind="final"
          coverKind="cover"
          deletingKind={
            deletingKind
          }
          onDelete={
            handleDelete
          }
        />

        <ExternalDeliveryField
          currentUrl={
            currentFinalExternalUrl
          }
          disabled={
            isUploading ||
            deletingKind !==
              null
          }
          deleting={
            deletingKind ===
            'external'
          }
          onDelete={
            () =>
              handleDelete(
                'external'
              )
          }
        />


        <div>
          <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.1em] text-slate-600">
            Arquivo final
          </label>

          <input
            type="file"
            name="finalFile"
            accept="image/*,video/*,.pdf"
            disabled={
              isUploading ||
              deletingKind !==
                null
            }
            className="block w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 file:mr-3 file:border-0 file:bg-blue-600 file:px-3 file:py-2.5 file:text-[11px] file:font-black file:text-white hover:file:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>


        <div>
          <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.1em] text-slate-600">
            Capa / thumbnail
          </label>

          <input
            type="file"
            name="coverFile"
            accept="image/*"
            disabled={
              isUploading ||
              deletingKind !==
                null
            }
            className="block w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 file:mr-3 file:border-0 file:bg-slate-900 file:px-3 file:py-2.5 file:text-[11px] file:font-black file:text-white hover:file:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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
              isUploading ||
              deletingKind !==
                null
            }
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-[11px] font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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
      className="space-y-4"
    >

      <div className="grid grid-cols-1 gap-3">

        {feedMode ===
        'carousel' ? (

          <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
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

          <section className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">

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
                mediaKind="final"
                coverKind="cover"
                deletingKind={
                  deletingKind
                }
                onDelete={
                  handleDelete
                }
              />
            </div>


            <div className="mt-4 space-y-3">

              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">
                  Arquivos finais do Feed
                </label>

                <input
                  type="file"
                  name="finalFile"
                  accept="image/*,video/*,.pdf"
                  multiple
                  disabled={
              isUploading ||
              deletingKind !==
                null
            }
                  className="block w-full cursor-pointer rounded-xl border border-slate-200 bg-white text-[10px] font-semibold text-slate-600 file:mr-3 file:border-0 file:bg-blue-600 file:px-3 file:py-2.5 file:text-[10px] file:font-black file:text-white hover:file:bg-blue-700 disabled:opacity-60"
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
              isUploading ||
              deletingKind !==
                null
            }
                  className="block w-full cursor-pointer rounded-xl border border-slate-200 bg-white text-[10px] font-semibold text-slate-600 file:mr-3 file:border-0 file:bg-slate-900 file:px-3 file:py-2.5 file:text-[10px] file:font-black file:text-white hover:file:bg-slate-800 disabled:opacity-60"
                />
              </div>

            </div>

          </section>

        )}


        <section className="rounded-2xl border border-violet-100 bg-violet-50/35 p-4">

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

            {
              currentStoryMediaItems.length >
                1
                ? (
                  <div className="rounded-xl border border-violet-200 bg-white p-3">

                    <div className="flex items-center justify-between gap-3">

                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wide text-violet-500">
                          Stories enviados
                        </p>

                        <p className="mt-1 text-[11px] font-black text-slate-900">
                          {currentStoryMediaItems.length} artes
                        </p>
                      </div>


                      <button
                        type="button"
                        disabled={
                          deletingKind !==
                            null
                        }
                        onClick={
                          () =>
                            handleDelete(
                              'story'
                            )
                        }
                        className="rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5 text-[9px] font-black text-red-600 hover:bg-red-100 disabled:opacity-50"
                      >
                        Remover Stories
                      </button>

                    </div>


                    <div className="mt-3 grid grid-cols-3 gap-2">

                      {
                        currentStoryMediaItems.map(
                          (
                            item,
                            index
                          ) => (
                            <a
                              key={
                                item.url
                              }
                              href={
                                item.url
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="relative overflow-hidden rounded-lg border border-violet-100 bg-black"
                            >
                              <img
                                src={
                                  item.url
                                }
                                alt={
                                  'Story ' +
                                  String(
                                    index +
                                      1
                                  )
                                }
                                className="aspect-[9/16] w-full object-cover"
                              />

                              <span className="absolute right-1 top-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[7px] font-black text-white">
                                {index + 1}/{currentStoryMediaItems.length}
                              </span>
                            </a>
                          )
                        )
                      }

                    </div>

                  </div>
                )
                : (
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
                    mediaKind="story"
                    coverKind="storyCover"
                    deletingKind={
                      deletingKind
                    }
                    onDelete={
                      handleDelete
                    }
                  />
                )
            }

          </div>


          <div className="mt-4 space-y-3">

            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">
                Arquivos finais dos Stories
              </label>

              <input
                type="file"
                name="storyFile"
                accept="image/*,video/*"
                multiple
                disabled={
              isUploading ||
              deletingKind !==
                null
            }
                className="block w-full cursor-pointer rounded-xl border border-slate-200 bg-white text-[10px] font-semibold text-slate-600 file:mr-3 file:border-0 file:bg-violet-600 file:px-3 file:py-2.5 file:text-[10px] file:font-black file:text-white hover:file:bg-violet-700 disabled:opacity-60"
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
              isUploading ||
              deletingKind !==
                null
            }
                className="block w-full cursor-pointer rounded-xl border border-slate-200 bg-white text-[10px] font-semibold text-slate-600 file:mr-3 file:border-0 file:bg-slate-900 file:px-3 file:py-2.5 file:text-[10px] file:font-black file:text-white hover:file:bg-slate-800 disabled:opacity-60"
              />
            </div>

          </div>

        </section>

      </div>


      <ExternalDeliveryField
        currentUrl={
          currentFinalExternalUrl
        }
        disabled={
          isUploading ||
          deletingKind !==
            null
        }
        deleting={
          deletingKind ===
          'external'
        }
        onDelete={
          () =>
            handleDelete(
              'external'
            )
        }
      />


      <p className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[10px] font-semibold leading-4 text-slate-500">
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
              isUploading ||
              deletingKind !==
                null
            }
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-[11px] font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <UploadCloud
          size={18}
        />

        {isUploading
          ? 'Enviando materiais...'
          : feedMode === 'carousel'
            ? 'Enviar link / Stories para conferência'
            : 'Enviar materiais para conferência'}
      </button>

    </form>
  );
}

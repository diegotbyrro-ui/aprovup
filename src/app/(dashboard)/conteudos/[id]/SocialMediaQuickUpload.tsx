'use client';

import {
  CheckCircle2,
  FileImage,
  Loader2,
  UploadCloud,
} from 'lucide-react';

import {
  useRouter,
} from 'next/navigation';

import {
  useMemo,
  useState,
} from 'react';

import {
  createClient,
} from '@supabase/supabase-js';


type PreparedUpload = {
  ok:
    boolean;

  bucket:
    string;

  path:
    string;

  token:
    string;

  message?:
    string;
};


type MediaAsset = {
  id:
    string;

  url:
    string;

  mimeType:
    string;

  position:
    number;
};


function browserStorageClient() {
  const url =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env
      .NEXT_PUBLIC_SUPABASE_ANON_KEY;


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


export function SocialMediaQuickUpload({
  contentId,
  status,
  isCarousel,
  assets,
  hasExistingMaterial,
}: {
  contentId:
    string;

  status:
    string;

  isCarousel:
    boolean;

  assets:
    MediaAsset[];

  hasExistingMaterial:
    boolean;
}) {
  const router =
    useRouter();

  const [
    files,
    setFiles,
  ] =
    useState<
      File[]
    >(
      []
    );

  const [
    loading,
    setLoading,
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


  const locked =
    [
      'PUBLICADO',
      'PUBLICADO_MANUALMENTE',
      'PUBLICANDO',
    ].includes(
      status
    );


  const selectedLabel =
    useMemo(
      () => {
        if (
          files.length ===
          0
        ) {
          return '';
        }

        if (
          files.length ===
          1
        ) {
          return files[0]
            .name;
        }

        return `${files.length} arquivos selecionados`;
      },
      [
        files,
      ]
    );


  async function prepareUpload(
    file:
      File
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

              kind:
                'final',

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
      !result?.ok
    ) {
      throw new Error(
        result?.message ||
        'Não foi possível preparar o upload.'
      );
    }


    return result as
      PreparedUpload;
  }


  async function uploadSingleFile(
    file:
      File
  ) {
    if (
      file.size >
      200 *
      1024 *
      1024
    ) {
      throw new Error(
        'O arquivo deve possuir no máximo 200 MB.'
      );
    }


    const prepared =
      await prepareUpload(
        file
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
      throw new Error(
        error.message ||
        'Não foi possível enviar o arquivo.'
      );
    }


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

              finalPath:
                prepared.path,

              coverPath:
                '',

              storyPath:
                '',

              storyCoverPath:
                '',

              externalUrl:
                '',

              finalMediaType:
                file.type ||
                '',
            }),
        }
      );


    const result =
      await response.json();


    if (
      !response.ok ||
      !result?.ok
    ) {
      throw new Error(
        result?.message ||
        'Não foi possível finalizar o material.'
      );
    }
  }


  async function uploadCarousel(
    selected:
      File[]
  ) {
    if (
      assets.length +
      selected.length >
      10
    ) {
      throw new Error(
        'O carrossel aceita no máximo 10 páginas.'
      );
    }


    if (
      selected.length >
      0
    ) {
      const body =
        new FormData();


      selected.forEach(
        (
          file
        ) => {
          body.append(
            'files',
            file
          );
        }
      );


      const uploadResponse =
        await fetch(
          `/api/integrations/instagram/carousel/${contentId}/media`,
          {
            method:
              'POST',

            body,
          }
        );


      const uploadResult =
        await uploadResponse
          .json();


      if (
        !uploadResponse.ok ||
        !uploadResult?.ok
      ) {
        throw new Error(
          uploadResult?.message ||
          'Não foi possível enviar o carrossel.'
        );
      }
    }


    const readyResponse =
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
                'social-ready',
            }),
        }
      );


    const readyResult =
      await readyResponse
        .json();


    if (
      !readyResponse.ok ||
      !readyResult?.ok
    ) {
      throw new Error(
        readyResult?.message ||
        'Não foi possível enviar o carrossel para Pronto para Postar.'
      );
    }
  }


  async function markExistingReady() {
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
                'social-ready',
            }),
        }
      );


    const result =
      await response.json();


    if (
      !response.ok ||
      !result?.ok
    ) {
      throw new Error(
        result?.message ||
        'Não foi possível mover o conteúdo para Pronto para Postar.'
      );
    }
  }


  async function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();


    if (locked) {
      return;
    }


    if (
      files.length ===
        0 &&
      !hasExistingMaterial
    ) {
      setMessage(
        'Selecione o material final antes de salvar.'
      );

      return;
    }


    if (
      !isCarousel &&
      files.length >
      1
    ) {
      setMessage(
        'Para este formato, selecione apenas um arquivo.'
      );

      return;
    }


    setLoading(
      true
    );

    setMessage(
      'Enviando material...'
    );


    try {
      if (
        isCarousel
      ) {
        await uploadCarousel(
          files
        );
      }
      else if (
        files[0]
      ) {
        await uploadSingleFile(
          files[0]
        );
      }
      else {
        await markExistingReady();
      }


      setFiles(
        []
      );

      setMessage(
        'Material salvo. Conteúdo enviado para Pronto para Postar.'
      );


      router.refresh();
    }
    catch (
      error
    ) {
      console.error(
        error
      );

      setMessage(
        error instanceof
          Error
          ? error.message
          : 'Não foi possível salvar o material.'
      );
    }
    finally {
      setLoading(
        false
      );
    }
  }


  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="space-y-4"
    >
      <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <FileImage
              size={18}
            />
          </div>

          <div>
            <p className="text-sm font-black text-slate-900">
              {isCarousel
                ? 'Anexar páginas do carrossel'
                : 'Anexar material final'}
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              {isCarousel
                ? 'Selecione as imagens do carrossel na ordem em que serão publicadas.'
                : 'Selecione a imagem ou o vídeo final que será publicado.'}
            </p>
          </div>
        </div>

        <input
          type="file"
          accept={
            isCarousel
              ? 'image/jpeg,image/png'
              : 'image/*,video/*'
          }
          multiple={
            isCarousel
          }
          disabled={
            loading ||
            locked
          }
          onChange={
            (
              event
            ) =>
              setFiles(
                Array.from(
                  event.target
                    .files ||
                  []
                )
              )
          }
          className="mt-4 block w-full cursor-pointer rounded-xl border border-blue-100 bg-white text-sm font-semibold text-slate-700 file:mr-4 file:border-0 file:bg-blue-600 file:px-4 file:py-3 file:text-sm file:font-black file:text-white hover:file:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        />

        {selectedLabel ? (
          <p className="mt-2 text-xs font-bold text-blue-700">
            {selectedLabel}
          </p>
        ) : null}

        {isCarousel &&
        assets.length >
          0 ? (
          <p className="mt-2 text-xs font-bold text-slate-500">
            {assets.length} página(s) já anexada(s).
          </p>
        ) : null}
      </div>

      {status ===
      'PRONTO_PARA_POSTAR' ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-700">
          <CheckCircle2
            size={16}
          />

          Este conteúdo já está em Pronto para Postar. Você ainda pode substituir o material.
        </div>
      ) : null}

      {message ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
          {message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={
          loading ||
          locked
        }
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <Loader2
            size={17}
            className="animate-spin"
          />
        ) : (
          <UploadCloud
            size={17}
          />
        )}

        {loading
          ? 'Salvando material...'
          : 'Salvar material e enviar para Pronto para Postar'}
      </button>
    </form>
  );
}

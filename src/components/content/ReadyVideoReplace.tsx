'use client';


import {
  Loader2,
  RefreshCw,
  UploadCloud,
} from 'lucide-react';


import {
  useRef,
  useState,
} from 'react';


import {
  useRouter,
} from 'next/navigation';


import {
  createClient,
} from '@supabase/supabase-js';


const MAX_VIDEO_SIZE =
  500 *
  1024 *
  1024;


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


function isAcceptedVideo(
  file:
    File
) {
  const type =
    String(
      file.type ||
      ''
    ).toLowerCase();


  const name =
    String(
      file.name ||
      ''
    ).toLowerCase();


  return (
    type.startsWith(
      'video/'
    ) ||
    /\.(mp4|mov|m4v)$/i.test(
      name
    )
  );
}


export function ReadyVideoReplace({
  contentId,
}: {
  contentId:
    string;
}) {
  const router =
    useRouter();


  const inputRef =
    useRef<
      HTMLInputElement |
      null
    >(
      null
    );


  const [
    file,
    setFile,
  ] =
    useState<
      File |
      null
    >(
      null
    );


  const [
    replacing,
    setReplacing,
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


  const [
    success,
    setSuccess,
  ] =
    useState(
      false
    );


  async function prepareUpload(
    video:
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
                'prepare-ready-video',

              fileName:
                video.name,

              contentType:
                video.type ||
                'video/mp4',

              fileSize:
                video.size,
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
        'Não foi possível preparar o envio do vídeo.'
      );
    }


    return result as
      PreparedUpload;
  }


  async function replaceVideo() {
    if (
      !file ||
      replacing
    ) {
      return;
    }


    if (
      !isAcceptedVideo(
        file
      )
    ) {
      setSuccess(
        false
      );

      setMessage(
        'Selecione um vídeo MP4 ou MOV.'
      );

      return;
    }


    if (
      file.size >
      MAX_VIDEO_SIZE
    ) {
      setSuccess(
        false
      );

      setMessage(
        'O vídeo ultrapassa o limite de 500 MB.'
      );

      return;
    }


    setReplacing(
      true
    );

    setSuccess(
      false
    );

    setMessage(
      'Preparando envio...'
    );


    try {
      const prepared =
        await prepareUpload(
          file
        );


      const supabase =
        browserStorageClient();


      setMessage(
        'Enviando vídeo legendado...'
      );


      const {
        error,
      } =
        await supabase
          .storage
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
                'video/mp4',

              cacheControl:
                '3600',
            }
          );


      if (error) {
        throw new Error(
          error.message ||
          'Não foi possível enviar o vídeo.'
        );
      }


      setMessage(
        'Atualizando material final...'
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
                  'replace-ready-video',

                finalPath:
                  prepared.path,

                finalMediaType:
                  file.type ||
                  'video/mp4',
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
          'Não foi possível substituir o vídeo final.'
        );
      }


      setSuccess(
        true
      );

      setMessage(
        'Vídeo legendado salvo. Esta é agora a versão que será publicada.'
      );


      setFile(
        null
      );


      if (
        inputRef.current
      ) {
        inputRef.current.value =
          '';
      }


      router.refresh();
    }
    catch (
      error
    ) {
      console.error(
        error
      );


      setSuccess(
        false
      );

      setMessage(
        error instanceof
          Error
          ? error.message
          : 'Não foi possível substituir o vídeo.'
      );
    }
    finally {
      setReplacing(
        false
      );
    }
  }


  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
          <RefreshCw
            size={17}
          />
        </div>


        <div>
          <p className="text-xs font-black text-violet-950">
            Finalização pela Social Media
          </p>

          <p className="mt-1 text-[11px] leading-5 text-violet-700">
            Baixe o vídeo entregue pelo Filmmaker, adicione as legendas e envie aqui a versão pronta para publicação.
          </p>
        </div>
      </div>


      <div className="mt-4 rounded-xl border border-violet-100 bg-white p-3">
        <input
          ref={
            inputRef
          }
          type="file"
          accept="video/mp4,video/quicktime,.mp4,.mov,.m4v"
          disabled={
            replacing
          }
          onChange={
            (
              event
            ) => {
              const nextFile =
                event.target
                  .files?.[0] ||
                null;


              setFile(
                nextFile
              );

              setSuccess(
                false
              );

              setMessage(
                ''
              );
            }
          }
          className="block w-full text-[11px] font-semibold text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-100 file:px-3 file:py-2 file:text-[10px] file:font-black file:text-violet-700 hover:file:bg-violet-200 disabled:opacity-50"
        />


        {file ? (
          <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
            <p className="truncate text-[10px] font-bold text-slate-700">
              {file.name}
            </p>

            <p className="mt-0.5 text-[9px] text-slate-400">
              {(
                file.size /
                1024 /
                1024
              ).toFixed(
                1
              )}{' '}
              MB
            </p>
          </div>
        ) : null}


        <button
          type="button"
          disabled={
            !file ||
            replacing
          }
          onClick={
            replaceVideo
          }
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {replacing ? (
            <Loader2
              size={15}
              className="animate-spin"
            />
          ) : (
            <UploadCloud
              size={15}
            />
          )}

          {replacing
            ? 'Enviando nova versão...'
            : 'Substituir vídeo final'}
        </button>


        {message ? (
          <p
            className={
              success
                ? 'mt-3 text-[10px] font-bold leading-4 text-emerald-600'
                : 'mt-3 text-[10px] font-bold leading-4 text-slate-500'
            }
          >
            {message}
          </p>
        ) : null}
      </div>


      <p className="mt-3 text-[9px] font-semibold leading-4 text-violet-500">
        A substituição não devolve o conteúdo para o Filmmaker. Ele continua em Pronto para Postar.
      </p>
    </div>
  );
}

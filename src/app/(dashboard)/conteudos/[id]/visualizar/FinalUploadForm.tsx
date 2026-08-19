'use client';

import {
  useRouter,
} from 'next/navigation';

import {
  useState,
} from 'react';

import {
  UploadCloud,
} from 'lucide-react';

import {
  createClient,
} from '@supabase/supabase-js';


type PreparedUpload = {
  ok: boolean;

  bucket: string;

  path: string;

  token: string;

  message?: string;
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
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}


export default function FinalUploadForm({
  contentId,
}: {
  contentId: string;
}) {
  const router =
    useRouter();


  const [
    isUploading,
    setIsUploading,
  ] =
    useState(false);


  const [
    message,
    setMessage,
  ] =
    useState('');


  async function prepareUpload(
    file: File,
    kind: 'final' | 'cover'
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
    kind: 'final' | 'cover'
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


    const finalValue =
      formData.get(
        'finalFile'
      );


    const coverValue =
      formData.get(
        'coverFile'
      );


    const finalFile =
      finalValue instanceof File &&
      finalValue.size > 0
        ? finalValue
        : null;


    const coverFile =
      coverValue instanceof File &&
      coverValue.size > 0
        ? coverValue
        : null;


    if (
      !finalFile &&
      !coverFile
    ) {
      setMessage(
        'Envie pelo menos um arquivo.'
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


      if (finalFile) {
        setMessage(
          'Enviando material final... Não feche esta página.'
        );


        finalPath =
          await uploadSignedFile(
            finalFile,
            'final'
          );
      }


      if (coverFile) {
        setMessage(
          'Enviando capa... Não feche esta página.'
        );


        coverPath =
          await uploadSignedFile(
            coverFile,
            'cover'
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

                finalMediaType:
                  finalFile?.type ||
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
        'Material enviado para conferência interna com sucesso.'
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

      {message && (
        <div className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-blue-700">
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={
          isUploading
        }
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <UploadCloud
          size={
            18
          }
        />

        {isUploading
          ? 'Enviando material...'
          : 'Enviar para conferência'}
      </button>
    </form>
  );
}
'use client';

import {
  useState,
} from 'react';

import {
  useRouter,
} from 'next/navigation';


export function InstagramPublishButton({
  contentId,
  enabled,
  disabledReason,
}: {
  contentId:
    string;

  enabled:
    boolean;

  disabledReason?:
    string;
}) {

  const router =
    useRouter();


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
    useState<
      string | null
    >(
      null
    );


  const [
    success,
    setSuccess,
  ] =
    useState(
      false
    );


  async function publish() {

    if (
      !enabled ||
      loading
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        'Publicar este conteúdo agora no Instagram? Esta ação criará uma publicação real.'
      );


    if (
      !confirmed
    ) {
      return;
    }


    setLoading(
      true
    );

    setMessage(
      null
    );

    setSuccess(
      false
    );


    try {

      const response =
        await fetch(
          `/api/integrations/instagram/publish/${contentId}`,
          {
            method:
              'POST',
          }
        );


      const payload =
        await response.json();


      if (
        !response.ok ||
        !payload?.ok
      ) {

        throw new Error(
          payload?.message ||
          'Não foi possível publicar.'
        );

      }


      setSuccess(
        true
      );

      setMessage(
        'Publicado com sucesso.'
      );


      setTimeout(
        () => {
          router.refresh();
        },
        900
      );

    }
    catch (
      error
    ) {

      setSuccess(
        false
      );

      setMessage(
        error instanceof Error
          ? error.message
          : 'Erro ao publicar.'
      );

    }
    finally {

      setLoading(
        false
      );

    }

  }


  return (
    <div>

      <button
        type="button"
        disabled={
          !enabled ||
          loading
        }
        title={
          enabled
            ? 'Publicar agora no Instagram'
            : disabledReason ||
              'Publicação indisponível'
        }
        onClick={
          publish
        }
        className={
          enabled
            ? 'w-full rounded-lg bg-slate-950 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60'
            : 'w-full cursor-not-allowed rounded-lg bg-slate-300 px-3 py-2.5 text-xs font-bold text-slate-500'
        }
      >

        {
          loading
            ? 'Publicando...'
            : 'Publicar agora'
        }

      </button>


      {
        message
          ? (
              <p
                className={
                  success
                    ? 'mt-2 text-[10px] font-bold text-emerald-700'
                    : 'mt-2 text-[10px] font-bold text-red-600'
                }
              >
                {message}
              </p>
            )
          : null
      }

    </div>
  );
}

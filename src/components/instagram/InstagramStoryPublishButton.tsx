'use client';

import {
  useState,
} from 'react';

import {
  useRouter,
} from 'next/navigation';


export function InstagramStoryPublishButton({
  contentId,
  enabled,
  disabledReason,
  scheduled = false,
}: {
  contentId: string;
  enabled: boolean;
  disabledReason?: string;
  scheduled?: boolean;
}) {
  const router =
    useRouter();

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const available =
    enabled &&
    !scheduled;

  async function publish() {
    if (!available || loading) {
      return;
    }

    if (
      !window.confirm(
        'Publicar este material agora nos Stories do Instagram?'
      )
    ) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response =
        await fetch(
          `/api/integrations/instagram/story/publish/${contentId}`,
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
          'Nao foi possivel publicar o Story.'
        );
      }

      setMessage(
        'Story publicado com sucesso.'
      );

      setTimeout(
        () => router.refresh(),
        700
      );
    }
    catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Erro ao publicar Story.'
      );
    }
    finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={!available || loading}
        onClick={publish}
        title={
          scheduled
            ? 'Cancele o agendamento para publicar agora.'
            : available
              ? 'Publicar agora nos Stories'
              : disabledReason || 'Story indisponivel'
        }
        className={
          available
            ? 'w-full rounded-lg bg-fuchsia-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-fuchsia-700 disabled:opacity-60'
            : 'w-full cursor-not-allowed rounded-lg bg-slate-300 px-3 py-2.5 text-xs font-bold text-slate-500'
        }
      >
        {
          scheduled
            ? 'Story agendado'
            : loading
              ? 'Publicando...'
              : 'Publicar Story agora'
        }
      </button>

      {
        message
          ? (
            <p className="mt-2 text-[10px] font-bold text-slate-600">
              {message}
            </p>
          )
          : null
      }
    </div>
  );
}

'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useRouter,
} from 'next/navigation';


function toLocal(value: string | null) {
  if (!value) {
    return '';
  }

  const date =
    new Date(value);

  const offset =
    date.getTimezoneOffset();

  return new Date(
    date.getTime() -
      offset * 60 * 1000
  )
    .toISOString()
    .slice(0, 16);
}


function pretty(value: string) {
  return new Date(value)
    .toLocaleString(
      'pt-BR',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }
    );
}


export function InstagramStoryScheduleControl({
  contentId,
  enabled,
  disabledReason,
  scheduledFor,
  publicationStatus,
}: {
  contentId: string;
  enabled: boolean;
  disabledReason?: string;
  scheduledFor: string | null;
  publicationStatus: string;
}) {
  const router =
    useRouter();

  const [value, setValue] =
    useState(
      () =>
        toLocal(scheduledFor)
    );

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  useEffect(
    () => {
      setValue(
        toLocal(scheduledFor)
      );
    },
    [scheduledFor]
  );

  const scheduled =
    publicationStatus ===
      'AGENDADO' &&
    Boolean(scheduledFor);

  const minimum =
    useMemo(
      () => {
        const date =
          new Date(
            Date.now() +
              60000
          );

        const offset =
          date.getTimezoneOffset();

        return new Date(
          date.getTime() -
            offset * 60 * 1000
        )
          .toISOString()
          .slice(0, 16);
      },
      []
    );

  async function schedule() {
    if (
      !enabled ||
      !value ||
      loading
    ) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        throw new Error(
          'Escolha data e horario validos.'
        );
      }

      const response =
        await fetch(
          `/api/integrations/instagram/story/schedule/${contentId}`,
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                scheduledFor:
                  date.toISOString(),
              }),
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
          'Nao foi possivel agendar o Story.'
        );
      }

      setMessage(
        'Story agendado.'
      );

      router.refresh();
    }
    catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Erro ao agendar Story.'
      );
    }
    finally {
      setLoading(false);
    }
  }

  async function cancel() {
    if (
      !window.confirm(
        'Cancelar o agendamento deste Story?'
      )
    ) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response =
        await fetch(
          `/api/integrations/instagram/story/schedule/${contentId}`,
          {
            method:
              'DELETE',
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
          'Nao foi possivel cancelar.'
        );
      }

      setValue('');
      setMessage(
        'Agendamento cancelado.'
      );

      router.refresh();
    }
    catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Erro ao cancelar.'
      );
    }
    finally {
      setLoading(false);
    }
  }

  if (
    scheduled &&
    scheduledFor
  ) {
    return (
      <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50 p-3">
        <p className="text-[10px] font-black uppercase tracking-wider text-fuchsia-500">
          Story agendado
        </p>

        <p className="mt-1 text-sm font-black text-fuchsia-900">
          {pretty(scheduledFor)}
        </p>

        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          <input
            type="datetime-local"
            value={value}
            min={minimum}
            disabled={loading}
            onChange={
              (event) =>
                setValue(
                  event.target.value
                )
            }
            className="min-w-0 rounded-lg border border-fuchsia-200 bg-white px-2 py-2 text-xs font-bold text-slate-700"
          />

          <button
            type="button"
            disabled={loading || !value}
            onClick={schedule}
            className="rounded-lg bg-fuchsia-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            Reagendar
          </button>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={cancel}
          className="mt-2 w-full rounded-lg border border-red-100 bg-white px-3 py-2 text-[10px] font-bold text-red-600"
        >
          Cancelar agendamento
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

  return (
    <div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input
          type="datetime-local"
          value={value}
          min={minimum}
          disabled={!enabled || loading}
          onChange={
            (event) =>
              setValue(
                event.target.value
              )
          }
          title={
            enabled
              ? 'Data e hora do Story'
              : disabledReason || 'Agendamento indisponivel'
          }
          className={
            enabled
              ? 'min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-bold text-slate-700'
              : 'min-w-0 cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-2 py-2 text-xs text-slate-400'
          }
        />

        <button
          type="button"
          disabled={
            !enabled ||
            !value ||
            loading
          }
          onClick={schedule}
          className={
            enabled
              ? 'rounded-lg bg-fuchsia-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50'
              : 'cursor-not-allowed rounded-lg bg-slate-300 px-3 py-2 text-xs font-bold text-slate-500'
          }
        >
          {
            loading
              ? 'Agendando...'
              : 'Agendar'
          }
        </button>
      </div>

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

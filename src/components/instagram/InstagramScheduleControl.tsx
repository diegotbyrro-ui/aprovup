'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  CalendarClock,
  X,
} from 'lucide-react';

import {
  useRouter,
} from 'next/navigation';


function toLocalInputValue(
  value:
    string | null
) {

  if (
    !value
  ) {
    return '';
  }


  const date =
    new Date(
      value
    );


  const offset =
    date.getTimezoneOffset();


  return new Date(
    date.getTime() -
    offset * 60 * 1000
  )
    .toISOString()
    .slice(
      0,
      16
    );

}


function formatScheduledDate(
  value:
    string
) {

  return new Date(
    value
  ).toLocaleString(
    'pt-BR',
    {
      day:
        '2-digit',

      month:
        '2-digit',

      year:
        'numeric',

      hour:
        '2-digit',

      minute:
        '2-digit',
    }
  );

}


export function InstagramScheduleControl({
  contentId,
  enabled,
  disabledReason,
  scheduledFor,
  publicationStatus,
}: {
  contentId:
    string;

  enabled:
    boolean;

  disabledReason?:
    string;

  scheduledFor:
    string | null;

  publicationStatus:
    string;
}) {

  const router =
    useRouter();


  const [
    value,
    setValue,
  ] =
    useState(
      () =>
        toLocalInputValue(
          scheduledFor
        )
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
    useState<
      string | null
    >(
      null
    );


  useEffect(
    () => {

      setValue(
        toLocalInputValue(
          scheduledFor
        )
      );

    },
    [
      scheduledFor,
    ]
  );


  const scheduled =
    publicationStatus ===
      'AGENDADO' &&
    Boolean(
      scheduledFor
    );


  const minimum =
    useMemo(
      () => {

        const date =
          new Date(
            Date.now() +
              60 * 1000
          );


        const offset =
          date.getTimezoneOffset();


        return new Date(
          date.getTime() -
          offset *
            60 *
            1000
        )
          .toISOString()
          .slice(
            0,
            16
          );

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


    const date =
      new Date(
        value
      );


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      setMessage(
        'Escolha uma data e horário.'
      );

      return;

    }


    setLoading(
      true
    );

    setMessage(
      null
    );


    try {

      const response =
        await fetch(
          `/api/integrations/instagram/schedule/${contentId}`,
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
          'Não foi possível agendar.'
        );

      }


      setMessage(
        'Publicação agendada.'
      );


      router.refresh();

    }
    catch (
      error
    ) {

      setMessage(
        error instanceof Error
          ? error.message
          : 'Erro ao agendar.'
      );

    }
    finally {

      setLoading(
        false
      );

    }

  }


  async function cancel() {

    if (
      !window.confirm(
        'Cancelar este agendamento?'
      )
    ) {
      return;
    }


    setLoading(
      true
    );

    setMessage(
      null
    );


    try {

      const response =
        await fetch(
          `/api/integrations/instagram/schedule/${contentId}`,
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
          'Não foi possível cancelar.'
        );

      }


      setValue(
        ''
      );


      setMessage(
        'Agendamento cancelado.'
      );


      router.refresh();

    }
    catch (
      error
    ) {

      setMessage(
        error instanceof Error
          ? error.message
          : 'Erro ao cancelar.'
      );

    }
    finally {

      setLoading(
        false
      );

    }

  }


  if (
    scheduled &&
    scheduledFor
  ) {

    return (
      <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">

        <div className="flex items-start gap-2">

          <CalendarClock
            size={
              16
            }
            className="mt-0.5 shrink-0 text-violet-600"
          />


          <div className="min-w-0 flex-1">

            <p className="text-[10px] font-black uppercase tracking-wider text-violet-500">
              Publicação agendada
            </p>

            <p className="mt-1 text-sm font-black text-violet-900">
              {formatScheduledDate(
                scheduledFor
              )}
            </p>

            <p className="mt-1 text-[10px] text-violet-600">
              O AprovUp publicará automaticamente quando chegar o horário.
            </p>

          </div>

        </div>


        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">

          <input
            type="datetime-local"
            value={
              value
            }
            min={
              minimum
            }
            disabled={
              loading
            }
            onChange={
              (
                event
              ) =>
                setValue(
                  event.target.value
                )
            }
            className="min-w-0 rounded-lg border border-violet-200 bg-white px-2 py-2 text-xs font-bold text-slate-700 outline-none focus:border-violet-500"
          />


          <button
            type="button"
            disabled={
              loading ||
              !value
            }
            onClick={
              schedule
            }
            className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            Reagendar
          </button>

        </div>


        <button
          type="button"
          disabled={
            loading
          }
          onClick={
            cancel
          }
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-100 bg-white px-3 py-2 text-[10px] font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          <X
            size={
              13
            }
          />

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
          value={
            value
          }
          min={
            minimum
          }
          disabled={
            !enabled ||
            loading
          }
          onChange={
            (
              event
            ) =>
              setValue(
                event.target.value
              )
          }
          title={
            enabled
              ? 'Data e hora da publicação'
              : disabledReason ||
                'Agendamento indisponível'
          }
          className={
            enabled
              ? 'min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-bold text-slate-700 outline-none focus:border-violet-500'
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
          onClick={
            schedule
          }
          title={
            enabled
              ? 'Agendar publicação'
              : disabledReason ||
                'Agendamento indisponível'
          }
          className={
            enabled
              ? 'rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50'
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

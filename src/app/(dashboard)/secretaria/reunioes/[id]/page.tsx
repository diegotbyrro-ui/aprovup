import Link from 'next/link';

import {
  notFound,
} from 'next/navigation';

import {
  prisma,
} from '@/lib/prisma';

import {
  requirePermission,
} from '@/lib/userAccess';

import {
  syncSecretaryMeetingAction,
} from '../actions';


export const dynamic =
  'force-dynamic';


function toStringArray(
  value:
    unknown
) {

  return Array.isArray(
    value
  )
    ? value.filter(
        (
          item
        ): item is string =>
          typeof item ===
          'string'
      )
    : [];
}


function formatDate(
  value:
    Date |
    null
) {

  if (!value) {
    return '-';
  }


  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      timeZone:
        'America/Maceio',

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
  ).format(
    value
  );
}


export default async function MeetingDetailPage({
  params,
}: {
  params:
    Promise<{
      id:
        string;
    }>;
}) {

  const user =
    await requirePermission(
      'settings.manage'
    );


  const {
    id,
  } =
    await params;


  const meeting =
    await prisma
      .secretaryMeeting
      .findFirst({
        where: {
          id,

          agencyId:
            user.agencyId,
        },

        include: {
          client: {
            select: {
              name:
                true,
            },
          },

          transcriptEntries: {
            orderBy: [
              {
                startTime:
                  'asc',
              },

              {
                createdAt:
                  'asc',
              },
            ],
          },

          actions: {
            orderBy: {
              createdAt:
                'asc',
            },
          },
        },
      });


  if (
    !meeting
  ) {

    notFound();
  }


  const syncAction =
    syncSecretaryMeetingAction
      .bind(
        null,
        meeting.id
      );


  const decisions =
    toStringArray(
      meeting.decisions
    );


  const pendingItems =
    toStringArray(
      meeting.pendingItems
    );


  const ideas =
    toStringArray(
      meeting.ideas
    );


  return (
    <main className="space-y-6">

      <section className="rounded-3xl bg-slate-950 p-7 text-white">

        <Link
          href="/secretaria/reunioes"
          className="text-sm font-bold text-blue-300 hover:underline"
        >
          ← Voltar para reuniões
        </Link>


        <h1 className="mt-4 text-3xl font-black">
          {meeting.title}
        </h1>


        <p className="mt-2 text-sm text-slate-300">
          {
            formatDate(
              meeting.scheduledStart
            )
          }
          {
            meeting.client
              ?.name
              ? ' · ' +
                meeting
                  .client
                  .name
              : ''
          }
        </p>


        <div className="mt-5 flex flex-wrap gap-2">

          {
            meeting.googleMeetUri
              ? (
                <a
                  href={
                    meeting.googleMeetUri
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white"
                >
                  Entrar no Google Meet
                </a>
              )
              : null
          }


          <form
            action={
              syncAction
            }
          >
            <button
              type="submit"
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-black text-white hover:bg-white/15"
            >
              Sincronizar transcrição + processar com Liv
            </button>
          </form>

        </div>


        {
          meeting.processingError
            ? (
              <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-xs font-bold text-amber-100">
                {meeting.processingError}
              </div>
            )
            : null
        }

      </section>


      <section className="grid gap-4 xl:grid-cols-2">

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <p className="text-xs font-black uppercase tracking-wider text-blue-600">
            Resumo da Liv
          </p>


          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {
              meeting.summary ||
              'A Liv ainda não processou esta reunião.'
            }
          </p>

        </div>


        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <p className="text-xs font-black uppercase tracking-wider text-emerald-600">
            Plano de ação
          </p>


          <div className="mt-4 space-y-3">

            {
              meeting.actions.length
                ? meeting.actions.map(
                    (
                      action
                    ) => (
                      <div
                        key={
                          action.id
                        }
                        className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                      >

                        <div className="flex flex-wrap items-center gap-2">

                          <p className="font-black text-slate-900">
                            {action.title}
                          </p>


                          <span className="rounded-full bg-white px-2 py-1 text-[9px] font-black text-slate-500">
                            {action.type}
                          </span>

                        </div>


                        {
                          action.description
                            ? (
                              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                                {action.description}
                              </p>
                            )
                            : null
                        }


                        <p className="mt-2 text-[11px] font-bold text-slate-500">
                          Responsável: {
                            action.responsible ||
                            'Não definido'
                          }
                          {
                            action.dueDateText
                              ? ' · Prazo: ' +
                                action.dueDateText
                              : ''
                          }
                        </p>

                      </div>
                    )
                  )
                : (
                  <p className="text-sm text-slate-500">
                    Nenhuma ação identificada ainda.
                  </p>
                )
            }

          </div>

        </div>

      </section>


      <section className="grid gap-4 lg:grid-cols-3">

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

          <h2 className="font-black text-slate-900">
            Decisões
          </h2>


          <div className="mt-3 space-y-2">

            {
              decisions.length
                ? decisions.map(
                    (
                      item,
                      index
                    ) => (
                      <p
                        key={
                          index
                        }
                        className="rounded-xl bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-900"
                      >
                        {item}
                      </p>
                    )
                  )
                : (
                  <p className="text-xs text-slate-400">
                    Nenhuma decisão registrada.
                  </p>
                )
            }

          </div>

        </div>


        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

          <h2 className="font-black text-slate-900">
            Pendências
          </h2>


          <div className="mt-3 space-y-2">

            {
              pendingItems.length
                ? pendingItems.map(
                    (
                      item,
                      index
                    ) => (
                      <p
                        key={
                          index
                        }
                        className="rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900"
                      >
                        {item}
                      </p>
                    )
                  )
                : (
                  <p className="text-xs text-slate-400">
                    Nenhuma pendência registrada.
                  </p>
                )
            }

          </div>

        </div>


        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

          <h2 className="font-black text-slate-900">
            Ideias levantadas
          </h2>


          <div className="mt-3 space-y-2">

            {
              ideas.length
                ? ideas.map(
                    (
                      item,
                      index
                    ) => (
                      <p
                        key={
                          index
                        }
                        className="rounded-xl bg-blue-50 p-3 text-xs leading-relaxed text-blue-900"
                      >
                        {item}
                      </p>
                    )
                  )
                : (
                  <p className="text-xs text-slate-400">
                    Nenhuma ideia registrada.
                  </p>
                )
            }

          </div>

        </div>

      </section>


      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-100 p-5">

          <h2 className="font-black text-slate-950">
            Transcrição
          </h2>


          <p className="mt-1 text-xs text-slate-500">
            {
              meeting
                .transcriptEntries
                .length
            } entradas recuperadas do Google Meet.
          </p>

        </div>


        <div className="max-h-[700px] divide-y divide-slate-100 overflow-y-auto">

          {
            meeting
              .transcriptEntries
              .length
                ? meeting
                    .transcriptEntries
                    .map(
                      (
                        entry
                      ) => (
                        <div
                          key={
                            entry.id
                          }
                          className="p-4"
                        >

                          <div className="flex flex-wrap items-center justify-between gap-2">

                            <p className="text-xs font-black text-slate-900">
                              {
                                entry.speakerName ||
                                'Participante'
                              }
                            </p>


                            <p className="text-[10px] text-slate-400">
                              {
                                formatDate(
                                  entry.startTime
                                )
                              }
                            </p>

                          </div>


                          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                            {entry.text}
                          </p>

                        </div>
                      )
                    )
                : (
                  <div className="p-8 text-center text-sm text-slate-400">
                    A transcrição aparecerá aqui depois da reunião.
                  </div>
                )
          }

        </div>

      </section>

    </main>
  );
}

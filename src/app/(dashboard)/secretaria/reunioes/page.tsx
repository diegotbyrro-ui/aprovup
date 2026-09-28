import Link from 'next/link';

import {
  FileText,
  Link2,
  Video,
  Zap,
} from 'lucide-react';

import {
  prisma,
} from '@/lib/prisma';

import {
  hasPermission,
  requirePermission,
} from '@/lib/userAccess';

import {
  createSecretaryMeetingAction,
  deleteSecretaryMeetingAction,
} from './actions';

import {
  CopyMeetingLinkButton,
} from './CopyMeetingLinkButton';

import {
  ConfirmDeleteMeetingButton,
} from './ConfirmDeleteMeetingButton';


export const dynamic =
  'force-dynamic';


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


function statusLabel(
  status:
    string
) {

  const labels:
    Record<
      string,
      string
    > = {
      READY:
        'Link criado',

      SCHEDULED:
        'Agendada',

      WAITING_TRANSCRIPT:
        'Aguardando transcrição',

      TRANSCRIBED:
        'Transcrita',

      PROCESSED:
        'Processada pela Liv',
    };


  return labels[
    status
  ] ||
  status;
}


export default async function MeetingsPage({
  searchParams,
}: {
  searchParams?:
    Promise<{
      created?:
        string;

      error?:
        string;

      detail?:
        string;
    }>;
}) {

  const user =
    await requirePermission(
      'secretary.use'
    );


  const canManageSecretary =
    hasPermission(
      user,
      'settings.manage'
    );


  const params =
    searchParams
      ? await searchParams
      : {};


  const createdId =
    String(
      params.created ||
      ''
    );


  const [
    meetings,
    google,
    createdMeeting,
  ] =
    await Promise.all([

      prisma
        .secretaryMeeting
        .findMany({
          where: {
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

            _count: {
              select: {
                transcriptEntries:
                  true,

                actions:
                  true,
              },
            },
          },

          orderBy: {
            createdAt:
              'desc',
          },

          take:
            100,
        }),


      prisma
        .googleCalendarConnection
        .findUnique({
          where: {
            agencyId:
              user.agencyId,
          },

          select: {
            googleAccountEmail:
              true,

            connectedAt:
              true,
          },
        }),


      createdId
        ? prisma
            .secretaryMeeting
            .findFirst({
              where: {
                id:
                  createdId,

                agencyId:
                  user.agencyId,
              },

              select: {
                id:
                  true,

                title:
                  true,

                googleMeetUri:
                  true,

                notes:
                  true,
              },
            })
        : Promise.resolve(
            null
          ),
    ]);


  const errorMessage =
    params.error ===
      'invalid'
      ? 'Digite um título para criar a reunião.'
      : params.error ===
          'meet'
        ? (
            'O Google Meet não conseguiu criar o link.' +
            (
              params.detail
                ? ' Detalhe do Google: ' +
                  String(
                    params.detail
                  )
                : ' Confira a autorização da conta Google.'
            )
          )
        : '';


  return (
    <main className="space-y-6">

      <section className="rounded-3xl bg-slate-950 p-7 text-white shadow-sm">

        {
          canManageSecretary
            ? (
              <Link
                href="/secretaria"
                className="text-sm font-bold text-blue-300 hover:underline"
              >
                ← Voltar para Secretária IA
              </Link>
            )
            : null
        }


        <div className="mt-5 flex flex-wrap items-start justify-between gap-5">

          <div>

            <div className="flex items-center gap-2 text-blue-300">
              <Video
                size={17}
              />

              <span className="text-xs font-black uppercase tracking-[0.16em]">
                Liv em reuniões
              </span>
            </div>


            <h1 className="mt-2 text-3xl font-black">
              Reuniões
            </h1>


            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
              Crie um Google Meet na hora, envie o link para o cliente e depois deixe a Liv organizar a transcrição, as decisões e os próximos passos.
            </p>

          </div>


          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs">

            <p className="font-black text-white">
              Google conectado
            </p>

            <p className="mt-1 text-slate-300">
              {
                google
                  ?.connectedAt
                  ? (
                      canManageSecretary
                        ? google.googleAccountEmail ||
                          'Conta da agência'
                        : 'Conta da agência conectada'
                    )
                  : 'Reconexão necessária'
              }
            </p>

          </div>

        </div>

      </section>


      {
        errorMessage
          ? (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              {errorMessage}
            </section>
          )
          : null
      }


      {
        createdMeeting
          ?.googleMeetUri
          ? (
            <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">

              <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                Reunião criada
              </p>


              <h2 className="mt-2 text-xl font-black text-emerald-950">
                {createdMeeting.title}
              </h2>


              {
                createdMeeting.notes
                  ? (
                    <div
                      className={
                        createdMeeting
                          .notes
                          .includes(
                            'não oferece'
                          )
                            ? 'mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-relaxed text-amber-800'
                            : 'mt-4 rounded-2xl border border-emerald-200 bg-white/70 p-4 text-sm font-semibold leading-relaxed text-emerald-800'
                      }
                    >
                      {createdMeeting.notes}
                    </div>
                  )
                  : null
              }


              <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">

                <div className="min-w-0">

                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Link para enviar ao cliente
                  </p>

                  <p className="mt-1 truncate font-mono text-sm font-bold text-slate-800">
                    {createdMeeting.googleMeetUri}
                  </p>

                </div>


                <div className="flex shrink-0 flex-wrap gap-2">

                  <CopyMeetingLinkButton
                    url={
                      createdMeeting.googleMeetUri
                    }
                  />


                  <a
                    href={
                      createdMeeting.googleMeetUri
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700"
                  >
                    <Video
                      size={14}
                    />

                    Entrar agora
                  </a>

                </div>

              </div>

            </section>
          )
          : null
      }


      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="flex items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Zap
              size={19}
            />
          </div>


          <div>

            <h2 className="text-lg font-black text-slate-950">
              Criar reunião agora
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Dê um nome para identificar a reunião no AprovUp. O link do Google Meet será criado imediatamente.
            </p>

          </div>

        </div>


        <form
          action={
            createSecretaryMeetingAction
          }
          className="mt-5 flex flex-col gap-3 sm:flex-row"
        >

          <label className="min-w-0 flex-1">

            <span className="sr-only">
              Título da reunião
            </span>

            <input
              name="title"
              required
              autoFocus
              placeholder="Ex.: Reunião Rocha - Planejamento de Outubro"
              className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            />

          </label>


          <button
            type="submit"
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-black text-white hover:bg-blue-700"
          >
            <Video
              size={16}
            />

            Criar Google Meet
          </button>

        </form>

      </section>


      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-100 p-5">

          <h2 className="font-black text-slate-950">
            Histórico de reuniões
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Os links ficam salvos para a Liv relacionar a transcrição e o resumo depois.
          </p>

        </div>


        {
          meetings.length ===
          0
            ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Nenhuma reunião registrada ainda.
              </div>
            )
            : (
              <div className="divide-y divide-slate-100">

                {
                  meetings.map(
                    (
                      meeting
                    ) => (
                      <div
                        key={
                          meeting.id
                        }
                        className="flex flex-col gap-4 p-5 xl:flex-row xl:items-center xl:justify-between"
                      >

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-2">

                            <h3 className="font-black text-slate-900">
                              {meeting.title}
                            </h3>


                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">
                              {
                                statusLabel(
                                  meeting.status
                                )
                              }
                            </span>

                          </div>


                          <p className="mt-2 text-xs text-slate-500">
                            Criada em {
                              formatDate(
                                meeting.createdAt
                              )
                            }
                          </p>


                          <p className="mt-2 text-[11px] text-slate-400">
                            {
                              meeting
                                ._count
                                .transcriptEntries
                            } falas · {
                              meeting
                                ._count
                                .actions
                            } ações identificadas
                          </p>

                        </div>


                        <div className="flex flex-wrap gap-2">

                          {
                            meeting.googleMeetUri
                              ? (
                                <>
                                  <CopyMeetingLinkButton
                                    url={
                                      meeting.googleMeetUri
                                    }
                                  />


                                  <a
                                    href={
                                      meeting.googleMeetUri
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                                  >
                                    <Video
                                      size={14}
                                    />

                                    Entrar
                                  </a>
                                </>
                              )
                              : null
                          }


                          <Link
                            href={
                              '/secretaria/reunioes/' +
                              meeting.id
                            }
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800"
                          >
                            <FileText
                              size={14}
                            />

                            Abrir
                          </Link>


                          {
                            canManageSecretary
                              ? (
                                <form
                                  action={
                                    deleteSecretaryMeetingAction.bind(
                                      null,
                                      meeting.id
                                    )
                                  }
                                >
                                  <ConfirmDeleteMeetingButton
                                    title={
                                      meeting.title
                                    }
                                  />
                                </form>
                              )
                              : null
                          }

                        </div>

                      </div>
                    )
                  )
                }

              </div>
            )
        }

      </section>

    </main>
  );
}

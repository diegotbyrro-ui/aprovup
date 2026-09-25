import Link from 'next/link';

import {
  CalendarPlus,
  ExternalLink,
  FileText,
  Video,
} from 'lucide-react';

import {
  prisma,
} from '@/lib/prisma';

import {
  requirePermission,
} from '@/lib/userAccess';

import {
  createSecretaryMeetingAction,
} from './actions';


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


export default async function MeetingsPage() {

  const user =
    await requirePermission(
      'settings.manage'
    );


  const [
    meetings,
    clients,
    google,
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

          orderBy: [
            {
              scheduledStart:
                'desc',
            },

            {
              createdAt:
                'desc',
            },
          ],

          take:
            100,
        }),


      prisma.client
        .findMany({
          where: {
            agencyId:
              user.agencyId,
          },

          select: {
            id:
              true,

            name:
              true,
          },

          orderBy: {
            name:
              'asc',
          },
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
    ]);


  return (
    <main className="space-y-6">

      <section className="rounded-3xl bg-slate-950 p-7 text-white shadow-sm">

        <Link
          href="/secretaria"
          className="text-sm font-bold text-blue-300 hover:underline"
        >
          ← Voltar para Secretária IA
        </Link>


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
              Crie reuniões com Google Meet e deixe a Liv transformar a transcrição em resumo, decisões, pendências e plano de ação.
            </p>

          </div>


          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs">

            <p className="font-black text-white">
              Google conectado
            </p>

            <p className="mt-1 text-slate-300">
              {
                google
                  ?.googleAccountEmail ||
                'Reconexão necessária'
              }
            </p>

          </div>

        </div>

      </section>


      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="flex items-center gap-2">

          <CalendarPlus
            size={18}
            className="text-blue-600"
          />


          <h2 className="text-lg font-black text-slate-950">
            Nova reunião com Google Meet
          </h2>

        </div>


        <p className="mt-1 text-xs text-slate-500">
          O AprovUp cria o evento, gera o link do Meet e envia os convites por e-mail.
        </p>


        <form
          action={
            createSecretaryMeetingAction
          }
          className="mt-5 grid gap-4 lg:grid-cols-2"
        >

          <label className="space-y-1 lg:col-span-2">

            <span className="text-xs font-black text-slate-700">
              Título
            </span>

            <input
              name="title"
              required
              placeholder="Ex.: Planejamento de Outubro - Rocha"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
            />

          </label>


          <label className="space-y-1">

            <span className="text-xs font-black text-slate-700">
              Cliente
            </span>

            <select
              name="clientId"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
              defaultValue=""
            >

              <option value="">
                Reunião interna / sem cliente
              </option>


              {
                clients.map(
                  (
                    client
                  ) => (
                    <option
                      key={
                        client.id
                      }
                      value={
                        client.id
                      }
                    >
                      {client.name}
                    </option>
                  )
                )
              }

            </select>

          </label>


          <label className="space-y-1">

            <span className="text-xs font-black text-slate-700">
              Convidados por e-mail
            </span>

            <input
              name="attendees"
              placeholder="yuri@empresa.com, raysa@empresa.com"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
            />

          </label>


          <label className="space-y-1">

            <span className="text-xs font-black text-slate-700">
              Início
            </span>

            <input
              type="datetime-local"
              name="start"
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
            />

          </label>


          <label className="space-y-1">

            <span className="text-xs font-black text-slate-700">
              Término
            </span>

            <input
              type="datetime-local"
              name="end"
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
            />

          </label>


          <label className="space-y-1 lg:col-span-2">

            <span className="text-xs font-black text-slate-700">
              Observações / materiais / pauta
            </span>

            <textarea
              name="notes"
              rows={4}
              placeholder="Ex.: levar drone, lapela e câmera. Pauta: campanha de outubro."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
            />

          </label>


          <div className="lg:col-span-2">

            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700"
            >
              Criar reunião + Google Meet
            </button>

          </div>

        </form>

      </section>


      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-100 p-5">

          <h2 className="font-black text-slate-950">
            Histórico de reuniões
          </h2>

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

                        <div>

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
                                <a
                                  href={
                                    meeting
                                      .googleMeetUri
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                                >
                                  <Video
                                    size={14}
                                  />

                                  Entrar no Meet
                                </a>
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
                            meeting.calendarHtmlLink
                              ? (
                                <a
                                  href={
                                    meeting
                                      .calendarHtmlLink
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Abrir no Google Agenda"
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                                >
                                  <ExternalLink
                                    size={14}
                                  />
                                </a>
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

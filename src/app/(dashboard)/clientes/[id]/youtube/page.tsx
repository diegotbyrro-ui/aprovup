import Link from 'next/link';

import type {
  ReactNode,
} from 'react';

import {
  notFound,
} from 'next/navigation';

import {
  BarChart3,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Users,
  Clock3,
  Play,
  Globe2,
} from 'lucide-react';

import {
  prisma,
} from '@/lib/prisma';

import {
  requirePermission,
} from '@/lib/userAccess';

import {
  canAccessClient,
} from '@/lib/clientAccess';

import {
  getYoutubeDashboard,
} from '@/lib/youtube';


function numberLabel(
  value:
    number
) {

  return new Intl.NumberFormat(
    'pt-BR'
  ).format(
    value
  );
}


function compactLabel(
  value:
    number
) {

  return new Intl.NumberFormat(
    'pt-BR',
    {
      notation:
        'compact',

      maximumFractionDigits:
        1,
    }
  ).format(
    value
  );
}


function minutesLabel(
  value:
    number
) {

  if (
    value < 60
  ) {

    return (
      numberLabel(
        Math.round(
          value
        )
      ) +
      ' min'
    );
  }


  return (
    (
      value /
      60
    ).toLocaleString(
      'pt-BR',
      {
        maximumFractionDigits:
          1,
      }
    ) +
    ' h'
  );
}


function dateLabel(
  value:
    string
) {

  const parts =
    value.split(
      '-'
    );


  if (
    parts.length !==
    3
  ) {

    return value;
  }


  return (
    parts[2] +
    '/' +
    parts[1] +
    '/' +
    parts[0]
  );
}


function countryLabel(
  value:
    string
) {

  try {

    const names =
      new Intl.DisplayNames(
        [
          'pt-BR',
        ],
        {
          type:
            'region',
        }
      );


    return (
      names.of(
        value
      ) ||
      value
    );

  }
  catch {

    return value;
  }
}


function trafficLabel(
  value:
    string
) {

  const labels:
    Record<
      string,
      string
    > = {

    ADVERTISING:
      'Publicidade',

    EXT_URL:
      'Sites externos',

    RELATED_VIDEO:
      'Vídeos relacionados',

    SUGGESTED_VIDEO:
      'Vídeos sugeridos',

    YT_SEARCH:
      'Pesquisa do YouTube',

    PLAYLIST:
      'Playlists',

    NOTIFICATION:
      'Notificações',

    SUBSCRIBER:
      'Feed de inscrições',

    END_SCREEN:
      'Tela final',

    YT_CHANNEL:
      'Página do canal',

    YT_OTHER_PAGE:
      'Outra página do YouTube',

    SHORTS:
      'Shorts',

    SOUND_PAGE:
      'Página de som',

    WATCH_WITH:
      'Watch With',
  };


  return (
    labels[
      value
    ] ||
    value.replaceAll(
      '_',
      ' '
    )
  );
}


function MetricCard({
  label,
  value,
  helper,
  icon,
}: {
  label:
    string;

  value:
    string;

  helper:
    string;

  icon:
    ReactNode;
}) {

  return (

    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-center justify-between">

        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          {icon}
        </span>

        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">
          Dados reais
        </span>

      </div>


      <p className="mt-5 text-3xl font-black tracking-tight text-slate-950">
        {value}
      </p>


      <p className="mt-1 text-sm font-bold text-slate-600">
        {label}
      </p>


      <p className="mt-2 text-xs text-slate-400">
        {helper}
      </p>

    </div>
  );
}


export default async function YoutubeMetricsPage({
  params,
  searchParams,
}: {
  params:
    Promise<{
      id:
        string;
    }>;

  searchParams:
    Promise<{
      period?:
        string;
    }>;
}) {

  const user =
    await requirePermission(
      'social.view'
    );


  const {
    id,
  } =
    await params;


  const query =
    await searchParams;


  const requestedPeriod =
    Number(
      query.period ||
      28
    );


  const period =
    [
      7,
      28,
      90,
    ].includes(
      requestedPeriod
    )
      ? requestedPeriod
      : 28;


  const client =
    await prisma
      .client
      .findFirst({
        where: {

          id,

          agencyId:
            user.agencyId,
        },

        select: {

          id:
            true,

          name:
            true,

          logoUrl:
            true,

          segment:
            true,

          agencyId:
            true,

          internalResponsible:
            true,

          socialConnections: {

            where: {

              platform:
                'YOUTUBE',
            },

            select: {

              status:
                true,

              accountName:
                true,

              accountUsername:
                true,

              connectedAt:
                true,
            },
          },
        },
      });


  if (
    !client
  ) {

    notFound();
  }


  if (
    !canAccessClient(
      user,
      client
    )
  ) {

    notFound();
  }


  const connection =
    client
      .socialConnections[0];


  if (
    !connection ||
    connection.status !==
      'ATIVO'
  ) {

    return (

      <div className="mx-auto max-w-7xl space-y-6">

        <section className="rounded-3xl border border-slate-800 bg-slate-950 p-7 text-white">

          <Link
            href={
              '/configuracoes/integracoes/redes-sociais?cliente=' +
              encodeURIComponent(
                client.id
              )
            }
            className="text-sm font-bold text-blue-300 hover:underline"
          >
            ← Voltar para integrações
          </Link>


          <p className="mt-7 text-xs font-black uppercase tracking-[0.18em] text-red-300">
            YouTube Analytics
          </p>


          <h1 className="mt-2 text-3xl font-black">
            {client.name}
          </h1>

        </section>


        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">

          <p className="text-sm font-black text-amber-900">
            YouTube ainda não conectado
          </p>


          <p className="mt-2 text-sm leading-relaxed text-amber-800">
            Conecte o canal do cliente na área de integrações para carregar as métricas.
          </p>


          <Link
            href={
              '/api/integrations/youtube/connect?clientId=' +
              encodeURIComponent(
                client.id
              )
            }
            className="mt-5 inline-flex rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white"
          >
            Conectar YouTube
          </Link>

        </section>

      </div>
    );
  }


  let dashboard:
    Awaited<
      ReturnType<
        typeof getYoutubeDashboard
      >
    > |
    null =
    null;


  let loadError =
    '';


  try {

    dashboard =
      await getYoutubeDashboard(
        client.id,
        period
      );

  }
  catch (
    error
  ) {

    console.error(
      'YOUTUBE METRICS ERROR',
      error
    );


    loadError =
      error instanceof Error
        ? error.message
        : 'Nao foi possivel carregar as metricas.';
  }


  if (
    !dashboard
  ) {

    return (

      <div className="mx-auto max-w-7xl space-y-6">

        <section className="rounded-3xl border border-slate-800 bg-slate-950 p-7 text-white">

          <Link
            href={
              '/configuracoes/integracoes/redes-sociais?cliente=' +
              encodeURIComponent(
                client.id
              )
            }
            className="text-sm font-bold text-blue-300 hover:underline"
          >
            ← Voltar para integrações
          </Link>


          <p className="mt-7 text-xs font-black uppercase tracking-[0.18em] text-red-300">
            YouTube Analytics
          </p>


          <h1 className="mt-2 text-3xl font-black">
            Erro ao carregar métricas
          </h1>

        </section>


        <section className="rounded-3xl border border-red-200 bg-red-50 p-6">

          <p className="text-sm font-black text-red-900">
            O YouTube não retornou os dados do Analytics.
          </p>


          <p className="mt-3 text-sm leading-relaxed text-red-800">
            {loadError}
          </p>


          <p className="mt-4 text-xs leading-relaxed text-red-700">
            Se o erro estiver relacionado à autorização, reconecte o YouTube uma vez.
          </p>


          <div className="mt-5 flex flex-wrap gap-2">

            <Link
              href={
                '/api/integrations/youtube/connect?clientId=' +
                encodeURIComponent(
                  client.id
                )
              }
              className="rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white"
            >
              Reconectar YouTube
            </Link>


            <Link
              href={
                '/configuracoes/integracoes/redes-sociais?cliente=' +
                encodeURIComponent(
                  client.id
                )
              }
              className="rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-black text-red-700"
            >
              Voltar
            </Link>

          </div>

        </section>

      </div>
    );
  }


  const maxDailyViews =
    Math.max(
      1,

      ...dashboard.daily.map(
        (
          row
        ) =>
          Number(
            row.views ||
            0
          )
      )
    );


  const maxVideoViews =
    Math.max(
      1,

      ...dashboard.topVideos.map(
        (
          video
        ) =>
          video.views
      )
    );


  return (

    <div className="mx-auto max-w-7xl space-y-6">

      <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-sm">

        <div className="p-7 md:p-8">

          <Link
            href={
              '/configuracoes/integracoes/redes-sociais?cliente=' +
              encodeURIComponent(
                client.id
              )
            }
            className="text-sm font-bold text-blue-300 hover:underline"
          >
            ← Voltar para integrações
          </Link>


          <div className="mt-7 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex items-center gap-4">

              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white text-xl font-black text-slate-950">

                {
                  client.logoUrl
                    ? (
                      <img
                        src={
                          client.logoUrl
                        }
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )
                    : client.name
                        .charAt(
                          0
                        )
                        .toUpperCase()
                }

              </div>


              <div>

                <p className="text-xs font-black uppercase tracking-[0.18em] text-red-300">
                  YouTube Analytics
                </p>


                <h1 className="mt-1 text-3xl font-black tracking-tight text-white">
                  {client.name}
                </h1>


                <p className="mt-1 text-sm text-slate-400">
                  {dashboard.channel.title}

                  {
                    dashboard.channel.customUrl
                      ? ` · ${dashboard.channel.customUrl}`
                      : ''
                  }
                </p>


                <p className="mt-2 text-xs text-slate-500">

                  Período:

                  {' '}

                  {dateLabel(
                    dashboard.range.startDate
                  )}

                  {' '}até{' '}

                  {dateLabel(
                    dashboard.range.endDate
                  )}

                </p>

              </div>

            </div>


            <div className="flex flex-wrap gap-2">

              {
                [
                  7,
                  28,
                  90,
                ].map(
                  (
                    value
                  ) => (

                    <Link
                      key={
                        value
                      }
                      href={
                        '/clientes/' +
                        encodeURIComponent(
                          client.id
                        ) +
                        '/youtube?period=' +
                        value
                      }
                      className={
                        value ===
                        period

                          ? 'rounded-xl bg-white px-4 py-2.5 text-sm font-black text-slate-950'

                          : 'rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10'
                      }
                    >
                      {value}
                      {' '}
                      dias
                    </Link>

                  )
                )
              }

            </div>

          </div>

        </div>

      </section>


      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <MetricCard
          label="Visualizações"
          value={
            numberLabel(
              dashboard
                .totals
                .views
            )
          }
          helper="No período analisado"
          icon={
            <Eye
              size={19}
            />
          }
        />


        <MetricCard
          label="Tempo assistido"
          value={
            minutesLabel(
              dashboard
                .totals
                .estimatedMinutesWatched
            )
          }
          helper="Tempo estimado de exibição"
          icon={
            <Clock3
              size={19}
            />
          }
        />


        <MetricCard
          label="Inscritos líquidos"
          value={
            (
              dashboard
                .totals
                .subscribersNet >=
              0
                ? '+'
                : ''
            ) +
            numberLabel(
              dashboard
                .totals
                .subscribersNet
            )
          }
          helper="Ganhos menos perdas"
          icon={
            <Users
              size={19}
            />
          }
        />


        <MetricCard
          label="Visualizações do canal"
          value={
            compactLabel(
              dashboard
                .channel
                .viewCount
            )
          }
          helper="Total atual do canal"
          icon={
            <Play
              size={19}
            />
          }
        />

      </section>


      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">

        <MetricCard
          label="Curtidas"
          value={
            numberLabel(
              dashboard
                .totals
                .likes
            )
          }
          helper="No período"
          icon={
            <Heart
              size={18}
            />
          }
        />


        <MetricCard
          label="Comentários"
          value={
            numberLabel(
              dashboard
                .totals
                .comments
            )
          }
          helper="No período"
          icon={
            <MessageCircle
              size={18}
            />
          }
        />


        <MetricCard
          label="Compartilhamentos"
          value={
            numberLabel(
              dashboard
                .totals
                .shares
            )
          }
          helper="No período"
          icon={
            <Share2
              size={18}
            />
          }
        />


        <MetricCard
          label="Inscritos atuais"
          value={
            compactLabel(
              dashboard
                .channel
                .subscriberCount
            )
          }
          helper="Total atual do canal"
          icon={
            <Users
              size={18}
            />
          }
        />

      </section>


      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

        <div>

          <p className="text-xs font-black uppercase tracking-wider text-red-600">
            Evolução
          </p>


          <h2 className="mt-1 text-xl font-black text-slate-950">
            Visualizações por dia
          </h2>


          <p className="mt-1 text-sm text-slate-500">
            Desempenho diário do canal no período selecionado.
          </p>

        </div>


        {
          dashboard.daily.length ===
          0

            ? (

              <div className="mt-6 flex h-52 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50">

                <div className="text-center">

                  <BarChart3
                    size={32}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 text-sm font-bold text-slate-500">
                    Nenhum dado diário retornado.
                  </p>

                </div>

              </div>

            )

            : (

              <div className="mt-7 rounded-2xl bg-slate-50 p-5">

                <div className="flex h-64 items-end gap-1">

                  {
                    dashboard.daily.map(
                      (
                        row,
                        index
                      ) => {

                        const views =
                          Number(
                            row.views ||
                            0
                          );


                        const height =
                          Math.max(
                            3,
                            Math.round(
                              (
                                views /
                                maxDailyViews
                              ) *
                              100
                            )
                          );


                        return (

                          <div
                            key={
                              String(
                                row.day ||
                                index
                              )
                            }
                            className="group relative flex h-full min-w-0 flex-1 items-end"
                            title={
                              String(
                                row.day ||
                                ''
                              ) +
                              ': ' +
                              numberLabel(
                                views
                              ) +
                              ' visualizações'
                            }
                          >

                            <div
                              className="w-full rounded-t-md bg-red-500 group-hover:bg-red-600"
                              style={{
                                height:
                                  `${height}%`,
                              }}
                            />

                          </div>

                        );
                      }
                    )
                  }

                </div>


                <div className="mt-3 flex justify-between text-[10px] font-bold text-slate-400">

                  {
                    dashboard.daily[0]
                      ? (
                        <span>
                          {
                            dateLabel(
                              String(
                                dashboard
                                  .daily[0]
                                  .day
                              )
                            )
                          }
                        </span>
                      )
                      : null
                  }


                  {
                    dashboard.daily[
                      dashboard.daily.length - 1
                    ]
                      ? (
                        <span>
                          {
                            dateLabel(
                              String(
                                dashboard
                                  .daily[
                                    dashboard.daily.length - 1
                                  ]
                                  .day
                              )
                            )
                          }
                        </span>
                      )
                      : null
                  }

                </div>

              </div>

            )
        }

      </section>


      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

        <p className="text-xs font-black uppercase tracking-wider text-red-600">
          Conteúdo
        </p>


        <h2 className="mt-1 text-xl font-black text-slate-950">
          Vídeos com melhor desempenho
        </h2>


        <p className="mt-1 text-sm text-slate-500">
          Ranking por visualizações dentro do período analisado.
        </p>


        <div className="mt-6 space-y-3">

          {
            dashboard.topVideos.map(
              (
                video,
                index
              ) => {

                const width =
                  Math.max(
                    3,
                    Math.round(
                      (
                        video.views /
                        maxVideoViews
                      ) *
                      100
                    )
                  );


                return (

                  <a
                    key={
                      video.id
                    }
                    href={
                      video.url
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="grid grid-cols-[34px_96px_minmax(0,1fr)] gap-4 rounded-2xl border border-slate-100 p-3 hover:border-red-200 hover:bg-red-50/30"
                  >

                    <div className="flex items-center justify-center text-sm font-black text-slate-400">
                      {index + 1}
                    </div>


                    <div className="h-16 w-24 overflow-hidden rounded-xl bg-slate-100">

                      {
                        video.thumbnail
                          ? (
                            <img
                              src={
                                video.thumbnail
                              }
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          )
                          : null
                      }

                    </div>


                    <div className="min-w-0">

                      <p className="line-clamp-2 text-sm font-black leading-snug text-slate-900">
                        {video.title}
                      </p>


                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">

                        <span className="font-bold">
                          {
                            numberLabel(
                              video.views
                            )
                          }
                          {' '}
                          views
                        </span>


                        <span>
                          {
                            numberLabel(
                              video.likes
                            )
                          }
                          {' '}
                          likes
                        </span>


                        <span>
                          {
                            numberLabel(
                              video.comments
                            )
                          }
                          {' '}
                          comentários
                        </span>


                        <span>
                          {
                            numberLabel(
                              video.shares
                            )
                          }
                          {' '}
                          compartilhamentos
                        </span>

                      </div>


                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">

                        <div
                          className="h-full rounded-full bg-red-500"
                          style={{
                            width:
                              `${width}%`,
                          }}
                        />

                      </div>

                    </div>

                  </a>
                );
              }
            )
          }


          {
            dashboard.topVideos.length ===
            0
              ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">

                  <p className="text-sm font-bold text-slate-500">
                    Nenhum vídeo encontrado no período.
                  </p>

                </div>
              )
              : null
          }

        </div>

      </section>


      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex items-center gap-3">

            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">

              <Globe2
                size={18}
              />

            </span>


            <div>

              <p className="text-xs font-black uppercase tracking-wider text-blue-600">
                Audiência
              </p>


              <h2 className="text-xl font-black text-slate-950">
                Países
              </h2>

            </div>

          </div>


          <div className="mt-5 space-y-2">

            {
              dashboard.countries.map(
                (
                  item
                ) => (

                  <div
                    key={
                      item.country
                    }
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                  >

                    <span className="text-sm font-bold text-slate-700">
                      {
                        countryLabel(
                          item.country
                        )
                      }
                    </span>


                    <span className="text-sm font-black text-slate-950">
                      {
                        numberLabel(
                          item.views
                        )
                      }
                    </span>

                  </div>
                )
              )
            }


            {
              dashboard.countries.length ===
              0
                ? (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    Nenhum dado de país retornado.
                  </p>
                )
                : null
            }

          </div>

        </div>


        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex items-center gap-3">

            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">

              <BarChart3
                size={18}
              />

            </span>


            <div>

              <p className="text-xs font-black uppercase tracking-wider text-violet-600">
                Descoberta
              </p>


              <h2 className="text-xl font-black text-slate-950">
                Origem das visualizações
              </h2>

            </div>

          </div>


          <div className="mt-5 space-y-2">

            {
              dashboard.trafficSources.map(
                (
                  item
                ) => (

                  <div
                    key={
                      item.source
                    }
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                  >

                    <span className="text-sm font-bold text-slate-700">
                      {
                        trafficLabel(
                          item.source
                        )
                      }
                    </span>


                    <span className="text-sm font-black text-slate-950">
                      {
                        numberLabel(
                          item.views
                        )
                      }
                    </span>

                  </div>
                )
              )
            }


            {
              dashboard.trafficSources.length ===
              0
                ? (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    Nenhuma origem de tráfego retornada.
                  </p>
                )
                : null
            }

          </div>

        </div>

      </section>


      <section className="rounded-3xl border border-blue-100 bg-blue-50 p-5">

        <p className="text-xs font-black uppercase tracking-wider text-blue-600">
          Dados do YouTube
        </p>


        <p className="mt-2 text-sm leading-relaxed text-blue-900">
          As métricas históricas vêm do YouTube Analytics. As estatísticas atuais do canal e dos vídeos vêm da YouTube Data API.
        </p>


        <p className="mt-2 text-xs leading-relaxed text-blue-700">
          O YouTube Analytics pode ter atraso no processamento dos dados recentes.
        </p>

      </section>

    </div>
  );
}
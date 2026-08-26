import Link from 'next/link';

import { InstagramIcon } from '@/components/icons/InstagramIcon';

import {
  notFound,
} from 'next/navigation';

import {
BarChart3,
  Eye,
  Heart,
  Users,
  TrendingUp,
  Trophy,
  Send,
  CalendarDays,
  FileText,
  CheckCircle2,
  Link2,
} from 'lucide-react';

import {
  prisma,
} from '@/lib/prisma';

import {
  decryptMetaSecret,
} from '@/lib/metaCrypto';

import {
  isMetaConfigured,
  getInstagramDashboardMetrics,
  getInstagramDailyReach,
  getInstagramTopMedia,
  type InstagramDashboardMetrics,
  type InstagramDailyReachPoint,
  type InstagramTopMediaItem,
} from '@/lib/metaInstagram';

import {
  requirePermission,
} from '@/lib/userAccess';

import {
  saveInstagramSnapshot,
} from '@/lib/instagramSnapshots';


function formatMetricValue(
  value:
    number | null
) {
  if (
    value === null
  ) {
    return '—';
  }

  return new Intl.NumberFormat(
    'pt-BR'
  ).format(
    value
  );
}


function formatComparison(
  value:
    number | null
) {
  if (
    value === null
  ) {
    return 'Comparação indisponível';
  }

  const formatted =
    Math.abs(
      value
    )
      .toFixed(1)
      .replace(
        '.',
        ','
      );

  if (
    value > 0
  ) {
    return `↑ +${formatted}% vs. mês anterior`;
  }

  if (
    value < 0
  ) {
    return `↓ -${formatted}% vs. mês anterior`;
  }

  return '0% vs. mês anterior';
}


function MetricCard({
  label,
  icon,
  value,
  comparison,
  connected,
  helper,
}: {
  label:
    string;

  icon:
    React.ReactNode;

  value:
    number | null;

  comparison:
    number | null;

  connected:
    boolean;

  helper?:
    string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-center justify-between">

        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
          {icon}
        </span>

        {
          connected
            ? (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                Dados reais
              </span>
            )
            : (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-400">
                Aguardando conexão
              </span>
            )
        }

      </div>


      <p className="mt-5 text-3xl font-bold tracking-tight text-slate-900">
        {
          formatMetricValue(
            value
          )
        }
      </p>


      <p className="mt-1 text-sm font-medium text-slate-500">
        {label}
      </p>


      <p className="mt-3 text-xs text-slate-400">
        {
          helper ||
          (
            connected
              ? formatComparison(
                  comparison
                )
              : 'vs. mês anterior'
          )
        }
      </p>

    </div>
  );
}



function formatCompactMetric(
  value: number | null
) {
  if (value === null) {
    return '—';
  }

  return new Intl.NumberFormat(
    'pt-BR',
    {
      notation:
        value >= 10000
          ? 'compact'
          : 'standard',
      maximumFractionDigits: 1,
    }
  ).format(value);
}


function getMediaTypeLabel(
  item: InstagramTopMediaItem
) {
  if (
    item.mediaProductType ===
    'REELS'
  ) {
    return 'Reel';
  }

  if (
    item.mediaType ===
    'CAROUSEL_ALBUM'
  ) {
    return 'Carrossel';
  }

  if (
    item.mediaType ===
    'VIDEO'
  ) {
    return 'Vídeo';
  }

  return 'Imagem';
}


function getMediaTitle(
  item: InstagramTopMediaItem
) {
  const caption =
    String(
      item.caption || ''
    )
      .replace(
        /\s+/g,
        ' '
      )
      .trim();

  if (!caption) {
    return `${getMediaTypeLabel(item)} publicado no Instagram`;
  }

  if (caption.length <= 70) {
    return caption;
  }

  return (
    caption.slice(
      0,
      67
    ) +
    '...'
  );
}


function ReachChart({
  points,
}: {
  points: InstagramDailyReachPoint[];
}) {
  if (points.length === 0) {
    return (
      <div className="mt-6 flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50">
        <div className="text-center">
          <BarChart3
            size={34}
            className="mx-auto text-slate-300"
          />

          <p className="mt-3 text-sm font-bold text-slate-500">
            Sem dados diários neste período
          </p>

          <p className="mt-1 text-xs text-slate-400">
            A Meta ainda não retornou a evolução diária.
          </p>
        </div>
      </div>
    );
  }

  const maxValue =
    Math.max(
      ...points.map(
        (point) =>
          point.value
      ),
      1
    );

  const highest =
    Math.max(
      ...points.map(
        (point) =>
          point.value
      )
    );

  return (
    <div className="mt-6">

      <div className="mb-4 flex flex-wrap gap-2">

        <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
          Pico diário: {highest.toLocaleString('pt-BR')}
        </span>

        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
          {points.length} dias analisados
        </span>

      </div>


      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">

        <div className="flex h-52 items-end gap-1">

          {points.map(
            (
              point,
              index
            ) => {

              const percentage =
                Math.max(
                  3,
                  (
                    point.value /
                    maxValue
                  ) *
                  100
                );

              return (
                <div
                  key={
                    point.date +
                    index
                  }
                  className="group relative flex h-full min-w-0 flex-1 items-end"
                  title={
                    `${new Date(
                      point.date
                    ).toLocaleDateString(
                      'pt-BR'
                    )}: ${point.value.toLocaleString(
                      'pt-BR'
                    )} de alcance`
                  }
                >

                  <div
                    className="w-full rounded-t-md bg-blue-600 transition group-hover:bg-blue-500"
                    style={{
                      height:
                        `${percentage}%`,
                    }}
                  />

                </div>
              );
            }
          )}

        </div>


        <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-slate-400">

          <span>
            {new Date(
              points[0].date
            ).toLocaleDateString(
              'pt-BR',
              {
                day: '2-digit',
                month: '2-digit',
              }
            )}
          </span>

          <span>
            Hoje
          </span>

        </div>

      </div>

    </div>
  );
}


function TopMediaCard({
  item,
  position,
}: {
  item: InstagramTopMediaItem;
  position: number;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">

      <div className="flex gap-4 p-4">

        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-200">

          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center px-2 text-center text-[10px] font-bold text-slate-400">
              {getMediaTypeLabel(item)}
            </div>
          )}

          <span className="absolute left-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-white text-xs font-black text-slate-900 shadow-sm">
            {position}º
          </span>

        </div>


        <div className="min-w-0 flex-1">

          <div className="flex items-start justify-between gap-3">

            <div className="min-w-0">

              <p className="text-[10px] font-bold uppercase tracking-wider text-pink-600">
                {getMediaTypeLabel(item)}
              </p>

              <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-slate-900">
                {getMediaTitle(item)}
              </h3>

            </div>

            {item.permalink && (
              <a
                href={item.permalink}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-600 shadow-sm hover:text-slate-950"
              >
                Abrir
              </a>
            )}

          </div>


          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">

            <span className="font-bold text-slate-700">
              {formatCompactMetric(
                item.reach
              )}
              <span className="ml-1 font-medium text-slate-400">
                alcance
              </span>
            </span>


            {item.views !== null && (
              <span className="font-bold text-slate-700">
                {formatCompactMetric(
                  item.views
                )}
                <span className="ml-1 font-medium text-slate-400">
                  views
                </span>
              </span>
            )}


            {item.interactions !== null && (
              <span className="font-bold text-slate-700">
                {formatCompactMetric(
                  item.interactions
                )}
                <span className="ml-1 font-medium text-slate-400">
                  interações
                </span>
              </span>
            )}

          </div>

        </div>

      </div>

    </article>
  );
}


export default async function ClientInstagramPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  await requirePermission(
    'social.view'
  );

  const {
    id,
  } = await params;

  const client =
    await prisma.client.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        segment: true,

        instagramConnection: {
          select: {
            id: true,
            instagramUserId: true,
            username: true,
            displayName: true,
            facebookPageName: true,
            status: true,
            connectedAt: true,
            userAccessTokenEncrypted: true,
          },
        },
      },
    });

  if (!client) {
    notFound();
  }

  const connection =
    client.instagramConnection;

  const configured =
    isMetaConfigured();


  let dashboardMetrics:
    InstagramDashboardMetrics |
    null =
    null;


  if (
    configured &&
    connection
      ?.userAccessTokenEncrypted
  ) {

    try {

      dashboardMetrics =
        await getInstagramDashboardMetrics({
          instagramUserId:
            connection.instagramUserId,

          accessToken:
            decryptMetaSecret(
              connection
                .userAccessTokenEncrypted
            ),
        });


      try {

        await saveInstagramSnapshot({

          clientId:
            client.id,

          instagramUserId:
            connection.instagramUserId,

          metrics:
            dashboardMetrics,

        });

      }
      catch (
        snapshotError
      ) {

        console.error(
          'INSTAGRAM SNAPSHOT SAVE ERROR',
          snapshotError
        );

      }

    }
    catch (
      error
    ) {

      console.error(
        'INSTAGRAM DASHBOARD METRICS ERROR',
        error
      );

    }

  }



  let dailyReach:
    InstagramDailyReachPoint[] =
    [];


  let topMedia:
    InstagramTopMediaItem[] =
    [];


  if (
    configured &&
    connection
      ?.userAccessTokenEncrypted
  ) {

    const accessToken =
      decryptMetaSecret(
        connection
          .userAccessTokenEncrypted
      );


    const [
      dailyReachResult,
      topMediaResult,
    ] =
      await Promise.allSettled([

        getInstagramDailyReach({
          instagramUserId:
            connection.instagramUserId,

          accessToken,
        }),

        getInstagramTopMedia({
          instagramUserId:
            connection.instagramUserId,

          accessToken,

          limit: 3,
        }),

      ]);


    if (
      dailyReachResult.status ===
      'fulfilled'
    ) {
      dailyReach =
        dailyReachResult.value;
    }
    else {
      console.error(
        'INSTAGRAM DAILY REACH ERROR',
        dailyReachResult.reason
      );
    }


    if (
      topMediaResult.status ===
      'fulfilled'
    ) {
      topMedia =
        topMediaResult.value;
    }
    else {
      console.error(
        'INSTAGRAM TOP MEDIA ERROR',
        topMediaResult.reason
      );
    }

  }


  return (
    <div className="mx-auto max-w-7xl space-y-6">

      {/* CABECALHO */}

      <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-sm">
        <div className="p-7 md:p-8">

          <Link
            href="/clientes"
            className="text-sm font-bold text-blue-300 hover:text-blue-200"
          >
            &larr; Voltar para clientes
          </Link>

          <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

            <div className="flex items-center gap-4">

              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/10 text-xl font-bold text-white">
                {client.logoUrl ? (
                  <img
                    src={client.logoUrl}
                    alt={client.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  client.name
                    .charAt(0)
                    .toUpperCase()
                )}
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-pink-300">
                  Instagram
                </p>

                <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">
                  {client.name}
                </h1>

                <p className="mt-1 text-sm text-slate-400">
                  {client.segment || 'Cliente AprovUp'}
                </p>
              </div>

            </div>

            {
              configured
                ? (
                  <a
                    href={`/api/integrations/instagram/connect?clientId=${client.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
                  >
                    <Link2 size={17} />

                    {
                      connection
                        ? 'Reconectar Instagram'
                        : 'Conectar Instagram'
                    }
                  </a>
                )
                : (
                  <button
                    type="button"
                    disabled
                    className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 opacity-60"
                  >
                    <Link2 size={17} />
                    Configuração pendente
                  </button>
                )
            }

          </div>
        </div>

        {/* NAVEGACAO */}

        <div className="overflow-x-auto border-t border-white/10 px-5 md:px-8">
          <nav className="flex min-w-max gap-1 py-3">

            <Link
              href={`/clientes/${client.id}/calendario`}
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              Calendário
            </Link>

            <Link
              href={`/clientes/${client.id}/conteudos`}
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              Conteúdos
            </Link>

            <Link
              href={`/clientes/${client.id}/aprovacao-final`}
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              Aprovações
            </Link>

            <span className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950">
              Instagram
            </span>

          </nav>
        </div>
      </section>


      {/* STATUS CONEXAO */}

      {
        connection
          ? (
            <section className="flex flex-col gap-4 rounded-3xl border border-emerald-100 bg-emerald-50 p-6 md:flex-row md:items-center md:justify-between">

              <div className="flex items-start gap-4">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                  <InstagramIcon
                    size={23}
                  />
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">
                    {
                      connection.username
                        ? `@${connection.username}`
                        : connection.displayName ||
                          'Instagram conectado'
                    }
                  </h2>

                  {
                    connection.displayName &&
                    (
                      <p className="mt-1 text-sm text-slate-600">
                        {
                          connection.displayName
                        }
                      </p>
                    )
                  }

                  <p className="mt-2 text-xs text-slate-500">
                    Página vinculada: {
                      connection.facebookPageName ||
                      'Meta'
                    }
                  </p>
                </div>

              </div>

              <span className="w-fit rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-sm">
                ● Conectado
              </span>

            </section>
          )
          : (
            <section className="flex flex-col gap-4 rounded-3xl border border-pink-100 bg-gradient-to-r from-pink-50 to-violet-50 p-6 md:flex-row md:items-center md:justify-between">

              <div className="flex items-start gap-4">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-600 text-white">
                  <InstagramIcon
                    size={23}
                  />
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">
                    Instagram ainda não conectado
                  </h2>

                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
                    Conecte a conta profissional deste cliente.
                    Depois os resultados serão trazidos automaticamente para o AprovUp.
                  </p>
                </div>

              </div>

              <span className="w-fit rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 shadow-sm">
                Desconectado
              </span>

            </section>
          )
      }


      {/* TABS INTERNAS */}

      <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">

        <div className="flex gap-2 overflow-x-auto">

          <span
            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white"
          >
            Visão geral
          </span>

          <Link
            href={`/clientes/${client.id}/instagram/conteudos`}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-100"
          >
            Conteúdos
          </Link>

          <button
            disabled
            className="cursor-not-allowed rounded-xl px-4 py-2.5 text-sm font-bold text-slate-400"
          >
            Relatórios
          </button>

        </div>

      </section>


      {/* METRICAS */}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <MetricCard
          label="Seguidores"
          icon={
            <Users size={19} />
          }
          value={
            dashboardMetrics
              ?.followersCount ??
            null
          }
          comparison={
            null
          }
          connected={
            Boolean(
              connection &&
              configured
            )
          }
          helper={
            connection &&
            configured
              ? 'Total atual de seguidores'
              : connection
                ? 'Configuração Meta pendente no servidor'
                : undefined
          }
        />

        <MetricCard
          label="Alcance"
          icon={
            <TrendingUp size={19} />
          }
          value={
            dashboardMetrics
              ?.current
              .reach ??
            null
          }
          comparison={
            dashboardMetrics
              ?.change
              .reach ??
            null
          }
          connected={
            Boolean(
              connection &&
              configured
            )
          }
        />

        <MetricCard
          label="Visualizações"
          icon={
            <Eye size={19} />
          }
          value={
            dashboardMetrics
              ?.current
              .views ??
            null
          }
          comparison={
            dashboardMetrics
              ?.change
              .views ??
            null
          }
          connected={
            Boolean(
              connection &&
              configured
            )
          }
        />

        <MetricCard
          label="Interações"
          icon={
            <Heart size={19} />
          }
          value={
            dashboardMetrics
              ?.current
              .interactions ??
            null
          }
          comparison={
            dashboardMetrics
              ?.change
              .interactions ??
            null
          }
          connected={
            Boolean(
              connection &&
              configured
            )
          }
        />

      </section>


      {/* GRAFICO E TOP CONTEUDOS */}

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_1fr]">

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex items-center justify-between gap-4">

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Resultados
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Evolução do alcance
              </h2>
            </div>

            <BarChart3
              size={22}
              className="text-blue-600"
            />

          </div>

          <ReachChart
            points={dailyReach}
          />

        </div>


        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex items-center justify-between gap-4">

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Desempenho
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Melhores conteúdos
              </h2>
            </div>

            <Trophy
              size={22}
              className="text-amber-500"
            />

          </div>

          {topMedia.length === 0 ? (

            <div className="mt-6 flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">

              <div>

                <Trophy
                  size={32}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-3 text-sm font-bold text-slate-600">
                  Nenhum conteúdo encontrado neste mês
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  O ranking aparecerá assim que a Meta retornar as publicações.
                </p>

              </div>

            </div>

          ) : (

            <div className="mt-6 space-y-3">

              {topMedia.map(
                (
                  item,
                  index
                ) => (
                  <TopMediaCard
                    key={item.id}
                    item={item}
                    position={
                      index + 1
                    }
                  />
                )
              )}

            </div>

          )}

        </div>

      </section>


      {/* PUBLICACAO */}

      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-sm md:p-7">

        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-start gap-4">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white">
              <Send size={21} />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-violet-300">
                Publicação
              </p>

              <h2 className="mt-1 text-xl font-bold text-white">
                Do conteúdo aprovado para o Instagram
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
                Quando ativarmos a publicação, os conteúdos aprovados poderão
                ser publicados imediatamente ou agendados sem precisar sair do AprovUp.
              </p>
            </div>

          </div>


          <div className="grid min-w-full grid-cols-1 gap-2 sm:grid-cols-3 lg:min-w-0">

            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <CheckCircle2
                size={16}
                className="text-emerald-400"
              />

              <p className="mt-2 text-xs font-bold text-white">
                Aprovado
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <CalendarDays
                size={16}
                className="text-violet-400"
              />

              <p className="mt-2 text-xs font-bold text-white">
                Agendado
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <FileText
                size={16}
                className="text-blue-400"
              />

              <p className="mt-2 text-xs font-bold text-white">
                Publicado
              </p>
            </div>

          </div>

        </div>

      </section>

    </div>
  );
}

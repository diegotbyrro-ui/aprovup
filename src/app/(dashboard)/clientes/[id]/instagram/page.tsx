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
  Link2,
} from 'lucide-react';

import {
  prisma,
} from '@/lib/prisma';
import {
  canUseMetaIntegration,
} from '@/lib/metaAccess';

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


function formatSignedMetricValue(
  value:
    number | null
) {
  if (
    value === null
  ) {
    return '—';
  }

  const formatted =
    new Intl.NumberFormat(
      'pt-BR'
    ).format(
      value
    );

  return value > 0
    ? `+${formatted}`
    : formatted;
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
    return `↑ +${formatted}% vs. 30 dias anteriores`;
  }

  if (
    value < 0
  ) {
    return `↓ -${formatted}% vs. 30 dias anteriores`;
  }

  return '0% vs. 30 dias anteriores';
}


function MetricCard({
  label,
  icon,
  value,
  comparison,
  connected,
  helper,
  signed = false,
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

  signed?:
    boolean;
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
          signed
            ? formatSignedMetricValue(
                value
              )
            : formatMetricValue(
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
              : 'vs. 30 dias anteriores'
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
  const currentUser =
    await requirePermission(
      'social.view'
    );

  const {
    id,
  } = await params;

  const client =
    await prisma.client.findFirst({
      where: {
        id,

        agencyId:
          currentUser.agencyId,
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

  const metaConfigured =
    isMetaConfigured();


  const metaAccessAllowed =
    canUseMetaIntegration(
      currentUser
    );


  const configured =
    metaConfigured &&
    metaAccessAllowed;


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

          days:
            30,
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

          days:
            30,
        }),

        getInstagramTopMedia({
          instagramUserId:
            connection.instagramUserId,

          accessToken,

          limit: 3,

          days:
            30,
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

              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white bg-white text-xl font-bold text-slate-900 shadow-sm">
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

            <div className="flex flex-wrap items-center gap-2">

              {connection ? (
                <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-300">
                  ● Conectado
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-slate-600 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300">
                  Desconectado
                </span>
              )}

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
        </div>

        <div className="overflow-x-auto border-t border-white/10 px-5 md:px-8">
          <nav className="flex min-w-max gap-1 py-3">
            <span className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950">
              Instagram
            </span>
          </nav>
        </div>
      </section>


      {!metaAccessAllowed ? (

        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">

          <p className="text-sm font-bold text-amber-900">
            Integração Meta em processo de aprovação
          </p>

          <p className="mt-1 text-sm leading-relaxed text-amber-800">
            A integração com o Instagram está em processo de aprovação pela Meta.
            Assim que a liberação for concluída, os recursos serão disponibilizados para sua agência.
          </p>

        </section>

      ) : null}

      {/* STATUS CONEXAO */}

      {!connection ? (
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
      ) : null}


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

          <Link
            href={`/clientes/${client.id}/instagram/relatorios`}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-100"
          >
            Relatórios
          </Link>

        </div>

      </section>


      {/* METRICAS */}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

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
          label="Seguidores líquidos"
          icon={
            <Users size={19} />
          }
          value={
            dashboardMetrics
              ?.current
              .netFollowers ??
            null
          }
          comparison={
            dashboardMetrics
              ?.change
              .netFollowers ??
            null
          }
          connected={
            Boolean(
              connection &&
              configured
            )
          }
          signed
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
                  Nenhum conteúdo encontrado nos últimos 30 dias
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


    </div>
  );
}

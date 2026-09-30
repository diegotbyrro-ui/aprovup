import Link from 'next/link';

import {
  ArrowLeft,
  Clock3,
  Eye,
  Gauge,
  Heart,
  Play,
  Repeat2,
  Share2,
  Sparkles,
} from 'lucide-react';

import {
  notFound,
} from 'next/navigation';

import {
  prisma,
} from '@/lib/prisma';

import {
  decryptMetaSecret,
} from '@/lib/metaCrypto';

import {
  getInstagramReelRetention,
  isMetaConfigured,
  type InstagramReelRetentionItem,
} from '@/lib/metaInstagram';

import {
  requirePermission,
} from '@/lib/userAccess';


function formatNumber(
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


function formatPercent(
  value:
    number | null
) {
  if (
    value === null
  ) {
    return '—';
  }

  return (
    value
      .toFixed(1)
      .replace(
        '.',
        ','
      ) +
    '%'
  );
}


function formatWatchTime(
  milliseconds:
    number | null
) {
  if (
    milliseconds ===
    null
  ) {
    return '—';
  }

  const seconds =
    milliseconds /
    1000;

  if (
    seconds <
    60
  ) {
    return (
      seconds
        .toFixed(1)
        .replace(
          '.',
          ','
        ) +
      's'
    );
  }

  const minutes =
    Math.floor(
      seconds /
      60
    );

  const remaining =
    Math.round(
      seconds %
      60
    );

  return `${minutes}m ${remaining}s`;
}


function formatTotalWatchTime(
  milliseconds:
    number | null
) {
  if (
    milliseconds ===
    null
  ) {
    return '—';
  }

  const totalSeconds =
    Math.max(
      0,
      Math.round(
        milliseconds /
        1000
      )
    );

  const hours =
    Math.floor(
      totalSeconds /
      3600
    );

  const minutes =
    Math.floor(
      (
        totalSeconds %
        3600
      ) /
      60
    );

  if (
    hours >
    0
  ) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes} min`;
}


function formatDate(
  value:
    string
) {
  return new Date(
    value
  ).toLocaleDateString(
    'pt-BR',
    {
      day:
        '2-digit',

      month:
        '2-digit',

      year:
        'numeric',
    }
  );
}


function titleFromCaption(
  item:
    InstagramReelRetentionItem
) {
  const caption =
    String(
      item.caption ||
      ''
    )
      .replace(
        /\s+/g,
        ' '
      )
      .trim();

  if (
    !caption
  ) {
    return 'Reel publicado no Instagram';
  }

  if (
    caption.length <=
    100
  ) {
    return caption;
  }

  return (
    caption.slice(
      0,
      97
    ) +
    '...'
  );
}


function average(
  values:
    Array<
      number | null
    >
) {
  const valid =
    values.filter(
      (
        value
      ): value is number =>
        typeof value ===
          'number' &&
        Number.isFinite(
          value
        )
    );

  if (
    valid.length ===
    0
  ) {
    return null;
  }

  return (
    valid.reduce(
      (
        sum,
        value
      ) =>
        sum +
        value,
      0
    ) /
    valid.length
  );
}


function RetentionChart({
  retained,
  skipped,
}: {
  retained:
    number | null;

  skipped:
    number | null;
}) {

  if (
    retained === null ||
    skipped === null
  ) {

    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-400">
        A Meta ainda não retornou a taxa de pulo deste Reel.
      </div>
    );
  }


  const retainedValue =
    Math.max(
      0,
      Math.min(
        100,
        retained
      )
    );


  const skippedValue =
    Math.max(
      0,
      Math.min(
        100,
        skipped
      )
    );


  /*
   * O único ponto de retenção real disponível aqui
   * é o valor aos 3 segundos.
   *
   * A curva entre 0s e 3s é apenas uma interpolação
   * visual entre 100% no início e o dado real da Meta
   * aos 3 segundos.
   */
  const chartLeft =
    32;

  const chartRight =
    308;

  const chartTop =
    18;

  const chartBottom =
    126;

  const chartHeight =
    chartBottom -
    chartTop;


  const retainedY =
    chartBottom -
    (
      retainedValue /
      100
    ) *
    chartHeight;


  const controlY =
    Math.max(
      chartTop +
        8,
      retainedY -
        12
    );


  const linePath =
    [
      'M',
      chartLeft,
      chartTop,

      'C',
      92,
      chartTop +
        5,

      205,
      controlY,

      chartRight,
      retainedY,
    ].join(
      ' '
    );


  const areaPath =
    [
      linePath,

      'L',
      chartRight,
      chartBottom,

      'L',
      chartLeft,
      chartBottom,

      'Z',
    ].join(
      ' '
    );


  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-sm">

      <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">

        <div>

          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-300">
            Retenção inicial
          </p>

          <p className="mt-1 text-sm font-black text-white">
            Comportamento nos primeiros 3 segundos
          </p>

        </div>


        <span className="w-fit rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-[10px] font-black text-violet-200">
          Dado real da Meta · 3s
        </span>

      </div>


      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_170px]">

        <div className="min-w-0 rounded-xl border border-white/5 bg-black/20 px-2 pb-1 pt-2">

          <svg
            viewBox="0 0 340 160"
            className="h-44 w-full"
            role="img"
            aria-label={
              `Retenção inicial: ${formatPercent(
                retainedValue
              )} permaneceu após 3 segundos`
            }
          >

            <line
              x1={chartLeft}
              y1={chartTop}
              x2={chartRight}
              y2={chartTop}
              stroke="#334155"
              strokeWidth="1"
            />

            <line
              x1={chartLeft}
              y1={
                chartTop +
                chartHeight /
                  2
              }
              x2={chartRight}
              y2={
                chartTop +
                chartHeight /
                  2
              }
              stroke="#334155"
              strokeWidth="1"
              strokeDasharray="4 5"
            />

            <line
              x1={chartLeft}
              y1={chartBottom}
              x2={chartRight}
              y2={chartBottom}
              stroke="#334155"
              strokeWidth="1"
            />


            <line
              x1={chartRight}
              y1={chartTop}
              x2={chartRight}
              y2={chartBottom}
              stroke="#64748b"
              strokeWidth="1"
              strokeDasharray="4 5"
            />


            <path
              d={areaPath}
              fill="rgba(168, 85, 247, 0.14)"
            />


            <path
              d={linePath}
              fill="none"
              stroke="#d946ef"
              strokeWidth="4"
              strokeLinecap="round"
            />


            <circle
              cx={chartLeft}
              cy={chartTop}
              r="4"
              fill="#f0abfc"
            />


            <circle
              cx={chartRight}
              cy={retainedY}
              r="6"
              fill="#f0abfc"
              stroke="#701a75"
              strokeWidth="3"
            />


            <rect
              x={
                chartRight -
                80
              }
              y={
                Math.max(
                  chartTop +
                    6,
                  retainedY -
                    32
                )
              }
              width="78"
              height="24"
              rx="8"
              fill="#18181b"
              stroke="#86198f"
            />


            <text
              x={
                chartRight -
                41
              }
              y={
                Math.max(
                  chartTop +
                    22,
                  retainedY -
                    16
                )
              }
              textAnchor="middle"
              fill="#f5d0fe"
              fontSize="10"
              fontWeight="700"
            >
              {formatPercent(
                retainedValue
              )}
            </text>


            <text
              x="3"
              y={
                chartTop +
                3
              }
              fill="#94a3b8"
              fontSize="9"
              fontWeight="700"
            >
              100%
            </text>


            <text
              x="8"
              y={
                chartTop +
                chartHeight /
                  2 +
                3
              }
              fill="#64748b"
              fontSize="9"
              fontWeight="700"
            >
              50%
            </text>


            <text
              x="15"
              y={
                chartBottom +
                3
              }
              fill="#64748b"
              fontSize="9"
              fontWeight="700"
            >
              0%
            </text>


            <text
              x={chartLeft}
              y="148"
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="10"
              fontWeight="700"
            >
              0s
            </text>


            <text
              x={chartRight}
              y="148"
              textAnchor="middle"
              fill="#e879f9"
              fontSize="10"
              fontWeight="700"
            >
              3s
            </text>

          </svg>

        </div>


        <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">

          <div className="rounded-xl border border-emerald-400/10 bg-emerald-400/10 p-3">

            <p className="text-[9px] font-black uppercase tracking-wider text-emerald-300">
              Permaneceu
            </p>

            <p className="mt-1 text-xl font-black text-white">
              {formatPercent(
                retainedValue
              )}
            </p>

            <p className="mt-1 text-[10px] text-emerald-200/70">
              após 3 segundos
            </p>

          </div>


          <div className="rounded-xl border border-rose-400/10 bg-rose-400/10 p-3">

            <p className="text-[9px] font-black uppercase tracking-wider text-rose-300">
              Pulou
            </p>

            <p className="mt-1 text-xl font-black text-white">
              {formatPercent(
                skippedValue
              )}
            </p>

            <p className="mt-1 text-[10px] text-rose-200/70">
              até os 3 segundos
            </p>

          </div>

        </div>

      </div>


      <div className="border-t border-white/10 px-4 py-3">

        <p className="text-[10px] leading-relaxed text-slate-400">
          A Meta disponibiliza aqui o ponto real de retenção aos 3 segundos. A linha entre 0s e 3s é uma interpolação visual para facilitar a leitura e não representa dados segundo a segundo.
        </p>

      </div>

    </div>
  );
}

function normalizeReportDate(
  value:
    string |
    undefined
) {
  const clean =
    String(
      value ||
      ''
    ).trim();


  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      clean
    )
  ) {
    return undefined;
  }


  const date =
    new Date(
      clean +
      'T12:00:00.000Z'
    );


  if (
    Number.isNaN(
      date.getTime()
    ) ||
    date
      .toISOString()
      .slice(
        0,
        10
      ) !==
      clean
  ) {
    return undefined;
  }


  return clean;
}


function reportRangeDays(
  startDate:
    string,
  endDate:
    string
) {
  return (
    Math.floor(
      (
        new Date(
          endDate +
          'T12:00:00.000Z'
        ).getTime() -
        new Date(
          startDate +
          'T12:00:00.000Z'
        ).getTime()
      ) /
      (
        24 *
        60 *
        60 *
        1000
      )
    ) +
    1
  );
}


function formatReportDate(
  value:
    string
) {
  const [
    year,
    month,
    day,
  ] =
    value.split(
      '-'
    );


  return [
    day,
    month,
    year,
  ].join(
    '/'
  );
}


export default async function ReelRetentionPage({
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
      periodo?:
        string;

      inicio?:
        string;

      fim?:
        string;
    }>;
}) {
  const currentUser =
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
      query.periodo ||
      30
    );


  const fallbackPeriod =
    Number.isFinite(
      requestedPeriod
    )
      ? Math.min(
          90,
          Math.max(
            1,
            Math.round(
              requestedPeriod
            )
          )
        )
      : 30;


  const requestedStartDate =
    normalizeReportDate(
      query.inicio
    );


  const requestedEndDate =
    normalizeReportDate(
      query.fim
    );


  let startDate:
    string |
    undefined;


  let endDate:
    string |
    undefined;


  let period =
    fallbackPeriod;


  if (
    requestedStartDate &&
    requestedEndDate &&
    requestedStartDate <=
      requestedEndDate
  ) {
    const customDays =
      reportRangeDays(
        requestedStartDate,
        requestedEndDate
      );


    if (
      customDays >=
        1 &&
      customDays <=
        90
    ) {
      startDate =
        requestedStartDate;

      endDate =
        requestedEndDate;

      period =
        customDays;
    }
  }


  const periodLabel =
    startDate &&
    endDate
      ? (
          formatReportDate(
            startDate
          ) +
          ' até ' +
          formatReportDate(
            endDate
          )
        )
      : (
          'Últimos ' +
          String(
            period
          ) +
          ' dias'
        );


  const periodQueryString =
    [
      'periodo=' +
        String(
          period
        ),

      startDate
        ? 'inicio=' +
          startDate
        : '',

      endDate
        ? 'fim=' +
          endDate
        : '',
    ]
      .filter(
        Boolean
      )
      .join(
        '&'
      );

  const client =
    await prisma.client.findFirst({
      where: {
        id,

        agencyId:
          currentUser.agencyId,
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

        instagramConnection: {
          select: {
            instagramUserId:
              true,

            username:
              true,

            userAccessTokenEncrypted:
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

  const connection =
    client.instagramConnection;

  const configured =
    isMetaConfigured();

  let reels:
    InstagramReelRetentionItem[] =
    [];

  if (
    configured &&
    connection
      ?.userAccessTokenEncrypted
  ) {
    try {
      reels =
        await getInstagramReelRetention({
          instagramUserId:
            connection.instagramUserId,

          accessToken:
            decryptMetaSecret(
              connection
                .userAccessTokenEncrypted
            ),

          days:
            period,

          startDate,

          endDate,

          limit:
            30,
        });
    }
    catch (
      error
    ) {
      console.error(
        'INSTAGRAM RETENTION PAGE ERROR',
        error
      );
    }
  }

  const avgRetained =
    average(
      reels.map(
        (
          item
        ) =>
          item.retainedAfter3s
      )
    );

  const avgSkip =
    average(
      reels.map(
        (
          item
        ) =>
          item.skipRate
      )
    );

  const avgWatch =
    average(
      reels.map(
        (
          item
        ) =>
          item.averageWatchTimeMs
      )
    );

  const best =
    reels.find(
      (
        item
      ) =>
        item.retainedAfter3s !==
        null
    ) ||
    reels[0] ||
    null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-sm">
        <div className="p-7 md:p-8">
          <Link
            href={`/clientes/${client.id}/instagram/relatorios?${periodQueryString}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-blue-300 hover:text-blue-200"
          >
            <ArrowLeft
              size={16}
            />

            Voltar ao relatório
          </Link>

          <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white bg-white text-xl font-black text-slate-900">
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
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-300">
                  Relatórios · Retenção de Reels
                </p>

                <h1 className="mt-1 text-3xl font-black tracking-tight text-white">
                  {client.name}
                </h1>

                <p className="mt-1 text-sm text-slate-400">
                  {connection?.username
                    ? `@${connection.username}`
                    : client.segment ||
                      'Cliente AprovUp'}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3">
              <p className="text-xs font-bold text-slate-400">
                Período analisado
              </p>

              <p className="mt-1 text-lg font-black text-white">
                {periodLabel}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex gap-2 overflow-x-auto">
          <Link
            href={`/clientes/${client.id}/instagram/relatorios?${periodQueryString}`}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-100"
          >
            Resumo
          </Link>

          <span className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white">
            Retenção de Reels
          </span>

          <Link
            href={`/clientes/${client.id}/instagram/relatorios/estaticos?${periodQueryString}`}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-100"
          >
            Imagens e Carrosséis
          </Link>

          <Link
            href={`/clientes/${client.id}/instagram/relatorios/analise-ia?${periodQueryString}`}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-100"
          >
            Análise IA
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">
            Janela de análise
          </p>

          <h2 className="mt-1 text-xl font-black text-slate-900">
            Compare os vídeos no mesmo período
          </h2>
        </div>

        <div className="flex flex-col items-start gap-2 md:items-end">

          <span className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">
            {periodLabel}
          </span>

          <Link
            href={`/clientes/${client.id}/instagram/relatorios?${periodQueryString}`}
            className="text-xs font-bold text-blue-600 transition hover:text-blue-700"
          >
            Alterar período
          </Link>

        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Play size={18} />
          </div>

          <p className="mt-5 text-3xl font-black text-slate-900">
            {reels.length}
          </p>

          <p className="mt-1 text-sm font-bold text-slate-600">
            Reels analisados
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Gauge size={18} />
          </div>

          <p className="mt-5 text-3xl font-black text-slate-900">
            {formatPercent(avgRetained)}
          </p>

          <p className="mt-1 text-sm font-bold text-slate-600">
            Retenção inicial média
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <Eye size={18} />
          </div>

          <p className="mt-5 text-3xl font-black text-slate-900">
            {formatPercent(avgSkip)}
          </p>

          <p className="mt-1 text-sm font-bold text-slate-600">
            Skip rate médio
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <Clock3 size={18} />
          </div>

          <p className="mt-5 text-3xl font-black text-slate-900">
            {formatWatchTime(avgWatch)}
          </p>

          <p className="mt-1 text-sm font-bold text-slate-600">
            Tempo médio assistido
          </p>
        </div>
      </section>

      {best ? (
        <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
              <Sparkles size={20} />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-wider text-emerald-600">
                Melhor retenção inicial do período
              </p>

              <p className="mt-1 text-lg font-black text-emerald-950">
                {titleFromCaption(best)}
              </p>

              <p className="mt-2 text-sm font-bold text-emerald-700">
                {formatPercent(best.retainedAfter3s)} permaneceu após o início · {formatWatchTime(best.averageWatchTimeMs)} de tempo médio assistido
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {!connection ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm font-bold text-amber-800">
          Conecte o Instagram deste cliente para analisar retenção.
        </section>
      ) : null}

      {connection && reels.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <Play
            size={34}
            className="mx-auto text-slate-300"
          />

          <p className="mt-4 font-black text-slate-700">
            Nenhum Reel com dados disponível neste período.
          </p>

          <p className="mt-2 text-sm text-slate-400">
            Algumas métricas de retenção podem levar tempo para aparecer na Meta.
          </p>
        </section>
      ) : null}

      <section className="space-y-5">
        {reels.map(
          (
            item,
            index
          ) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr]">
                <div className="relative min-h-72 bg-slate-100">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="h-full min-h-72 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full min-h-72 items-center justify-center text-slate-300">
                      <Play size={42} />
                    </div>
                  )}

                  <span className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-black text-slate-900 shadow-sm">
                    {index + 1}º
                  </span>
                </div>

                <div className="p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-violet-600">
                        Reel · {formatDate(item.timestamp)}
                      </p>

                      <h2 className="mt-2 max-w-3xl text-lg font-black leading-snug text-slate-900">
                        {titleFromCaption(item)}
                      </h2>
                    </div>

                    {item.permalink ? (
                      <a
                        href={item.permalink}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 rounded-xl bg-slate-950 px-4 py-2.5 text-center text-xs font-black text-white"
                      >
                        Abrir Reel
                      </a>
                    ) : null}
                  </div>

                  <div className="mt-6">
                    <RetentionChart
                      retained={item.retainedAfter3s}
                      skipped={item.skipRate}
                    />
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <Eye size={16} className="text-slate-400" />
                      <p className="mt-2 text-xl font-black text-slate-900">
                        {formatNumber(item.views)}
                      </p>
                      <p className="text-xs font-bold text-slate-400">
                        Visualizações
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <Clock3 size={16} className="text-slate-400" />
                      <p className="mt-2 text-xl font-black text-slate-900">
                        {formatWatchTime(item.averageWatchTimeMs)}
                      </p>
                      <p className="text-xs font-bold text-slate-400">
                        Tempo médio
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <Repeat2 size={16} className="text-slate-400" />
                      <p className="mt-2 text-xl font-black text-slate-900">
                        {formatTotalWatchTime(item.totalWatchTimeMs)}
                      </p>
                      <p className="text-xs font-bold text-slate-400">
                        Tempo total
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <Heart size={16} className="text-slate-400" />
                      <p className="mt-2 text-xl font-black text-slate-900">
                        {formatNumber(item.interactions)}
                      </p>
                      <p className="text-xs font-bold text-slate-400">
                        Interações
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                    <span className="rounded-full bg-blue-50 px-3 py-1.5 text-blue-700">
                      {formatNumber(item.reach)} alcance
                    </span>

                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
                      {formatNumber(item.saved)} salvos
                    </span>

                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1.5 text-violet-700">
                      <Share2 size={12} />
                      {formatNumber(item.shares)} compartilhamentos
                    </span>

                    {item.reposts !== null ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1.5">
                        {formatNumber(item.reposts)} reposts
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          )
        )}
      </section>
    </div>
  );
}

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


function RetentionBar({
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

  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-xs font-bold">
        <span className="text-emerald-700">
          Permaneceu após 3s · {formatPercent(retained)}
        </span>

        <span className="text-rose-600">
          Pulou · {formatPercent(skipped)}
        </span>
      </div>

      <div className="mt-3 flex h-5 overflow-hidden rounded-full bg-rose-100">
        <div
          className="h-full bg-emerald-500 transition-all"
          style={{
            width:
              `${Math.max(
                0,
                Math.min(
                  100,
                  retained
                )
              )}%`,
          }}
        />
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
        Este gráfico representa a retenção inicial disponível via API: quanto do público não pulou o Reel nos primeiros segundos. Ele não inventa uma curva segundo a segundo.
      </p>
    </div>
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

  const period =
    [
      7,
      30,
      90,
    ].includes(
      requestedPeriod
    )
      ? requestedPeriod
      : 30;

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
            href={`/clientes/${client.id}/instagram/relatorios?periodo=${period}`}
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
                Últimos {period} dias
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex gap-2 overflow-x-auto">
          <Link
            href={`/clientes/${client.id}/instagram/relatorios?periodo=${period}`}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-100"
          >
            Resumo
          </Link>

          <span className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white">
            Retenção de Reels
          </span>

          <Link
            href={`/clientes/${client.id}/instagram/relatorios/estaticos?periodo=${period}`}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-100"
          >
            Imagens e Carrosséis
          </Link>

          <Link
            href={`/clientes/${client.id}/instagram/relatorios/analise-ia?periodo=${period}`}
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

        <div className="flex flex-wrap gap-2">
          {[7, 30, 90].map(
            (
              option
            ) => (
              <Link
                key={option}
                href={`/clientes/${client.id}/instagram/relatorios/retencao?periodo=${option}`}
                className={
                  option ===
                  period
                    ? 'rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white'
                    : 'rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200'
                }
              >
                {option} dias
              </Link>
            )
          )}
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
                    <RetentionBar
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

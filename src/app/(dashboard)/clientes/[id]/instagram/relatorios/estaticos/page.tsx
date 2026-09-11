import Link from 'next/link';

import {
  BarChart3,
  Bookmark,
  Eye,
  Heart,
  ImageIcon,
  Layers3,
  MessageCircle,
  Share2,
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
  getInstagramStaticMediaPerformance,
  isMetaConfigured,
  type InstagramTopMediaItem,
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
    value === null ||
    !Number.isFinite(
      value
    )
  ) {
    return '—';
  }

  return (
    value
      .toFixed(2)
      .replace(
        '.',
        ','
      ) +
    '%'
  );
}


function rate(
  numerator:
    number | null,
  denominator:
    number | null
) {
  if (
    numerator === null ||
    denominator === null ||
    denominator <= 0
  ) {
    return null;
  }

  return (
    numerator /
    denominator
  ) * 100;
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


function mediaTitle(
  item:
    InstagramTopMediaItem
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
    return item.mediaType ===
      'CAROUSEL_ALBUM'
        ? 'Carrossel publicado no Instagram'
        : 'Imagem publicada no Instagram';
  }

  if (
    caption.length <=
    105
  ) {
    return caption;
  }

  return (
    caption.slice(
      0,
      102
    ) +
    '...'
  );
}


function isCarousel(
  item:
    InstagramTopMediaItem
) {
  return item.mediaType ===
    'CAROUSEL_ALBUM';
}


function averageRate(
  items:
    InstagramTopMediaItem[],
  selector:
    (
      item:
        InstagramTopMediaItem
    ) =>
      number | null
) {
  const values =
    items
      .map(
        selector
      )
      .filter(
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
    values.length ===
    0
  ) {
    return null;
  }

  return (
    values.reduce(
      (
        sum,
        value
      ) =>
        sum +
        value,
      0
    ) /
    values.length
  );
}


function MetricBox({
  label,
  value,
  icon,
}: {
  label:
    string;

  value:
    string;

  icon:
    React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-slate-400">
        {icon}
      </div>

      <p className="mt-2 text-xl font-black text-slate-900">
        {value}
      </p>

      <p className="text-xs font-bold text-slate-400">
        {label}
      </p>
    </div>
  );
}


export default async function StaticMediaMetricsPage({
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

      formato?:
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

  const requestedFormat =
    String(
      query.formato ||
      'todos'
    )
      .trim()
      .toLowerCase();

  const format =
    [
      'todos',
      'imagem',
      'carrossel',
    ].includes(
      requestedFormat
    )
      ? requestedFormat
      : 'todos';

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

  let media:
    InstagramTopMediaItem[] =
    [];

  if (
    configured &&
    connection
      ?.userAccessTokenEncrypted
  ) {
    try {
      media =
        await getInstagramStaticMediaPerformance({
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
            50,
        });
    }
    catch (
      error
    ) {
      console.error(
        'INSTAGRAM STATIC METRICS PAGE ERROR',
        error
      );
    }
  }

  const imageCount =
    media.filter(
      (
        item
      ) =>
        !isCarousel(
          item
        )
    ).length;

  const carouselCount =
    media.filter(
      isCarousel
    ).length;

  const filtered =
    media.filter(
      (
        item
      ) => {
        if (
          format ===
          'imagem'
        ) {
          return !isCarousel(
            item
          );
        }

        if (
          format ===
          'carrossel'
        ) {
          return isCarousel(
            item
          );
        }

        return true;
      }
    );

  const avgInteractionRate =
    averageRate(
      filtered,
      (
        item
      ) =>
        rate(
          item.interactions,
          item.reach
        )
    );

  const avgSaveRate =
    averageRate(
      filtered,
      (
        item
      ) =>
        rate(
          item.saved,
          item.reach
        )
    );

  const avgShareRate =
    averageRate(
      filtered,
      (
        item
      ) =>
        rate(
          item.shares,
          item.reach
        )
    );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-sm">
        <div className="p-7 md:p-8">
          <Link
            href={`/clientes/${client.id}/instagram/relatorios?periodo=${period}`}
            className="text-sm font-bold text-blue-300 hover:text-blue-200"
          >
            &larr; Voltar ao relatório
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
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                  Relatórios · Imagens e Carrosséis
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

          <Link
            href={`/clientes/${client.id}/instagram/relatorios/retencao?periodo=${period}`}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-100"
          >
            Retenção de Reels
          </Link>

          <span className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white">
            Imagens e Carrosséis
          </span>

          <Link
            href={`/clientes/${client.id}/instagram/relatorios/analise-ia?periodo=${period}`}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-100"
          >
            Análise IA
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">
            Métricas individuais por publicação
          </p>

          <h2 className="mt-1 text-xl font-black text-slate-900">
            Imagens e carrosséis do período
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Aqui cada publicação é analisada separadamente. Em carrosséis, os dados são da publicação como um todo; a API da Meta não fornece o avanço card a card.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {[7, 30, 90].map(
            (
              option
            ) => (
              <Link
                key={option}
                href={`/clientes/${client.id}/instagram/relatorios/estaticos?periodo=${option}&formato=${format}`}
                className={
                  option ===
                  period
                    ? 'rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white'
                    : 'rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-200'
                }
              >
                {option} dias
              </Link>
            )
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
            <ImageIcon size={18} />
          </div>

          <p className="mt-5 text-3xl font-black text-slate-900">
            {imageCount}
          </p>

          <p className="mt-1 text-sm font-bold text-slate-600">
            Imagens
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <Layers3 size={18} />
          </div>

          <p className="mt-5 text-3xl font-black text-slate-900">
            {carouselCount}
          </p>

          <p className="mt-1 text-sm font-bold text-slate-600">
            Carrosséis
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <BarChart3 size={18} />
          </div>

          <p className="mt-5 text-3xl font-black text-slate-900">
            {formatPercent(avgInteractionRate)}
          </p>

          <p className="mt-1 text-sm font-bold text-slate-600">
            Interação / alcance
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Bookmark size={18} />
          </div>

          <p className="mt-5 text-3xl font-black text-slate-900">
            {formatPercent(avgSaveRate)}
          </p>

          <p className="mt-1 text-sm font-bold text-slate-600">
            Salvos / alcance
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Share2 size={18} />
          </div>

          <p className="mt-5 text-3xl font-black text-slate-900">
            {formatPercent(avgShareRate)}
          </p>

          <p className="mt-1 text-sm font-bold text-slate-600">
            Compart. / alcance
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {[
            {
              key:
                'todos',
              label:
                `Todos (${media.length})`,
            },
            {
              key:
                'imagem',
              label:
                `Imagens (${imageCount})`,
            },
            {
              key:
                'carrossel',
              label:
                `Carrosséis (${carouselCount})`,
            },
          ].map(
            (
              option
            ) => (
              <Link
                key={option.key}
                href={`/clientes/${client.id}/instagram/relatorios/estaticos?periodo=${period}&formato=${option.key}`}
                className={
                  option.key ===
                  format
                    ? 'rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white'
                    : 'rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-100'
                }
              >
                {option.label}
              </Link>
            )
          )}
        </div>
      </section>

      {!connection ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm font-bold text-amber-800">
          Conecte o Instagram deste cliente para carregar as métricas das publicações.
        </section>
      ) : null}

      {connection && filtered.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <ImageIcon
            size={34}
            className="mx-auto text-slate-300"
          />

          <p className="mt-4 font-black text-slate-700">
            Nenhuma publicação deste formato encontrada no período.
          </p>
        </section>
      ) : null}

      <section className="space-y-5">
        {filtered.map(
          (
            item
          ) => {
            const interactionRate =
              rate(
                item.interactions,
                item.reach
              );

            const saveRate =
              rate(
                item.saved,
                item.reach
              );

            const shareRate =
              rate(
                item.shares,
                item.reach
              );

            return (
              <article
                key={item.id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr]">
                  <div className="relative min-h-80 bg-slate-100">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="h-full min-h-80 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full min-h-80 items-center justify-center text-slate-300">
                        {isCarousel(
                          item
                        ) ? (
                          <Layers3
                            size={44}
                          />
                        ) : (
                          <ImageIcon
                            size={44}
                          />
                        )}
                      </div>
                    )}

                    <span className="absolute left-4 top-4 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-900 shadow-sm">
                      {isCarousel(
                        item
                      )
                        ? 'CARROSSEL'
                        : 'IMAGEM'}
                    </span>
                  </div>

                  <div className="p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-cyan-600">
                          {formatDate(
                            item.timestamp
                          )}
                        </p>

                        <h2 className="mt-2 max-w-3xl text-lg font-black leading-snug text-slate-900">
                          {mediaTitle(
                            item
                          )}
                        </h2>
                      </div>

                      {item.permalink ? (
                        <a
                          href={item.permalink}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 rounded-xl bg-slate-950 px-4 py-2.5 text-center text-xs font-black text-white"
                        >
                          Abrir post
                        </a>
                      ) : null}
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
                      <MetricBox
                        label="Alcance"
                        value={formatNumber(
                          item.reach
                        )}
                        icon={<BarChart3 size={16} />}
                      />

                      <MetricBox
                        label="Visualizações"
                        value={formatNumber(
                          item.views
                        )}
                        icon={<Eye size={16} />}
                      />

                      <MetricBox
                        label="Interações"
                        value={formatNumber(
                          item.interactions
                        )}
                        icon={<Heart size={16} />}
                      />

                      <MetricBox
                        label="Curtidas"
                        value={formatNumber(
                          item.likes
                        )}
                        icon={<Heart size={16} />}
                      />

                      <MetricBox
                        label="Comentários"
                        value={formatNumber(
                          item.comments
                        )}
                        icon={<MessageCircle size={16} />}
                      />

                      <MetricBox
                        label="Salvos"
                        value={formatNumber(
                          item.saved
                        )}
                        icon={<Bookmark size={16} />}
                      />

                      <MetricBox
                        label="Compart."
                        value={formatNumber(
                          item.shares
                        )}
                        icon={<Share2 size={16} />}
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                        <p className="text-xs font-bold text-blue-500">
                          Taxa de interação
                        </p>

                        <p className="mt-1 text-2xl font-black text-blue-900">
                          {formatPercent(
                            interactionRate
                          )}
                        </p>

                        <p className="mt-1 text-[11px] text-blue-600">
                          Interações ÷ alcance
                        </p>
                      </div>

                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                        <p className="text-xs font-bold text-emerald-500">
                          Taxa de salvamento
                        </p>

                        <p className="mt-1 text-2xl font-black text-emerald-900">
                          {formatPercent(
                            saveRate
                          )}
                        </p>

                        <p className="mt-1 text-[11px] text-emerald-600">
                          Salvos ÷ alcance
                        </p>
                      </div>

                      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                        <p className="text-xs font-bold text-amber-500">
                          Taxa de compartilhamento
                        </p>

                        <p className="mt-1 text-2xl font-black text-amber-900">
                          {formatPercent(
                            shareRate
                          )}
                        </p>

                        <p className="mt-1 text-[11px] text-amber-600">
                          Compartilhamentos ÷ alcance
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          }
        )}
      </section>
    </div>
  );
}

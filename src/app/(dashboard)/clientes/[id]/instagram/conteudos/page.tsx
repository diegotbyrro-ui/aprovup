import Link from 'next/link';

import {
  notFound,
} from 'next/navigation';

import {
  BarChart3,
  Bookmark,
  CalendarDays,
  Eye,
  Heart,
  Images,
  MessageCircle,
  Share2,
  SlidersHorizontal,
  Video,
} from 'lucide-react';

import {
  InstagramIcon,
} from '@/components/icons/InstagramIcon';

import {
  prisma,
} from '@/lib/prisma';

import {
  decryptMetaSecret,
} from '@/lib/metaCrypto';

import {
  getInstagramTopMedia,
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


function getMediaType(
  item:
    InstagramTopMediaItem
) {
  if (
    item.mediaProductType ===
    'REELS'
  ) {
    return 'REEL';
  }

  if (
    item.mediaType ===
    'CAROUSEL_ALBUM'
  ) {
    return 'CARROSSEL';
  }

  if (
    item.mediaType ===
    'VIDEO'
  ) {
    return 'VIDEO';
  }

  return 'IMAGEM';
}


function getMediaLabel(
  item:
    InstagramTopMediaItem
) {
  const type =
    getMediaType(
      item
    );

  if (
    type === 'REEL'
  ) {
    return 'Reel';
  }

  if (
    type ===
    'CARROSSEL'
  ) {
    return 'Carrossel';
  }

  if (
    type === 'VIDEO'
  ) {
    return 'Vídeo';
  }

  return 'Imagem';
}


function getTitle(
  item:
    InstagramTopMediaItem
) {
  const text =
    String(
      item.caption ||
      ''
    )
      .replace(
        /\s+/g,
        ' '
      )
      .trim();

  if (!text) {
    return `${getMediaLabel(
      item
    )} publicado no Instagram`;
  }

  if (
    text.length <=
    92
  ) {
    return text;
  }

  return (
    text.slice(
      0,
      89
    ) +
    '...'
  );
}


function engagementRate(
  item:
    InstagramTopMediaItem
) {
  if (
    item.reach === null ||
    item.reach <= 0 ||
    item.interactions ===
      null
  ) {
    return null;
  }

  return (
    item.interactions /
    item.reach
  ) * 100;
}


function Metric({
  label,
  value,
  icon,
}: {
  label:
    string;

  value:
    number | null;

  icon:
    React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5">

      <div className="flex items-center gap-1.5 text-slate-400">
        {icon}

        <span className="text-[10px] font-bold uppercase tracking-wider">
          {label}
        </span>
      </div>

      <p className="mt-1 text-sm font-black text-slate-800">
        {formatNumber(
          value
        )}
      </p>

    </div>
  );
}


export default async function InstagramContentsPage({
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
      tipo?:
        string;

      ordem?:
        string;
    }>;
}) {
  await requirePermission(
    'social.view'
  );

  const {
    id,
  } = await params;

  const query =
    await searchParams;

  const typeFilter =
    String(
      query.tipo ||
      'todos'
    );

  const order =
    String(
      query.ordem ||
      'alcance'
    );


  const client =
    await prisma.client.findUnique({
      where: {
        id,
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
            id:
              true,

            instagramUserId:
              true,

            username:
              true,

            displayName:
              true,

            facebookPageName:
              true,

            userAccessTokenEncrypted:
              true,
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


  let media:
    InstagramTopMediaItem[] =
    [];

  let loadError =
    false;


  if (
    configured &&
    connection
      ?.userAccessTokenEncrypted
  ) {
    try {
      media =
        await getInstagramTopMedia({
          instagramUserId:
            connection.instagramUserId,

          accessToken:
            decryptMetaSecret(
              connection
                .userAccessTokenEncrypted
            ),

          limit:
            24,
        });
    }
    catch (
      error
    ) {
      console.error(
        'INSTAGRAM CONTENTS ERROR',
        error
      );

      loadError =
        true;
    }
  }


  const allMedia =
    [...media];


  const reelCount =
    allMedia.filter(
      (
        item
      ) =>
        getMediaType(
          item
        ) ===
        'REEL'
    ).length;


  const carouselCount =
    allMedia.filter(
      (
        item
      ) =>
        getMediaType(
          item
        ) ===
        'CARROSSEL'
    ).length;


  const imageCount =
    allMedia.filter(
      (
        item
      ) =>
        getMediaType(
          item
        ) ===
        'IMAGEM'
    ).length;


  let filtered =
    allMedia.filter(
      (
        item
      ) => {
        if (
          typeFilter ===
          'todos'
        ) {
          return true;
        }

        return (
          getMediaType(
            item
          ).toLowerCase() ===
          typeFilter
        );
      }
    );


  filtered.sort(
    (
      a,
      b
    ) => {

      if (
        order ===
        'visualizacoes'
      ) {
        return (
          (
            b.views ||
            0
          ) -
          (
            a.views ||
            0
          )
        );
      }


      if (
        order ===
        'interacoes'
      ) {
        return (
          (
            b.interactions ||
            0
          ) -
          (
            a.interactions ||
            0
          )
        );
      }


      if (
        order ===
        'recentes'
      ) {
        return (
          new Date(
            b.timestamp
          ).getTime() -
          new Date(
            a.timestamp
          ).getTime()
        );
      }


      return (
        (
          b.reach ||
          0
        ) -
        (
          a.reach ||
          0
        )
      );
    }
  );


  const monthLabel =
    new Intl.DateTimeFormat(
      'pt-BR',
      {
        month:
          'long',

        year:
          'numeric',
      }
    ).format(
      new Date()
    );


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
                  {connection?.username
                    ? `@${connection.username}`
                    : client.segment ||
                      'Cliente AprovUp'}
                </p>

              </div>

            </div>


            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">

              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Período
              </p>

              <p className="mt-1 text-sm font-bold capitalize text-white">
                {monthLabel}
              </p>

            </div>

          </div>

        </div>


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


      {/* STATUS */}

      {connection ? (

        <section className="flex flex-col gap-4 rounded-3xl border border-emerald-100 bg-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <InstagramIcon
                size={20}
              />
            </div>

            <div>

              <p className="font-bold text-slate-900">
                {connection.username
                  ? `@${connection.username}`
                  : 'Instagram conectado'}
              </p>

              <p className="text-xs text-slate-500">
                Página: {connection.facebookPageName || 'Meta'}
              </p>

            </div>

          </div>

          <span className="w-fit rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700">
            ● Conectado
          </span>

        </section>

      ) : (

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">

          <p className="font-bold text-amber-900">
            Instagram não conectado
          </p>

          <Link
            href={`/clientes/${client.id}/instagram`}
            className="mt-2 inline-block text-sm font-bold text-amber-700 underline"
          >
            Ir para conexão
          </Link>

        </section>

      )}


      {/* ABAS */}

      <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">

        <div className="flex gap-2 overflow-x-auto">

          <Link
            href={`/clientes/${client.id}/instagram`}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-100"
          >
            Visão geral
          </Link>

          <span className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">
            Conteúdos
          </span>

          <Link
            href={`/clientes/${client.id}/instagram/relatorios`}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-100"
          >
            Relatórios
          </Link>

        </div>

      </section>


      {/* RESUMO */}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <BarChart3
            size={18}
            className="text-blue-600"
          />

          <p className="mt-4 text-3xl font-black text-slate-900">
            {allMedia.length}
          </p>

          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">
            Publicações
          </p>

        </div>


        <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5 shadow-sm">

          <Video
            size={18}
            className="text-violet-600"
          />

          <p className="mt-4 text-3xl font-black text-violet-900">
            {reelCount}
          </p>

          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-violet-500">
            Reels
          </p>

        </div>


        <div className="rounded-2xl border border-orange-100 bg-orange-50 p-5 shadow-sm">

          <Images
            size={18}
            className="text-orange-600"
          />

          <p className="mt-4 text-3xl font-black text-orange-900">
            {carouselCount}
          </p>

          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-orange-500">
            Carrosséis
          </p>

        </div>


        <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-5 shadow-sm">

          <Images
            size={18}
            className="text-cyan-600"
          />

          <p className="mt-4 text-3xl font-black text-cyan-900">
            {imageCount}
          </p>

          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-cyan-500">
            Imagens
          </p>

        </div>

      </section>


      {/* FILTROS */}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="mb-4 flex items-center gap-2">

          <SlidersHorizontal
            size={17}
            className="text-slate-500"
          />

          <p className="text-sm font-bold text-slate-800">
            Filtrar conteúdos
          </p>

        </div>


        <form className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">

          <select
            name="tipo"
            defaultValue={typeFilter}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="todos">
              Todos os formatos
            </option>

            <option value="reel">
              Reels
            </option>

            <option value="carrossel">
              Carrosséis
            </option>

            <option value="imagem">
              Imagens
            </option>

            <option value="video">
              Vídeos
            </option>
          </select>


          <select
            name="ordem"
            defaultValue={order}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="alcance">
              Maior alcance
            </option>

            <option value="visualizacoes">
              Mais visualizações
            </option>

            <option value="interacoes">
              Mais interações
            </option>

            <option value="recentes">
              Mais recentes
            </option>
          </select>


          <button
            type="submit"
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Aplicar
          </button>

        </form>

      </section>


      {/* CONTEUDOS */}

      {!configured && connection ? (

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">

          <p className="font-bold text-amber-900">
            Configuração Meta pendente no servidor
          </p>

        </section>

      ) : loadError ? (

        <section className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">

          <p className="font-bold text-red-900">
            Não foi possível carregar as publicações agora.
          </p>

          <p className="mt-2 text-sm text-red-700">
            Tente atualizar a página em alguns instantes.
          </p>

        </section>

      ) : filtered.length === 0 ? (

        <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">

          <Images
            size={36}
            className="mx-auto text-slate-300"
          />

          <p className="mt-4 font-bold text-slate-700">
            Nenhum conteúdo encontrado
          </p>

          <p className="mt-1 text-sm text-slate-400">
            Não há publicações para este filtro no mês atual.
          </p>

        </section>

      ) : (

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">

          {filtered.map(
            (
              item
            ) => {

              const rate =
                engagementRate(
                  item
                );

              return (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >

                  <div className="flex flex-col sm:flex-row">

                    <div className="relative aspect-square w-full shrink-0 bg-slate-100 sm:w-48">

                      {item.imageUrl ? (

                        <img
                          src={item.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />

                      ) : (

                        <div className="flex h-full w-full items-center justify-center">

                          <InstagramIcon
                            size={32}
                            className="text-slate-300"
                          />

                        </div>

                      )}


                      <span className="absolute left-3 top-3 rounded-full bg-slate-950/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white">
                        {getMediaLabel(
                          item
                        )}
                      </span>

                    </div>


                    <div className="min-w-0 flex-1 p-5">

                      <div className="flex items-start justify-between gap-4">

                        <div className="min-w-0">

                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">

                            <CalendarDays
                              size={13}
                            />

                            {new Date(
                              item.timestamp
                            ).toLocaleDateString(
                              'pt-BR'
                            )}

                          </div>


                          <h2 className="mt-2 line-clamp-3 text-sm font-bold leading-relaxed text-slate-900">
                            {getTitle(
                              item
                            )}
                          </h2>

                        </div>


                        {item.permalink && (

                          <a
                            href={item.permalink}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                          >
                            Abrir
                          </a>

                        )}

                      </div>


                      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">

                        <Metric
                          label="Alcance"
                          value={item.reach}
                          icon={
                            <BarChart3
                              size={13}
                            />
                          }
                        />

                        <Metric
                          label="Views"
                          value={item.views}
                          icon={
                            <Eye
                              size={13}
                            />
                          }
                        />

                        <Metric
                          label="Interações"
                          value={
                            item.interactions
                          }
                          icon={
                            <Heart
                              size={13}
                            />
                          }
                        />

                        <Metric
                          label="Curtidas"
                          value={
                            item.likes
                          }
                          icon={
                            <Heart
                              size={13}
                            />
                          }
                        />

                        <Metric
                          label="Comentários"
                          value={
                            item.comments
                          }
                          icon={
                            <MessageCircle
                              size={13}
                            />
                          }
                        />

                        <Metric
                          label="Salvos"
                          value={
                            item.saved
                          }
                          icon={
                            <Bookmark
                              size={13}
                            />
                          }
                        />

                      </div>


                      <div className="mt-3 flex flex-wrap items-center gap-2">

                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">

                          <Share2
                            size={13}
                          />

                          {formatNumber(
                            item.shares
                          )} compartilhamentos

                        </span>


                        {rate !== null && (

                          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">

                            {rate
                              .toFixed(1)
                              .replace(
                                '.',
                                ','
                              )}% interação / alcance

                          </span>

                        )}

                      </div>

                    </div>

                  </div>

                </article>
              );
            }
          )}

        </section>

      )}


      <p className="pb-2 text-center text-xs text-slate-400">
        Analisando até 24 publicações do mês atual diretamente pela Meta.
      </p>

    </div>
  );
}

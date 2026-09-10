import Link from 'next/link';

import {
  requireSaasFeature,
} from '@/lib/saasAccess';

import {
  prisma,
} from '@/lib/prisma';

import {
  requireAgencyContext,
} from '@/lib/tenant';

import {
  enableStoryForContent,
  markStoryAsPublished,
} from '../actions';

import {
  InstagramStoryPublishButton,
} from '@/components/instagram/InstagramStoryPublishButton';

import {
  InstagramStoryScheduleControl,
} from '@/components/instagram/InstagramStoryScheduleControl';


function formatDate(
  date:
    Date | null
) {
  if (!date) {
    return 'Sem data';
  }

  return new Date(date)
    .toLocaleDateString(
      'pt-BR'
    );
}


function isStoryOnly(
  format:
    string | null
) {
  return String(format || '')
    .trim()
    .toUpperCase()
    .includes('STORY');
}


function isCarousel(
  format:
    string | null
) {
  const value =
    String(format || '')
      .trim()
      .toUpperCase();

  return (
    value.includes('CARROSSEL') ||
    value.includes('CAROUSEL') ||
    value.includes('ALBUM')
  );
}


export default async function StoriesPage({
  searchParams,
}: {
  searchParams:
    Promise<{
      cliente?: string;
    }>;
}) {
  await requireSaasFeature(
    'socialPosting'
  );

  const {
    agencyId,
  } =
    await requireAgencyContext();

  const params =
    await searchParams;

  const selectedClient =
    params.cliente ||
    'TODOS';

  const clients =
    await prisma.client.findMany({
      where: {
        agencyId,
      },

      orderBy: {
        name:
          'asc',
      },
    });

  const contents =
    await prisma.content.findMany({
      where: {
        client: {
          agencyId,
        },

        status: {
          in: [
            'PRONTO_PARA_POSTAR',
            'PUBLICADO',
            'PUBLICADO_MANUALMENTE',
          ],
        },

        ...(
          selectedClient !== 'TODOS'
            ? {
                clientId:
                  selectedClient,
              }
            : {}
        ),
      },

      include: {
        client: {
          include: {
            instagramConnection:
              true,
          },
        },

        instagramStoryPublication:
          true,

        instagramPublication:
          true,

        instagramMediaAssets: {
          orderBy: {
            position:
              'asc',
          },
        },
      },

      orderBy: [
        {
          plannedDate:
            'desc',
        },
        {
          createdAt:
            'desc',
        },
      ],

      take:
        150,
    });

  const prepared =
    contents.filter(
      (
        content
      ) =>
        Boolean(
          content.storyMediaUrl ||
          content.instagramStoryPublication ||
          isStoryOnly(content.format)
        )
    );

  const available =
    contents.filter(
      (
        content
      ) => {
        if (
          content.storyMediaUrl ||
          content.instagramStoryPublication ||
          isStoryOnly(content.format) ||
          isCarousel(content.format)
        ) {
          return false;
        }

        const mediaType =
          String(
            content.finalMediaType || ''
          );

        return Boolean(
          content.finalMediaUrl &&
          (
            mediaType.startsWith('image/') ||
            mediaType.startsWith('video/')
          )
        );
      }
    );

  const feedHref =
    selectedClient === 'TODOS'
      ? '/pronto-para-postar'
      : `/pronto-para-postar?cliente=${encodeURIComponent(selectedClient)}`;

  const storiesHref =
    selectedClient === 'TODOS'
      ? '/pronto-para-postar/stories'
      : `/pronto-para-postar/stories?cliente=${encodeURIComponent(selectedClient)}`;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-8 shadow-sm">
        <div className="absolute -right-10 -top-10 h-52 w-52 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-52 w-52 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="relative z-10">
          <Link
            href="/clientes"
            className="mb-3 inline-block text-sm text-blue-200 hover:underline"
          >
            &larr; Voltar para Dashboard
          </Link>

          <p className="text-sm font-bold uppercase tracking-wider text-fuchsia-300">
            Central de publicacao
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
            Pronto para Postar
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
            Feed e Stories possuem publicacao e agendamento independentes.
            Um material do Feed tambem pode ser enviado aos Stories.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        <Link
          href={feedHref}
          className="rounded-xl px-4 py-3 text-center text-sm font-black text-slate-500 hover:bg-slate-50"
        >
          Feed
        </Link>

        <Link
          href={storiesHref}
          className="rounded-xl bg-fuchsia-600 px-4 py-3 text-center text-sm font-black text-white shadow-sm"
        >
          Stories
          <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
            {prepared.length}
          </span>
        </Link>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form
          action="/pronto-para-postar/stories"
          method="GET"
          className="grid gap-3 md:grid-cols-[1fr_auto]"
        >
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Cliente
            </label>

            <select
              name="cliente"
              defaultValue={selectedClient}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700"
            >
              <option value="TODOS">
                Todos os clientes
              </option>

              {
                clients.map(
                  (
                    client
                  ) => (
                    <option
                      key={client.id}
                      value={client.id}
                    >
                      {client.name}
                    </option>
                  )
                )
              }
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-bold text-white"
            >
              Aplicar filtro
            </button>
          </div>
        </form>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-fuchsia-500">
              Fila de Stories
            </p>

            <h2 className="mt-1 text-2xl font-black text-slate-900">
              Prontos para Story
            </h2>
          </div>

          <span className="rounded-full border border-fuchsia-100 bg-fuchsia-50 px-3 py-1 text-xs font-black text-fuchsia-700">
            {prepared.length} preparado(s)
          </span>
        </div>

        {
          prepared.length === 0
            ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <p className="font-bold text-slate-800">
                  Nenhum Story preparado.
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Adicione abaixo uma foto ou video aprovado do Feed ou use o material especifico de Story enviado na producao.
                </p>
              </div>
            )
            : (
              <div className="grid gap-5 lg:grid-cols-2">
                {
                  prepared.map(
                    (
                      content
                    ) => {
                      const publication =
                        content.instagramStoryPublication;

                      const storyOnly =
                        isStoryOnly(content.format);

                      const mediaUrl =
                        content.storyMediaUrl ||
                        publication?.mediaUrl ||
                        (
                          storyOnly
                            ? content.finalMediaUrl
                            : null
                        );

                      const mediaType =
                        content.storyMediaUrl
                          ? content.storyMediaType || ''
                          : publication?.mediaUrl
                            ? publication.mediaType || ''
                            : content.finalMediaType || '';

                      const connected =
                        Boolean(
                          content.client.instagramConnection
                        );

                      const mediaReady =
                        Boolean(
                          mediaUrl &&
                          (
                            mediaType.startsWith('image/') ||
                            mediaType.startsWith('video/')
                          )
                        );

                      const ready =
                        connected &&
                        mediaReady;

                      const status =
                        publication?.status ||
                        'PRONTO';

                      const scheduled =
                        status ===
                          'AGENDADO';

                      const published =
                        status ===
                          'PUBLICADO';

                      const manual =
                        markStoryAsPublished.bind(
                          null,
                          content.id
                        );

                      return (
                        <article
                          key={content.id}
                          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                        >
                          <div className="grid gap-5 p-5 sm:grid-cols-[170px_1fr]">
                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
                              <div className="aspect-[9/16]">
                                {
                                  mediaUrl &&
                                  mediaType.startsWith('video/')
                                    ? (
                                      <video
                                        src={mediaUrl}
                                        controls
                                        playsInline
                                        className="h-full w-full object-cover"
                                      />
                                    )
                                    : mediaUrl
                                      ? (
                                        <img
                                          src={mediaUrl}
                                          alt=""
                                          className="h-full w-full object-cover"
                                        />
                                      )
                                      : (
                                        <div className="flex h-full items-center justify-center p-5 text-center text-xs font-bold text-slate-400">
                                          Material indisponivel
                                        </div>
                                      )
                                }
                              </div>
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-fuchsia-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-fuchsia-700">
                                  Story
                                </span>

                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">
                                  {
                                    content.storyMediaUrl
                                      ? 'Arte especifica'
                                      : 'Material do Feed'
                                  }
                                </span>

                                {
                                  published
                                    ? (
                                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">
                                        Publicado
                                      </span>
                                    )
                                    : null
                                }
                              </div>

                              <h3 className="mt-3 text-lg font-black text-slate-900">
                                {content.title}
                              </h3>

                              <p className="mt-1 text-sm font-bold text-slate-500">
                                {content.client.name}
                              </p>

                              <p className="mt-2 text-xs text-slate-500">
                                Data prevista: {formatDate(content.plannedDate)}
                              </p>

                              {
                                !published
                                  ? (
                                    <div className="mt-4 space-y-3">
                                      <InstagramStoryPublishButton
                                        contentId={content.id}
                                        enabled={ready}
                                        scheduled={scheduled}
                                        disabledReason={
                                          !connected
                                            ? 'Instagram nao conectado'
                                            : !mediaReady
                                              ? 'Material indisponivel'
                                              : undefined
                                        }
                                      />

                                      <InstagramStoryScheduleControl
                                        contentId={content.id}
                                        enabled={ready}
                                        disabledReason={
                                          !connected
                                            ? 'Instagram nao conectado'
                                            : !mediaReady
                                              ? 'Material indisponivel'
                                              : undefined
                                        }
                                        publicationStatus={status}
                                        scheduledFor={
                                          publication?.scheduledFor?.toISOString() ||
                                          null
                                        }
                                      />

                                      <form action={manual}>
                                        <button
                                          type="submit"
                                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600"
                                        >
                                          Marcar Story como publicado manualmente
                                        </button>
                                      </form>
                                    </div>
                                  )
                                  : (
                                    <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
                                      Story finalizado.
                                    </div>
                                  )
                              }
                            </div>
                          </div>
                        </article>
                      );
                    }
                  )
                }
              </div>
            )
        }
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wider text-blue-500">
          Reaproveitar material
        </p>

        <h2 className="mt-1 text-xl font-black text-slate-900">
          Tambem publicar nos Stories
        </h2>

        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Fotos e videos aprovados para o Feed podem entrar tambem na fila de Stories.
          Carrosseis ficam de fora porque precisam de tratamento proprio.
        </p>

        {
          available.length === 0
            ? (
              <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                Nenhum material do Feed disponivel para adicionar.
              </p>
            )
            : (
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {
                  available.map(
                    (
                      content
                    ) => {
                      const action =
                        enableStoryForContent.bind(
                          null,
                          content.id
                        );

                      return (
                        <article
                          key={content.id}
                          className="rounded-xl border border-slate-200 p-4"
                        >
                          <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                            {content.client.name}
                          </p>

                          <h3 className="mt-2 font-black text-slate-900">
                            {content.title}
                          </h3>

                          <p className="mt-2 text-xs text-slate-500">
                            {
                              content.finalMediaType?.startsWith('video/')
                                ? 'Video / Reel'
                                : 'Imagem do Feed'
                            }
                            {' · '}
                            {formatDate(content.plannedDate)}
                          </p>

                          <form
                            action={action}
                            className="mt-4"
                          >
                            <button
                              type="submit"
                              className="w-full rounded-lg bg-fuchsia-50 px-3 py-2.5 text-xs font-black text-fuchsia-700 hover:bg-fuchsia-100"
                            >
                              Adicionar aos Stories
                            </button>
                          </form>
                        </article>
                      );
                    }
                  )
                }
              </div>
            )
        }
      </section>
    </div>
  );
}

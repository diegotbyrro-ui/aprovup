import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

import {
  prisma,
} from '@/lib/prisma';

import {
  FINAL_PENDING_STATUSES,
} from '@/lib/finalMonthlyApproval';

import {
  approveIndividualContentAction,
  requestIndividualChangesAction,
} from './actions';


function formatDate(
  value:
    Date | null
) {

  if (!value) {
    return 'Sem data';
  }


  return new Date(
    value
  ).toLocaleDateString(
    'pt-BR',
    {
      timeZone:
        'America/Maceio',

      day:
        '2-digit',

      month:
        'long',

      year:
        'numeric',
    }
  );
}


function isVideo(
  mimeType:
    string | null,
  url:
    string
) {

  if (
    String(
      mimeType ||
      ''
    ).startsWith(
      'video/'
    )
  ) {
    return true;
  }


  return /\.(mp4|mov|m4v|webm)(\?|$)/i.test(
    url
  );
}


export default async function IndividualApprovalPage({
  params,
  searchParams,
}: {
  params:
    Promise<{
      token:
        string;
    }>;

  searchParams?:
    Promise<{
      feedback?:
        string;

      error?:
        string;
    }>;
}) {

  const {
    token,
  } =
    await params;


  const query =
    searchParams
      ? await searchParams
      : {};


  const approval =
    await prisma.approval.findUnique({
      where: {
        token,
      },

      include: {
        content: {
          include: {
            client:
              true,

            instagramMediaAssets: {
              orderBy: {
                position:
                  'asc',
              },
            },
          },
        },
      },
    });


  if (
    !approval ||
    !approval.content
  ) {

    return (
      <main className="min-h-screen bg-slate-100 p-5 md:p-10">

        <section className="mx-auto max-w-3xl rounded-3xl bg-white p-8 text-center shadow-sm">

          <AlertTriangle
            size={32}
            className="mx-auto text-red-500"
          />

          <h1 className="mt-4 text-2xl font-black text-slate-900">
            Link de aprovação inválido
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Solicite um novo link à equipe responsável.
          </p>

        </section>

      </main>
    );
  }


  const content =
    approval.content;


  const assets =
    content.instagramMediaAssets;


  const approved =
    approval.status ===
      'APROVADO' ||
    [
      'PRONTO_PARA_POSTAR',
      'PUBLICADO',
      'PUBLICADO_MANUALMENTE',
    ].includes(
      content.status
    );


  const adjustmentRequested =
    approval.status ===
    'ALTERACAO_SOLICITADA';


  const pending =
    approval.status ===
      'PENDENTE' &&
    FINAL_PENDING_STATUSES.includes(
      content.status
    );


  const feedback =
    String(
      query?.feedback ||
      ''
    );


  const error =
    String(
      query?.error ||
      ''
    );


  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">

      <div className="mx-auto max-w-5xl space-y-6">

        <section className="rounded-3xl bg-slate-950 p-7 text-white shadow-sm">

          <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-300">
            Aprovação individual
          </p>

          <h1 className="mt-2 text-3xl font-black">
            {content.client.name}
          </h1>

          <p className="mt-2 text-sm text-slate-300">
            Revise este conteúdo e aprove ou solicite uma alteração.
          </p>

        </section>


        {feedback ===
        'aprovado' ? (

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            Conteúdo aprovado com sucesso.
          </div>

        ) : null}


        {feedback ===
        'ajuste' ? (

          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm font-bold text-orange-700">
            Solicitação de ajuste enviada à equipe.
          </div>

        ) : null}


        {error ===
        'empty-adjustment' ? (

          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            Escreva o ajuste solicitado antes de enviar.
          </div>

        ) : null}


        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">

          <div className="space-y-5">

            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

              <div className="flex flex-wrap gap-2">

                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
                  {content.format || 'Conteúdo'}
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  {formatDate(
                    content.plannedDate
                  )}
                </span>

              </div>


              <h2 className="mt-4 text-2xl font-black text-slate-950">
                {content.title}
              </h2>


              {content.caption ? (

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">

                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                    Legenda
                  </p>

                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                    {content.caption}
                  </p>

                </div>

              ) : null}

            </article>


            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 px-6 py-4">

                <h2 className="font-black text-slate-900">
                  Material para aprovação
                </h2>

              </div>


              <div className="p-5">

                {assets.length >
                0 ? (

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                    {assets.map(
                      (
                        asset
                      ) => (

                        <div
                          key={
                            asset.id
                          }
                          className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950"
                        >

                          {isVideo(
                            asset.mimeType,
                            asset.url
                          ) ? (

                            <video
                              src={
                                asset.url
                              }
                              controls
                              playsInline
                              className="max-h-[680px] w-full object-contain"
                            />

                          ) : (

                            <img
                              src={
                                asset.url
                              }
                              alt="Material para aprovação"
                              className="max-h-[680px] w-full object-contain"
                            />

                          )}

                        </div>

                      )
                    )}

                  </div>

                ) : content.finalMediaUrl ? (

                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">

                    {isVideo(
                      content.finalMediaType,
                      content.finalMediaUrl
                    ) ? (

                      <video
                        src={
                          content.finalMediaUrl
                        }
                        poster={
                          content.finalCoverUrl ||
                          undefined
                        }
                        controls
                        playsInline
                        className="max-h-[720px] w-full object-contain"
                      />

                    ) : (

                      <img
                        src={
                          content.finalMediaUrl
                        }
                        alt="Material final"
                        className="max-h-[720px] w-full object-contain"
                      />

                    )}

                  </div>

                ) : content.finalCoverUrl ? (

                  <img
                    src={
                      content.finalCoverUrl
                    }
                    alt="Material final"
                    className="mx-auto max-h-[720px] rounded-2xl object-contain"
                  />

                ) : content.finalExternalUrl ? (

                  <a
                    href={
                      content.finalExternalUrl
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-4 text-sm font-black text-white"
                  >

                    <ExternalLink
                      size={17}
                    />

                    Abrir material

                  </a>

                ) : content.storyMediaUrl ? (

                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">

                    {isVideo(
                      content.storyMediaType,
                      content.storyMediaUrl
                    ) ? (

                      <video
                        src={
                          content.storyMediaUrl
                        }
                        poster={
                          content.storyCoverUrl ||
                          undefined
                        }
                        controls
                        playsInline
                        className="max-h-[720px] w-full object-contain"
                      />

                    ) : (

                      <img
                        src={
                          content.storyMediaUrl
                        }
                        alt="Story"
                        className="max-h-[720px] w-full object-contain"
                      />

                    )}

                  </div>

                ) : (

                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
                    Material final ainda não disponível.
                  </div>

                )}

              </div>

            </section>

          </div>


          <aside>

            <section className="sticky top-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

              {approved ? (

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-700">

                  <CheckCircle2
                    size={24}
                  />

                  <p className="mt-3 font-black">
                    Conteúdo aprovado
                  </p>

                  <p className="mt-1 text-sm">
                    A equipe já recebeu sua aprovação.
                  </p>

                </div>

              ) : adjustmentRequested ? (

                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 text-orange-700">

                  <AlertTriangle
                    size={24}
                  />

                  <p className="mt-3 font-black">
                    Ajuste solicitado
                  </p>

                  <p className="mt-1 text-sm">
                    A equipe recebeu sua solicitação.
                  </p>

                </div>

              ) : pending ? (

                <div className="space-y-5">

                  <form
                    action={
                      approveIndividualContentAction.bind(
                        null,
                        token
                      )
                    }
                  >

                    <button
                      type="submit"
                      className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700"
                    >
                      Aprovar conteúdo
                    </button>

                  </form>


                  <div className="border-t border-slate-100 pt-4">

                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                      Solicitar ajuste
                    </p>

                    <form
                      action={
                        requestIndividualChangesAction.bind(
                          null,
                          token
                        )
                      }
                      className="mt-2 space-y-3"
                    >

                      <textarea
                        name="message"
                        required
                        rows={6}
                        maxLength={2000}
                        placeholder="Escreva aqui o que precisa ser alterado..."
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-50"
                      />

                      <button
                        type="submit"
                        className="w-full rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-white hover:bg-orange-600"
                      >
                        Enviar solicitação de ajuste
                      </button>

                    </form>

                  </div>

                </div>

              ) : (

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                  Este conteúdo não está mais aguardando uma decisão.
                </div>

              )}

            </section>

          </aside>

        </section>

      </div>

    </main>
  );
}
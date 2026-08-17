import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

import {
  approveFinalContentAction,
  requestFinalChangesAction,
} from './actions';

function statusLabel(status: string) {
  if (status === 'ENVIADO_CLIENTE') {
    return 'Aguardando aprovacao';
  }

  if (status === 'ALTERACAO_SOLICITADA') {
    return 'Alteracao solicitada';
  }

  if (status === 'PRONTO_PARA_POSTAR') {
    return 'Aprovado';
  }

  return status;
}

function isVideo(content: {
  finalMediaType?: string | null;
  format?: string | null;
}) {
  const type =
    String(content.finalMediaType || '').toLowerCase();

  const format =
    String(content.format || '').toUpperCase();

  return (
    type.includes('video') ||
    format.includes('REEL') ||
    format.includes('VIDEO') ||
    format.includes('TIKTOK') ||
    format.includes('SHORT')
  );
}

export default async function FinalApprovalPage({
  params,
  searchParams,
}: {
  params: Promise<{
    token: string;
  }>;

  searchParams?: Promise<{
    feedback?: string;
    error?: string;
  }>;
}) {
  const { token } = await params;

  const query =
    searchParams
      ? await searchParams
      : {};

  const gatewayApproval =
    await prisma.approval.findUnique({
      where: {
        token,
      },
      include: {
        content: {
          include: {
            client: true,
          },
        },
      },
    });

  if (!gatewayApproval) {
    notFound();
  }

  const client =
    gatewayApproval.content.client;

  const contents = await prisma.content.findMany({
    where: {
      clientId: client.id,
      status: {
        in: [
          'ENVIADO_CLIENTE',
          'ALTERACAO_SOLICITADA',
          'PRONTO_PARA_POSTAR',
        ],
      },
      approvals: {
        some: {},
      },
    },
    include: {
      approvals: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
    orderBy: [
      {
        plannedDate: 'asc',
      },
      {
        createdAt: 'asc',
      },
    ],
  });

  const pending = contents.filter(
    (content) =>
      content.status === 'ENVIADO_CLIENTE'
  );

  const approved = contents.filter(
    (content) =>
      content.status === 'PRONTO_PARA_POSTAR'
  );

  const changes = contents.filter(
    (content) =>
      content.status === 'ALTERACAO_SOLICITADA'
  );

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl bg-slate-950 p-8 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-300">
            {'2\u00aa Etapa de Aprova\u00e7\u00e3o'}
          </p>

          <h1 className="mt-3 text-4xl font-black">
            {client.name}
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
            {
              'Revise as artes e videos finalizados. Aprove o material ou descreva o ajuste necessario.'
            }
          </p>
        </section>

        {query.feedback === 'aprovado' && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-800">
            Material aprovado com sucesso.
          </div>
        )}

        {query.feedback === 'alteracao' && (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 font-bold text-orange-800">
            Solicitacao enviada para a equipe.
          </div>
        )}

        {query.error === 'empty' && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">
            Escreva o ajuste solicitado antes de enviar.
          </div>
        )}

        {query.error === 'not-pending' && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">
            Este material nao possui aprovacao pendente.
          </div>
        )}

        <section className="grid grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white p-5">
            <p className="text-xs font-bold uppercase text-slate-400">
              Pendentes
            </p>

            <p className="mt-2 text-3xl font-black">
              {pending.length}
            </p>
          </div>

          <div className="rounded-2xl bg-emerald-50 p-5">
            <p className="text-xs font-bold uppercase text-emerald-500">
              Aprovados
            </p>

            <p className="mt-2 text-3xl font-black text-emerald-800">
              {approved.length}
            </p>
          </div>

          <div className="rounded-2xl bg-orange-50 p-5">
            <p className="text-xs font-bold uppercase text-orange-500">
              Ajustes
            </p>

            <p className="mt-2 text-3xl font-black text-orange-800">
              {changes.length}
            </p>
          </div>
        </section>

        {contents.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-xl font-black text-slate-900">
              Nenhum material aguardando aprovacao final.
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {
                'Quando a equipe finalizar novas artes ou videos, eles aparecerao aqui.'
              }
            </p>
          </section>
        ) : (
          <section className="space-y-5">
            {contents.map((content) => {
              const mediaUrl =
                content.finalMediaUrl ||
                content.finalCoverUrl ||
                content.coverImageUrl ||
                '';

              const approvedContent =
                content.status === 'PRONTO_PARA_POSTAR';

              const adjustmentContent =
                content.status === 'ALTERACAO_SOLICITADA';

              return (
                                <article
                  key={content.id}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="grid xl:grid-cols-[minmax(0,1fr)_360px]">

                    <div className="p-6">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-bold text-pink-700">
                          Instagram
                        </span>

                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                          {content.format || 'Conteudo'}
                        </span>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                          {statusLabel(content.status)}
                        </span>
                      </div>

                      <h2 className="mt-4 text-2xl font-black text-slate-900">
                        {content.title}
                      </h2>

                      <div className="mt-6 rounded-3xl bg-slate-100 p-4 sm:p-6">
                        <div className="mx-auto max-w-[390px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                            {client.logoUrl ? (
                              <img
                                src={client.logoUrl}
                                alt={client.name}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-blue-600 text-sm font-black text-white">
                                {client.name.slice(0, 1).toUpperCase()}
                              </div>
                            )}

                            <div>
                              <p className="text-sm font-black text-slate-900">
                                {client.name}
                              </p>

                              <p className="text-xs text-slate-400">
                                Publicacao em aprovacao
                              </p>
                            </div>
                          </div>

                          <div className="bg-black">
                            {mediaUrl ? (
                              isVideo(content) ? (
                                <video
                                  src={mediaUrl}
                                  controls
                                  className="aspect-[4/5] w-full object-contain"
                                />
                              ) : (
                                <img
                                  src={mediaUrl}
                                  alt={content.title}
                                  className="aspect-[4/5] w-full object-cover"
                                />
                              )
                            ) : (
                              <div className="flex aspect-[4/5] items-center justify-center bg-slate-200 p-8 text-center text-sm font-bold text-slate-500">
                                Material final ainda nao disponivel.
                              </div>
                            )}
                          </div>

                          <div className="px-4 pb-4 pt-3">

                            <div className="mb-3 flex items-center justify-between text-xl text-slate-800">
                              <div className="flex gap-4">
                                <span>♡</span>
                                <span>○</span>
                                <span>↗</span>
                              </div>

                              <span>▱</span>
                            </div>

                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                              <span className="mr-1 font-black text-slate-900">
                                {client.name}
                              </span>

                              {content.caption || 'Nenhuma legenda cadastrada.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <aside className="border-t border-slate-200 bg-slate-50 p-6 xl:border-l xl:border-t-0 xl:pt-16">

                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                        Aprovacao
                      </p>

                      <p className="mt-2 text-xl font-black text-slate-900">
                        {statusLabel(content.status)}
                      </p>

                      {approvedContent ? (
                        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                          <p className="font-black text-emerald-800">
                            Conteudo aprovado
                          </p>

                          <p className="mt-1 text-sm text-emerald-700">
                            Este material ja foi aprovado na segunda etapa.
                          </p>
                        </div>
                      ) : adjustmentContent ? (
                        <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-5">
                          <p className="font-black text-orange-800">
                            Ajuste solicitado
                          </p>

                          <p className="mt-1 text-sm text-orange-700">
                            A solicitacao foi enviada para a equipe.
                          </p>
                        </div>
                      ) : (
                        <div className="mt-6 space-y-6">

                          <form
                            action={approveFinalContentAction.bind(
                              null,
                              token,
                              content.id
                            )}
                          >
                            <button
                              type="submit"
                              className="w-full rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700"
                            >
                              Aprovar conteudo
                            </button>
                          </form>

                          <div className="border-t border-slate-200 pt-5">

                            <p className="text-sm font-black text-slate-900">
                              Precisa de algum ajuste?
                            </p>

                            <p className="mt-1 text-xs leading-relaxed text-slate-500">
                              Descreva abaixo exatamente o que deseja alterar.
                            </p>

                            <form
                              action={requestFinalChangesAction.bind(
                                null,
                                token,
                                content.id
                              )}
                              className="mt-4 space-y-3"
                            >
                              <textarea
                                name="message"
                                required
                                rows={6}
                                placeholder="Ex.: trocar a foto, ajustar uma palavra da arte, alterar um trecho da legenda..."
                                className="w-full resize-none rounded-2xl border border-slate-300 bg-white p-4 text-sm leading-relaxed text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                              />

                              <button
                                type="submit"
                                className="w-full rounded-2xl bg-orange-500 px-5 py-4 text-sm font-black text-white transition hover:bg-orange-600"
                              >
                                Enviar pedido de ajuste
                              </button>
                            </form>
                          </div>
                        </div>
                      )}

                    </aside>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
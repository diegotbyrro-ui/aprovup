import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAgencyContext } from '@/lib/tenant';
import { CopyFinalApprovalLinkButton } from './CopyFinalApprovalLinkButton';

import {
  sendAllReadyToFinalApprovalAction,
  sendContentToFinalApprovalAction,
} from './actions';

const READY_STATUSES = [
  'REVISAO_INTERNA',
  'DESIGN_ANALISE',
  'FILMMAKER_ANALISE',
];

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    REVISAO_INTERNA: 'Revisao interna',
    DESIGN_ANALISE: 'Analise do Design',
    FILMMAKER_ANALISE: 'Analise do Filmmaker',
    ENVIADO_CLIENTE: 'Aguardando cliente',
    ALTERACAO_SOLICITADA: 'Alteracao solicitada',
    PRONTO_PARA_POSTAR: 'Aprovado na 2a etapa',
  };

  return labels[status] || status;
}

function areaLabel(area?: string | null) {
  if (area === 'DESIGN') return 'Design';
  if (area === 'FILMMAKER') return 'Filmaker';

  return area || 'Conteudo';
}

function isVideo(content: {
  finalMediaType?: string | null;
  format?: string | null;
}) {
  const type = String(content.finalMediaType || '').toLowerCase();
  const format = String(content.format || '').toUpperCase();

  return (
    type.includes('video') ||
    format.includes('REEL') ||
    format.includes('VIDEO') ||
    format.includes('TIKTOK') ||
    format.includes('SHORT')
  );
}

export default async function FinalApprovalManagerPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const {
    agencyId,
  } =
    await requireAgencyContext();

  const { id } = await params;

  const client = await prisma.client.findFirst({
    where: {
      id,
      agencyId,
    },
  });

  if (!client) {
    notFound();
  }

  const contents = await prisma.content.findMany({
    where: {
      clientId:
        id,

      client: {
        agencyId,
      },
      format: { not: "DEMANDA_EMERGENCIAL" },
      status: {
        in: [
          ...READY_STATUSES,
          'ENVIADO_CLIENTE',
          'ALTERACAO_SOLICITADA',
          'PRONTO_PARA_POSTAR',
        ],
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

  const publicApproval =
    await prisma.approval.findFirst({
      where: {
        content: {
          clientId:
            id,

          client: {
            agencyId,
          },

          status: {
            in: [
              'ENVIADO_CLIENTE',
              'ALTERACAO_SOLICITADA',
              'PRONTO_PARA_POSTAR',
            ],
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

  const ready = contents.filter(
    (content) =>
      READY_STATUSES.includes(content.status) &&
      Boolean(content.finalMediaUrl || content.finalCoverUrl)
  );

  const pending = contents.filter(
    (content) =>
      content.status === 'ENVIADO_CLIENTE'
  );

  const changes = contents.filter(
    (content) =>
      content.status === 'ALTERACAO_SOLICITADA'
  );

  const approved = contents.filter(
    (content) =>
      content.status === 'PRONTO_PARA_POSTAR'
  );

  return (
    <main className="space-y-6">
      <section className="rounded-3xl bg-slate-950 p-8 text-white">
        <Link
          href={`/clientes/${id}`}
          className="text-sm font-bold text-blue-300 hover:underline"
        >
          {'\u2190 Voltar para o cliente'}
        </Link>

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-blue-300">
          {'2\u00aa Etapa de Aprova\u00e7\u00e3o'}
        </p>

        <h1 className="mt-2 text-4xl font-black">
          {client.name}
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
          {
            'Aqui ficam apenas artes e videos que ja passaram pela producao e estao prontos para a aprovacao final do cliente.'
          }
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          {publicApproval ? (
            <CopyFinalApprovalLinkButton
              path={`/aprovacao-final/${publicApproval.token}`}
            />
          ) : (
            <div className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white/60">
              {
                'O link sera criado quando um material for enviado.'
              }
            </div>
          )}

          {ready.length > 0 && (
            <form
              action={sendAllReadyToFinalApprovalAction.bind(
                null,
                id
              )}
            >
              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700"
              >
                Enviar todos os prontos
              </button>
            </form>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold uppercase text-slate-400">
            Prontos
          </p>

          <p className="mt-2 text-3xl font-black">
            {ready.length}
          </p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <p className="text-xs font-bold uppercase text-blue-500">
            Com o cliente
          </p>

          <p className="mt-2 text-3xl font-black text-blue-800">
            {pending.length}
          </p>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-orange-50 p-5">
          <p className="text-xs font-bold uppercase text-orange-500">
            Ajustes
          </p>

          <p className="mt-2 text-3xl font-black text-orange-800">
            {changes.length}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <p className="text-xs font-bold uppercase text-emerald-500">
            Aprovados
          </p>

          <p className="mt-2 text-3xl font-black text-emerald-800">
            {approved.length}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        {contents.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="font-bold text-slate-900">
              Nenhum material chegou a 2a etapa ainda.
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {
                'Quando Design ou Filmmaker finalizarem um material, ele aparecera aqui.'
              }
            </p>
          </div>
        ) : (
          contents.map((content) => {
            const canSend =
              READY_STATUSES.includes(content.status) &&
              Boolean(content.finalMediaUrl || content.finalCoverUrl);

            return (
                            <article
                key={content.id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                {(() => {
                  const mediaUrl =
                    content.finalMediaUrl ||
                    content.finalCoverUrl ||
                    content.coverImageUrl ||
                    '';

                  return (
                    <div className="grid gap-0 xl:grid-cols-[1fr_360px]">
                      <div className="p-6">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                            {areaLabel(content.area)}
                          </span>

                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                            {content.format || 'Formato'}
                          </span>

                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                            {statusLabel(content.status)}
                          </span>
                        </div>

                        <h2 className="mt-4 text-2xl font-black text-slate-900">
                          {content.title}
                        </h2>

                        {mediaUrl ? (
                          <div className="mt-5 overflow-hidden rounded-2xl bg-slate-950">
                            {isVideo(content) ? (
                              <video
                                src={mediaUrl}
                                controls
                                className="max-h-[650px] w-full"
                              />
                            ) : (
                              <img
                                src={mediaUrl}
                                alt={content.title}
                                className="max-h-[750px] w-full object-contain"
                              />
                            )}
                          </div>
                        ) : (
                          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm font-bold text-slate-500">
                            Material final ainda nao disponivel para preview.
                          </div>
                        )}

                        <div className="mt-5 rounded-2xl bg-slate-50 p-5">
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Legenda
                          </p>

                          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                            {content.caption || 'Nenhuma legenda cadastrada.'}
                          </p>
                        </div>
                      </div>

                      <aside className="border-t border-slate-200 bg-slate-50 p-6 xl:border-l xl:border-t-0">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Situacao
                        </p>

                        <p className="mt-2 text-lg font-black text-slate-900">
                          {statusLabel(content.status)}
                        </p>

                        {canSend && (
                          <form
                            action={sendContentToFinalApprovalAction.bind(
                              null,
                              content.id,
                              id
                            )}
                            className="mt-6"
                          >
                            <button
                              type="submit"
                              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
                            >
                              {'Enviar para 2\u00aa etapa'}
                            </button>
                          </form>
                        )}
                      </aside>
                    </div>
                  );
                })()}
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
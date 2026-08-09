import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

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
  if (area === 'FILMMAKER') return 'Filmmaker';

  return area || 'Conteudo';
}

export default async function FinalApprovalManagerPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: {
      id,
    },
  });

  if (!client) {
    notFound();
  }

  const contents = await prisma.content.findMany({
    where: {
      clientId: id,
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
          clientId: id,
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
            <Link
              href={`/aprovacao-final/${publicApproval.token}`}
              target="_blank"
              className="rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950"
            >
              Abrir link do cliente
            </Link>
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
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                        {areaLabel(content.area)}
                      </span>

                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                        {content.format || 'Formato'}
                      </span>
                    </div>

                    <h2 className="mt-3 text-xl font-black text-slate-900">
                      {content.title}
                    </h2>

                    <p className="mt-2 text-sm font-bold text-slate-500">
                      {statusLabel(content.status)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/conteudos/${content.id}`}
                      className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700"
                    >
                      Abrir conteudo
                    </Link>

                    {canSend && (
                      <form
                        action={sendContentToFinalApprovalAction.bind(
                          null,
                          content.id,
                          id
                        )}
                      >
                        <button
                          type="submit"
                          className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
                        >
                          {'Enviar para 2\u00aa etapa'}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
import { AprovUpLogo } from '@/components/brand/AprovUpLogo';
import { formatLabel } from '@/lib/formatLabel';

import { prisma } from '@/lib/prisma';
import FinalContentViewer from './FinalContentViewer';
import {
  approveFinalContentAction,
  requestFinalAdjustmentAction,
} from './actions';
import {
CalendarDays,
  CheckCircle2,
  FileText,
  ImageIcon,
  MessageSquare,
  PenLine,
} from 'lucide-react';

function monthRange(month?: string | string[]) {
  const value = Array.isArray(month) ? month[0] : month;

  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    return monthRange('2026-06');
  }

  const [year, m] = value.split('-').map(Number);

  const start = new Date(year, m - 1, 1);
  const end = new Date(year, m, 1);

  return {
    value,
    start,
    end,
    label: start.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    }),
  };
}

function formatDate(date?: Date | null) {
  if (!date) return 'Sem data';

  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getImageUrl(content: any) {
  return (
    content.finalCoverUrl || content.finalMediaUrl || content.finalCoverUrl || content.finalMediaUrl || content.coverUrl ||
    content.finalCoverUrl || content.finalMediaUrl || content.finalCoverUrl || content.finalMediaUrl || content.thumbnailUrl ||
    content.finalCoverUrl || content.finalMediaUrl || content.imageUrl ||
    content.finalCoverUrl || content.finalMediaUrl || content.mediaUrl ||
    content.firstMediaUrl ||
    content.artUrl ||
    content.finalMediaUrl ||
    content.finalImageUrl ||
    ''
  );
}

function getStatusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    'Enviado ao Cliente': 'Aguardando aprovação',
    'Pronto para Postar': 'Aprovado para publicação',
    'Ajuste Solicitado': 'Ajuste solicitado',
    POSTADO: 'Publicado',
    APROVADO_FINAL: 'Aprovado',
  };

  return labels[String(status || '')] || formatLabel(String(status || 'Pendente'));
}

function getStatusClass(status?: string | null) {
  const value = String(status || '');

  if (value === 'Pronto para Postar' || value === 'POSTADO' || value === 'APROVADO_FINAL') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  }

  if (value === 'Ajuste Solicitado') {
    return 'bg-amber-50 text-amber-700 border-amber-100';
  }

  return 'bg-blue-50 text-blue-700 border-blue-100';
}

export default async function FinalApprovalPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { clientId } = await params;
  const query = await searchParams;
  const month = monthRange(query.month);

  const client = await prisma.client.findUnique({
    where: {
      id: clientId,
    },
  });

  if (!client) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Link inválido
          </h1>

          <p className="mt-2 text-slate-500">
            Não encontramos o cliente deste link de aprovação final.
          </p>
        </div>
      </main>
    );
  }

  const contents = await prisma.content.findMany({
    where: {
      clientId,
      plannedDate: {
        gte: month.start,
        lt: month.end,
      },
    },
    include: {
      comments: {
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

  const finalContents = contents.filter((content: any) => {
    const status = String(content.status || '');

    return (
      status === 'Enviado ao Cliente' ||
      status === 'Pronto para Postar' ||
      status === 'Ajuste Solicitado' ||
      status === 'POSTADO' ||
      status === 'APROVADO_FINAL' ||
      getImageUrl(content)
    );
  });

  const approvedCount = finalContents.filter((content: any) =>
    ['Pronto para Postar', 'POSTADO', 'APROVADO_FINAL'].includes(String(content.status || ''))
  ).length;

  const pendingCount = finalContents.length - approvedCount;

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm md:p-8">
          <p className="text-sm font-bold uppercase tracking-wider text-blue-300">
            Aprovação Final
          </p>

          <h1 className="mt-2 text-3xl font-bold md:text-4xl">
            {client.name}
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
            Confira os conteúdos finalizados de {month.label}. Aprove os materiais prontos para publicação ou solicite ajustes quando necessário.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Conteúdos
              </p>

              <p className="mt-1 text-2xl font-bold">
                {finalContents.length}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Aprovados
              </p>

              <p className="mt-1 text-2xl font-bold text-emerald-300">
                {approvedCount}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Pendentes
              </p>

              <p className="mt-1 text-2xl font-bold text-amber-300">
                {pendingCount}
              </p>
            </div>
          </div>
        </section>

        {finalContents.length === 0 ? (
          <section className="rounded-3xl bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              Nenhum conteúdo final disponível ainda
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              A equipe da Level UP ainda está preparando os materiais finais para este mês.
            </p>
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {finalContents.map((content: any) => {
              const imageUrl = getImageUrl(content);
              const isApproved = ['Pronto para Postar', 'POSTADO', 'APROVADO_FINAL'].includes(String(content.status || ''));

              return (
                <div key={content.id}>
                  <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                    <FinalContentViewer content={content}>
                      <div className="h-56 bg-slate-200">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
                            <ImageIcon size={36} />

                            <span className="text-sm font-bold">
                              Sem mídia anexada
                            </span>
                          </div>
                        )}
                      </div>
                    </FinalContentViewer>

                    <div className="space-y-4 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="line-clamp-2 text-lg font-bold text-slate-900">
                            {content.title || 'Conteúdo sem título'}
                          </h2>

                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                              <CalendarDays size={13} />
                              {formatDate(content.plannedDate)}
                            </span>

                            <span className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                              <FileText size={13} />
                              {formatLabel(content.format) || 'Formato'}
                            </span>
                          </div>
                        </div>

                        <span className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold uppercase ${getStatusClass(content.status)}`}>
                          {getStatusLabel(content.status)}
                        </span>
                      </div>

                      {(content.caption || content.legend || content.instagramCaption) && (
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                            Legenda
                          </p>

                          <p className="line-clamp-4 text-sm leading-relaxed text-slate-600">
                            {content.caption || content.legend || content.instagramCaption}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-3 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-400">
                        <span className="flex items-center gap-1">
                          <ImageIcon size={14} />
                          {imageUrl ? '1 mídia' : '0 mídia'}
                        </span>

                        <span className="flex items-center gap-1">
                          <MessageSquare size={14} />
                          {content.comments?.length || 0}
                        </span>
                      </div>

                      {isApproved ? (
                        <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                          <CheckCircle2 size={18} />
                          Aprovado para publicação
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <form action={approveFinalContentAction.bind(null, content.id, clientId)}>
                            <input type="hidden" name="month" value={month.value} />

                            <button
                              type="submit"
                              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700"
                            >
                              <CheckCircle2 size={18} />
                              Aprovar para publicação
                            </button>
                          </form>

                          <details className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
                            <summary className="cursor-pointer list-none text-sm font-bold text-amber-800 [&::-webkit-details-marker]:hidden">
                              Solicitar ajuste
                            </summary>

                            <form action={requestFinalAdjustmentAction.bind(null, content.id, clientId)} className="mt-3 space-y-2">
                              <input type="hidden" name="month" value={month.value} />

                              <textarea
                                name="message"
                                rows={3}
                                placeholder="Explique o ajuste necessário..."
                                className="w-full rounded-xl border border-amber-200 bg-white px-3 py-3 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
                              />

                              <button
                                type="submit"
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 py-3 text-sm font-bold text-white hover:bg-amber-600"
                              >
                                <PenLine size={16} />
                                Enviar ajuste
                              </button>
                            </form>
                          </details>
                        </div>
                      )}
                    </div>
                  </article>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

import { prisma } from '@/lib/prisma';
import { requireAgencyContext } from '@/lib/tenant';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  MessageSquare,
} from 'lucide-react';

function formatDate(date?: Date | string | null) {
  if (!date) return '';

  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTone(message: string) {
  const value = message.toUpperCase();

  if (
    value.includes('APROVAÇÃO') ||
    value.includes('APROVACAO')
  ) {
    return {
      label: 'Cliente aprovou',
      className:
        'border-emerald-100 bg-emerald-50 text-emerald-800',
    };
  }

  if (value.includes('ALTERAÇÃO') || value.includes('AJUSTE')) {
    return {
      label: 'Ajuste solicitado',
      className: 'border-amber-100 bg-amber-50 text-amber-800',
    };
  }

  if (value.includes('REAGENDAMENTO')) {
    return {
      label: 'Reagendamento',
      className: 'border-blue-100 bg-blue-50 text-blue-800',
    };
  }

  if (value.includes('DÚVIDA') || value.includes('DUVIDA')) {
    return {
      label: 'Dúvida',
      className: 'border-violet-100 bg-violet-50 text-violet-800',
    };
  }

  return {
    label: 'Aviso',
    className: 'border-slate-100 bg-slate-50 text-slate-800',
  };
}

export default async function SocialMediaAlertsPage() {
  const {
    agencyId,
  } =
    await requireAgencyContext();

  const comments = await prisma.comment.findMany({
    where: {
      content: {
        client: {
          agencyId,
        },
      },
      OR: [
        {
          message: {
            contains: 'APROVAÇÃO',
          },
        },
        {
          message: {
            contains: 'APROVACAO',
          },
        },
        {
          message: {
            contains: 'DÚVIDA',
          },
        },
        {
          message: {
            contains: 'DUVIDA',
          },
        },
        {
          message: {
            contains: 'ALTERAÇÃO',
          },
        },
        {
          message: {
            contains: 'ALTERACAO',
          },
        },
        {
          message: {
            contains: 'REAGENDAMENTO',
          },
        },
        {
          message: {
            contains: 'AJUSTE',
          },
        },
      ],
    },
    include: {
      content: {
        include: {
          client: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 80,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <Link
        href="/clientes"
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-950"
      >
        <ArrowLeft size={16} />
        Voltar
      </Link>

      <section className="rounded-3xl bg-slate-950 p-8 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500 text-white">
            <Bell size={24} />
          </div>

          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-blue-300">
              Social Media
            </p>

            <h1 className="text-3xl font-bold">
              Central de avisos
            </h1>
          </div>
        </div>

        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-300">
          Aqui ficam reunidas as aprovações e os pedidos de ajuste dos clientes, além das dúvidas do Design, dúvidas do Filmmaker e solicitações de reagendamento.
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Pendências recebidas
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {comments.length} aviso(s) encontrados.
            </p>
          </div>
        </div>

        {comments.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
            <AlertTriangle size={28} className="mx-auto text-slate-400" />

            <p className="mt-3 text-sm font-bold text-slate-500">
              Nenhuma aprovação, dúvida ou ajuste encontrado no momento.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => {
              const tone = getTone(comment.message || '');

              return (
                <article
                  key={comment.id}
                  className={`rounded-3xl border p-5 ${tone.className}`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-bold">
                        <MessageSquare size={14} />
                        {tone.label}
                      </div>

                      <h3 className="text-lg font-bold">
                        {comment.content?.title || 'Conteúdo sem título'}
                      </h3>

                      <p className="mt-1 text-sm font-semibold opacity-80">
                        {comment.content?.client?.name || 'Cliente'} • {comment.authorName || 'Equipe'} • {formatDate(comment.createdAt)}
                      </p>

                      <p className="mt-4 whitespace-pre-line text-sm leading-relaxed">
                        {comment.message}
                      </p>
                    </div>

                    {comment.contentId && (
                      <Link
                        href={`/conteudos/${comment.contentId}`}
                        className="shrink-0 rounded-2xl bg-slate-950 px-5 py-3 text-center text-sm font-bold text-white hover:bg-slate-800"
                      >
                        Abrir conteúdo
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

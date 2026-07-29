import { prisma } from '@/lib/prisma';
import { requireCurrentUser, isDirector, isSocialMedia } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { MessageCircleQuestion } from 'lucide-react';
import { answerDesignQuestionAction } from './actions';

export default async function SocialMediaPage() {
  const currentUser = await requireCurrentUser();

  if (!isDirector(currentUser.role) && !isSocialMedia(currentUser.role)) {
    redirect('/clientes');
  }

  const doubts = await prisma.content.findMany({
    where: {
      area: 'DESIGN',
      status: 'DESIGN_DUVIDA_SOCIAL',
    },
    include: {
      client: true,
      comments: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Gravações
            </p>
            <h2 className="mt-1 text-xl font-bold text-blue-950">
              Agendamentos pendentes com clientes aprovados
            </h2>
            <p className="mt-1 text-sm text-blue-800">
              Quando o cliente aprovar todo o calendário e tiver vídeo, o Social Media agenda a captação por aqui.
            </p>
          </div>

          <Link
            href="/social-media/agendamentos"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
          >
            Ver agendamentos
          </Link>
        </div>
      </section>
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-8 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wider text-blue-300">
          Social Media
        </p>

        <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
          Dúvidas do Design
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
          Responda as dúvidas enviadas pelo Design para liberar a produção da demanda.
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Pendências para Social Media
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {doubts.length} demanda(s) aguardando resposta.
            </p>
          </div>

          <Link
            href="/clientes"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Ver clientes
          </Link>
        </div>

        <div className="space-y-4">
          {doubts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              Nenhuma dúvida pendente no momento.
            </div>
          ) : (
            doubts.map((content) => {
              const lastQuestion = content.comments.find((comment) =>
                comment.message.startsWith('DÚVIDA PARA SOCIAL MEDIA:')
              );

              return (
                <article
                  key={content.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-yellow-700">
                        <MessageCircleQuestion size={18} />

                        <p className="text-xs font-bold uppercase tracking-wider">
                          Dúvida do Design
                        </p>
                      </div>

                      <h3 className="mt-2 text-lg font-bold text-slate-900">
                        {content.title}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {content.client?.name || 'Cliente não informado'}
                      </p>

                      <div className="mt-4 rounded-xl bg-white p-4 text-sm leading-relaxed text-slate-700">
                        {lastQuestion
                          ? lastQuestion.message.replace('DÚVIDA PARA SOCIAL MEDIA:', '').trim()
                          : 'Sem descrição da dúvida.'}
                      </div>
                    </div>

                    <div className="w-full lg:w-96">
                      <form
                        action={answerDesignQuestionAction.bind(null, content.id)}
                        className="space-y-3"
                      >
                        <textarea
                          name="answer"
                          required
                          rows={5}
                          placeholder="Responda a dúvida para o design..."
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                        />

                        <button
                          type="submit"
                          className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
                        >
                          Responder e devolver para Design
                        </button>

                        <Link
                          href={`/conteudos/${content.id}`}
                          className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-bold text-slate-600 hover:bg-slate-50"
                        >
                          Abrir conteúdo
                        </Link>
                      </form>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

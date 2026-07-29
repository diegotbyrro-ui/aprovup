import { prisma } from '@/lib/prisma';
import {
  approveClientContentAction,
  requestClientAdjustmentAction,
  scheduleSuggestedCaptureAction,
} from './actions';
import {
  CheckCircle2,
  AlertTriangle,
  CalendarDays,
  Clock,
  Video,
  Palette,
} from 'lucide-react';

function formatDate(date?: Date | null) {
  if (!date) return 'Sem data';

  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    CLIENTE: 'Aguardando aprovação',
    APROVADO: 'Aprovado',
    ALTERACAO_SOLICITADA: 'Alteração solicitada',
    FILMMAKER_AGENDAMENTO: 'Captação agendada',
    FILMMAKER_PRE_PRODUCAO: 'Pré-produção',
    FILMMAKER_GRAVANDO: 'Gravando',
    FILMMAKER_EDICAO: 'Edição',
    FILMMAKER_ANALISE: 'Análise',
    PRONTO_PARA_POSTAR: 'Pronto para postar',
    PUBLICADO: 'Publicado',
  };

  return labels[status] || status;
}

function getStatusClass(status: string) {
  if (status === 'APROVADO' || status === 'FILMMAKER_AGENDAMENTO') {
    return 'bg-emerald-50 text-emerald-700';
  }

  if (status === 'ALTERACAO_SOLICITADA') {
    return 'bg-orange-50 text-orange-700';
  }

  return 'bg-slate-900 text-white';
}

function getAreaIcon(area?: string | null) {
  if (area === 'FILMMAKER') return Video;
  return Palette;
}

function getAreaLabel(area?: string | null) {
  if (area === 'FILMMAKER') return 'Vídeo / Captação';
  if (area === 'DESIGN') return 'Design';
  if (area === 'SOCIAL_MEDIA') return 'Social Media';
  return area || 'Conteúdo';
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getSuggestedDates(blockedDates: string[]) {
  const suggestions: { date: string; label: string; time: string }[] = [];
  const today = new Date();

  for (let i = 2; i <= 30; i++) {
    const date = addDays(today, i);
    const day = date.getDay();

    // Evita domingo
    if (day === 0) continue;

    const dateKey = toDateKey(date);

    if (blockedDates.includes(dateKey)) continue;

    suggestions.push({
      date: dateKey,
      time: day === 6 ? '09:00' : '14:00',
      label: date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
      }),
    });

    if (suggestions.length >= 5) break;
  }

  return suggestions;
}

function getErrorMessage(error?: string) {
  if (error === 'empty-adjustment') {
    return 'Escreva o ajuste solicitado antes de enviar.';
  }

  if (error === 'busy-date') {
    return 'Essa data acabou de ficar ocupada para outro cliente. Escolha outra sugestão.';
  }

  if (error === 'same-client-date') {
    return 'Você já possui uma captação marcada nesse dia.';
  }

  if (error === 'no-date') {
    return 'Escolha uma data sugerida para continuar.';
  }

  return '';
}

export default async function ApprovalPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{
    error?: string;
    scheduled?: string;
  }>;
}) {
  const { token } = await params;
  const query = searchParams ? await searchParams : {};

  const client = await prisma.client.findUnique({
    where: {
      id: token,
    },
  });

  if (!client) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Link de aprovação inválido
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Verifique se o link enviado está correto.
          </p>
        </div>
      </main>
    );
  }

  const contents = await prisma.content.findMany({
    where: {
      clientId: client.id,
      status: {
        in: [
          'CLIENTE',
          'APROVADO',
          'ALTERACAO_SOLICITADA',
          'FILMMAKER_AGENDAMENTO',
          'FILMMAKER_PRE_PRODUCAO',
          'FILMMAKER_GRAVANDO',
          'FILMMAKER_EDICAO',
          'FILMMAKER_ANALISE',
          'PRONTO_PARA_POSTAR',
          'PUBLICADO',
        ],
      },
    },
    include: {
      comments: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
    orderBy: {
      plannedDate: 'asc',
    },
  });

  const approvedStatuses = [
    'APROVADO',
    'FILMMAKER_AGENDAMENTO',
    'FILMMAKER_PRE_PRODUCAO',
    'FILMMAKER_GRAVANDO',
    'FILMMAKER_EDICAO',
    'FILMMAKER_ANALISE',
    'PRONTO_PARA_POSTAR',
    'PUBLICADO',
  ];

  const pendingClientContents = contents.filter((content) => content.status === 'CLIENTE');
  const adjustmentClientContents = contents.filter((content) => content.status === 'ALTERACAO_SOLICITADA');

  const filmmakerApprovedContents = contents.filter(
    (content) =>
      content.area === 'FILMMAKER' &&
      approvedStatuses.includes(content.status)
  );

  const allApproved =
    contents.length > 0 &&
    pendingClientContents.length === 0 &&
    adjustmentClientContents.length === 0;

  const hasFilmmaker = filmmakerApprovedContents.length > 0;

  const blockedSchedules = await prisma.captureSchedule.findMany({
    where: {
      status: {
        not: 'CANCELADO',
      },
      scheduledAt: {
        gte: new Date(),
      },
    },
    select: {
      dateKey: true,
    },
  });

  const suggestedDates = getSuggestedDates(
    blockedSchedules.map((schedule) => schedule.dateKey)
  );

  const existingSchedule = await prisma.captureSchedule.findFirst({
    where: {
      clientId: client.id,
      status: {
        not: 'CANCELADO',
      },
      scheduledAt: {
        gte: new Date(),
      },
    },
    orderBy: {
      scheduledAt: 'asc',
    },
  });

  const approvedCount = contents.filter((content) =>
    approvedStatuses.includes(content.status)
  ).length;

  const adjustmentCount = adjustmentClientContents.length;
  const pendingCount = pendingClientContents.length;

  const errorMessage = getErrorMessage(query?.error);

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-950 p-8 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wider text-blue-300">
            Aprovação de conteúdo
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
            {client.name}
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
            Aprove cada conteúdo individualmente. Se precisar de ajuste, escreva a solicitação no próprio conteúdo.
          </p>
        </section>

        {errorMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
            <AlertTriangle size={18} />
            <p>{errorMessage}</p>
          </div>
        )}

        {query?.scheduled === 'success' && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            <CheckCircle2 size={18} />
            <p>Captação agendada com sucesso. A equipe receberá essa organização dentro do sistema.</p>
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{contents.length}</p>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-500">Pendentes</p>
            <p className="mt-2 text-3xl font-bold text-blue-800">{pendingCount}</p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Aprovados</p>
            <p className="mt-2 text-3xl font-bold text-emerald-800">{approvedCount}</p>
          </div>

          <div className="rounded-2xl border border-orange-100 bg-orange-50 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-orange-600">Ajustes</p>
            <p className="mt-2 text-3xl font-bold text-orange-800">{adjustmentCount}</p>
          </div>
        </section>

        <section className="space-y-4">
          {contents.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
              Nenhum conteúdo disponível para aprovação.
            </div>
          ) : (
            contents.map((content) => {
              const Icon = getAreaIcon(content.area);
              const lastClientAdjustment = content.comments.find((comment) =>
                comment.message.startsWith('ALTERAÇÃO SOLICITADA PELO CLIENTE:')
              );

              const isApproved = approvedStatuses.includes(content.status);

              return (
                <article key={content.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                          <Icon size={13} />
                          {getAreaLabel(content.area)}
                        </span>

                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                          {content.format || 'Formato'}
                        </span>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                          {formatDate(content.plannedDate)}
                        </span>

                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(content.status)}`}>
                          {getStatusLabel(content.status)}
                        </span>
                      </div>

                      <h2 className="mt-4 text-2xl font-bold text-slate-900">
                        {content.title.replace('[TESTE] ', '')}
                      </h2>

                      {content.objective && (
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                          <strong>Objetivo:</strong> {content.objective}
                        </p>
                      )}

                      {content.briefing && (
                        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
                          <strong>Briefing:</strong>
                          <p className="mt-2 whitespace-pre-line">{content.briefing}</p>
                        </div>
                      )}

                      {content.caption && (
                        <div className="mt-4 rounded-2xl border border-slate-200 p-4 text-sm leading-relaxed text-slate-600">
                          <strong>Legenda sugerida:</strong>
                          <p className="mt-2 whitespace-pre-line">{content.caption}</p>
                        </div>
                      )}

                      {lastClientAdjustment && (
                        <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm leading-relaxed text-orange-800">
                          <strong>Último ajuste solicitado:</strong>
                          <p className="mt-2">
                            {lastClientAdjustment.message.replace('ALTERAÇÃO SOLICITADA PELO CLIENTE:', '').trim()}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      {isApproved ? (
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                          <CheckCircle2 size={18} className="mb-2" />
                          Conteúdo aprovado.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <form action={approveClientContentAction.bind(null, content.id, token)}>
                            <button
                              type="submit"
                              className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700"
                            >
                              Aprovar conteúdo
                            </button>
                          </form>

                          <form action={requestClientAdjustmentAction.bind(null, content.id, token)} className="space-y-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                              Solicitar ajuste
                            </label>

                            <textarea
                              name="message"
                              rows={5}
                              placeholder="Escreva aqui o que precisa alterar nesse conteúdo..."
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                            />

                            <button
                              type="submit"
                              className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white hover:bg-orange-600"
                            >
                              Enviar ajuste para Social Media
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>

        {allApproved && hasFilmmaker && (
          <section className="rounded-3xl border border-blue-100 bg-blue-50 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-1 text-blue-700" size={24} />

              <div>
                <h2 className="text-2xl font-bold text-blue-950">
                  Tudo aprovado. Agora escolha uma data sugerida para captação.
                </h2>

                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-blue-800">
                  Como a equipe possui apenas um filmmaker, o sistema sugere datas livres e bloqueia automaticamente dias já ocupados por outro cliente.
                </p>
              </div>
            </div>

            {existingSchedule ? (
              <div className="mt-5 rounded-2xl border border-emerald-100 bg-white p-5 text-sm text-slate-700">
                <p className="font-bold text-emerald-700">Captação já agendada</p>

                <p className="mt-2">
                  {new Date(existingSchedule.scheduledAt).toLocaleDateString('pt-BR')} às{' '}
                  {new Date(existingSchedule.scheduledAt).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-5">
                {suggestedDates.map((suggestion) => (
                  <form
                    key={suggestion.date}
                    action={scheduleSuggestedCaptureAction.bind(null, token)}
                    className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm"
                  >
                    <input type="hidden" name="date" value={suggestion.date} />
                    <input type="hidden" name="time" value={suggestion.time} />

                    <p className="text-sm font-bold capitalize text-slate-900">
                      {suggestion.label}
                    </p>

                    <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-slate-500">
                      <Clock size={13} />
                      {suggestion.time}
                    </p>

                    <button
                      type="submit"
                      className="mt-4 w-full rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
                    >
                      Escolher data
                    </button>
                  </form>
                ))}
              </div>
            )}
          </section>
        )}

        {allApproved && !hasFilmmaker && (
          <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-emerald-900">
              Todos os conteúdos foram aprovados.
            </h2>

            <p className="mt-2 text-sm text-emerald-800">
              Esse calendário não possui demandas de captação.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}

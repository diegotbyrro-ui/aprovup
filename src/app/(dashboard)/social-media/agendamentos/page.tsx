import { prisma } from '@/lib/prisma';
import { requireCurrentUser } from '@/lib/auth';
import Link from 'next/link';
import { CalendarDays, CheckCircle2, Video, AlertTriangle } from 'lucide-react';

const approvedStatuses = [
  'APROVADO',
  'FILMMAKER_PRE_PRODUCAO',
  'FILMMAKER_AGENDAMENTO',
  'FILMMAKER_GRAVANDO',
  'FILMMAKER_EDICAO',
  'FILMMAKER_ANALISE',
  'PRONTO_PARA_POSTAR',
  'PUBLICADO',
];

function isApprovedStatus(status: string) {
  return approvedStatuses.includes(status);
}

export default async function SocialMediaAgendamentosPage() {
  await requireCurrentUser();

  const clients = await prisma.client.findMany({
    include: {
      contents: {
        where: {
          status: {
            in: [
              'CLIENTE',
              'APROVADO',
              'ALTERACAO_SOLICITADA',
              'FILMMAKER_PRE_PRODUCAO',
              'FILMMAKER_AGENDAMENTO',
              'FILMMAKER_GRAVANDO',
              'FILMMAKER_EDICAO',
              'FILMMAKER_ANALISE',
              'PRONTO_PARA_POSTAR',
              'PUBLICADO',
            ],
          },
        },
        orderBy: {
          plannedDate: 'asc',
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  const schedules = await prisma.captureSchedule.findMany({
    where: {
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

  const clientsToSchedule = clients
    .map((client) => {
      const contents = client.contents || [];
      const hasContents = contents.length > 0;
      const pending = contents.filter((content) => content.status === 'CLIENTE');
      const adjustments = contents.filter((content) => content.status === 'ALTERACAO_SOLICITADA');
      const filmmakerApproved = contents.filter(
        (content) => content.area === 'FILMMAKER' && isApprovedStatus(content.status)
      );

      const hasFutureSchedule = schedules.some((schedule) => schedule.clientId === client.id);

      const readyToSchedule =
        hasContents &&
        pending.length === 0 &&
        adjustments.length === 0 &&
        filmmakerApproved.length > 0 &&
        !hasFutureSchedule;

      return {
        client,
        contents,
        pending,
        adjustments,
        filmmakerApproved,
        hasFutureSchedule,
        readyToSchedule,
      };
    })
    .filter((item) => item.readyToSchedule);

  const scheduledClients = clients
    .map((client) => {
      const schedule = schedules.find((item) => item.clientId === client.id);

      return {
        client,
        schedule,
      };
    })
    .filter((item) => item.schedule);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-8 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wider text-blue-300">
          Social Media
        </p>

        <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
          Agendamento de gravações
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
          Clientes que aprovaram todos os conteúdos e precisam de alinhamento humano para marcar gravação com o Filmmaker.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Para agendar
          </p>
          <p className="mt-2 text-3xl font-bold text-blue-900">
            {clientsToSchedule.length}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Já agendados
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-900">
            {scheduledClients.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Regra
          </p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700">
            O Social Media conversa com o cliente e agenda dentro do sistema. O cliente não escolhe sozinho.
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Pendências de agendamento
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Esses clientes já aprovaram tudo e possuem conteúdo de vídeo.
            </p>
          </div>
        </div>

        {clientsToSchedule.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <CheckCircle2 className="mx-auto text-emerald-500" size={32} />

            <p className="mt-3 text-sm font-bold text-slate-700">
              Nenhum cliente aguardando agendamento agora.
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Quando um cliente aprovar todos os conteúdos e tiver demanda de vídeo, ele aparecerá aqui.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {clientsToSchedule.map((item) => (
              <article
                key={item.client.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                      Cliente aprovado
                    </p>

                    <h3 className="mt-1 text-xl font-bold text-slate-900">
                      {item.client.name}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {item.client.segment || 'Sem segmento definido'}
                    </p>
                  </div>

                  <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                    <Video size={22} />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white p-3">
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Vídeos
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">
                      {item.filmmakerApproved.length}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3">
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Status
                    </p>
                    <p className="mt-1 text-sm font-bold text-emerald-700">
                      Tudo aprovado
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm leading-relaxed text-blue-800">
                  <strong>Próximo passo:</strong> falar com o cliente pelo WhatsApp, alinhar melhor dia, horário, local e orientar sobre o que será gravado.
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Link
                    href={`/captacoes/nova?cliente=${item.client.id}`}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
                  >
                    <CalendarDays size={17} />
                    Agendar gravação
                  </Link>

                  <Link
                    href={`/clientes/${item.client.id}`}
                    className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Ver cliente
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">
          Próximas captações
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Agenda interna já confirmada para o Filmmaker.
        </p>

        <div className="mt-5 space-y-3">
          {scheduledClients.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-medium text-slate-400">
              Nenhuma captação futura marcada.
            </div>
          ) : (
            scheduledClients.map((item) => (
              <div
                key={item.schedule!.id}
                className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-bold text-slate-900">
                    {item.client.name}
                  </p>

                  <p className="text-sm text-slate-500">
                    {new Date(item.schedule!.scheduledAt).toLocaleDateString('pt-BR')} às{' '}
                    {new Date(item.schedule!.scheduledAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  <CheckCircle2 size={13} />
                  Agendado
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

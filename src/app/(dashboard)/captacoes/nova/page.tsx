import { prisma } from '@/lib/prisma';
import { requireCurrentUser } from '@/lib/auth';
import Link from 'next/link';
import { createCaptureScheduleAction } from './actions';
import { CalendarDays, AlertTriangle } from 'lucide-react';

function getErrorMessage(error?: string) {
  if (error === 'busy') {
    return 'Essa data já está ocupada para outro cliente. Como existe apenas 1 filmmaker, escolha outra data.';
  }

  if (error === 'missing') {
    return 'Preencha cliente, data e horário para agendar.';
  }

  if (error === 'no-video') {
    return 'Esse cliente ainda não possui conteúdo de vídeo aprovado na primeira etapa.';
  }

  return '';
}

export default async function NovaCaptacaoPage({
  searchParams,
}: {
  searchParams?: Promise<{
    cliente?: string;
    error?: string;
  }>;
}) {
  await requireCurrentUser();

  const params = searchParams ? await searchParams : {};
  const selectedClientId = String(params?.cliente || '');
  const errorMessage = getErrorMessage(params?.error);

  const clients = await prisma.client.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  const upcomingSchedules = await prisma.captureSchedule.findMany({
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
    take: 10,
  });

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-950 p-8 shadow-sm">
          <Link href="/clientes" className="text-sm font-bold text-blue-300 hover:text-blue-200">
            &larr; Voltar
          </Link>

          <p className="mt-5 text-sm font-bold uppercase tracking-wider text-blue-300">
            Agendamento de captação
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
            Marcar gravação com o cliente
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
            O Social Media alinha com o cliente e agenda a captação mensal. O sistema bloqueia mais de um cliente no mesmo dia.
          </p>
        </section>

        {errorMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
            <AlertTriangle size={18} />
            <p>{errorMessage}</p>
          </div>
        )}

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
          <form action={createCaptureScheduleAction} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Dados do agendamento
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Esse agendamento representa a captação mensal do cliente.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                Cliente *
              </label>

              <select
                name="clientId"
                required
                defaultValue={selectedClientId}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              >
                <option value="">Selecione um cliente...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Data *
                </label>

                <input
                  name="date"
                  type="date"
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Horário *
                </label>

                <input
                  name="time"
                  type="time"
                  required
                  defaultValue="09:00"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                Local da captação
              </label>

              <input
                name="location"
                placeholder="Ex: endereço do cliente, unidade, loja, escola..."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                Observações para o Filmmaker
              </label>

              <textarea
                name="notes"
                rows={5}
                placeholder="Ex: levar microfone, captar fachada, gravar depoimento, takes verticais..."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
              <Link
                href="/clientes"
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </Link>

              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-slate-800"
              >
                Agendar captação
              </button>
            </div>
          </form>

          <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <CalendarDays size={18} className="text-slate-600" />

              <h2 className="text-lg font-bold text-slate-900">
                Próximas captações
              </h2>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Dias já ocupados pelo filmmaker.
            </p>

            <div className="mt-5 space-y-3">
              {upcomingSchedules.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm font-medium text-slate-400">
                  Nenhuma captação futura marcada.
                </div>
              ) : (
                upcomingSchedules.map((schedule) => (
                  <div key={schedule.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-900">
                      {schedule.clientName}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {new Date(schedule.scheduledAt).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(schedule.scheduledAt).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>

                    {schedule.location && (
                      <p className="mt-2 text-xs text-slate-500">
                        {schedule.location}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

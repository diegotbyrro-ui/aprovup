import Link from 'next/link';
import {
  CalendarDays,
  Clock,
  MapPin,
  Video,
} from 'lucide-react';
import { prisma } from '@/lib/prisma';

function formatDateTime(date: Date) {
  return {
    date: date.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
    time: date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

export async function FilmmakerCaptureAgenda() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const schedules =
    await prisma.captureSchedule.findMany({
      where: {
        status: {
          not: 'CANCELADO',
        },
        scheduledAt: {
          gte: startOfToday,
        },
      },
      orderBy: {
        scheduledAt: 'asc',
      },
      take: 12,
    });

  return (
    <section className="rounded-3xl border border-blue-100 bg-blue-50 p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Agenda do Filmmaker
          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Próximas gravações
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            Datas e horários cadastrados pela Social Mídia.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-blue-700 shadow-sm">
          <CalendarDays size={18} />
          {schedules.length} agendamento(s)
        </div>
      </div>

      {schedules.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-blue-200 bg-white/70 p-8 text-center">
          <Video
            size={32}
            className="mx-auto text-blue-300"
          />

          <p className="mt-3 text-sm font-bold text-slate-700">
            Nenhuma gravação futura agendada.
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Quando a Social Mídia marcar uma captação, ela aparecerá aqui.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {schedules.map((schedule) => {
            const formatted =
              formatDateTime(schedule.scheduledAt);

            return (
              <article
                key={schedule.id}
                className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-500">
                      Captação
                    </p>

                    <h3 className="mt-1 text-lg font-bold text-slate-900">
                      {schedule.clientName}
                    </h3>
                  </div>

                  <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                    <Video size={20} />
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                    <CalendarDays
                      size={17}
                      className="text-blue-600"
                    />

                    <div>
                      <p className="text-xs font-bold uppercase text-slate-400">
                        Data
                      </p>

                      <p className="text-sm font-bold capitalize text-slate-800">
                        {formatted.date}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                    <Clock
                      size={17}
                      className="text-blue-600"
                    />

                    <div>
                      <p className="text-xs font-bold uppercase text-slate-400">
                        Horário
                      </p>

                      <p className="text-sm font-bold text-slate-800">
                        {formatted.time}
                      </p>
                    </div>
                  </div>

                  {schedule.location && (
                    <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                      <MapPin
                        size={17}
                        className="mt-0.5 shrink-0 text-blue-600"
                      />

                      <div>
                        <p className="text-xs font-bold uppercase text-slate-400">
                          Local
                        </p>

                        <p className="text-sm font-semibold text-slate-700">
                          {schedule.location}
                        </p>
                      </div>
                    </div>
                  )}

                  {schedule.notes && (
                    <div className="rounded-xl border border-slate-100 p-3">
                      <p className="text-xs font-bold uppercase text-slate-400">
                        Observações
                      </p>

                      <p className="mt-1 line-clamp-4 text-sm leading-relaxed text-slate-600">
                        {schedule.notes}
                      </p>
                    </div>
                  )}

                  {schedule.contentId && (
                    <Link
                      href={`/conteudos/${schedule.contentId}/visualizar`}
                      className="block rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-bold text-white hover:bg-slate-800"
                    >
                      Abrir conteúdo vinculado
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
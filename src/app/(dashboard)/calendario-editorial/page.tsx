import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/StatusBadge';

import { CalendarBackButton } from './CalendarBackButton';
const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
];

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const priorityLabels: Record<string, string> = {
    BAIXA: 'Baixa',
    MEDIA: 'Média',
    ALTA: 'Alta',
    URGENTE: 'Urgente',
};

const priorityClasses: Record<string, string> = {
    BAIXA: 'bg-slate-100 text-slate-600 border-slate-200',
    MEDIA: 'bg-blue-50 text-blue-700 border-blue-100',
    ALTA: 'bg-orange-100 text-orange-700 border-orange-200',
    URGENTE: 'bg-red-100 text-red-700 border-red-200',
};

const areaLabels: Record<string, string> = {
    GERAL: 'Geral',
    SOCIAL_DESIGN: 'Social',
    AUDIOVISUAL: 'Audiovisual',
};

function getDateKey(date: Date) {
    return date.toISOString().split('T')[0];
}

function startOfDay(date: Date) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
}

function endOfDay(date: Date) {
    const copy = new Date(date);
    copy.setHours(23, 59, 59, 999);
    return copy;
}

function formatDateInput(date: Date) {
    return date.toISOString().split('T')[0];
}

function getCalendarDays(year: number, month: number) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: Array<Date | null> = [];

    const startOffset = firstDay.getDay();

    for (let i = 0; i < startOffset; i++) {
        days.push(null);
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
        days.push(new Date(year, month, day, 12, 0, 0));
    }

    while (days.length % 7 !== 0) {
        days.push(null);
    }

    return days;
}

function isToday(date: Date | null) {
    if (!date) return false;

    const today = new Date();

    return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
    );
}

function isPast(date: Date | null) {
    if (!date) return false;

    return startOfDay(date) < startOfDay(new Date());
}

function buildCalendarHref({
    month,
    year,
    clientId,
    area,
    priority,
}: {
    month: number;
    year: number;
    clientId?: string;
    area?: string;
    priority?: string;
}) {
    const params = new URLSearchParams();

    params.set('mes', String(month));
    params.set('ano', String(year));

    if (clientId && clientId !== 'TODOS') {
        params.set('cliente', clientId);
    }

    if (area && area !== 'TODOS') {
        params.set('area', area);
    }

    if (priority && priority !== 'TODOS') {
        params.set('prioridade', priority);
    }

    return `/calendario-editorial?${params.toString()}`;
}

export default async function CalendarioEditorialPage({
    searchParams,
}: {
    searchParams: Promise<{
        mes?: string;
        ano?: string;
        cliente?: string;
        area?: string;
        prioridade?: string;
    }>;
}) {
    const params = await searchParams;

    const today = new Date();
    const currentMonth = params.mes ? Number(params.mes) - 1 : today.getMonth();
    const currentYear = params.ano ? Number(params.ano) : today.getFullYear();

    const selectedClient = params.cliente || 'TODOS';
    const selectedArea = params.area || 'TODOS';
    const selectedPriority = params.prioridade || 'TODOS';

    const monthStart = startOfDay(new Date(currentYear, currentMonth, 1));
    const monthEnd = endOfDay(new Date(currentYear, currentMonth + 1, 0));

    const clients = await prisma.client.findMany({
        orderBy: {
            name: 'asc',
        },
    });

    const contents = await prisma.content.findMany({
        where: {
            plannedDate: {
                gte: monthStart,
                lte: monthEnd,
            },
            ...(selectedClient !== 'TODOS'
                ? {
                    clientId: selectedClient,
                }
                : {}),
            ...(selectedArea !== 'TODOS'
                ? {
                    area: selectedArea,
                }
                : {}),
            ...(selectedPriority !== 'TODOS'
                ? {
                    priority: selectedPriority,
                }
                : {}),
        },
        include: {
            client: true,
        },
        orderBy: [
            {
                plannedDate: 'asc',
            },
            {
                createdAt: 'desc',
            },
        ],
    });

    const calendarDays = getCalendarDays(currentYear, currentMonth);

    const contentsByDay = contents.reduce<Record<string, typeof contents>>(
        (acc, content) => {
            if (!content.plannedDate) return acc;

            const key = getDateKey(new Date(content.plannedDate));

            if (!acc[key]) {
                acc[key] = [];
            }

            acc[key].push(content);

            return acc;
        },
        {}
    );

    const previousMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const nextMonthDate = new Date(currentYear, currentMonth + 1, 1);

    const previousMonthHref = buildCalendarHref({
        month: previousMonthDate.getMonth() + 1,
        year: previousMonthDate.getFullYear(),
        clientId: selectedClient,
        area: selectedArea,
        priority: selectedPriority,
    });

    const nextMonthHref = buildCalendarHref({
        month: nextMonthDate.getMonth() + 1,
        year: nextMonthDate.getFullYear(),
        clientId: selectedClient,
        area: selectedArea,
        priority: selectedPriority,
    });

    const currentMonthHref = buildCalendarHref({
        month: today.getMonth() + 1,
        year: today.getFullYear(),
        clientId: selectedClient,
        area: selectedArea,
        priority: selectedPriority,
    });

    const clearFiltersHref = buildCalendarHref({
        month: currentMonth + 1,
        year: currentYear,
    });

    const urgentContents = contents.filter(
        (content) => content.priority === 'URGENTE'
    );

    const lateContents = contents.filter((content) => {
        if (!content.plannedDate) return false;

        return (
            isPast(new Date(content.plannedDate)) &&
            !['PUBLICADO_MANUALMENTE', 'ARQUIVADO'].includes(content.status)
        );
    });

    const readyToPostContents = contents.filter(
        (content) => content.status === 'PRONTO_PARA_POSTAR'
    );

    const publishedContents = contents.filter(
        (content) => content.status === 'PUBLICADO_MANUALMENTE'
    );

    const hasActiveFilters =
        selectedClient !== 'TODOS' ||
        selectedArea !== 'TODOS' ||
        selectedPriority !== 'TODOS';

    const selectedClientName =
        clients.find((client) => client.id === selectedClient)?.name || 'Todos';

    const secondStageApproval =
        selectedClient !== 'TODOS'
            ? await prisma.approval.findFirst({
                  where: {
                      content: {
                          clientId: selectedClient,
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
                  select: {
                      token: true,
                  },
              })
            : null;

    const secondStageHref =
        selectedClient !== 'TODOS' && secondStageApproval
            ? `/aprovacao-final/${secondStageApproval.token}`
            : selectedClient !== 'TODOS'
              ? `/clientes/${selectedClient}/aprovacao-final`
              : '/clientes';
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <CalendarBackButton />

                    <h1 className="text-3xl font-bold text-slate-900">
                        Calendário Editorial
                    </h1>

                    <p className="mt-1 text-slate-500">
                        Visão mensal dos conteúdos planejados, prioridades, status e áreas responsáveis.
                    </p>
                </div>

                                <div className="flex flex-wrap gap-2">
                    {selectedClient !== 'TODOS' && (
                        <>
                            <Link
                                href={`/clientes/${selectedClient}/aprovacao-mensal?month=${currentMonth + 1}&year=${currentYear}`}
                                className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700"
                            >
                                {'1\u00aa Etapa de Aprova\u00e7\u00e3o'}
                            </Link>

                            <Link
                                href={secondStageHref}
                                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
                            >
                                {'2\u00aa Etapa de Aprova\u00e7\u00e3o'}
                            </Link>

                            <Link
                                href={`/captacoes/nova?clientId=${selectedClient}`}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                            >
                                {'Agendar grava\u00e7\u00e3o'}
                            </Link>
                        </>
                    )}

                    <Link
                        href={
                            selectedClient !== 'TODOS'
                                ? `/conteudos/novo?cliente=${selectedClient}`
                                : '/clientes'
                        }
                        className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
                    >
                        {'Novo Conte\u00fado'}
                    </Link>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="mr-2 text-2xl font-bold text-slate-900">
                                {monthNames[currentMonth]} de {currentYear}
                            </h2>

                            <Link
                                href={previousMonthHref}
                                title="Mês anterior"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-black text-slate-600 hover:bg-slate-100"
                            >
                                {'\u2190'}
                            </Link>

                            <Link
                                href={currentMonthHref}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
                            >
                                Hoje
                            </Link>

                            <Link
                                href={nextMonthHref}
                                title="Próximo mês"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-black text-slate-600 hover:bg-slate-100"
                            >
                                {'\u2192'}
                            </Link>
                        </div>

                        <p className="mt-1 text-sm text-slate-500">
                            {contents.length} conteúdo(s) encontrado(s) neste mês.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                            <p className="text-xs font-bold uppercase tracking-wide text-red-500">
                                Atrasados
                            </p>
                            <p className="text-xl font-bold text-red-700">
                                {lateContents.length}
                            </p>
                        </div>

                        <div className="rounded-xl border border-red-100 bg-white px-4 py-3">
                            <p className="text-xs font-bold uppercase tracking-wide text-red-400">
                                Urgentes
                            </p>
                            <p className="text-xl font-bold text-red-700">
                                {urgentContents.length}
                            </p>
                        </div>

                        <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3">
                            <p className="text-xs font-bold uppercase tracking-wide text-emerald-500">
                                Prontos
                            </p>
                            <p className="text-xl font-bold text-emerald-700">
                                {readyToPostContents.length}
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                Publicados
                            </p>
                            <p className="text-xl font-bold text-slate-900">
                                {publishedContents.length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-7 gap-2">
                    {weekDays.map((day) => (
                        <div
                            key={day}
                            className="rounded-lg bg-slate-100 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-slate-500"
                        >
                            {day}
                        </div>
                    ))}

                    {calendarDays.map((day, index) => {
                        if (!day) {
                            return (
                                <div
                                    key={`empty-${index}`}
                                    className="min-h-44 rounded-xl border border-dashed border-slate-100 bg-slate-50"
                                />
                            );
                        }

                        const key = getDateKey(day);
                        const dayContents = contentsByDay[key] || [];
                        const todayDay = isToday(day);
                        const pastDay = isPast(day);

                        return (
                            <div
                                key={key}
                                className={`min-h-44 rounded-xl border p-3 ${todayDay
                                        ? 'border-blue-300 bg-blue-50'
                                        : pastDay
                                            ? 'border-slate-200 bg-slate-50'
                                            : 'border-slate-200 bg-white'
                                    }`}
                            >
                                <div className="mb-3 flex items-center justify-between">
                                    <div
                                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${todayDay
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-slate-100 text-slate-700'
                                            }`}
                                    >
                                        {day.getDate()}
                                    </div>

                                    <Link
                                        href={
                                        selectedClient !== 'TODOS'
                                            ? `/conteudos/novo?cliente=${selectedClient}&data=${formatDateInput(day)}`
                                            : '/clientes'
                                    }
                                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-100"
                                    >
                                        +
                                    </Link>
                                </div>

                                <div className="space-y-2">
                                    {dayContents.length === 0 ? (
                                        <p className="text-xs text-slate-400">
                                            Sem conteúdo
                                        </p>
                                    ) : (
                                        dayContents.slice(0, 4).map((content) => {
                                            const priority = content.priority || 'MEDIA';
                                            const area = content.area || 'GERAL';
                                            const late =
                                                pastDay &&
                                                !['PUBLICADO_MANUALMENTE', 'ARQUIVADO'].includes(
                                                    content.status
                                                );

                                            return (
                                                <Link
                                                    key={content.id}
                                                    href={`/conteudos/${content.id}`}
                                                    className={`block rounded-lg border p-2 text-xs transition hover:shadow-sm ${late
                                                            ? 'border-red-200 bg-red-50'
                                                            : priority === 'URGENTE'
                                                                ? 'border-red-200 bg-white'
                                                                : priority === 'ALTA'
                                                                    ? 'border-orange-200 bg-white'
                                                                    : 'border-slate-100 bg-white'
                                                        }`}
                                                >
                                                    <p className="line-clamp-2 font-bold text-slate-900">
                                                        {content.title}
                                                    </p>

                                                    <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">
                                                        {content.client?.name || 'Cliente não informado'}
                                                    </p>

                                                    <div className="mt-2 flex flex-wrap gap-1">
                                                        <span
                                                            className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase ${priorityClasses[priority] ||
                                                                priorityClasses.MEDIA
                                                                }`}
                                                        >
                                                            {priorityLabels[priority] || priority}
                                                        </span>

                                                        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500">
                                                            {areaLabels[area] || area}
                                                        </span>
                                                    </div>
                                                </Link>
                                            );
                                        })
                                    )}

                                    {dayContents.length > 4 && (
                                        <p className="text-[11px] font-bold text-slate-500">
                                            +{dayContents.length - 4} conteúdo(s)
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <section className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
                    <h2 className="text-lg font-bold text-red-800">
                        Atenção do mês
                    </h2>

                    <p className="mt-1 text-sm text-red-600">
                        Conteúdos atrasados ou urgentes neste calendário.
                    </p>

                    <div className="mt-4 space-y-3">
                        {[...lateContents, ...urgentContents]
                            .filter(
                                (content, index, array) =>
                                    array.findIndex((item) => item.id === content.id) === index
                            )
                            .slice(0, 5)
                            .map((content) => (
                                <Link
                                    key={content.id}
                                    href={`/conteudos/${content.id}`}
                                    className="block rounded-xl border border-red-100 bg-white p-3 hover:shadow-sm"
                                >
                                    <p className="font-bold text-slate-900">
                                        {content.title}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                        {content.client?.name || 'Cliente não informado'} •{' '}
                                        {formatDateInput(new Date(content.plannedDate || today))}
                                    </p>
                                </Link>
                            ))}

                        {lateContents.length === 0 && urgentContents.length === 0 && (
                            <p className="rounded-xl border border-dashed border-red-200 bg-white p-6 text-center text-sm text-red-500">
                                Nenhum conteúdo crítico neste mês.
                            </p>
                        )}
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
                    <h2 className="text-lg font-bold text-slate-900">
                        Legenda rápida
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        Como interpretar a visão do calendário.
                    </p>

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                            <p className="font-bold text-blue-800">
                                Dia atual
                            </p>
                            <p className="mt-1 text-sm text-blue-700">
                                Aparece com fundo azul para facilitar a leitura do dia.
                            </p>
                        </div>

                        <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                            <p className="font-bold text-red-800">
                                Conteúdo atrasado
                            </p>
                            <p className="mt-1 text-sm text-red-700">
                                Data anterior a hoje e ainda não publicado ou arquivado.
                            </p>
                        </div>

                        <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
                            <p className="font-bold text-orange-800">
                                Alta prioridade
                            </p>
                            <p className="mt-1 text-sm text-orange-700">
                                Conteúdos que precisam de atenção, mas não são urgentes.
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="font-bold text-slate-800">
                                Botão +
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                                Cria um novo conteúdo já com aquela data preenchida.
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}


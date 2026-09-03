import { prisma } from '@/lib/prisma';
import { requireAgencyContext } from '@/lib/tenant';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/StatusBadge';

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
    SOCIAL_DESIGN: 'Design',
    AUDIOVISUAL: 'Filmaker',
};

const priorityOrder: Record<string, number> = {
    URGENTE: 1,
    ALTA: 2,
    MEDIA: 3,
    BAIXA: 4,
};

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

function addDays(date: Date, days: number) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
}

function formatDate(date: Date | null) {
    if (!date) return 'Sem data';

    return new Date(date).toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
    });
}

function isToday(date: Date | null) {
    if (!date) return false;

    const today = new Date();
    const current = new Date(date);

    return (
        today.getFullYear() === current.getFullYear() &&
        today.getMonth() === current.getMonth() &&
        today.getDate() === current.getDate()
    );
}

function getContentHighlightClasses(priority: string) {
    if (priority === 'URGENTE') {
        return 'border-red-300 bg-red-50 ring-1 ring-red-100';
    }

    if (priority === 'ALTA') {
        return 'border-orange-300 bg-orange-50 ring-1 ring-orange-100';
    }

    return 'border-slate-100 bg-white hover:bg-slate-50';
}

export default async function EntregasSemanaPage({
    searchParams,
}: {
    searchParams: Promise<{
        cliente?: string;
    }>;
}) {
    const {
        agencyId,
    } =
        await requireAgencyContext();

    const params = await searchParams;

    const selectedClient = params.cliente || 'TODOS';

    const clients = await prisma.client.findMany({
        where: {
            agencyId,
        },

        orderBy: {
            name: 'asc',
        },
    });

    const selectedClientName =
        clients.find((client) => client.id === selectedClient)?.name || 'Todos';

    const today = new Date();
    const start = startOfDay(today);
    const end = endOfDay(addDays(today, 7));

    const clientFilter =
        selectedClient !== 'TODOS'
            ? {
                clientId: selectedClient,
            }
            : {};

    const weekContents = await prisma.content.findMany({
        where: {
            client: {
                agencyId,
            },
            ...clientFilter,
            plannedDate: {
                gte: start,
                lte: end,
            },
            status: {
                not: 'PUBLICADO_MANUALMENTE',
            },
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

    const lateContents = await prisma.content.findMany({
        where: {
            client: {
                agencyId,
            },
            ...clientFilter,
            plannedDate: {
                lt: start,
            },
            status: {
                notIn: ['PUBLICADO_MANUALMENTE', 'ARQUIVADO'],
            },
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

    const sortedWeekContents = [...weekContents].sort((a, b) => {
        const priorityA = priorityOrder[a.priority || 'MEDIA'] || 3;
        const priorityB = priorityOrder[b.priority || 'MEDIA'] || 3;

        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }

        const dateA = a.plannedDate ? new Date(a.plannedDate).getTime() : 0;
        const dateB = b.plannedDate ? new Date(b.plannedDate).getTime() : 0;

        return dateA - dateB;
    });

    const sortedLateContents = [...lateContents].sort((a, b) => {
        const priorityA = priorityOrder[a.priority || 'MEDIA'] || 3;
        const priorityB = priorityOrder[b.priority || 'MEDIA'] || 3;

        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }

        const dateA = a.plannedDate ? new Date(a.plannedDate).getTime() : 0;
        const dateB = b.plannedDate ? new Date(b.plannedDate).getTime() : 0;

        return dateA - dateB;
    });

    const urgentContents = sortedWeekContents.filter(
        (content) => (content.priority || 'MEDIA') === 'URGENTE'
    );

    const highContents = sortedWeekContents.filter(
        (content) => (content.priority || 'MEDIA') === 'ALTA'
    );

    const criticalContents = sortedWeekContents.filter((content) =>
        ['URGENTE', 'ALTA'].includes(content.priority || 'MEDIA')
    );

    const pendingClientContents = sortedWeekContents.filter(
        (content) => content.status === 'ENVIADO_CLIENTE'
    );

    const readyToPostContents = sortedWeekContents.filter(
        (content) => content.status === 'PRONTO_PARA_POSTAR'
    );

    const contentsByDay = sortedWeekContents.reduce<Record<string, typeof weekContents>>(
        (acc, content) => {
            const key = content.plannedDate
                ? new Date(content.plannedDate).toISOString().split('T')[0]
                : 'sem-data';

            if (!acc[key]) {
                acc[key] = [];
            }

            acc[key].push(content);

            return acc;
        },
        {}
    );

    const dayKeys = Object.keys(contentsByDay).sort();

    const hasActiveFilters = selectedClient !== 'TODOS';

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <Link
                        href="/clientes"
                        className="text-sm text-blue-600 hover:underline mb-2 inline-block"
                    >
                        &larr; Voltar para Dashboard
                    </Link>

                    <h1 className="text-3xl font-bold text-slate-900">
                        Entregas da Semana
                    </h1>

                    <p className="text-slate-500 mt-1">
                        Conteúdos previstos para os próximos 7 dias, atrasados, prioridades e status.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Link
                        href="/conteudos/kanban"
                        className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Produção Geral
                    </Link>

                    <Link
                        href="/pronto-para-postar"
                        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                    >
                        Pronto para Postar
                    </Link>

                    <Link
                        href="/conteudos/novo"
                        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    >
                        Novo Conteúdo
                    </Link>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Filtros
                        </p>

                        <h2 className="mt-1 text-lg font-bold text-slate-900">
                            Refinar entregas
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Filtre as entregas por cliente para acompanhar uma operação específica.
                        </p>
                    </div>

                    {hasActiveFilters && (
                        <Link
                            href="/entregas-semana"
                            className="w-fit rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
                        >
                            Limpar filtros
                        </Link>
                    )}
                </div>

                <form
                    action="/entregas-semana"
                    method="GET"
                    className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-4"
                >
                    <div className="lg:col-span-3">
                        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            Cliente
                        </label>

                        <select
                            name="cliente"
                            defaultValue={selectedClient}
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                            <option value="TODOS">Todos os clientes</option>
                            {clients.map((client) => (
                                <option key={client.id} value={client.id}>
                                    {client.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-end">
                        <button
                            type="submit"
                            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                        >
                            Aplicar filtro
                        </button>
                    </div>
                </form>

                {hasActiveFilters && (
                    <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700">
                        Exibindo entregas filtradas por{' '}
                        <strong>Cliente: {selectedClientName}</strong>.
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Total da Semana
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                        {sortedWeekContents.length}
                    </p>
                </div>

                <div className="rounded-xl border border-red-300 bg-red-50 p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-red-500">
                        Atrasados
                    </p>
                    <p className="mt-2 text-3xl font-bold text-red-700">
                        {sortedLateContents.length}
                    </p>
                </div>

                <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-red-500">
                        Urgentes
                    </p>
                    <p className="mt-2 text-3xl font-bold text-red-700">
                        {urgentContents.length}
                    </p>
                </div>

                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-orange-500">
                        Alta Prioridade
                    </p>
                    <p className="mt-2 text-3xl font-bold text-orange-700">
                        {highContents.length}
                    </p>
                </div>

                <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-400">
                        Aguardando Cliente
                    </p>
                    <p className="mt-2 text-3xl font-bold text-blue-700">
                        {pendingClientContents.length}
                    </p>
                </div>
            </div>

            {sortedLateContents.length > 0 && (
                <div className="rounded-xl border border-red-300 bg-white shadow-sm">
                    <div className="border-b border-red-100 bg-red-50 p-4">
                        <h2 className="text-lg font-bold text-red-800">
                            Entregas Atrasadas
                        </h2>

                        <p className="mt-1 text-sm text-red-600">
                            Conteúdos com data prevista anterior a hoje e que ainda não foram publicados ou arquivados.
                        </p>
                    </div>

                    <div className="divide-y divide-red-100">
                        {sortedLateContents.map((content) => {
                            const priority = content.priority || 'MEDIA';
                            const area = content.area || 'GERAL';

                            return (
                                <div key={content.id} className="bg-red-50 p-4">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Link
                                                    href={`/conteudos/${content.id}`}
                                                    className="font-bold text-slate-900 hover:text-blue-600 hover:underline"
                                                >
                                                    {content.title}
                                                </Link>

                                                <span className="rounded-full border border-red-200 bg-red-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-red-700">
                                                    Atrasado
                                                </span>

                                                <span
                                                    className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${priorityClasses[priority] || priorityClasses.MEDIA
                                                        }`}
                                                >
                                                    {priorityLabels[priority] || priority}
                                                </span>
                                            </div>

                                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                                                <span>
                                                    Data:{' '}
                                                    <strong className="text-red-700">
                                                        {formatDate(content.plannedDate)}
                                                    </strong>
                                                </span>

                                                <span>•</span>

                                                <span>
                                                    Cliente:{' '}
                                                    <strong className="text-slate-800">
                                                        {content.client?.name || 'Não informado'}
                                                    </strong>
                                                </span>

                                                <span>•</span>

                                                <span>
                                                    Responsável:{' '}
                                                    <strong className="text-slate-800">
                                                        {content.responsible || 'Não definido'}
                                                    </strong>
                                                </span>

                                                <span>•</span>

                                                <span>
                                                    Área:{' '}
                                                    <strong className="text-slate-800">
                                                        {areaLabels[area] || area}
                                                    </strong>
                                                </span>
                                            </div>
                                        </div>

                                        <StatusBadge status={content.status} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {criticalContents.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-white shadow-sm">
                    <div className="border-b border-red-100 bg-red-50 p-4">
                        <h2 className="text-lg font-bold text-red-800">
                            Demandas Críticas da Semana
                        </h2>

                        <p className="mt-1 text-sm text-red-600">
                            Conteúdos marcados como Urgente ou Alta prioridade dentro dos próximos 7 dias.
                        </p>
                    </div>

                    <div className="divide-y divide-red-100">
                        {criticalContents.map((content) => {
                            const priority = content.priority || 'MEDIA';
                            const area = content.area || 'GERAL';

                            return (
                                <div
                                    key={content.id}
                                    className={`p-4 ${priority === 'URGENTE' ? 'bg-red-50' : 'bg-orange-50'
                                        }`}
                                >
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Link
                                                    href={`/conteudos/${content.id}`}
                                                    className="font-bold text-slate-900 hover:text-blue-600 hover:underline"
                                                >
                                                    {content.title}
                                                </Link>

                                                <span
                                                    className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${priorityClasses[priority] || priorityClasses.MEDIA
                                                        }`}
                                                >
                                                    {priorityLabels[priority] || priority}
                                                </span>
                                            </div>

                                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                                                <span>
                                                    Data:{' '}
                                                    <strong className="text-slate-800">
                                                        {formatDate(content.plannedDate)}
                                                    </strong>
                                                </span>

                                                <span>•</span>

                                                <span>
                                                    Cliente:{' '}
                                                    <strong className="text-slate-800">
                                                        {content.client?.name || 'Não informado'}
                                                    </strong>
                                                </span>

                                                <span>•</span>

                                                <span>
                                                    Responsável:{' '}
                                                    <strong className="text-slate-800">
                                                        {content.responsible || 'Não definido'}
                                                    </strong>
                                                </span>

                                                <span>•</span>

                                                <span>
                                                    Área:{' '}
                                                    <strong className="text-slate-800">
                                                        {areaLabels[area] || area}
                                                    </strong>
                                                </span>
                                            </div>
                                        </div>

                                        <StatusBadge status={content.status} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {sortedWeekContents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
                    <h2 className="text-lg font-bold text-slate-900">
                        Nenhuma entrega prevista para os próximos 7 dias.
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                        Quando houver conteúdos com data prevista, eles aparecerão aqui.
                    </p>
                </div>
            ) : (
                <div className="space-y-5">
                    {dayKeys.map((dayKey) => {
                        const dayContents = contentsByDay[dayKey];
                        const dayDate = new Date(`${dayKey}T12:00:00`);

                        return (
                            <div
                                key={dayKey}
                                className="rounded-xl border border-slate-200 bg-white shadow-sm"
                            >
                                <div className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900">
                                            {formatDate(dayDate)}
                                        </h2>

                                        <p className="text-sm text-slate-500">
                                            {dayContents.length} conteúdo(s) previsto(s)
                                        </p>
                                    </div>

                                    {isToday(dayDate) && (
                                        <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                                            Hoje
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-3 p-4">
                                    {dayContents.map((content) => {
                                        const priority = content.priority || 'MEDIA';
                                        const area = content.area || 'GERAL';

                                        return (
                                            <div
                                                key={content.id}
                                                className={`rounded-xl border p-4 transition ${getContentHighlightClasses(priority)}`}
                                            >
                                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Link
                                                                href={`/conteudos/${content.id}`}
                                                                className="font-bold text-slate-900 hover:text-blue-600 hover:underline"
                                                            >
                                                                {content.title}
                                                            </Link>

                                                            <span
                                                                className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${priorityClasses[priority] ||
                                                                    priorityClasses.MEDIA
                                                                    }`}
                                                            >
                                                                {priorityLabels[priority] || priority}
                                                            </span>
                                                        </div>

                                                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                                                            <span>
                                                                Cliente:{' '}
                                                                <strong className="text-slate-700">
                                                                    {content.client?.name || 'Não informado'}
                                                                </strong>
                                                            </span>

                                                            <span>•</span>

                                                            <span>
                                                                Área:{' '}
                                                                <strong className="text-slate-700">
                                                                    {areaLabels[area] || area}
                                                                </strong>
                                                            </span>

                                                            <span>•</span>

                                                            <span>
                                                                Responsável:{' '}
                                                                <strong className="text-slate-700">
                                                                    {content.responsible || 'Não definido'}
                                                                </strong>
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <StatusBadge status={content.status} />

                                                        {content.format && (
                                                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                                                {content.format}
                                                            </span>
                                                        )}

                                                        {content.platform && (
                                                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                                                {content.platform}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {readyToPostContents.length > 0 && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="font-bold text-emerald-900">
                                Conteúdos prontos para postar nesta semana
                            </h2>

                            <p className="mt-1 text-sm text-emerald-700">
                                Existem {readyToPostContents.length} conteúdo(s) prontos para publicação manual.
                            </p>
                        </div>

                        <Link
                            href={
                                selectedClient !== 'TODOS'
                                    ? `/pronto-para-postar?cliente=${selectedClient}`
                                    : '/pronto-para-postar'
                            }
                            className="w-fit rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                        >
                            Abrir Prontos
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}


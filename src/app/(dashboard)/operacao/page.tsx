import { prisma } from '@/lib/prisma';
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
    SOCIAL_DESIGN: 'Social / Design',
    AUDIOVISUAL: 'Audiovisual',
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
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

export default async function OperacaoPage() {
    const today = new Date();
    const start = startOfDay(today);
    const end = endOfDay(addDays(today, 7));

    const [
        allContents,
        lateContents,
        weekContents,
        pendingTasks,
        urgentTasks,
        pendingClientContents,
        readyToPostContents,
    ] = await Promise.all([
        prisma.content.findMany({
            include: {
                client: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 8,
        }),

        prisma.content.findMany({
            where: {
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
            orderBy: {
                plannedDate: 'asc',
            },
            take: 6,
        }),

        prisma.content.findMany({
            where: {
                plannedDate: {
                    gte: start,
                    lte: end,
                },
                status: {
                    notIn: ['PUBLICADO_MANUALMENTE', 'ARQUIVADO'],
                },
            },
            include: {
                client: true,
            },
            orderBy: {
                plannedDate: 'asc',
            },
            take: 6,
        }),

        prisma.task.findMany({
            where: {
                status: {
                    not: 'FINALIZADO',
                },
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
            take: 6,
        }),

        prisma.task.findMany({
            where: {
                status: {
                    not: 'FINALIZADO',
                },
                priority: 'URGENTE',
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
            take: 6,
        }),

        prisma.content.findMany({
            where: {
                status: 'ENVIADO_CLIENTE',
            },
            include: {
                client: true,
            },
            orderBy: {
                updatedAt: 'desc',
            },
            take: 6,
        }),

        prisma.content.findMany({
            where: {
                status: 'PRONTO_PARA_POSTAR',
            },
            include: {
                client: true,
            },
            orderBy: {
                plannedDate: 'asc',
            },
            take: 6,
        }),
    ]);

    const totalContents = await prisma.content.count();

    const totalTasks = await prisma.task.count();

    const finishedTasks = await prisma.task.count({
        where: {
            status: 'FINALIZADO',
        },
    });

    const activeClients = await prisma.client.count();

    function ContentRow({
        content,
        showDate = true,
    }: {
        content: (typeof allContents)[number];
        showDate?: boolean;
    }) {
        const priority = content.priority || 'MEDIA';
        const area = content.area || 'GERAL';

        return (
            <div className="rounded-lg border border-slate-100 bg-white p-3 hover:bg-slate-50">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
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

                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
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

                            {showDate && (
                                <>
                                    <span>•</span>
                                    <span>
                                        Data:{' '}
                                        <strong className="text-slate-700">
                                            {formatDate(content.plannedDate)}
                                        </strong>
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    <StatusBadge status={content.status} />
                </div>
            </div>
        );
    }

    function TaskRow({
        task,
    }: {
        task: (typeof pendingTasks)[number];
    }) {
        const priority = task.priority || 'MEDIA';

        return (
            <div className="rounded-lg border border-slate-100 bg-white p-3 hover:bg-slate-50">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href={`/conteudos/${task.contentId}`}
                                className="font-bold text-slate-900 hover:text-blue-600 hover:underline"
                            >
                                {task.title}
                            </Link>

                            <span
                                className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${priorityClasses[priority] || priorityClasses.MEDIA
                                    }`}
                            >
                                {priorityLabels[priority] || priority}
                            </span>
                        </div>

                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                            <span>
                                Conteúdo:{' '}
                                <strong className="text-slate-700">
                                    {task.content?.title || 'Não informado'}
                                </strong>
                            </span>

                            <span>•</span>

                            <span>
                                Cliente:{' '}
                                <strong className="text-slate-700">
                                    {task.content?.client?.name || 'Não informado'}
                                </strong>
                            </span>
                        </div>
                    </div>

                    <Link
                        href={`/conteudos/${task.contentId}`}
                        className="w-fit rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                    >
                        Abrir
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <Link
                        href="/dashboard"
                        className="text-sm text-blue-600 hover:underline mb-2 inline-block"
                    >
                        &larr; Voltar para Dashboard
                    </Link>

                    <h1 className="text-3xl font-bold text-slate-900">
                        Operação da Agência
                    </h1>

                    <p className="text-slate-500 mt-1">
                        Visão rápida do que está atrasado, urgente, em produção e aguardando cliente.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Link
                        href="/entregas-semana"
                        className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Entregas
                    </Link>

                    <Link
                        href="/tarefas"
                        className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Tarefas
                    </Link>

                    <Link
                        href="/conteudos/kanban"
                        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    >
                        Kanban
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Clientes
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                        {activeClients}
                    </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Conteúdos
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                        {totalContents}
                    </p>
                </div>

                <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-red-500">
                        Atrasados
                    </p>
                    <p className="mt-2 text-3xl font-bold text-red-700">
                        {lateContents.length}
                    </p>
                </div>

                <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-400">
                        Tarefas
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                        {finishedTasks}/{totalTasks}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                        finalizadas / total
                    </p>
                </div>
            </div>

            {lateContents.length > 0 && (
                <section className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-bold text-red-800">
                                Atenção: conteúdos atrasados
                            </h2>

                            <p className="text-sm text-red-600">
                                Conteúdos com data anterior a hoje e ainda não publicados.
                            </p>
                        </div>

                        <Link
                            href="/entregas-semana"
                            className="rounded-md bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
                        >
                            Ver todos
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {lateContents.map((content) => (
                            <ContentRow key={content.id} content={content} />
                        ))}
                    </div>
                </section>
            )}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">
                                Entregas dos próximos 7 dias
                            </h2>

                            <p className="text-sm text-slate-500">
                                Próximas demandas com data prevista.
                            </p>
                        </div>

                        <Link
                            href="/entregas-semana"
                            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                        >
                            Ver entregas
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {weekContents.length === 0 ? (
                            <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                                Nenhuma entrega prevista para os próximos 7 dias.
                            </p>
                        ) : (
                            weekContents.map((content) => (
                                <ContentRow key={content.id} content={content} />
                            ))
                        )}
                    </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">
                                Tarefas pendentes
                            </h2>

                            <p className="text-sm text-slate-500">
                                Atividades internas ainda em aberto.
                            </p>
                        </div>

                        <Link
                            href="/tarefas"
                            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                        >
                            Ver tarefas
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {pendingTasks.length === 0 ? (
                            <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                                Nenhuma tarefa pendente.
                            </p>
                        ) : (
                            pendingTasks.map((task) => (
                                <TaskRow key={task.id} task={task} />
                            ))
                        )}
                    </div>
                </section>

                <section className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-bold text-red-800">
                                Tarefas urgentes
                            </h2>

                            <p className="text-sm text-red-600">
                                Tarefas que precisam de atenção imediata.
                            </p>
                        </div>

                        <Link
                            href="/tarefas"
                            className="rounded-md bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
                        >
                            Ver tarefas
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {urgentTasks.length === 0 ? (
                            <p className="rounded-lg border border-dashed border-red-200 bg-white p-6 text-center text-sm text-red-500">
                                Nenhuma tarefa urgente no momento.
                            </p>
                        ) : (
                            urgentTasks.map((task) => (
                                <TaskRow key={task.id} task={task} />
                            ))
                        )}
                    </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">
                                Aguardando cliente
                            </h2>

                            <p className="text-sm text-slate-500">
                                Conteúdos enviados e pendentes de retorno.
                            </p>
                        </div>

                        <Link
                            href="/conteudos/kanban"
                            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                        >
                            Ver Kanban
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {pendingClientContents.length === 0 ? (
                            <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                                Nenhum conteúdo aguardando cliente.
                            </p>
                        ) : (
                            pendingClientContents.map((content) => (
                                <ContentRow key={content.id} content={content} showDate={false} />
                            ))
                        )}
                    </div>
                </section>
            </div>

            {readyToPostContents.length > 0 && (
                <section className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-bold text-emerald-900">
                                Prontos para postar
                            </h2>

                            <p className="text-sm text-emerald-700">
                                Conteúdos finalizados e aguardando publicação manual.
                            </p>
                        </div>

                        <Link
                            href="/conteudos/kanban"
                            className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                            Ver Kanban
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {readyToPostContents.map((content) => (
                            <ContentRow key={content.id} content={content} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}


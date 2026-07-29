import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import {
    updateTaskFromTasksPage,
    deleteTaskFromTasksPage,
} from './tarefasActions';

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

const statusLabels: Record<string, string> = {
    A_FAZER: 'A fazer',
    EM_ANDAMENTO: 'Em andamento',
    FINALIZADO: 'Finalizada',
};

const statusClasses: Record<string, string> = {
    A_FAZER: 'bg-slate-100 text-slate-700 border-slate-200',
    EM_ANDAMENTO: 'bg-blue-50 text-blue-700 border-blue-100',
    FINALIZADO: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

const contentStatusLabels: Record<string, string> = {
    IDEIA: 'Ideia',
    ROTEIRO: 'Roteiro',
    AGENDAMENTO_PRODUCAO: 'Agendamento de Produção',
    DESIGN: 'Design',
    EDICAO: 'Edição',
    REVISAO_INTERNA: 'Revisão Interna',
    ENVIADO_CLIENTE: 'Enviado ao Cliente',
    ALTERACAO_SOLICITADA: 'Alteração Solicitada',
    APROVADO: 'Aprovado',
    PRONTO_PARA_POSTAR: 'Pronto para Postar',
    PUBLICADO_MANUALMENTE: 'Publicado',
    ARQUIVADO: 'Arquivado',
};

const contentStatusClasses: Record<string, string> = {
    IDEIA: 'bg-slate-100 text-slate-700 border-slate-200',
    ROTEIRO: 'bg-purple-50 text-purple-700 border-purple-100',
    AGENDAMENTO_PRODUCAO: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    DESIGN: 'bg-blue-50 text-blue-700 border-blue-100',
    EDICAO: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    REVISAO_INTERNA: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    ENVIADO_CLIENTE: 'bg-orange-50 text-orange-700 border-orange-100',
    ALTERACAO_SOLICITADA: 'bg-red-50 text-red-700 border-red-100',
    APROVADO: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    PRONTO_PARA_POSTAR: 'bg-teal-50 text-teal-700 border-teal-100',
    PUBLICADO_MANUALMENTE: 'bg-slate-900 text-white border-slate-900',
    ARQUIVADO: 'bg-slate-100 text-slate-500 border-slate-200',
};

const areaLabels: Record<string, string> = {
    GERAL: 'Geral',
    SOCIAL_DESIGN: 'Design',
    AUDIOVISUAL: 'Filmmaker',
};

const priorityOrder: Record<string, number> = {
    URGENTE: 1,
    ALTA: 2,
    MEDIA: 3,
    BAIXA: 4,
};

const statusFilterOptions = [
    { value: 'TODOS', label: 'Todos' },
    { value: 'A_FAZER', label: 'A fazer' },
    { value: 'EM_ANDAMENTO', label: 'Em andamento' },
    { value: 'FINALIZADO', label: 'Finalizadas' },
];

function formatDate(date: Date | null) {
    if (!date) return 'Sem data';

    return new Date(date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function isLate(date: Date | null) {
    if (!date) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const current = new Date(date);
    current.setHours(0, 0, 0, 0);

    return current < today;
}

function getTaskDate(task: {
    dueDate: Date | null;
    content?: {
        plannedDate: Date | null;
    } | null;
}) {
    return task.dueDate || task.content?.plannedDate || null;
}

function isAutomaticTask(task: {
    title: string;
    description: string | null;
}) {
    const text = `${task.title} ${task.description || ''}`.toLowerCase();

    return (
        text.includes('calendário mensal') ||
        text.includes('planejamento aprovado') ||
        text.includes('cliente solicitou') ||
        text.includes('produzir') ||
        text.includes('ajustar')
    );
}

function buildTarefasHref({
    cliente,
    status,
    prioridade,
    tipo,
}: {
    cliente?: string;
    status?: string;
    prioridade?: string;
    tipo?: string;
}) {
    const params = new URLSearchParams();

    if (cliente && cliente !== 'TODOS') {
        params.set('cliente', cliente);
    }

    if (status && status !== 'TODOS') {
        params.set('status', status);
    }

    if (prioridade && prioridade !== 'TODOS') {
        params.set('prioridade', prioridade);
    }

    if (tipo && tipo !== 'TODOS') {
        params.set('tipo', tipo);
    }

    const query = params.toString();

    return query ? `/tarefas?${query}` : '/tarefas';
}

export default async function TarefasPage({
    searchParams,
}: {
    searchParams: Promise<{
        cliente?: string;
        status?: string;
        prioridade?: string;
        tipo?: string;
    }>;
}) {
    const params = await searchParams;

    const selectedClient = params.cliente || 'TODOS';
    const selectedStatus = params.status || 'TODOS';
    const selectedPriority = params.prioridade || 'TODOS';
    const selectedType = params.tipo || 'TODOS';

    const clients = await prisma.client.findMany({
        orderBy: {
            name: 'asc',
        },
    });

    const tasks = await prisma.task.findMany({
        where: {
            ...(selectedStatus !== 'TODOS'
                ? {
                    status: selectedStatus,
                }
                : {}),
            ...(selectedPriority !== 'TODOS'
                ? {
                    priority: selectedPriority,
                }
                : {}),
            ...(selectedClient !== 'TODOS'
                ? {
                    content: {
                        clientId: selectedClient,
                    },
                }
                : {}),
        },
        include: {
            content: {
                include: {
                    client: true,
                },
            },
        },
        orderBy: [
            {
                createdAt: 'desc',
            },
        ],
    });

    const typedTasks =
        selectedType === 'AUTOMATICAS'
            ? tasks.filter((task) => isAutomaticTask(task))
            : selectedType === 'MANUAIS'
                ? tasks.filter((task) => !isAutomaticTask(task))
                : tasks;

    const sortedTasks = [...typedTasks].sort((a, b) => {
        const statusA = a.status === 'FINALIZADO' ? 2 : 1;
        const statusB = b.status === 'FINALIZADO' ? 2 : 1;

        if (statusA !== statusB) {
            return statusA - statusB;
        }

        const priorityA = priorityOrder[a.priority || 'MEDIA'] || 3;
        const priorityB = priorityOrder[b.priority || 'MEDIA'] || 3;

        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }

        const dateA = getTaskDate(a)
            ? new Date(getTaskDate(a) as Date).getTime()
            : 9999999999999;

        const dateB = getTaskDate(b)
            ? new Date(getTaskDate(b) as Date).getTime()
            : 9999999999999;

        return dateA - dateB;
    });

    const pendingTasks = sortedTasks.filter((task) => task.status !== 'FINALIZADO');
    const completedTasks = sortedTasks.filter(
        (task) => task.status === 'FINALIZADO'
    );

    const urgentTasks = pendingTasks.filter((task) => task.priority === 'URGENTE');
    const highTasks = pendingTasks.filter((task) => task.priority === 'ALTA');
    const inProgressTasks = pendingTasks.filter(
        (task) => task.status === 'EM_ANDAMENTO'
    );
    const lateTasks = pendingTasks.filter((task) => isLate(getTaskDate(task)));
    const automaticTasks = pendingTasks.filter((task) => isAutomaticTask(task));

    const hasActiveFilters =
        selectedClient !== 'TODOS' ||
        selectedStatus !== 'TODOS' ||
        selectedPriority !== 'TODOS' ||
        selectedType !== 'TODOS';

    const selectedClientName =
        clients.find((client) => client.id === selectedClient)?.name || 'Todos';

    function renderTask(task: (typeof tasks)[number], completed = false) {
        const priority = task.priority || 'MEDIA';
        const status = task.status || 'A_FAZER';
        const taskDate = getTaskDate(task);
        const late = isLate(taskDate);
        const area = task.content?.area || 'GERAL';
        const contentStatus = task.content?.status || 'IDEIA';
        const automatic = isAutomaticTask(task);

        const updateAction = updateTaskFromTasksPage.bind(null, task.id);
        const deleteAction = deleteTaskFromTasksPage.bind(null, task.id);

        return (
            <div
                key={task.id}
                className={`p-4 transition ${completed
                        ? 'bg-white'
                        : late
                            ? 'bg-red-50'
                            : priority === 'URGENTE'
                                ? 'bg-red-50'
                                : priority === 'ALTA'
                                    ? 'bg-orange-50'
                                    : automatic
                                        ? 'bg-cyan-50'
                                        : 'hover:bg-slate-50'
                    }`}
            >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href={`/conteudos/${task.contentId}`}
                                className={`font-bold hover:text-blue-600 hover:underline ${completed ? 'text-slate-500 line-through' : 'text-slate-900'
                                    }`}
                            >
                                {task.title}
                            </Link>

                            <span
                                className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${priorityClasses[priority] || priorityClasses.MEDIA
                                    }`}
                            >
                                {priorityLabels[priority] || priority}
                            </span>

                            <span
                                className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClasses[status] || statusClasses.A_FAZER
                                    }`}
                            >
                                {statusLabels[status] || status}
                            </span>

                            {automatic && (
                                <span className="rounded-full border border-cyan-100 bg-cyan-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-cyan-700">
                                    Automática
                                </span>
                            )}

                            {late && !completed && (
                                <span className="rounded-full border border-red-200 bg-red-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-red-700">
                                    Atrasada
                                </span>
                            )}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                            <span>
                                Conteúdo:{' '}
                                <strong className="text-slate-700">
                                    {task.content?.title || 'Conteúdo não encontrado'}
                                </strong>
                            </span>

                            <span>•</span>

                            <span>
                                Cliente:{' '}
                                <strong className="text-slate-700">
                                    {task.content?.client?.name || 'Não informado'}
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
                                Prazo:{' '}
                                <strong className={late ? 'text-red-700' : 'text-slate-700'}>
                                    {formatDate(taskDate)}
                                </strong>
                            </span>

                            {task.responsible && (
                                <>
                                    <span>•</span>
                                    <span>
                                        Responsável:{' '}
                                        <strong className="text-slate-700">
                                            {task.responsible}
                                        </strong>
                                    </span>
                                </>
                            )}
                        </div>

                        {task.description && (
                            <div className="mt-3 rounded-xl border border-slate-100 bg-white/70 p-3">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Descrição
                                </p>

                                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                                    {task.description}
                                </p>
                            </div>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2">
                            <span
                                className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${contentStatusClasses[contentStatus] ||
                                    contentStatusClasses.IDEIA
                                    }`}
                            >
                                Conteúdo: {contentStatusLabels[contentStatus] || contentStatus}
                            </span>

                            {task.content?.format && (
                                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                    {task.content.format}
                                </span>
                            )}

                            {task.content?.platform && (
                                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                    {task.content.platform}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="w-full rounded-lg border border-slate-200 bg-white p-3 xl:w-80">
                        <form action={updateAction} className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                        Status
                                    </label>

                                    <select
                                        name="status"
                                        defaultValue={status}
                                        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    >
                                        <option value="A_FAZER">A fazer</option>
                                        <option value="EM_ANDAMENTO">Em andamento</option>
                                        <option value="FINALIZADO">Finalizada</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                        Prioridade
                                    </label>

                                    <select
                                        name="priority"
                                        defaultValue={priority}
                                        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    >
                                        <option value="BAIXA">Baixa</option>
                                        <option value="MEDIA">Média</option>
                                        <option value="ALTA">Alta</option>
                                        <option value="URGENTE">Urgente</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full rounded-md bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                            >
                                Salvar tarefa
                            </button>
                        </form>

                        {!completed && (
                            <div className="mt-2 grid grid-cols-2 gap-2">
                                {status !== 'EM_ANDAMENTO' && (
                                    <form action={updateAction}>
                                        <input type="hidden" name="status" value="EM_ANDAMENTO" />
                                        <input type="hidden" name="priority" value={priority} />

                                        <button
                                            type="submit"
                                            className="w-full rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                                        >
                                            Iniciar
                                        </button>
                                    </form>
                                )}

                                {status !== 'FINALIZADO' && (
                                    <form action={updateAction}>
                                        <input type="hidden" name="status" value="FINALIZADO" />
                                        <input type="hidden" name="priority" value={priority} />

                                        <button
                                            type="submit"
                                            className="w-full rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                                        >
                                            Finalizar
                                        </button>
                                    </form>
                                )}
                            </div>
                        )}

                        <div className="mt-2 flex gap-2">
                            <Link
                                href={`/conteudos/${task.contentId}`}
                                className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-center text-xs font-bold text-slate-600 hover:bg-slate-100"
                            >
                                Abrir conteúdo
                            </Link>

                            {task.content?.clientId && (
                                <Link
                                    href={`/clientes/${task.content.clientId}/visao`}
                                    className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-center text-xs font-bold text-slate-600 hover:bg-slate-100"
                                >
                                    Cliente
                                </Link>
                            )}
                        </div>

                        <form action={deleteAction} className="mt-2">
                            <button
                                type="submit"
                                className="w-full rounded-md bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
                            >
                                Excluir tarefa
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-8 shadow-sm">
                <div className="absolute -right-10 -top-10 h-52 w-52 rounded-full bg-blue-500/20 blur-3xl"></div>
                <div className="absolute bottom-0 left-1/3 h-52 w-52 rounded-full bg-indigo-500/20 blur-3xl"></div>
                <div className="absolute bottom-0 right-1/4 h-32 w-32 rounded-full bg-cyan-500/10 blur-2xl"></div>

                <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <Link
                            href="/dashboard"
                            className="mb-3 inline-block text-sm text-blue-200 hover:underline"
                        >
                            &larr; Voltar para Dashboard
                        </Link>

                        <p className="text-sm font-bold uppercase tracking-wider text-blue-300">
                            Central Operacional
                        </p>

                        <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
                            Tarefas da Equipe
                        </h1>

                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
                            Controle as tarefas criadas manualmente e automaticamente pelo fluxo de aprovação dos clientes.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Link
                            href="/entregas-semana"
                            className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-100"
                        >
                            Entregas
                        </Link>

                        <Link
                            href="/conteudos/kanban"
                            className="rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-white hover:bg-white/10"
                        >
                            Produção Geral
                        </Link>

                        <Link
                            href="/conteudos/novo"
                            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                        >
                            Novo Conteúdo
                        </Link>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Filtros
                        </p>

                        <h2 className="mt-1 text-lg font-bold text-slate-900">
                            Refinar tarefas
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Filtre por cliente, status, prioridade e origem da tarefa.
                        </p>
                    </div>

                    {hasActiveFilters && (
                        <Link
                            href="/tarefas"
                            className="w-fit rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
                        >
                            Limpar filtros
                        </Link>
                    )}
                </div>

                <form
                    action="/tarefas"
                    method="GET"
                    className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-5"
                >
                    <div>
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

                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            Status
                        </label>

                        <select
                            name="status"
                            defaultValue={selectedStatus}
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                            {statusFilterOptions.map((status) => (
                                <option key={status.value} value={status.value}>
                                    {status.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            Prioridade
                        </label>

                        <select
                            name="prioridade"
                            defaultValue={selectedPriority}
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                            <option value="TODOS">Todas</option>
                            <option value="BAIXA">Baixa</option>
                            <option value="MEDIA">Média</option>
                            <option value="ALTA">Alta</option>
                            <option value="URGENTE">Urgente</option>
                        </select>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            Origem
                        </label>

                        <select
                            name="tipo"
                            defaultValue={selectedType}
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                            <option value="TODOS">Todas</option>
                            <option value="AUTOMATICAS">Automáticas</option>
                            <option value="MANUAIS">Manuais</option>
                        </select>
                    </div>

                    <div className="flex items-end">
                        <button
                            type="submit"
                            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                        >
                            Aplicar filtros
                        </button>
                    </div>
                </form>

                {hasActiveFilters && (
                    <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700">
                        Exibindo tarefas filtradas por{' '}
                        <strong>Cliente: {selectedClientName}</strong>,{' '}
                        <strong>
                            Status:{' '}
                            {
                                statusFilterOptions.find(
                                    (status) => status.value === selectedStatus
                                )?.label
                            }
                        </strong>
                        ,{' '}
                        <strong>
                            Prioridade: {priorityLabels[selectedPriority] || 'Todas'}
                        </strong>{' '}
                        e{' '}
                        <strong>
                            Origem:{' '}
                            {selectedType === 'AUTOMATICAS'
                                ? 'Automáticas'
                                : selectedType === 'MANUAIS'
                                    ? 'Manuais'
                                    : 'Todas'}
                        </strong>
                        .
                    </div>
                )}
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-6">
                <Link
                    href={buildTarefasHref({
                        cliente: selectedClient,
                        status: 'TODOS',
                        prioridade: 'TODOS',
                        tipo: selectedType,
                    })}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50"
                >
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Total
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                        {sortedTasks.length}
                    </p>
                </Link>

                <Link
                    href={buildTarefasHref({
                        cliente: selectedClient,
                        status: 'A_FAZER',
                        prioridade: selectedPriority,
                        tipo: selectedType,
                    })}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50"
                >
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Pendentes
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                        {pendingTasks.length}
                    </p>
                </Link>

                <Link
                    href={buildTarefasHref({
                        cliente: selectedClient,
                        status: 'EM_ANDAMENTO',
                        prioridade: selectedPriority,
                        tipo: selectedType,
                    })}
                    className="rounded-xl border border-blue-100 bg-blue-50 p-4 shadow-sm hover:bg-blue-100"
                >
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-500">
                        Em Andamento
                    </p>
                    <p className="mt-2 text-3xl font-bold text-blue-700">
                        {inProgressTasks.length}
                    </p>
                </Link>

                <Link
                    href={buildTarefasHref({
                        cliente: selectedClient,
                        status: selectedStatus,
                        prioridade: 'URGENTE',
                        tipo: selectedType,
                    })}
                    className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm hover:bg-red-100"
                >
                    <p className="text-xs font-bold uppercase tracking-wider text-red-500">
                        Urgentes
                    </p>
                    <p className="mt-2 text-3xl font-bold text-red-700">
                        {urgentTasks.length}
                    </p>
                    <p className="mt-1 text-xs text-red-600">
                        Alta: {highTasks.length}
                    </p>
                </Link>

                <Link
                    href={buildTarefasHref({
                        cliente: selectedClient,
                        status: selectedStatus,
                        prioridade: selectedPriority,
                        tipo: 'AUTOMATICAS',
                    })}
                    className="rounded-xl border border-cyan-100 bg-cyan-50 p-4 shadow-sm hover:bg-cyan-100"
                >
                    <p className="text-xs font-bold uppercase tracking-wider text-cyan-500">
                        Automáticas
                    </p>
                    <p className="mt-2 text-3xl font-bold text-cyan-700">
                        {automaticTasks.length}
                    </p>
                </Link>

                <div className="rounded-xl border border-red-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-red-400">
                        Atrasadas
                    </p>
                    <p className="mt-2 text-3xl font-bold text-red-700">
                        {lateTasks.length}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                        Finalizadas: {completedTasks.length}
                    </p>
                </div>
            </section>

            {lateTasks.length > 0 && (
                <section className="rounded-xl border border-red-200 bg-white shadow-sm">
                    <div className="border-b border-red-100 bg-red-50 p-4">
                        <h2 className="text-lg font-bold text-red-800">
                            Tarefas atrasadas
                        </h2>

                        <p className="mt-1 text-sm text-red-600">
                            Resolva esses itens primeiro para destravar a operação.
                        </p>
                    </div>

                    <div className="divide-y divide-red-100">
                        {lateTasks.map((task) => renderTask(task))}
                    </div>
                </section>
            )}

            {sortedTasks.length === 0 ? (
                <section className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
                    <h2 className="text-lg font-bold text-slate-900">
                        Nenhuma tarefa encontrada.
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                        Ajuste os filtros ou crie uma tarefa dentro de um conteúdo.
                    </p>
                </section>
            ) : (
                <section className="space-y-6">
                    {pendingTasks.filter((task) => !isLate(getTaskDate(task))).length > 0 && (
                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="border-b border-slate-100 p-4">
                                <h2 className="text-lg font-bold text-slate-900">
                                    Tarefas pendentes
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Tarefas aguardando execução ou em andamento.
                                </p>
                            </div>

                            <div className="divide-y divide-slate-100">
                                {pendingTasks
                                    .filter((task) => !isLate(getTaskDate(task)))
                                    .map((task) => renderTask(task))}
                            </div>
                        </div>
                    )}

                    {completedTasks.length > 0 && (
                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="border-b border-slate-100 p-4">
                                <h2 className="text-lg font-bold text-slate-900">
                                    Tarefas finalizadas
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Histórico das tarefas já concluídas.
                                </p>
                            </div>

                            <div className="divide-y divide-slate-100">
                                {completedTasks.map((task) => renderTask(task, true))}
                            </div>
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}


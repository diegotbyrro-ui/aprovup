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

const approvalStatuses = [
    'ENVIADO_CLIENTE',
    'ALTERACAO_SOLICITADA',
    'APROVADO',
];

const statusFilterOptions = [
    { value: 'TODOS', label: 'Todos' },
    { value: 'ENVIADO_CLIENTE', label: 'Aguardando Cliente' },
    { value: 'ALTERACAO_SOLICITADA', label: 'Alteração Solicitada' },
    { value: 'APROVADO', label: 'Aprovado' },
];

function formatDate(date: Date | null) {
    if (!date) return 'Sem data';

    return new Date(date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function buildAprovacoesHref({
    cliente,
    status,
    prioridade,
}: {
    cliente?: string;
    status?: string;
    prioridade?: string;
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

    const query = params.toString();

    return query ? `/aprovacoes?${query}` : '/aprovacoes';
}

export default async function AprovacoesPage({
    searchParams,
}: {
    searchParams: Promise<{
        cliente?: string;
        status?: string;
        prioridade?: string;
    }>;
}) {
    const params = await searchParams;

    const selectedClient = params.cliente || 'TODOS';
    const selectedStatus = params.status || 'TODOS';
    const selectedPriority = params.prioridade || 'TODOS';

    const clients = await prisma.client.findMany({
        orderBy: {
            name: 'asc',
        },
    });

    const contents = await prisma.content.findMany({
        where: {
            status:
                selectedStatus !== 'TODOS'
                    ? selectedStatus
                    : {
                        in: approvalStatuses,
                    },
            ...(selectedClient !== 'TODOS'
                ? {
                    clientId: selectedClient,
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
            approvals: {
                orderBy: {
                    createdAt: 'desc',
                },
            },
        },
        orderBy: [
            {
                updatedAt: 'desc',
            },
        ],
    });

    const aguardandoCliente = contents.filter(
        (content) => content.status === 'ENVIADO_CLIENTE'
    );

    const alteracaoSolicitada = contents.filter(
        (content) => content.status === 'ALTERACAO_SOLICITADA'
    );

    const aprovados = contents.filter(
        (content) => content.status === 'APROVADO'
    );

    const urgentes = contents.filter(
        (content) => content.priority === 'URGENTE'
    );

    const altaPrioridade = contents.filter(
        (content) => content.priority === 'ALTA'
    );

    const hasActiveFilters =
        selectedClient !== 'TODOS' ||
        selectedStatus !== 'TODOS' ||
        selectedPriority !== 'TODOS';

    const selectedClientName =
        clients.find((client) => client.id === selectedClient)?.name || 'Todos';

    function ApprovalCard({
        content,
    }: {
        content: (typeof contents)[number];
    }) {
        const priority = content.priority || 'MEDIA';
        const area = content.area || 'GERAL';

        const approvalToken =
            content.approvals.find((approval) => approval.status === 'PENDENTE')?.token ||
            content.approvals[0]?.token;

        const lastApproval = content.approvals[0];

        return (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href={`/conteudos/${content.id}`}
                                className="font-bold text-slate-900 hover:text-blue-600 hover:underline"
                            >
                                {content.title}
                            </Link>

                            <StatusBadge status={content.status} />

                            <span
                                className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${priorityClasses[priority] || priorityClasses.MEDIA
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
                                Data prevista:{' '}
                                <strong className="text-slate-700">
                                    {formatDate(content.plannedDate)}
                                </strong>
                            </span>

                            <span>•</span>

                            <span>
                                Atualizado em:{' '}
                                <strong className="text-slate-700">
                                    {formatDate(content.updatedAt)}
                                </strong>
                            </span>
                        </div>

                        {lastApproval?.clientComment && (
                            <div className="mt-3 rounded-lg border border-orange-100 bg-orange-50 p-3">
                                <p className="text-xs font-bold uppercase tracking-wide text-orange-600">
                                    Comentário do cliente
                                </p>

                                <p className="mt-1 text-sm text-orange-800">
                                    {lastApproval.clientComment}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex w-full flex-col gap-2 lg:w-48">
                        <Link
                            href={`/conteudos/${content.id}`}
                            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-center text-xs font-bold text-slate-600 hover:bg-slate-100"
                        >
                            Abrir conteúdo
                        </Link>

                        {approvalToken && (
                            <Link
                                href={`/aprovacao/${approvalToken}`}
                                target="_blank"
                                className="rounded-md bg-indigo-600 px-3 py-2 text-center text-xs font-bold text-white hover:bg-indigo-700"
                            >
                                Abrir aprovação
                            </Link>
                        )}

                        <Link
                            href={`/clientes/${content.clientId}/visao`}
                            className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-center text-xs font-bold text-blue-700 hover:bg-blue-100"
                        >
                            Visão do cliente
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <Link
                        href="/clientes"
                        className="mb-2 inline-block text-sm text-blue-600 hover:underline"
                    >
                        &larr; Voltar para Dashboard
                    </Link>

                    <h1 className="text-3xl font-bold text-slate-900">
                        Central de Aprovações
                    </h1>

                    <p className="mt-1 text-slate-500">
                        Acompanhe conteúdos enviados, alterações solicitadas e aprovações dos clientes.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Link
                        href="/conteudos/kanban"
                        className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Ver Kanban
                    </Link>

                    <Link
                        href="/entregas-semana"
                        className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Entregas
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
                            Refinar aprovações
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Filtre por cliente, status e prioridade para encontrar aprovações mais rápido.
                        </p>
                    </div>

                    {hasActiveFilters && (
                        <Link
                            href="/aprovacoes"
                            className="w-fit rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
                        >
                            Limpar filtros
                        </Link>
                    )}
                </div>

                <form
                    action="/aprovacoes"
                    method="GET"
                    className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-4"
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
                        Exibindo aprovações filtradas por{' '}
                        <strong>Cliente: {selectedClientName}</strong>,{' '}
                        <strong>
                            Status:{' '}
                            {
                                statusFilterOptions.find(
                                    (status) => status.value === selectedStatus
                                )?.label
                            }
                        </strong>{' '}
                        e{' '}
                        <strong>
                            Prioridade: {priorityLabels[selectedPriority] || 'Todas'}
                        </strong>.
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Total filtrado
                    </p>

                    <p className="mt-2 text-3xl font-bold text-slate-900">
                        {contents.length}
                    </p>
                </div>

                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-500">
                        Aguardando Cliente
                    </p>

                    <p className="mt-2 text-3xl font-bold text-indigo-700">
                        {aguardandoCliente.length}
                    </p>
                </div>

                <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-orange-500">
                        Alterações
                    </p>

                    <p className="mt-2 text-3xl font-bold text-orange-700">
                        {alteracaoSolicitada.length}
                    </p>
                </div>

                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                        Aprovados
                    </p>

                    <p className="mt-2 text-3xl font-bold text-emerald-700">
                        {aprovados.length}
                    </p>
                </div>

                <div className="rounded-xl border border-red-100 bg-red-50 p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-red-500">
                        Urgentes
                    </p>

                    <p className="mt-2 text-3xl font-bold text-red-700">
                        {urgentes.length}
                    </p>

                    <p className="mt-1 text-xs text-red-600">
                        Alta prioridade: {altaPrioridade.length}
                    </p>
                </div>
            </div>

            {contents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
                    <h2 className="text-lg font-bold text-slate-900">
                        Nenhum conteúdo encontrado.
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                        Ajuste os filtros ou envie um conteúdo para aprovação.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {(selectedStatus === 'TODOS' ||
                        selectedStatus === 'ENVIADO_CLIENTE') && (
                            <section className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 shadow-sm">
                                <div className="mb-4">
                                    <h2 className="text-lg font-bold text-indigo-900">
                                        Aguardando Cliente
                                    </h2>

                                    <p className="text-sm text-indigo-700">
                                        Conteúdos enviados e aguardando aprovação ou retorno.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {aguardandoCliente.length === 0 ? (
                                        <p className="rounded-lg border border-dashed border-indigo-200 bg-white p-6 text-center text-sm text-indigo-500">
                                            Nenhum conteúdo aguardando cliente.
                                        </p>
                                    ) : (
                                        aguardandoCliente.map((content) => (
                                            <ApprovalCard key={content.id} content={content} />
                                        ))
                                    )}
                                </div>
                            </section>
                        )}

                    {(selectedStatus === 'TODOS' ||
                        selectedStatus === 'ALTERACAO_SOLICITADA') && (
                            <section className="rounded-xl border border-orange-100 bg-orange-50 p-4 shadow-sm">
                                <div className="mb-4">
                                    <h2 className="text-lg font-bold text-orange-900">
                                        Alteração Solicitada
                                    </h2>

                                    <p className="text-sm text-orange-700">
                                        Conteúdos que retornaram com pedido de ajuste do cliente.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {alteracaoSolicitada.length === 0 ? (
                                        <p className="rounded-lg border border-dashed border-orange-200 bg-white p-6 text-center text-sm text-orange-500">
                                            Nenhuma alteração solicitada.
                                        </p>
                                    ) : (
                                        alteracaoSolicitada.map((content) => (
                                            <ApprovalCard key={content.id} content={content} />
                                        ))
                                    )}
                                </div>
                            </section>
                        )}

                    {(selectedStatus === 'TODOS' || selectedStatus === 'APROVADO') && (
                        <section className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
                            <div className="mb-4">
                                <h2 className="text-lg font-bold text-emerald-900">
                                    Aprovados
                                </h2>

                                <p className="text-sm text-emerald-700">
                                    Conteúdos aprovados e prontos para avançar no fluxo.
                                </p>
                            </div>

                            <div className="space-y-3">
                                {aprovados.length === 0 ? (
                                    <p className="rounded-lg border border-dashed border-emerald-200 bg-white p-6 text-center text-sm text-emerald-500">
                                        Nenhum conteúdo aprovado.
                                    </p>
                                ) : (
                                    aprovados.map((content) => (
                                        <ApprovalCard key={content.id} content={content} />
                                    ))
                                )}
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}


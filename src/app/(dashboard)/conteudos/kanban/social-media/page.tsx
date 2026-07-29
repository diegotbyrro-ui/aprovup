import { AprovUpLogo } from '@/components/brand/AprovUpLogo';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import KanbanBoard from '../KanbanBoard';

const statusColumns = [
    {
        key: 'IDEIA',
        title: 'Demandas',
        description: 'Ideias, solicitações e conteúdos ainda sem produção visual.',
    },
    {
        key: 'ROTEIRO',
        title: 'Briefing / Texto',
        description: 'Conteúdos que precisam de briefing, legenda ou roteiro base.',
    },
    {
        key: 'AGENDAMENTO_PRODUCAO',
        title: 'Agendamento de Produção',
        description: 'Planejamento aprovado pelo cliente e liberado para criação visual.',
    },
    {
        key: 'DESIGN',
        title: 'Em Design',
        description: 'Artes, carrosséis e criativos em produção visual.',
    },
    {
        key: 'REVISAO_INTERNA',
        title: 'Revisão Interna',
        description: 'Materiais aguardando revisão da equipe Level UP.',
    },
    {
        key: 'ENVIADO_CLIENTE',
        title: 'Com o Cliente',
        description: 'Conteúdos enviados para aprovação externa.',
    },
    {
        key: 'ALTERACAO_SOLICITADA',
        title: 'Ajustes',
        description: 'Materiais com alteração solicitada pelo cliente.',
    },
    {
        key: 'APROVADO',
        title: 'Aprovado',
        description: 'Conteúdos aprovados pelo cliente.',
    },
    {
        key: 'PRONTO_PARA_POSTAR',
        title: 'Pronto para Postar',
        description: 'Materiais finalizados para publicação manual.',
    },
    {
        key: 'PUBLICADO_MANUALMENTE',
        title: 'Publicado',
        description: 'Conteúdos já publicados manualmente.',
    },
];

export default async function DesignKanbanPage({
    searchParams,
}: {
    searchParams: Promise<{
        cliente?: string;
    }>;
}) {
    const params = await searchParams;
    const selectedClient = params.cliente || 'TODOS';

    const clients = await prisma.client.findMany({
        orderBy: {
            name: 'asc',
        },
    });

    const selectedClientName =
        clients.find((client) => client.id === selectedClient)?.name || 'Todos';

    const contents = await prisma.content.findMany({
        where: {
            area: 'SOCIAL_DESIGN',
            ...(selectedClient !== 'TODOS'
                ? {
                    clientId: selectedClient,
                }
                : {}),
            status: {
                not: 'ARQUIVADO',
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

    const serializedContents = contents.map((content) => ({
        id: content.id,
        title: content.title,
        status: content.status,
        format: content.format,
        platform: content.platform,
        plannedDate: content.plannedDate ? content.plannedDate.toISOString() : null,
        responsible: content.responsible,
        priority: content.priority || 'MEDIA',
        clientName: content.client?.name || 'Cliente não informado',
    }));

    const urgentContents = contents.filter(
        (content) => (content.priority || 'MEDIA') === 'URGENTE'
    );

    const highPriorityContents = contents.filter(
        (content) => (content.priority || 'MEDIA') === 'ALTA'
    );

    const scheduledProductionContents = contents.filter(
        (content) => content.status === 'AGENDAMENTO_PRODUCAO'
    );

    const waitingClientContents = contents.filter(
        (content) => content.status === 'ENVIADO_CLIENTE'
    );

    const adjustmentContents = contents.filter(
        (content) => content.status === 'ALTERACAO_SOLICITADA'
    );

    const hasActiveFilters = selectedClient !== 'TODOS';

    return (
        <div className="w-full max-w-full space-y-6 overflow-hidden bg-slate-50">
            <div className="flex flex-col gap-4 bg-slate-50 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <Link
                        href="/dashboard"
                        className="mb-2 inline-block text-sm text-blue-600 hover:underline"
                    >
                        &larr; Voltar para Dashboard
                    </Link>

                    <h1 className="text-3xl font-bold text-slate-900">
                        Área do Design
                    </h1>

                    <p className="mt-1 text-slate-500">
                        Organize artes, carrosséis, criativos e demandas visuais por etapa, cliente, prioridade e responsável.
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
                        href="/entregas-semana"
                        className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Entregas
                    </Link>

                    <Link
                        href="/conteudos/novo"
                        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    >
                        Nova Demanda
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
                            Filtrar demandas de design
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Veja as demandas visuais de todos os clientes ou foque em uma operação específica.
                        </p>
                    </div>

                    {hasActiveFilters && (
                        <Link
                            href="/conteudos/kanban/social-media"
                            className="w-fit rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
                        >
                            Limpar filtros
                        </Link>
                    )}
                </div>

                <form
                    action="/conteudos/kanban/social-media"
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
                        Exibindo demandas de design filtradas por{' '}
                        <strong>Cliente: {selectedClientName}</strong>.
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Total em Design
                    </p>

                    <p className="mt-2 text-3xl font-bold text-slate-900">
                        {contents.length}
                    </p>
                </div>

                <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-cyan-500">
                        Agendamento
                    </p>

                    <p className="mt-2 text-3xl font-bold text-cyan-700">
                        {scheduledProductionContents.length}
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
                        {highPriorityContents.length}
                    </p>
                </div>

                <div className="rounded-xl border border-indigo-100 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                        Com Cliente
                    </p>

                    <p className="mt-2 text-3xl font-bold text-indigo-700">
                        {waitingClientContents.length}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                        Ajustes: {adjustmentContents.length}
                    </p>
                </div>
            </div>

            <KanbanBoard
                initialContents={serializedContents}
                statusColumns={statusColumns}
            />
        </div>
    );
}


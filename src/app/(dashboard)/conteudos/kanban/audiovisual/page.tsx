import { AprovUpLogo } from '@/components/brand/AprovUpLogo';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import KanbanBoard from '../KanbanBoard';

const statusColumns = [
    {
        key: 'IDEIA',
        title: 'Demandas',
        description: 'Solicitações de vídeos, reels, captações e ideias audiovisuais.',
    },
    {
        key: 'ROTEIRO',
        title: 'Roteiro',
        description: 'Vídeos que precisam de roteiro, estrutura ou direcionamento.',
    },
    {
        key: 'AGENDAMENTO_PRODUCAO',
        title: 'Agendamento de Produção',
        description: 'Planejamento aprovado pelo cliente e liberado para produção audiovisual.',
    },
    {
        key: 'DESIGN',
        title: 'Pré-produção',
        description: 'Organização de gravação, referências, cenas e materiais.',
    },
    {
        key: 'EDICAO',
        title: 'Edição',
        description: 'Vídeos em edição, cortes, ajustes e finalização.',
    },
    {
        key: 'REVISAO_INTERNA',
        title: 'Revisão Interna',
        description: 'Vídeos aguardando revisão da equipe Level UP.',
    },
    {
        key: 'ENVIADO_CLIENTE',
        title: 'Com o Cliente',
        description: 'Vídeos enviados para aprovação externa.',
    },
    {
        key: 'ALTERACAO_SOLICITADA',
        title: 'Ajustes',
        description: 'Vídeos com alteração solicitada pelo cliente.',
    },
    {
        key: 'APROVADO',
        title: 'Aprovado',
        description: 'Vídeos aprovados pelo cliente.',
    },
    {
        key: 'PRONTO_PARA_POSTAR',
        title: 'Pronto para Postar',
        description: 'Vídeos finalizados para publicação manual.',
    },
    {
        key: 'PUBLICADO_MANUALMENTE',
        title: 'Publicado',
        description: 'Conteúdos já publicados manualmente.',
    },
];

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

function isLate(date: Date | null, status: string) {
    if (!date) return false;

    if (['PUBLICADO_MANUALMENTE', 'ARQUIVADO'].includes(status)) {
        return false;
    }

    const today = startOfDay(new Date());
    const planned = startOfDay(new Date(date));

    return planned < today;
}

export default async function FilmmakerKanbanPage({
    searchParams,
}: {
    searchParams: Promise<{
        cliente?: string;
    }>;
}) {
    const params = await searchParams;
    const selectedClient = params.cliente || 'TODOS';

    const today = new Date();
    const start = startOfDay(today);
    const endWeek = endOfDay(addDays(today, 7));

    const clients = await prisma.client.findMany({
        orderBy: {
            name: 'asc',
        },
    });

    const selectedClientName =
        clients.find((client) => client.id === selectedClient)?.name || 'Todos';

    const contents = await prisma.content.findMany({
        where: {
            area: 'AUDIOVISUAL',
            status: {
                not: 'ARQUIVADO',
            },
            ...(selectedClient !== 'TODOS'
                ? {
                    clientId: selectedClient,
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

    const hasActiveFilters = selectedClient !== 'TODOS';

    const activeContents = contents.filter(
        (content) => !['PUBLICADO_MANUALMENTE', 'ARQUIVADO'].includes(content.status)
    );

    const scheduledProductionContents = contents.filter(
        (content) => content.status === 'AGENDAMENTO_PRODUCAO'
    );

    const preProductionContents = contents.filter(
        (content) => content.status === 'DESIGN'
    );

    const editingContents = contents.filter(
        (content) => content.status === 'EDICAO'
    );

    const internalReviewContents = contents.filter(
        (content) => content.status === 'REVISAO_INTERNA'
    );

    const waitingClientContents = contents.filter(
        (content) => content.status === 'ENVIADO_CLIENTE'
    );

    const adjustmentContents = contents.filter(
        (content) => content.status === 'ALTERACAO_SOLICITADA'
    );

    const readyToPostContents = contents.filter(
        (content) => content.status === 'PRONTO_PARA_POSTAR'
    );

    const urgentContents = activeContents.filter(
        (content) => (content.priority || 'MEDIA') === 'URGENTE'
    );

    const highPriorityContents = activeContents.filter(
        (content) => (content.priority || 'MEDIA') === 'ALTA'
    );

    const lateContents = activeContents.filter((content) =>
        isLate(content.plannedDate, content.status)
    );

    const weekContents = activeContents.filter((content) => {
        if (!content.plannedDate) return false;

        const plannedDate = new Date(content.plannedDate);

        return plannedDate >= start && plannedDate <= endWeek;
    });

    function ContentMiniCard({
        content,
    }: {
        content: (typeof contents)[number];
    }) {
        const priority = content.priority || 'MEDIA';
        const late = isLate(content.plannedDate, content.status);

        return (
            <Link
                href={`/conteudos/${content.id}`}
                className={`block rounded-xl border p-4 transition hover:border-blue-200 hover:shadow-sm ${late
                        ? 'border-red-200 bg-red-50'
                        : priority === 'URGENTE'
                            ? 'border-red-200 bg-red-50'
                            : priority === 'ALTA'
                                ? 'border-orange-200 bg-orange-50'
                                : 'border-slate-100 bg-white'
                    }`}
            >
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-slate-900">
                                {content.title}
                            </h3>

                            <span
                                className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${priorityClasses[priority] || priorityClasses.MEDIA
                                    }`}
                            >
                                {priorityLabels[priority] || priority}
                            </span>

                            {late && (
                                <span className="rounded-full border border-red-200 bg-red-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-red-700">
                                    Atrasado
                                </span>
                            )}
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
                                Data:{' '}
                                <strong className={late ? 'text-red-700' : 'text-slate-700'}>
                                    {formatDate(content.plannedDate)}
                                </strong>
                            </span>

                            {content.responsible && (
                                <>
                                    <span>•</span>
                                    <span>
                                        Responsável:{' '}
                                        <strong className="text-slate-700">
                                            {content.responsible}
                                        </strong>
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
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
            </Link>
        );
    }

    return (
        <div className="w-full max-w-full space-y-6 overflow-hidden bg-slate-50">
            <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-8 shadow-sm">
                <div className="absolute -right-10 -top-10 h-52 w-52 rounded-full bg-indigo-500/20 blur-3xl"></div>
                <div className="absolute bottom-0 left-1/3 h-52 w-52 rounded-full bg-blue-500/20 blur-3xl"></div>

                <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <Link
                            href="/clientes"
                            className="mb-3 inline-block text-sm text-blue-200 hover:underline"
                        >
                            &larr; Voltar para Dashboard
                        </Link>

                        <p className="text-sm font-bold uppercase tracking-wider text-indigo-300">
                            Operação Audiovisual
                        </p>

                        <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
                            Área do Filmmaker
                        </h1>

                        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
                            Central das demandas audiovisuais: vídeos, reels, captações, edição, revisão e aprovação do cliente.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Link
                            href="/conteudos/kanban"
                            className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-100"
                        >
                            Produção Geral
                        </Link>

                        <Link
                            href="/conteudos/kanban/social-media"
                            className="rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-white hover:bg-white/10"
                        >
                            Design
                        </Link>

                        <Link
                            href="/tarefas"
                            className="rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-white hover:bg-white/10"
                        >
                            Tarefas
                        </Link>

                        <Link
                            href="/conteudos/novo"
                            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                        >
                            Nova Demanda
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
                            Filtrar demandas audiovisuais
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Veja vídeos de todos os clientes ou foque em uma operação específica.
                        </p>
                    </div>

                    {hasActiveFilters && (
                        <Link
                            href="/conteudos/kanban/audiovisual"
                            className="w-fit rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
                        >
                            Limpar filtros
                        </Link>
                    )}
                </div>

                <form
                    action="/conteudos/kanban/audiovisual"
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
                        Exibindo demandas audiovisuais filtradas por{' '}
                        <strong>Cliente: {selectedClientName}</strong>.
                    </div>
                )}
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-6">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Total Ativo
                    </p>

                    <p className="mt-2 text-3xl font-bold text-slate-900">
                        {activeContents.length}
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

                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-500">
                        Pré-produção
                    </p>

                    <p className="mt-2 text-3xl font-bold text-indigo-700">
                        {preProductionContents.length}
                    </p>
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-500">
                        Edição
                    </p>

                    <p className="mt-2 text-3xl font-bold text-blue-700">
                        {editingContents.length}
                    </p>
                </div>

                <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-red-500">
                        Ajustes
                    </p>

                    <p className="mt-2 text-3xl font-bold text-red-700">
                        {adjustmentContents.length}
                    </p>
                </div>

                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                        Prontos
                    </p>

                    <p className="mt-2 text-3xl font-bold text-emerald-700">
                        {readyToPostContents.length}
                    </p>
                </div>
            </section>

            {(lateContents.length > 0 || urgentContents.length > 0) && (
                <section className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-red-800">
                                Prioridade do Filmmaker
                            </h2>

                            <p className="text-sm text-red-600">
                                Demandas atrasadas ou urgentes que precisam ser vistas primeiro.
                            </p>
                        </div>

                        <Link
                            href="/entregas-semana"
                            className="w-fit rounded-md bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
                        >
                            Ver entregas
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {[...lateContents, ...urgentContents]
                            .filter(
                                (content, index, array) =>
                                    array.findIndex((item) => item.id === content.id) === index
                            )
                            .slice(0, 6)
                            .map((content) => (
                                <ContentMiniCard key={content.id} content={content} />
                            ))}
                    </div>
                </section>
            )}

            {scheduledProductionContents.length > 0 && (
                <section className="rounded-2xl border border-cyan-100 bg-cyan-50 p-5 shadow-sm">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-cyan-900">
                                Liberado para produção audiovisual
                            </h2>

                            <p className="text-sm text-cyan-700">
                                Planejamentos aprovados pelo cliente e prontos para captação, gravação ou edição.
                            </p>
                        </div>

                        <Link
                            href="/tarefas?tipo=AUTOMATICAS"
                            className="w-fit rounded-md border border-cyan-200 bg-white px-3 py-2 text-xs font-bold text-cyan-700 hover:bg-cyan-100"
                        >
                            Ver tarefas automáticas
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {scheduledProductionContents.slice(0, 8).map((content) => (
                            <ContentMiniCard key={content.id} content={content} />
                        ))}
                    </div>
                </section>
            )}

            {adjustmentContents.length > 0 && (
                <section className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
                    <div className="mb-4">
                        <h2 className="text-lg font-bold text-red-800">
                            Ajustes solicitados
                        </h2>

                        <p className="text-sm text-red-600">
                            Vídeos que voltaram com pedido de alteração do cliente.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {adjustmentContents.map((content) => (
                            <ContentMiniCard key={content.id} content={content} />
                        ))}
                    </div>
                </section>
            )}

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4">
                        <h2 className="text-lg font-bold text-slate-900">
                            Próximas entregas audiovisuais
                        </h2>

                        <p className="text-sm text-slate-500">
                            Demandas audiovisuais previstas para os próximos 7 dias.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {weekContents.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                                Nenhuma entrega audiovisual prevista para os próximos 7 dias.
                            </p>
                        ) : (
                            weekContents.slice(0, 6).map((content) => (
                                <ContentMiniCard key={content.id} content={content} />
                            ))
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4">
                        <h2 className="text-lg font-bold text-slate-900">
                            Leitura rápida
                        </h2>

                        <p className="text-sm text-slate-500">
                            Resumo dos gargalos da área audiovisual.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                            <p className="font-bold text-slate-900">
                                {scheduledProductionContents.length > 0
                                    ? 'Existem demandas liberadas para produção audiovisual.'
                                    : 'Nenhuma demanda aguardando início audiovisual.'}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                                Agendamento: {scheduledProductionContents.length} • Pré-produção:{' '}
                                {preProductionContents.length} • Edição: {editingContents.length}
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                            <p className="font-bold text-slate-900">
                                {internalReviewContents.length > 0
                                    ? 'Existem vídeos aguardando revisão interna.'
                                    : 'Nenhum vídeo parado em revisão interna.'}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                                Revisão interna: {internalReviewContents.length} • Com cliente:{' '}
                                {waitingClientContents.length}
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                            <p className="font-bold text-slate-900">
                                {adjustmentContents.length > 0
                                    ? 'Existem ajustes solicitados pelo cliente.'
                                    : 'Nenhum ajuste audiovisual solicitado no momento.'}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                                Ajustes: {adjustmentContents.length} • Alta prioridade:{' '}
                                {highPriorityContents.length}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <KanbanBoard
                initialContents={serializedContents}
                statusColumns={statusColumns}
            />
        </div>
    );
}


import { requireSaasFeature } from '@/lib/saasAccess';
import { prisma } from '@/lib/prisma';
import { requireAgencyContext } from '@/lib/tenant';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { markContentAsPublished } from './actions';
import { InstagramPublishButton } from '@/components/instagram/InstagramPublishButton';
import { InstagramScheduleControl } from '@/components/instagram/InstagramScheduleControl';

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

function formatDate(date: Date | null) {
    if (!date) return 'Sem data';

    return new Date(date).toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function formatShortDate(date: Date | null) {
    if (!date) return 'Sem data';

    return new Date(date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
    });
}

function getDateKey(date: Date | null) {
    if (!date) return 'sem-data';
    return new Date(date).toISOString().split('T')[0];
}

function isLate(date: Date | null) {
    if (!date) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const current = new Date(date);
    current.setHours(0, 0, 0, 0);

    return current < today;
}

export default async function ProntoParaPostarPage({
    searchParams,
}: {
    searchParams: Promise<{
        cliente?: string;
    }>;
}) {
  await requireSaasFeature('socialPosting');

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

    const contents = await prisma.content.findMany({
        where: {
            client: {
                agencyId,
            },
            status: 'PRONTO_PARA_POSTAR',
            ...(selectedClient !== 'TODOS'
                ? {
                    clientId: selectedClient,
                }
                : {}),
        },
        include: {
            client: {
                include: {
                    instagramConnection: true,
                },
            },

            instagramPublication: true,

            instagramMediaAssets: {
                orderBy: {
                    position: 'asc',
                },
            },
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

    const urgentContents = contents.filter(
        (content) => (content.priority || 'MEDIA') === 'URGENTE'
    );

    const highPriorityContents = contents.filter(
        (content) => (content.priority || 'MEDIA') === 'ALTA'
    );

    const lateContents = contents.filter((content) => isLate(content.plannedDate));

    const designContents = contents.filter(
        (content) =>
            ['DESIGN', 'SOCIAL_DESIGN'].includes(
                content.area || ''
            )
    );

    const filmmakerContents = contents.filter(
        (content) =>
            ['FILMMAKER', 'AUDIOVISUAL'].includes(
                content.area || ''
            )
    );

    const contentsByDate = contents.reduce<Record<string, typeof contents>>(
        (acc, content) => {
            const key = getDateKey(content.plannedDate);

            if (!acc[key]) {
                acc[key] = [];
            }

            acc[key].push(content);

            return acc;
        },
        {}
    );

    const dateKeys = Object.keys(contentsByDate).sort();

    const hasActiveFilters = selectedClient !== 'TODOS';

    return (
        <div className="space-y-6">
            <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-8 shadow-sm">
                <div className="absolute -right-10 -top-10 h-52 w-52 rounded-full bg-emerald-500/20 blur-3xl"></div>
                <div className="absolute bottom-0 left-1/3 h-52 w-52 rounded-full bg-blue-500/20 blur-3xl"></div>

                <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <Link
                            href="/clientes"
                            className="mb-3 inline-block text-sm text-blue-200 hover:underline"
                        >
                            &larr; Voltar para Dashboard
                        </Link>

                        <p className="text-sm font-bold uppercase tracking-wider text-emerald-300">
                            Publicação Manual
                        </p>

                        <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
                            Pronto para Postar
                        </h1>

                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
                            Central dos conteúdos aprovados e finalizados para publicação manual.
                            Confira legenda, material, cliente, data e marque como publicado.
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
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
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
                            Filtrar publicações
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Veja todos os conteúdos prontos para postar ou filtre por cliente.
                        </p>
                    </div>

                    {hasActiveFilters && (
                        <Link
                            href="/pronto-para-postar"
                            className="w-fit rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
                        >
                            Limpar filtros
                        </Link>
                    )}
                </div>

                <form
                    action="/pronto-para-postar"
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
                    <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">
                        Exibindo conteúdos prontos para postar filtrados por{' '}
                        <strong>Cliente: {selectedClientName}</strong>.
                    </div>
                )}
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-5">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Total Pronto
                    </p>

                    <p className="mt-2 text-3xl font-bold text-slate-900">
                        {contents.length}
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

                <div className="rounded-xl border border-red-100 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-red-400">
                        Urgentes
                    </p>

                    <p className="mt-2 text-3xl font-bold text-red-700">
                        {urgentContents.length}
                    </p>
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-500">
                        Design
                    </p>

                    <p className="mt-2 text-3xl font-bold text-blue-700">
                        {designContents.length}
                    </p>
                </div>

                <div className="rounded-xl border border-indigo-100 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                        Filmaker
                    </p>

                    <p className="mt-2 text-3xl font-bold text-indigo-700">
                        {filmmakerContents.length}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                        Alta prioridade: {highPriorityContents.length}
                    </p>
                </div>
            </section>

            {contents.length === 0 ? (
                <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                    <h2 className="text-lg font-bold text-slate-900">
                        Nenhum conteúdo pronto para postar.
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                        Quando uma peça final for aprovada pelo cliente, ela aparecerá aqui.
                    </p>

                    <div className="mt-5 flex justify-center">
                        <Link
                            href="/conteudos/kanban"
                            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                        >
                            Ver Produção Geral
                        </Link>
                    </div>
                </section>
            ) : (
                <section className="space-y-5">
                    {dateKeys.map((dateKey) => {
                        const dayContents = contentsByDate[dateKey];
                        const dayDate =
                            dateKey === 'sem-data' ? null : new Date(`${dateKey}T12:00:00`);

                        return (
                            <div
                                key={dateKey}
                                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                            >
                                <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">
                                            {formatDate(dayDate)}
                                        </h2>

                                        <p className="mt-1 text-sm text-slate-500">
                                            {dayContents.length} conteúdo(s) pronto(s) para publicação.
                                        </p>
                                    </div>

                                    {dayDate && isLate(dayDate) && (
                                        <span className="w-fit rounded-full border border-red-200 bg-red-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-700">
                                            Data vencida
                                        </span>
                                    )}
                                </div>

                                <div className="divide-y divide-slate-100">
                                    {dayContents.map((content) => {
                                        const priority = content.priority || 'MEDIA';
                                        const area = content.area || 'GERAL';
                                        const late = isLate(content.plannedDate);
                                        const publishAction = markContentAsPublished.bind(
                                            null,
                                            content.id
                                        );

                                        const instagramConnection =
                                            content.client
                                                ?.instagramConnection;

                                        const hasFinalMedia =
                                            Boolean(
                                                content.finalMediaUrl ||
                                                content.instagramMediaAssets.length >= 2
                                            );

                                        const hasCaption =
                                            Boolean(
                                                content.caption
                                                    ?.trim()
                                            );

                                        const instagramReady =
                                            Boolean(
                                                instagramConnection &&
                                                hasFinalMedia
                                            );

                                        const publicationStatus =
                                            content.instagramPublication
                                                ?.status ||
                                            'NAO_PREPARADO';

                                        const normalizedFormat =
                                            String(
                                                content.format ||
                                                ''
                                            )
                                                .trim()
                                                .toUpperCase();

                                        const isCarousel =
                                            normalizedFormat.includes(
                                                'CARROSSEL'
                                            ) ||
                                            normalizedFormat.includes(
                                                'CAROUSEL'
                                            ) ||
                                            normalizedFormat.includes(
                                                'ALBUM'
                                            );

                                        const isImageMedia =
                                            String(
                                                content.finalMediaType ||
                                                ''
                                            ).startsWith(
                                                'image/'
                                            );

                                        const isReel =
                                            normalizedFormat.includes(
                                                'REEL'
                                            ) ||
                                            normalizedFormat ===
                                                'VIDEO' ||
                                            normalizedFormat ===
                                                'VÍDEO';

                                        const isStory =
                                            normalizedFormat.includes(
                                                'STORY'
                                            );

                                        const isVideoMedia =
                                            String(
                                                content.finalMediaType ||
                                                ''
                                            ).startsWith(
                                                'video/'
                                            );

                                        const carouselMediaCount =
                                            content
                                                .instagramMediaAssets
                                                .length;

                                        const canPublishInstagram =
                                            Boolean(
                                                instagramConnection &&
                                                (
                                                    isCarousel
                                                        ? carouselMediaCount >= 2
                                                        : isReel
                                                            ? Boolean(
                                                                content.finalMediaUrl &&
                                                                isVideoMedia
                                                            )
                                                            : !isStory &&
                                                              Boolean(
                                                                  content.finalMediaUrl &&
                                                                  isImageMedia
                                                              )
                                                )
                                            );

                                        const publishDisabledReason =
                                            !instagramConnection
                                                ? 'Instagram não conectado.'
                                                : isCarousel &&
                                                  carouselMediaCount < 2
                                                    ? 'Envie pelo menos 2 imagens do carrossel.'
                                                    : isStory
                                                        ? 'Story ainda não está disponível nesta versão.'
                                                        : !hasFinalMedia
                                                            ? 'Material final ausente.'
                                                            : isReel &&
                                                              !isVideoMedia
                                                                ? 'Reel precisa de arquivo final de vídeo.'
                                                                : !isCarousel &&
                                                                  !isReel &&
                                                                  !isImageMedia
                                                                    ? 'Formato de mídia ainda não suportado.'
                                                                    : undefined;

                                        return (
                                            <div
                                                key={content.id}
                                                className={`p-5 ${late
                                                        ? 'bg-red-50'
                                                        : priority === 'URGENTE'
                                                            ? 'bg-red-50'
                                                            : priority === 'ALTA'
                                                                ? 'bg-orange-50'
                                                                : 'bg-white'
                                                    }`}
                                            >
                                                <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">
                                                    <div className="space-y-4 xl:col-span-3">
                                                        <div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <Link
                                                                    href={`/conteudos/${content.id}`}
                                                                    className="text-lg font-bold text-slate-900 hover:text-blue-600 hover:underline"
                                                                >
                                                                    {content.title}
                                                                </Link>

                                                                <StatusBadge status={content.status} />

                                                                {late && (
                                                                    <span className="rounded-full border border-red-200 bg-red-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-red-700">
                                                                        Atrasado
                                                                    </span>
                                                                )}

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
                                                                    Data:{' '}
                                                                    <strong
                                                                        className={
                                                                            late ? 'text-red-700' : 'text-slate-700'
                                                                        }
                                                                    >
                                                                        {formatShortDate(content.plannedDate)}
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

                                                                {content.format && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span>
                                                                            Formato:{' '}
                                                                            <strong className="text-slate-700">
                                                                                {content.format}
                                                                            </strong>
                                                                        </span>
                                                                    </>
                                                                )}

                                                                {content.platform && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span>
                                                                            Plataforma:{' '}
                                                                            <strong className="text-slate-700">
                                                                                {content.platform}
                                                                            </strong>
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {content.caption ? (
                                                            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                                                                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                                                        Legenda para copiar
                                                                    </p>

                                                                    <p className="text-xs text-slate-400">
                                                                        Selecione o texto abaixo e copie.
                                                                    </p>
                                                                </div>

                                                                <textarea
                                                                    readOnly
                                                                    value={content.caption}
                                                                    className="min-h-32 w-full resize-y rounded-lg border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="rounded-xl border border-dashed border-orange-200 bg-orange-50 p-4">
                                                                <p className="text-sm font-bold text-orange-800">
                                                                    Atenção: este conteúdo não possui legenda cadastrada.
                                                                </p>
                                                            </div>
                                                        )}

                                                        {content.fileLinks && (
                                                            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                                                                <p className="text-xs font-bold uppercase tracking-wider text-blue-500">
                                                                    Material / Anexo
                                                                </p>

                                                                <p className="mt-2 break-all text-sm text-blue-700">
                                                                    {content.fileLinks}
                                                                </p>

                                                                <a
                                                                    href={content.fileLinks}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="mt-3 inline-flex rounded-md bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                                                                >
                                                                    Abrir material
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <aside className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">

                                                        <div className="rounded-xl border border-pink-100 bg-gradient-to-br from-pink-50 to-violet-50 p-4">

                                                            <div className="flex items-start justify-between gap-3">

                                                                <div>

                                                                    <p className="text-[10px] font-black uppercase tracking-wider text-pink-500">
                                                                        Publicação Instagram
                                                                    </p>

                                                                    <p className="mt-1 text-sm font-bold text-slate-900">
                                                                        {
                                                                            instagramConnection
                                                                                ?.username
                                                                                ? '@' +
                                                                                  instagramConnection.username
                                                                                : 'Conta não conectada'
                                                                        }
                                                                    </p>

                                                                </div>


                                                                <span
                                                                    className={
                                                                        instagramConnection
                                                                            ? 'rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[10px] font-bold text-emerald-700'
                                                                            : 'rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[10px] font-bold text-amber-700'
                                                                    }
                                                                >
                                                                    {
                                                                        instagramConnection
                                                                            ? '● Conectado'
                                                                            : 'Pendente'
                                                                    }
                                                                </span>

                                                            </div>


                                                            <div className="mt-4 grid grid-cols-2 gap-2">

                                                                <div className="rounded-lg bg-white p-3">

                                                                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                                                        Material final
                                                                    </p>

                                                                    <p
                                                                        className={
                                                                            hasFinalMedia
                                                                                ? 'mt-1 text-xs font-bold text-emerald-700'
                                                                                : 'mt-1 text-xs font-bold text-red-600'
                                                                        }
                                                                    >
                                                                        {
                                                                            hasFinalMedia
                                                                                ? '✓ Pronto'
                                                                                : '✕ Ausente'
                                                                        }
                                                                    </p>

                                                                </div>


                                                                <div className="rounded-lg bg-white p-3">

                                                                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                                                        Legenda
                                                                    </p>

                                                                    <p
                                                                        className={
                                                                            hasCaption
                                                                                ? 'mt-1 text-xs font-bold text-emerald-700'
                                                                                : 'mt-1 text-xs font-bold text-amber-700'
                                                                        }
                                                                    >
                                                                        {
                                                                            hasCaption
                                                                                ? '✓ Pronta'
                                                                                : 'Sem legenda'
                                                                        }
                                                                    </p>

                                                                </div>

                                                            </div>


                                                            {
                                                                publicationStatus !==
                                                                'NAO_PREPARADO'
                                                                    ? (
                                                                        <div className="mt-3 rounded-lg border border-white bg-white/80 px-3 py-2">

                                                                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                                                                Situação
                                                                            </p>

                                                                            <p className="mt-1 text-xs font-black text-slate-700">
                                                                                {
                                                                                    publicationStatus
                                                                                }
                                                                            </p>

                                                                        </div>
                                                                    )
                                                                    : null
                                                            }
<div className="mt-4 grid grid-cols-1 gap-2">

                                                                <InstagramPublishButton
                                                                    contentId={
                                                                        content.id
                                                                    }
                                                                    enabled={
                                                                        canPublishInstagram
                                                                    }
                                                                    disabledReason={
                                                                        publishDisabledReason
                                                                    }
                                                                  scheduled={
    publicationStatus ===
    'AGENDADO'
  }
/>

                                                        <InstagramScheduleControl
                                                            contentId={
                                                                content.id
                                                            }
                                                            enabled={
                                                                canPublishInstagram
                                                            }
                                                            disabledReason={
                                                                publishDisabledReason
                                                            }
                                                            scheduledFor={
                                                                content.instagramPublication
                                                                    ?.scheduledFor
                                                                    ?.toISOString() ||
                                                                null
                                                            }
                                                            publicationStatus={
                                                                publicationStatus
                                                            }
                                                        />


                                                                <button
                                                                    type="button"
                                                                    disabled
                                                                    title={
                                                                        instagramReady
                                                                            ? 'Será ativado na próxima etapa.'
                                                                            : 'Conecte o Instagram e envie o material final.'
                                                                    }
                                                                    className="cursor-not-allowed rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 opacity-70"
                                                                >
                                                                    Agendar publicação
                                                                </button>

                                                            </div>


                                                            {
                                                                instagramReady
                                                                    ? (
                                                                        <p className="mt-3 text-[10px] leading-relaxed text-emerald-700">
                                                                            Pronto para integrar com a publicação automática da Meta.
                                                                        </p>
                                                                    )
                                                                    : (
                                                                        <p className="mt-3 text-[10px] leading-relaxed text-amber-700">
                                                                            Para publicar automaticamente, precisamos do Instagram conectado e do material final.
                                                                        </p>
                                                                    )
                                                            }

                                                        </div>


                                                        <div>

                                                            <p className="text-sm font-bold text-slate-900">
                                                                Checklist antes de publicar
                                                            </p>

                                                        <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-slate-500">
                                                            <li>Conferir se a arte/vídeo é a versão final.</li>
                                                            <li>Copiar a legenda correta.</li>
                                                            <li>Conferir cliente, data e formato.</li>
                                                            <li>Publicar manualmente na plataforma.</li>
                                                            <li>Depois marcar como publicado.</li>
                                                        </ul>

                                                        <div className="mt-4 space-y-2">
                                                            <Link
                                                                href={`/conteudos/${content.id}`}
                                                                className="block rounded-md border border-slate-200 bg-white px-3 py-2 text-center text-xs font-bold text-slate-600 hover:bg-slate-100"
                                                            >
                                                                Abrir conteúdo
                                                            </Link>

                                                            {content.clientId && (
                                                                <Link
                                                                    href={`/clientes/${content.clientId}/visao`}
                                                                    className="block rounded-md border border-slate-200 bg-white px-3 py-2 text-center text-xs font-bold text-slate-600 hover:bg-slate-100"
                                                                >
                                                                    Visão do cliente
                                                                </Link>
                                                            )}

                                                            <form action={publishAction}>
                                                                <button
                                                                    type="submit"
                                                                    className="w-full rounded-md bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                                                                >
                                                                    Marcar como publicado
                                                                </button>
                                                            </form>
                                                        </div>

                                                        </div>
                                                    </aside>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </section>
            )}
        </div>
    );
}

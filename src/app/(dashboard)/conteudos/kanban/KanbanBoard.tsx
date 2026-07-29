"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { updateContentStatusFromKanban } from "./kanbanActions";

type KanbanContent = {
    id: string;
    title: string;
    status: string;
    format: string | null;
    platform: string | null;
    plannedDate: string | null;
    responsible: string | null;
    clientName: string;
    priority?: string | null;
};

type StatusColumn = {
    key: string;
    title: string;
    description: string;
};

type KanbanBoardProps = {
    initialContents: KanbanContent[];
    statusColumns: StatusColumn[];
};

const statusLabels: Record<string, string> = {
    IDEIA: "Ideia",
    ROTEIRO: "Roteiro",
    DESIGN: "Design",
    EDICAO: "Edição",
    REVISAO_INTERNA: "Revisão Interna",
    ENVIADO_CLIENTE: "Enviado ao Cliente",
    ALTERACAO_SOLICITADA: "Alteração Solicitada",
    APROVADO: "Aprovado",
    PRONTO_PARA_POSTAR: "Pronto para Postar",
    PUBLICADO_MANUALMENTE: "Publicado",
};

const priorityLabels: Record<string, string> = {
    BAIXA: "Baixa",
    MEDIA: "Média",
    ALTA: "Alta",
    URGENTE: "Urgente",
};

const priorityClasses: Record<string, string> = {
    BAIXA: "bg-slate-100 text-slate-600",
    MEDIA: "bg-blue-50 text-blue-700",
    ALTA: "bg-orange-100 text-orange-700",
    URGENTE: "bg-red-100 text-red-700",
};

function formatDate(date: string | null) {
    if (!date) return "Sem data";
    return new Date(date).toLocaleDateString("pt-BR");
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

function addDays(date: Date, days: number) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
}

function isSameDay(a: Date, b: Date) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

function matchesPeriod(plannedDate: string | null, selectedPeriod: string) {
    if (selectedPeriod === "TODOS") return true;

    if (selectedPeriod === "SEM_DATA") {
        return !plannedDate;
    }

    if (!plannedDate) return false;

    const date = new Date(plannedDate);
    const today = new Date();
    const todayStart = startOfDay(today);

    if (selectedPeriod === "HOJE") {
        return isSameDay(date, today);
    }

    if (selectedPeriod === "PROXIMOS_7_DIAS") {
        const limit = endOfDay(addDays(today, 7));
        return date >= todayStart && date <= limit;
    }

    if (selectedPeriod === "ESTE_MES") {
        return (
            date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth()
        );
    }

    if (selectedPeriod === "ATRASADOS") {
        return date < todayStart;
    }

    return true;
}

export default function KanbanBoard({
    initialContents,
    statusColumns,
}: KanbanBoardProps) {
    const [contents, setContents] = useState(initialContents);
    const [selectedClient, setSelectedClient] = useState("TODOS");
    const [selectedFormat, setSelectedFormat] = useState("TODOS");
    const [selectedResponsible, setSelectedResponsible] = useState("TODOS");
    const [selectedPriority, setSelectedPriority] = useState("TODOS");
    const [selectedPeriod, setSelectedPeriod] = useState("TODOS");
    const [searchTerm, setSearchTerm] = useState("");
    const [draggingContentId, setDraggingContentId] = useState<string | null>(null);
    const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const clientOptions = useMemo(() => {
        return Array.from(
            new Set(contents.map((content) => content.clientName).filter(Boolean))
        ).sort((a, b) => a.localeCompare(b));
    }, [contents]);

    const formatOptions = useMemo(() => {
        return Array.from(
            new Set(contents.map((content) => content.format).filter(Boolean))
        ).sort((a, b) => String(a).localeCompare(String(b)));
    }, [contents]);

    const responsibleOptions = useMemo(() => {
        return Array.from(
            new Set(contents.map((content) => content.responsible).filter(Boolean))
        ).sort((a, b) => String(a).localeCompare(String(b)));
    }, [contents]);

    const filteredContents = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        return contents.filter((content) => {
            const contentPriority = content.priority || "MEDIA";

            const matchesClient =
                selectedClient === "TODOS" || content.clientName === selectedClient;

            const matchesFormat =
                selectedFormat === "TODOS" || content.format === selectedFormat;

            const matchesResponsible =
                selectedResponsible === "TODOS" ||
                content.responsible === selectedResponsible;

            const matchesPriority =
                selectedPriority === "TODOS" || contentPriority === selectedPriority;

            const matchesDate = matchesPeriod(content.plannedDate, selectedPeriod);

            const searchableText = [
                content.title,
                content.clientName,
                content.format,
                content.platform,
                content.responsible,
                content.status,
                contentPriority,
                priorityLabels[contentPriority],
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const matchesSearch =
                !normalizedSearch || searchableText.includes(normalizedSearch);

            return (
                matchesClient &&
                matchesFormat &&
                matchesResponsible &&
                matchesPriority &&
                matchesDate &&
                matchesSearch
            );
        });
    }, [
        contents,
        selectedClient,
        selectedFormat,
        selectedResponsible,
        selectedPriority,
        selectedPeriod,
        searchTerm,
    ]);

    const stats = useMemo(() => {
        return {
            total: filteredContents.length,
            urgent: filteredContents.filter(
                (content) => (content.priority || "MEDIA") === "URGENTE"
            ).length,
            high: filteredContents.filter(
                (content) => (content.priority || "MEDIA") === "ALTA"
            ).length,
            pendingClient: filteredContents.filter(
                (content) => content.status === "ENVIADO_CLIENTE"
            ).length,
        };
    }, [filteredContents]);

    function clearFilters() {
        setSelectedClient("TODOS");
        setSelectedFormat("TODOS");
        setSelectedResponsible("TODOS");
        setSelectedPriority("TODOS");
        setSelectedPeriod("TODOS");
        setSearchTerm("");
    }

    function handleDragStart(contentId: string) {
        setDraggingContentId(contentId);
    }

    function handleDragEnd() {
        setDraggingContentId(null);
        setDragOverStatus(null);
    }

    function handleDrop(newStatus: string) {
        if (!draggingContentId) return;

        const draggedContent = contents.find(
            (content) => content.id === draggingContentId
        );

        if (!draggedContent) return;

        if (draggedContent.status === newStatus) {
            handleDragEnd();
            return;
        }

        const previousContents = contents;

        setContents((currentContents) =>
            currentContents.map((content) =>
                content.id === draggingContentId
                    ? {
                        ...content,
                        status: newStatus,
                    }
                    : content
            )
        );

        startTransition(async () => {
            try {
                await updateContentStatusFromKanban(draggingContentId, newStatus);
            } catch (error) {
                console.error(error);
                setContents(previousContents);
                alert("Não foi possível atualizar o status. Tente novamente.");
            } finally {
                handleDragEnd();
            }
        });
    }

    const hasActiveFilters =
        selectedClient !== "TODOS" ||
        selectedFormat !== "TODOS" ||
        selectedResponsible !== "TODOS" ||
        selectedPriority !== "TODOS" ||
        selectedPeriod !== "TODOS" ||
        searchTerm.trim();

    return (
        <div className="w-full max-w-full space-y-6 overflow-hidden bg-slate-50">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Filtros
                        </p>

                        <h2 className="mt-1 text-lg font-bold text-slate-900">
                            Encontre conteúdos mais rápido
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Use busca, cliente, formato, responsável, prioridade e período para focar no que precisa ser produzido agora.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 2xl:grid-cols-7">
                        <div className="2xl:col-span-2">
                            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                Buscar
                            </label>

                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Buscar por título, cliente, responsável..."
                                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                Cliente
                            </label>

                            <select
                                value={selectedClient}
                                onChange={(event) => setSelectedClient(event.target.value)}
                                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="TODOS">Todos</option>

                                {clientOptions.map((clientName) => (
                                    <option key={clientName} value={clientName}>
                                        {clientName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                Formato
                            </label>

                            <select
                                value={selectedFormat}
                                onChange={(event) => setSelectedFormat(event.target.value)}
                                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="TODOS">Todos</option>

                                {formatOptions.map((format) => (
                                    <option key={format} value={format || ""}>
                                        {format}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                Responsável
                            </label>

                            <select
                                value={selectedResponsible}
                                onChange={(event) => setSelectedResponsible(event.target.value)}
                                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="TODOS">Todos</option>

                                {responsibleOptions.map((responsible) => (
                                    <option key={responsible} value={responsible || ""}>
                                        {responsible}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                                Prioridade
                            </label>

                            <select
                                value={selectedPriority}
                                onChange={(event) => setSelectedPriority(event.target.value)}
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
                                Período
                            </label>

                            <select
                                value={selectedPeriod}
                                onChange={(event) => setSelectedPeriod(event.target.value)}
                                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="TODOS">Todos</option>
                                <option value="SEM_DATA">Sem data</option>
                                <option value="HOJE">Hoje</option>
                                <option value="PROXIMOS_7_DIAS">Próx. 7 dias</option>
                                <option value="ESTE_MES">Este mês</option>
                                <option value="ATRASADOS">Atrasados</option>
                            </select>
                        </div>
                    </div>

                    {hasActiveFilters && (
                        <div className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-slate-500">
                                Exibindo{" "}
                                <span className="font-bold text-slate-900">
                                    {filteredContents.length}
                                </span>{" "}
                                conteúdo(s) com os filtros atuais.
                            </p>

                            <button
                                type="button"
                                onClick={clearFilters}
                                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                            >
                                Limpar filtros
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 bg-slate-50 md:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Total filtrado
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                        {stats.total}
                    </p>
                </div>

                <div className="rounded-xl border border-red-100 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-red-400">
                        Urgentes
                    </p>
                    <p className="mt-2 text-3xl font-bold text-red-700">
                        {stats.urgent}
                    </p>
                </div>

                <div className="rounded-xl border border-orange-100 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-orange-400">
                        Alta Prioridade
                    </p>
                    <p className="mt-2 text-3xl font-bold text-orange-700">
                        {stats.high}
                    </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Aguardando Cliente
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                        {stats.pendingClient}
                    </p>
                </div>
            </div>

            {isPending && (
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                    Atualizando status do conteúdo...
                </div>
            )}

            {filteredContents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
                    <p className="text-sm font-medium text-slate-500">
                        Nenhum conteúdo encontrado para este filtro.
                    </p>
                </div>
            ) : (
                <div className="w-full max-w-full overflow-x-auto overflow-y-hidden bg-slate-50 pb-4">
                    <div className="flex h-[calc(100vh-580px)] min-h-[400px] w-max min-w-full gap-4 bg-slate-50 pr-8">
                        {statusColumns.map((column) => {
                            const columnContents = filteredContents.filter(
                                (content) => content.status === column.key
                            );

                            const isDragOver = dragOverStatus === column.key;

                            return (
                                <div
                                    key={column.key}
                                    onDragOver={(event) => {
                                        event.preventDefault();
                                        setDragOverStatus(column.key);
                                    }}
                                    onDragLeave={() => setDragOverStatus(null)}
                                    onDrop={(event) => {
                                        event.preventDefault();
                                        handleDrop(column.key);
                                    }}
                                    className={`flex h-full w-80 shrink-0 flex-col rounded-xl border transition-colors ${isDragOver
                                            ? "border-blue-300 bg-blue-50"
                                            : "border-slate-200 bg-slate-50"
                                        }`}
                                >
                                    <div className="shrink-0 rounded-t-xl border-b border-slate-200 bg-white p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <h2 className="font-bold text-slate-900">
                                                    {column.title}
                                                </h2>

                                                <p className="mt-1 text-xs text-slate-500">
                                                    {column.description}
                                                </p>
                                            </div>

                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                                                {columnContents.length}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3">
                                        {columnContents.length > 0 ? (
                                            columnContents.map((content) => {
                                                const isDragging = draggingContentId === content.id;
                                                const contentPriority = content.priority || "MEDIA";

                                                return (
                                                    <div
                                                        key={content.id}
                                                        draggable
                                                        onDragStart={() => handleDragStart(content.id)}
                                                        onDragEnd={handleDragEnd}
                                                        className={`cursor-grab rounded-xl border bg-white p-4 shadow-sm transition active:cursor-grabbing ${isDragging
                                                                ? "border-blue-300 opacity-50"
                                                                : contentPriority === "URGENTE"
                                                                    ? "border-red-200 hover:border-red-300 hover:shadow-md"
                                                                    : contentPriority === "ALTA"
                                                                        ? "border-orange-200 hover:border-orange-300 hover:shadow-md"
                                                                        : "border-slate-200 hover:border-blue-200 hover:shadow-md"
                                                            }`}
                                                    >
                                                        <div className="space-y-3">
                                                            <Link
                                                                href={`/conteudos/${content.id}`}
                                                                className="block"
                                                                onClick={(event) => {
                                                                    if (draggingContentId) event.preventDefault();
                                                                }}
                                                            >
                                                                <div>
                                                                    <p className="line-clamp-2 text-sm font-bold text-slate-900 hover:text-blue-600">
                                                                        {content.title}
                                                                    </p>

                                                                    <p className="mt-1 text-xs text-slate-500">
                                                                        {content.clientName || "Cliente não informado"}
                                                                    </p>
                                                                </div>
                                                            </Link>

                                                            <div className="flex flex-wrap gap-2">
                                                                <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                                                                    {statusLabels[content.status] || content.status}
                                                                </span>

                                                                <span
                                                                    className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${priorityClasses[contentPriority] ||
                                                                        priorityClasses.MEDIA
                                                                        }`}
                                                                >
                                                                    {priorityLabels[contentPriority] ||
                                                                        contentPriority}
                                                                </span>

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

                                                            <div className="border-t border-slate-100 pt-3">
                                                                <p className="text-xs text-slate-500">
                                                                    Data prevista:{" "}
                                                                    <span className="font-medium text-slate-700">
                                                                        {formatDate(content.plannedDate)}
                                                                    </span>
                                                                </p>

                                                                <p className="mt-1 text-xs text-slate-500">
                                                                    Responsável:{" "}
                                                                    <span className="font-medium text-slate-700">
                                                                        {content.responsible || "Não definido"}
                                                                    </span>
                                                                </p>
                                                            </div>

                                                            <p className="rounded-md bg-slate-50 px-3 py-2 text-center text-[11px] font-medium text-slate-400">
                                                                Arraste para mudar o status
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center">
                                                <p className="text-sm text-slate-400">
                                                    Solte um conteúdo aqui ou aguarde uma nova demanda.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}


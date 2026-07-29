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

function formatDate(date: string | null) {
    if (!date) return "Sem data";

    return new Date(date).toLocaleDateString("pt-BR");
}

export default function KanbanBoard({
    initialContents,
    statusColumns,
}: KanbanBoardProps) {
    const [contents, setContents] = useState(initialContents);
    const [draggingContentId, setDraggingContentId] = useState<string | null>(
        null
    );
    const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const stats = useMemo(() => {
        return {
            total: contents.length,
            pendingClient: contents.filter(
                (content) => content.status === "ENVIADO_CLIENTE"
            ).length,
            needsChanges: contents.filter(
                (content) => content.status === "ALTERACAO_SOLICITADA"
            ).length,
            approved: contents.filter((content) => content.status === "APROVADO")
                .length,
        };
    }, [contents]);

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

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Total
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                        {stats.total}
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

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Alterações
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                        {stats.needsChanges}
                    </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Aprovados
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                        {stats.approved}
                    </p>
                </div>
            </div>

            {isPending && (
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                    Atualizando status do conteúdo...
                </div>
            )}

            <div className="overflow-x-auto pb-4">
                <div className="flex min-w-max gap-4">
                    {statusColumns.map((column) => {
                        const columnContents = contents.filter(
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
                                className={`w-80 shrink-0 rounded-xl border transition-colors ${isDragOver
                                        ? "border-blue-300 bg-blue-50"
                                        : "border-slate-200 bg-slate-50"
                                    }`}
                            >
                                <div className="border-b border-slate-200 bg-white p-4 rounded-t-xl">
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

                                <div className="space-y-3 p-3 min-h-[420px]">
                                    {columnContents.length > 0 ? (
                                        columnContents.map((content) => {
                                            const isDragging = draggingContentId === content.id;

                                            return (
                                                <div
                                                    key={content.id}
                                                    draggable
                                                    onDragStart={() => handleDragStart(content.id)}
                                                    onDragEnd={handleDragEnd}
                                                    className={`cursor-grab rounded-xl border bg-white p-4 shadow-sm transition active:cursor-grabbing ${isDragging
                                                            ? "border-blue-300 opacity-50"
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
        </div>
    );
}


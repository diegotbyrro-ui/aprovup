import type { ReactNode } from "react";

import { DraggableDesignCard } from "@/app/(dashboard)/design/DraggableDesignCard";
import { DraggableContentCard } from "@/app/(dashboard)/filmmaker/DraggableContentCard";

type Area = "DESIGN" | "FILMMAKER";

type GroupableContent = {
  id: string;
  title: string;
  plannedDate?: Date | string | null;
  productionDeadline?: Date | string | null;
  client?: {
    id?: string;
    name?: string | null;
    logoUrl?: string | null;
  } | null;
};

type BatchGroup<T extends GroupableContent> = {
  key: string;
  clientName: string;
  clientLogo: string;
  period: string;
  items: T[];
};

function dateParts(value?: Date | string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Maceio",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(date);

  const get = (name: string) =>
    parts.find((p) => p.type === name)?.value || "";

  return {
    day: get("day"),
    month: get("month"),
    year: get("year"),
  };
}

const months = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio",
  "Junho", "Julho", "Agosto", "Setembro", "Outubro",
  "Novembro", "Dezembro",
];

export function groupProductionKanbanItems<T extends GroupableContent>(
  items: T[]
): BatchGroup<T>[] {
  const groups = new Map<string, BatchGroup<T>>();

  for (const item of items) {
    const clientId = item.client?.id || "SEM_CLIENTE";
    const date = dateParts(item.plannedDate);
    const periodKey = date
      ? `${date.year}-${date.month}`
      : "SEM_DATA";

    const key = `${clientId}:${periodKey}`;
    const existing = groups.get(key);

    if (existing) {
      existing.items.push(item);
      continue;
    }

    groups.set(key, {
      key,
      clientName: item.client?.name || "Cliente",
      clientLogo: item.client?.logoUrl || "",
      period: date
        ? `${months[Number(date.month)] || "Mês"} ${date.year}`
        : "Sem período",
      items: [item],
    });
  }

  return [...groups.values()];
}

function DragWrapper({
  area,
  contentId,
  contentIds,
  children,
}: {
  area: Area;
  contentId: string;
  contentIds?: string[];
  children: ReactNode;
}) {
  if (area === "DESIGN") {
    return (
      <DraggableDesignCard
        contentId={contentId}
        contentIds={contentIds}
      >
        {children}
      </DraggableDesignCard>
    );
  }

  return (
    <DraggableContentCard
      contentId={contentId}
      contentIds={contentIds}
    >
      {children}
    </DraggableContentCard>
  );
}

export function ProductionGroupedStageCard<T extends GroupableContent>({
  group,
  area,
  renderItem,
}: {
  group: BatchGroup<T>;
  area: Area;
  renderItem: (item: T) => ReactNode;
}) {
  const first = group.items[0];

  if (!first) return null;

  const initials = group.clientName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <DragWrapper
      area={area}
      contentId={first.id}
      contentIds={group.items.map((item) => item.id)}
    >
      <article className="overflow-hidden rounded-xl border border-indigo-200 bg-white shadow-sm">
        <div className="border-b border-indigo-100 bg-indigo-50/70 p-3">
          <div className="flex items-start gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-indigo-100 bg-white">
              {group.clientLogo ? (
                <img
                  src={group.clientLogo}
                  alt=""
                  draggable={false}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-[9px] font-black text-indigo-600">
                  {initials}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-black text-slate-900">
                {group.clientName}
              </p>
              <p className="mt-0.5 text-[8px] font-black uppercase tracking-wide text-indigo-600">
                {group.period}
              </p>
              <p className="mt-1 text-[7px] font-medium text-indigo-500">
                Arraste o cabeçalho para mover o pacote inteiro
              </p>
            </div>

            <span className="rounded-md bg-white px-2 py-1 text-[8px] font-black text-indigo-700 shadow-sm">
              {group.items.length}
            </span>
          </div>
        </div>

        <div className="p-2.5">
          <p className="mb-2 px-1 text-[8px] font-bold uppercase tracking-wide text-slate-400">
            Conteúdos do pacote
          </p>

          <div className="max-h-[430px] space-y-1.5 overflow-y-auto pr-1 [scrollbar-width:thin]">
            {group.items.map((item) => {
              const publish = dateParts(item.plannedDate);
              const due = dateParts(item.productionDeadline);

              return (
                <DragWrapper
                  key={item.id}
                  area={area}
                  contentId={item.id}
                >
                  <details className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50/60 open:bg-white">
                    <summary
                      draggable={false}
                      className="cursor-pointer list-none p-2 [&::-webkit-details-marker]:hidden"
                    >
                      <div className="flex items-start gap-1.5">
                        <span className="shrink-0 rounded bg-indigo-50 px-1.5 py-1 text-[7px] font-black text-indigo-600">
                          {publish
                            ? `${publish.day}/${publish.month}`
                            : "Sem data"}
                        </span>

                        <span className="min-w-0 flex-1 text-[9px] font-semibold leading-4 text-slate-700">
                          {item.title}
                        </span>

                        <span className="shrink-0 text-[8px] font-bold text-indigo-600">
                          Detalhes
                        </span>
                      </div>

                      {due && (
                        <p className="mt-1 text-[7px] font-medium text-amber-700">
                          Entrega: {due.day}/{due.month}
                        </p>
                      )}
                    </summary>

                    <div className="border-t border-slate-200 bg-white p-1.5">
                      {renderItem(item)}
                    </div>
                  </details>
                </DragWrapper>
              );
            })}
          </div>
        </div>
      </article>
    </DragWrapper>
  );
}
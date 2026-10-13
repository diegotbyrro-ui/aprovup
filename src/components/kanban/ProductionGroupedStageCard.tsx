import Link from "next/link";
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
  periodKey: string;
  clientId: string;
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

  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return { day: get("day"), month: get("month"), year: get("year") };
}

const months = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function groupProductionKanbanItems<T extends GroupableContent>(
  items: T[]
): BatchGroup<T>[] {
  const groups = new Map<string, BatchGroup<T>>();

  for (const item of items) {
    const clientId = item.client?.id || "SEM_CLIENTE";
    const date = dateParts(item.plannedDate);
    const periodKey = date ? `${date.year}-${date.month}` : "SEM_DATA";
    const key = `${clientId}:${periodKey}`;
    const existing = groups.get(key);

    if (existing) {
      existing.items.push(item);
      continue;
    }

    groups.set(key, {
      key,
      periodKey,
      clientId,
      clientName: item.client?.name || "Cliente",
      clientLogo: item.client?.logoUrl || "",
      period: date ? `${months[Number(date.month)] || "Mês"} ${date.year}` : "Sem período",
      items: [item],
    });
  }

  return Array.from(groups.values());
}

function DragWrapper({ area, contentId, contentIds, children }: {
  area: Area;
  contentId: string;
  contentIds?: string[];
  children: ReactNode;
}) {
  if (area === "DESIGN") {
    return (
      <DraggableDesignCard contentId={contentId} contentIds={contentIds}>
        {children}
      </DraggableDesignCard>
    );
  }
  return (
    <DraggableContentCard contentId={contentId} contentIds={contentIds}>
      {children}
    </DraggableContentCard>
  );
}

export function ProductionGroupedStageCard<T extends GroupableContent>({
  group,
  area,
  statusKey,
}: {
  group: BatchGroup<T>;
  area: Area;
  statusKey: string;
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

  const packageUrl =
    `/pacotes-producao/etapa?cliente=${encodeURIComponent(group.clientId)}` +
    `&area=${encodeURIComponent(area)}` +
    `&etapa=${encodeURIComponent(statusKey)}` +
    `&periodo=${encodeURIComponent(group.periodKey)}`;

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
                <img src={group.clientLogo} alt="" draggable={false} className="h-full w-full object-cover" />
              ) : (
                <span className="text-[9px] font-black text-indigo-600">{initials}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-black text-slate-900">{group.clientName}</p>
              <p className="mt-0.5 text-[8px] font-black uppercase tracking-wide text-indigo-600">{group.period}</p>
              <p className="mt-1 text-[7px] font-medium text-indigo-500">Arraste para mover o pacote inteiro</p>
            </div>
            <span className="rounded-md bg-white px-2 py-1 text-[8px] font-black text-indigo-700 shadow-sm">
              {group.items.length}
            </span>
          </div>
        </div>
        <div className="p-3">
          <p className="mb-2 text-[8px] font-bold uppercase tracking-wide text-slate-400">Conteúdos desta etapa</p>
          <div className="max-h-[220px] space-y-1.5 overflow-y-auto pr-1 [scrollbar-width:thin]">
            {group.items.map((item) => {
              const publish = dateParts(item.plannedDate);
              return (
                <DragWrapper key={item.id} area={area} contentId={item.id}>
                  <div className="flex items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 p-2 hover:border-indigo-100">
                    <span
  title="Data de publicacao"
  className="inline-flex shrink-0 items-center gap-1 rounded bg-indigo-50 px-1.5 py-1 text-[7px] font-black text-indigo-600"
>
  <span className="text-[6px] uppercase tracking-[0.04em] text-indigo-400">
    PUB
  </span>
  {publish ? `${publish.day}/${publish.month}` : "Sem data"}
</span>
                    <span className="min-w-0 flex-1 truncate text-[8px] leading-[13px] font-semibold normal-case tracking-normal text-slate-600" title={item.title}>
                      {item.title}
                    </span>
                    <Link
                      href={`/conteudos/${item.id}/visualizar`}
                      draggable={false}
                      className="shrink-0 rounded border border-slate-200 bg-white px-1.5 py-1 text-[7px] font-bold text-indigo-600 hover:bg-indigo-50"
                    >
                      Abrir
                    </Link>
                  </div>
                </DragWrapper>
              );
            })}
          </div>
          <Link
            href={packageUrl}
            draggable={false}
            className="mt-3 flex min-h-9 items-center justify-center rounded-lg bg-slate-950 px-3 text-center text-[9px] font-black text-white transition hover:bg-indigo-700"
          >
            Abrir pacote completo
          </Link>
        </div>
      </article>
    </DragWrapper>
  );
}
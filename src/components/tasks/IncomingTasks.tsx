import Link from "next/link";

import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

import { completeTask } from "@/app/actions";
import { prisma } from "@/lib/prisma";

type IncomingTasksProps = {
  destination: "DESIGN" | "FILMMAKER";
  title?: string;
};

const priorityLabels: Record<string, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
  URGENTE: "Urgente",
};

const priorityClasses: Record<string, string> = {
  BAIXA: "border-slate-200 bg-slate-50 text-slate-600",
  MEDIA: "border-blue-100 bg-blue-50 text-blue-700",
  ALTA: "border-orange-200 bg-orange-50 text-orange-700",
  URGENTE: "border-red-200 bg-red-50 text-red-700",
};

function formatDate(date?: Date | null) {
  if (!date) {
    return "Sem prazo";
  }

  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isLate(date?: Date | null) {
  if (!date) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(date);
  due.setHours(0, 0, 0, 0);

  return due < today;
}

export async function IncomingTasks({
  destination,
  title = "Tarefas recebidas",
}: IncomingTasksProps) {
  const tasks = await prisma.task.findMany({
    where: {
      responsible: destination,
      status: {
        notIn: ["FINALIZADO", "FINALIZADA"],
      },
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
        dueDate: "asc",
      },
      {
        createdAt: "desc",
      },
    ],
  });

  const urgentCount = tasks.filter(
    (task) => task.priority === "URGENTE"
  ).length;

  const lateCount = tasks.filter(
    (task) => isLate(task.dueDate)
  ).length;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-blue-600">
            Demandas direcionadas
          </p>

          <h2 className="mt-1 text-lg font-bold text-slate-900">
            {title}
          </h2>

          <p className="mt-1 text-[11px] text-slate-500">
            Tarefas enviadas pela Social Media diretamente para esta área.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-600">
            {tasks.length} pendente(s)
          </span>

          {urgentCount > 0 ? (
            <span className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-bold text-red-700">
              {urgentCount} urgente(s)
            </span>
          ) : null}

          {lateCount > 0 ? (
            <span className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-bold text-red-700">
              {lateCount} atrasada(s)
            </span>
          ) : null}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
          <CheckCircle2
            className="mx-auto text-emerald-500"
            size={22}
          />

          <p className="mt-2 text-sm font-bold text-slate-700">
            Nenhuma tarefa pendente
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Novas demandas enviadas pela Social Media aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {tasks.map((task) => {
            const late = isLate(task.dueDate);
            const priority = task.priority || "MEDIA";

            return (
              <article
                key={task.id}
                className={[
                  "rounded-xl border p-4",
                  late
                    ? "border-red-200 bg-red-50"
                    : priority === "URGENTE"
                      ? "border-red-200 bg-red-50"
                      : priority === "ALTA"
                        ? "border-orange-200 bg-orange-50"
                        : "border-slate-200 bg-white",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">
                      {task.content?.client?.name || "Cliente não informado"}
                    </p>

                    <h3 className="mt-1 text-sm font-bold text-slate-900">
                      {task.title}
                    </h3>

                    <p className="mt-1 text-[10px] font-medium text-slate-500">
                      Conteúdo: {task.content?.title || "Não informado"}
                    </p>
                  </div>

                  <span
                    className={[
                      "shrink-0 rounded-md border px-2 py-1 text-[8px] font-bold uppercase",
                      priorityClasses[priority] ||
                        priorityClasses.MEDIA,
                    ].join(" ")}
                  >
                    {priorityLabels[priority] || priority}
                  </span>
                </div>

                {task.description ? (
                  <p className="mt-3 whitespace-pre-wrap rounded-lg border border-white/70 bg-white/70 p-3 text-[11px] leading-relaxed text-slate-600">
                    {task.description}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={[
                      "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[9px] font-bold",
                      late
                        ? "border-red-200 bg-red-100 text-red-700"
                        : "border-slate-200 bg-slate-50 text-slate-600",
                    ].join(" ")}
                  >
                    {late ? (
                      <AlertTriangle size={11} />
                    ) : (
                      <CalendarClock size={11} />
                    )}

                    {late ? "ATRASADA • " : ""}
                    {formatDate(task.dueDate)}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link
                    href={`/conteudos/${task.contentId}`}
                    className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 text-[9px] font-bold text-white hover:bg-slate-800"
                  >
                    Abrir conteúdo
                    <ExternalLink size={11} />
                  </Link>

                  <form action={completeTask.bind(null, task.id)}>
                    <button
                      type="submit"
                      className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[9px] font-bold text-white hover:bg-emerald-700"
                    >
                      <CheckCircle2 size={12} />
                      Concluir
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
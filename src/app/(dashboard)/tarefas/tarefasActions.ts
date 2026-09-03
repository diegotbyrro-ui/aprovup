"use server";

import { prisma } from "@/lib/prisma";
import { requireAnyPermission } from "@/lib/userAccess";
import { revalidatePath } from "next/cache";

function normalizeTaskStatus(status: FormDataEntryValue | null) {
    const value = String(status || "A_FAZER").trim();

    const allowedStatuses = ["A_FAZER", "EM_ANDAMENTO", "FINALIZADO"];

    if (!allowedStatuses.includes(value)) {
        return "A_FAZER";
    }

    return value;
}

function normalizeTaskPriority(priority: FormDataEntryValue | null) {
    const value = String(priority || "MEDIA").trim();

    const allowedPriorities = ["BAIXA", "MEDIA", "ALTA", "URGENTE"];

    if (!allowedPriorities.includes(value)) {
        return "MEDIA";
    }

    return value;
}

export async function updateTaskFromTasksPage(taskId: string, formData: FormData) {
    const currentUser =
        await requireAnyPermission([
        "social.manage",
        "design.manage",
        "filmmaker.manage",
    ]);

    const task = await prisma.task.findFirst({
        where: {
            id:
                taskId,

            content: {
                client: {
                    agencyId:
                        currentUser.agencyId,
                },
            },
        },

        include: {
            content:
                true,
        },
    });

    if (!task) {
        throw new Error("Tarefa não encontrada.");
    }

    const newStatus = normalizeTaskStatus(formData.get("status"));
    const newPriority = normalizeTaskPriority(formData.get("priority"));

    await prisma.task.update({
        where: {
            id: taskId,
        },
        data: {
            status: newStatus,
            priority: newPriority,
        },
    });

    await prisma.historyLog.create({
        data: {
            entityType: "CONTENT",
            entityId: task.contentId,
            action: "TASK_UPDATED_FROM_TASKS_PAGE",
            description: `Tarefa "${task.title}" atualizada: status ${newStatus}, prioridade ${newPriority}.`,
            authorName: "Equipe Level UP",
        },
    });

    revalidatePath("/tarefas");
    revalidatePath(`/conteudos/${task.contentId}`);
}

export async function deleteTaskFromTasksPage(taskId: string) {
    const currentUser =
        await requireAnyPermission([
        "social.manage",
        "design.manage",
        "filmmaker.manage",
    ]);

    const task = await prisma.task.findFirst({
        where: {
            id:
                taskId,

            content: {
                client: {
                    agencyId:
                        currentUser.agencyId,
                },
            },
        },
    });

    if (!task) {
        throw new Error("Tarefa não encontrada.");
    }

    await prisma.task.delete({
        where: {
            id: taskId,
        },
    });

    await prisma.historyLog.create({
        data: {
            entityType: "CONTENT",
            entityId: task.contentId,
            action: "TASK_DELETED_FROM_TASKS_PAGE",
            description: `Tarefa "${task.title}" excluída pela tela de tarefas.`,
            authorName: "Equipe Level UP",
        },
    });

    revalidatePath("/tarefas");
    revalidatePath(`/conteudos/${task.contentId}`);
}


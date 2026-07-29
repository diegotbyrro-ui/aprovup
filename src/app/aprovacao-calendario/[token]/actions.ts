"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function getMonthRange(year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    return {
        start,
        end,
    };
}

async function validateMonthlyApproval(token: string, contentId: string) {
    const monthlyApproval = await prisma.monthlyApproval.findUnique({
        where: {
            token,
        },
        include: {
            client: true,
        },
    });

    if (!monthlyApproval) {
        throw new Error("Calendário de aprovação não encontrado.");
    }

    const { start, end } = getMonthRange(
        monthlyApproval.year,
        monthlyApproval.month
    );

    const content = await prisma.content.findFirst({
        where: {
            id: contentId,
            clientId: monthlyApproval.clientId,
            plannedDate: {
                gte: start,
                lte: end,
            },
        },
        include: {
            client: true,
        },
    });

    if (!content) {
        throw new Error("Conteúdo não encontrado neste calendário mensal.");
    }

    return {
        monthlyApproval,
        content,
    };
}

export async function approvePlanningContent(
    token: string,
    contentId: string
) {
    const { monthlyApproval, content } = await validateMonthlyApproval(
        token,
        contentId
    );

    await prisma.content.update({
        where: {
            id: contentId,
        },
        data: {
            status: "AGENDAMENTO_PRODUCAO",
        },
    });

    await prisma.historyLog.create({
        data: {
            entityType: "CONTENT",
            entityId: contentId,
            action: "MONTHLY_PLANNING_APPROVED",
            description: `Cliente aprovou o planejamento do conteúdo "${content.title}" no calendário mensal.`,
            authorName: "Cliente",
        },
    });

    await prisma.comment.create({
        data: {
            contentId,
            authorName: "Cliente",
            authorRole: "CLIENTE",
            message:
                "Planejamento aprovado no calendário mensal. Conteúdo liberado para produção.",
        },
    });

    revalidatePath(`/aprovacao-calendario/${token}`);
    revalidatePath(`/conteudos/${contentId}`);
    revalidatePath("/clientes");
    revalidatePath("/conteudos/kanban");
    revalidatePath("/entregas-semana");
    revalidatePath("/tarefas");

    if (monthlyApproval.clientId) {
        revalidatePath(`/clientes/${monthlyApproval.clientId}`);
        revalidatePath(`/clientes/${monthlyApproval.clientId}/visao`);
    }

    redirect(`/aprovacao-calendario/${token}?feedback=aprovado`);
}

export async function requestPlanningChanges(
    token: string,
    contentId: string,
    formData: FormData
) {
    const comment = String(formData.get("clientComment") || "").trim();

    if (!comment) {
        throw new Error("Informe o que precisa ser alterado.");
    }

    const { monthlyApproval, content } = await validateMonthlyApproval(
        token,
        contentId
    );

    await prisma.content.update({
        where: {
            id: contentId,
        },
        data: {
            status: "ALTERACAO_SOLICITADA",
        },
    });

    await prisma.comment.create({
        data: {
            contentId,
            authorName: "Cliente",
            authorRole: "CLIENTE",
            message: comment,
        },
    });

    await prisma.historyLog.create({
        data: {
            entityType: "CONTENT",
            entityId: contentId,
            action: "MONTHLY_PLANNING_CHANGE_REQUESTED",
            description: `Cliente solicitou alteração no planejamento do conteúdo "${content.title}" pelo calendário mensal.`,
            authorName: "Cliente",
        },
    });

    revalidatePath(`/aprovacao-calendario/${token}`);
    revalidatePath(`/conteudos/${contentId}`);
    revalidatePath("/clientes");
    revalidatePath("/conteudos/kanban");
    revalidatePath("/entregas-semana");
    revalidatePath("/tarefas");

    if (monthlyApproval.clientId) {
        revalidatePath(`/clientes/${monthlyApproval.clientId}`);
        revalidatePath(`/clientes/${monthlyApproval.clientId}/visao`);
    }

    redirect(`/aprovacao-calendario/${token}?feedback=alteracao`);
}


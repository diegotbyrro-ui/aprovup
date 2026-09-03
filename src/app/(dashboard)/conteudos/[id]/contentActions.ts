"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/userAccess";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

export async function generateApprovalLink(contentId: string) {
    const currentUser =
        await requirePermission(
            "social.manage"
        );

    const content = await prisma.content.findFirst({
        where: {
            id: contentId,

            client: {
                agencyId:
                    currentUser.agencyId,
            },
        },
    });

    if (!content) {
        throw new Error("Conteúdo não encontrado.");
    }

    const existingApproval = await prisma.approval.findFirst({
        where: {
            contentId,
            status: "PENDENTE",
        },
    });

    if (existingApproval) {
        revalidatePath(`/conteudos/${contentId}`);
        return;
    }

    const token = randomUUID();

    await prisma.approval.create({
        data: {
            contentId,
            token,
            status: "PENDENTE",
        },
    });

    await prisma.content.update({
        where: {
            id: contentId,
        },
        data: {
            status: "ENVIADO_CLIENTE",
        },
    });

    await prisma.historyLog.create({
        data: {
            entityType: "CONTENT",
            entityId: contentId,
            action: "APPROVAL_LINK_CREATED",
            description: `Link de aprovação criado para o conteúdo "${content.title}".`,
            authorName: "Equipe Level UP",
        },
    });

    revalidatePath(`/conteudos/${contentId}`);
    revalidatePath("/clientes");
    revalidatePath("/entregas-semana");
    revalidatePath("/conteudos/kanban");
    revalidatePath("/aprovacoes");

    if (content.clientId) {
        revalidatePath(`/clientes/${content.clientId}`);
        revalidatePath(`/clientes/${content.clientId}/visao`);
    }
}


"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/userAccess";

export async function markContentAsPublished(contentId: string) {
    await requirePermission("social.manage");

    const content = await prisma.content.findUnique({
        where: {
            id: contentId,
        },
    });

    if (!content) {
        throw new Error("Conteúdo não encontrado.");
    }

    await prisma.content.update({
        where: {
            id: contentId,
        },
        data: {
            status: "PUBLICADO_MANUALMENTE",
        },
    });

    await prisma.historyLog.create({
        data: {
            entityType: "CONTENT",
            entityId: contentId,
            action: "CONTENT_MARKED_AS_PUBLISHED",
            description: `Conteúdo "${content.title}" marcado como publicado manualmente.`,
            authorName: "Equipe Level UP",
        },
    });

    revalidatePath("/pronto-para-postar");
    revalidatePath("/clientes");
    revalidatePath("/entregas-semana");
    revalidatePath("/conteudos/kanban");
    revalidatePath(`/conteudos/${contentId}`);
}


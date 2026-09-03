"use server";

import { prisma } from "@/lib/prisma";
import { requireAnyPermission } from "@/lib/userAccess";
import { revalidatePath } from "next/cache";

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

export async function updateContentStatusFromKanban(
    contentId: string,
    newStatus: string
) {
    const currentUser =
        await requireAnyPermission([
            "social.manage",
            "design.manage",
            "filmmaker.manage",
        ]);

    if (!contentId) {
        throw new Error("Conteúdo não informado.");
    }

    if (!newStatus) {
        throw new Error("Novo status não informado.");
    }

    const oldContent = await prisma.content.findFirst({
        where: {
            id:
                contentId,

            client: {
                agencyId:
                    currentUser.agencyId,
            },
        },
    });

    if (!oldContent) {
        throw new Error("Conteúdo não encontrado.");
    }

    if (oldContent.status === newStatus) {
        return;
    }

    await prisma.content.update({
        where: {
            id: contentId,
        },
        data: {
            status: newStatus,
        },
    });

    await prisma.historyLog.create({
        data: {
            entityType: "CONTENT",
            entityId: contentId,
            action: "STATUS_CHANGED",
            description: `Status alterado no Kanban de ${statusLabels[oldContent.status] || oldContent.status
                } para ${statusLabels[newStatus] || newStatus}.`,
            authorName: "Equipe Level UP",
        },
    });

    revalidatePath("/conteudos/kanban");
    revalidatePath("/conteudos");
    revalidatePath("/calendario");
    revalidatePath(`/conteudos/${contentId}`);
}


import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/userAccess";
import { revalidatePath } from "next/cache";

type DuplicateContentButtonProps = {
    contentId: string;
    clientId: string;
};

function addDays(date: Date, days: number) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
}

async function duplicateContent(contentId: string, clientId: string) {
    "use server";

    const currentUser =
        await requirePermission(
            "social.manage"
        );

    const originalContent =
        await prisma.content.findFirst({
            where: {
                id:
                    contentId,

                client: {
                    agencyId:
                        currentUser.agencyId,
                },
            },
        });

    if (!originalContent) {
        throw new Error(
            "Conteúdo original não encontrado."
        );
    }

    if (
        originalContent.clientId !==
        clientId
    ) {
        throw new Error(
            "Conteúdo não pertence ao cliente informado."
        );
    }

    const safeClientId =
        originalContent.clientId;

    const duplicatedContent = await prisma.content.create({
        data: {
            title: `Cópia de ${originalContent.title}`,
            objective: originalContent.objective,
            format: originalContent.format,
            platform: originalContent.platform,
            plannedDate: originalContent.plannedDate
                ? addDays(originalContent.plannedDate, 1)
                : addDays(new Date(), 1),
            responsible: originalContent.responsible,
            caption: originalContent.caption,
            artText: originalContent.artText,
            script: originalContent.script,
            briefing: originalContent.briefing,
            fileLinks: originalContent.fileLinks,
            coverImageUrl: originalContent.coverImageUrl,
            status: "IDEIA",

            clientId:
                safeClientId,
        },
    });

    await prisma.historyLog.create({
        data: {
            entityType: "CLIENT",

            entityId:
                safeClientId,
            action: "CONTENT_DUPLICATED",
            description: `Conteúdo "${originalContent.title}" duplicado como "${duplicatedContent.title}".`,
            authorName: "Equipe Level UP",
        },
    });

    await prisma.historyLog.create({
        data: {
            entityType: "CONTENT",
            entityId: duplicatedContent.id,
            action: "CREATED_FROM_DUPLICATION",
            description: `Conteúdo criado a partir da duplicação de "${originalContent.title}".`,
            authorName: "Equipe Level UP",
        },
    });

    revalidatePath(
        `/clientes/${safeClientId}`
    );
    revalidatePath("/conteudos");
    revalidatePath("/calendario");
}

export default function DuplicateContentButton({
    contentId,
    clientId,
}: DuplicateContentButtonProps) {
    const action = duplicateContent.bind(null, contentId, clientId);

    return (
        <form action={action}>
            <button
                type="submit"
                className="rounded-md bg-slate-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-sm"
            >
                Duplicar
            </button>
        </form>
    );
}


import { AprovUpLogo } from '@/components/brand/AprovUpLogo';
import { prisma } from "@/lib/prisma";
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

    const originalContent = await prisma.content.findUnique({
        where: {
            id: contentId,
        },
    });

    if (!originalContent) {
        throw new Error("Conteúdo original não encontrado.");
    }

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
            clientId,
        },
    });

    await prisma.historyLog.create({
        data: {
            entityType: "CLIENT",
            entityId: clientId,
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

    revalidatePath(`/clientes/${clientId}`);
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


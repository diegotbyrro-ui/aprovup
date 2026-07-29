import { AprovUpLogo } from '@/components/brand/AprovUpLogo';
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

type DeleteContentButtonProps = {
    contentId: string;
    clientId: string;
    contentTitle: string;
};

async function deleteContent(
    contentId: string,
    clientId: string,
    contentTitle: string
) {
    "use server";

    if (!contentId) {
        throw new Error("Conteúdo não informado.");
    }

    await prisma.approval.deleteMany({
        where: {
            contentId,
        },
    });

    await prisma.comment.deleteMany({
        where: {
            contentId,
        },
    });

    await prisma.task.deleteMany({
        where: {
            contentId,
        },
    });

    await prisma.content.delete({
        where: {
            id: contentId,
        },
    });

    await prisma.historyLog.create({
        data: {
            entityType: "CLIENT",
            entityId: clientId,
            action: "CONTENT_DELETED",
            description: `Conteúdo "${contentTitle}" excluído.`,
            authorName: "Equipe Level UP",
        },
    });

    revalidatePath(`/clientes/${clientId}`);
    revalidatePath("/conteudos");
    revalidatePath("/calendario");
}

export default function DeleteContentButton({
    contentId,
    clientId,
    contentTitle,
}: DeleteContentButtonProps) {
    const action = deleteContent.bind(null, contentId, clientId, contentTitle);

    return (
        <details className="relative">
            <summary className="list-none cursor-pointer rounded-md bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition-colors shadow-sm">
                Excluir
            </summary>

            <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-red-100 bg-white p-4 shadow-xl">
                <p className="text-sm font-bold text-slate-900">
                    Excluir conteúdo?
                </p>

                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Esta ação vai apagar este conteúdo, comentários, tarefas e aprovações vinculadas.
                </p>

                <p className="mt-2 text-xs font-medium text-red-600 line-clamp-2">
                    {contentTitle}
                </p>

                <form action={action} className="mt-4 flex gap-2">
                    <button
                        type="submit"
                        className="flex-1 rounded-md bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700 transition-colors"
                    >
                        Confirmar exclusão
                    </button>
                </form>
            </div>
        </details>
    );
}


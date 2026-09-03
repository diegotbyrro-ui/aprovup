import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth";
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

  const currentUser =
    await requireCurrentUser();

  if (
    currentUser.status !==
    "APROVADO"
  ) {
    throw new Error(
      "Usuário sem acesso ao AprovUp."
    );
  }

  const content =
    await prisma.content.findFirst({
      where: {
        id: contentId,
        clientId,
      },

      select: {
        id: true,
        clientId: true,
        title: true,
      },
    });

  if (!content) {
    throw new Error(
      "Conteúdo não encontrado."
    );
  }

  await prisma.$transaction(
    async (transaction) => {

      await transaction.captureSchedule.updateMany({
        where: {
          contentId:
            content.id,
        },

        data: {
          contentId: null,
        },
      });

      await transaction.approval.deleteMany({
        where: {
          contentId:
            content.id,
        },
      });

      await transaction.comment.deleteMany({
        where: {
          contentId:
            content.id,
        },
      });

      await transaction.task.deleteMany({
        where: {
          contentId:
            content.id,
        },
      });

      await transaction.content.delete({
        where: {
          id:
            content.id,
        },
      });

      await transaction.historyLog.create({
        data: {
          entityType:
            "CLIENT",

          entityId:
            content.clientId,

          action:
            "CONTENT_DELETED",

          description:
            `Conteúdo "${
              content.title ||
              contentTitle
            }" excluído permanentemente.`,

          authorName:
            currentUser.name ||
            currentUser.email ||
            "Equipe AprovUp",
        },
      });
    }
  );

  revalidatePath(
    `/clientes/${content.clientId}`
  );

  revalidatePath(
    `/clientes/${content.clientId}/visao`
  );

  revalidatePath(
    `/clientes/${content.clientId}/calendario`
  );

  revalidatePath("/conteudos");
  revalidatePath("/calendario");
  revalidatePath("/calendario-editorial");
  revalidatePath("/operacao");
  revalidatePath("/design");
  revalidatePath("/filmmaker");
  revalidatePath("/social-media");
}

export default function DeleteContentButton({
  contentId,
  clientId,
  contentTitle,
}: DeleteContentButtonProps) {

  const action =
    deleteContent.bind(
      null,
      contentId,
      clientId,
      contentTitle
    );

  return (
    <details className="relative">
      <summary className="list-none cursor-pointer rounded-md bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-red-700">
        Excluir
      </summary>

      <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-red-100 bg-white p-4 shadow-xl">
        <p className="text-sm font-bold text-slate-900">
          Excluir conteúdo?
        </p>

        <p className="mt-2 text-xs leading-relaxed text-slate-600">
          Esta exclusão será permanente e não poderá ser desfeita.
          Tem certeza de que deseja excluir este conteúdo?
        </p>

        <p className="mt-2 line-clamp-2 text-xs font-semibold text-red-600">
          {contentTitle}
        </p>

        <div className="mt-4 flex gap-2">
          <a
            href={`/clientes/${clientId}`}
            className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-center text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </a>

          <form
            action={action}
            className="flex-1"
          >
            <button
              type="submit"
              className="w-full rounded-md bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
            >
              Excluir permanentemente
            </button>
          </form>
        </div>
      </div>
    </details>
  );
}

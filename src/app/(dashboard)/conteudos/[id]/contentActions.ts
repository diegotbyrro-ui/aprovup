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




export async function reopenFinalApprovalInternallyAction(
  contentId:
    string
) {

  const currentUser =
    await requirePermission(
      "social.manage"
    );


  const content =
    await prisma.content.findFirst({
      where: {
        id:
          contentId,

        client: {
          agencyId:
            currentUser.agencyId,
        },

        status:
          "PRONTO_PARA_POSTAR",
      },

      include: {
        instagramPublication:
          true,

        instagramStoryPublication:
          true,
      },
    });


  if (
    !content
  ) {

    revalidatePath(
      "/conteudos/" +
      contentId
    );

    return;
  }


  const blockedStatuses =
    [
      "AGENDADO",
      "PUBLICANDO",
      "PUBLICADO",
    ];


  if (
    blockedStatuses.includes(
      content
        .instagramPublication
        ?.status ||
      ""
    ) ||
    blockedStatuses.includes(
      content
        .instagramStoryPublication
        ?.status ||
      ""
    )
  ) {

    throw new Error(
      "Este conteúdo já foi agendado ou publicado e não pode retornar para aprovação por este botão."
    );
  }


  const legacyApproval =
    await prisma.approval.findFirst({
      where: {
        contentId,

        status:
          "APROVADO",
      },

      orderBy: {
        updatedAt:
          "desc",
      },
    });


  const author =
    currentUser.name ||
    currentUser.email ||
    "Equipe AprovUp";


  await prisma.$transaction(
    async (
      transaction
    ) => {

      if (
        legacyApproval
      ) {

        await transaction
          .approval
          .update({
            where: {
              id:
                legacyApproval.id,
            },

            data: {
              status:
                "PENDENTE",

              clientComment:
                null,
            },
          });
      }


      await transaction
        .content
        .update({
          where: {
            id:
              content.id,
          },

          data: {
            status:
              "ENVIADO_CLIENTE",
          },
        });


      await transaction
        .comment
        .create({
          data: {
            contentId:
              content.id,

            authorName:
              author,

            authorRole:
              currentUser.role ||
              "EQUIPE",

            message:
              "APROVAÇÃO DESFEITA INTERNAMENTE: material marcado como não aprovado e devolvido para a 2ª Etapa de Aprovação.",
          },
        });


      await transaction
        .historyLog
        .create({
          data: {
            entityType:
              "CONTENT",

            entityId:
              content.id,

            action:
              "FINAL_APPROVAL_REOPENED_INTERNAL",

            description:
              'A equipe desfez a aprovação final do conteúdo "' +
              content.title +
              '". Material retornado para a 2ª Etapa de Aprovação.',

            authorName:
              author,
          },
        });
    }
  );


  revalidatePath(
    "/conteudos/" +
    content.id
  );

  revalidatePath(
    "/clientes/" +
    content.clientId +
    "/aprovacao-final"
  );

  revalidatePath(
    "/social-media"
  );

  revalidatePath(
    "/social-media/avisos"
  );

  revalidatePath(
    "/pronto-para-postar"
  );

  revalidatePath(
    "/calendario-editorial"
  );
}




export async function markContentAsPublishedByDirectorAction(
  contentId:
    string
) {
  const currentUser =
    await requirePermission(
      "social.manage"
    );


  if (
    currentUser.role !==
    "DIRECTOR"
  ) {
    throw new Error(
      "Somente a Diretoria pode confirmar manualmente uma publicação por esta tela."
    );
  }


  const content =
    await prisma.content
      .findFirst({
        where: {
          id:
            contentId,

          client: {
            agencyId:
              currentUser.agencyId,
          },
        },

        include: {
          instagramPublication:
            true,
        },
      });


  if (!content) {
    throw new Error(
      "Conteúdo não encontrado."
    );
  }


  if (
    [
      "PUBLICADO",
      "PUBLICADO_MANUALMENTE",
    ].includes(
      content.status
    )
  ) {
    revalidatePath(
      `/conteudos/${content.id}`
    );

    return;
  }


  const now =
    new Date();


  const effectivePublishedAt =
    content.plannedDate &&
    content.plannedDate <=
      now
      ? content.plannedDate
      : now;


  await prisma.$transaction(
    async (
      transaction
    ) => {

      await transaction.content.update({
        where: {
          id:
            content.id,
        },

        data: {
          status:
            "PUBLICADO_MANUALMENTE",
        },
      });


      /*
       * Se existia uma tentativa de publicação
       * automática presa em AGENDADO ou ERRO,
       * a confirmação manual da Diretoria encerra
       * também essa pendência.
       */
      await transaction
        .instagramPublication
        .updateMany({
          where: {
            contentId:
              content.id,
          },

          data: {
            status:
              "PUBLICADO",

            publishedAt:
              effectivePublishedAt,

            scheduledFor:
              null,

            lastError:
              null,
          },
        });


      /*
       * Resolve imediatamente alertas da LIV
       * referentes à publicação deste conteúdo.
       */
      await transaction
        .secretaryAlert
        .updateMany({
          where: {
            agencyId:
              currentUser.agencyId,

            contentId:
              content.id,

            status:
              "OPEN",

            type: {
              in: [
                "INSTAGRAM_PUBLICATION_ERROR",
                "INSTAGRAM_PUBLICATION_OVERDUE",
              ],
            },
          },

          data: {
            status:
              "RESOLVED",
          },
        });


      await transaction.historyLog.create({
        data: {
          entityType:
            "CONTENT",

          entityId:
            content.id,

          action:
            "CONTENT_MARKED_AS_PUBLISHED_BY_DIRECTOR",

          description:
            `Diretoria confirmou manualmente que o conteúdo "${content.title}" já foi publicado.`,

          authorName:
            currentUser.name ||
            currentUser.email ||
            "Diretoria",
        },
      });
    }
  );


  revalidatePath(
    `/conteudos/${content.id}`
  );

  revalidatePath(
    `/clientes/${content.clientId}`
  );

  revalidatePath(
    `/clientes/${content.clientId}/visao`
  );

  revalidatePath(
    "/social-media"
  );

  revalidatePath(
    "/pronto-para-postar"
  );

  revalidatePath(
    "/calendario"
  );

  revalidatePath(
    "/calendario-editorial"
  );

  revalidatePath(
    "/conteudos"
  );

  revalidatePath(
    "/operacao"
  );
}

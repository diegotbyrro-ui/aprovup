"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  prisma,
} from "@/lib/prisma";

import {
  requirePermission,
} from "@/lib/userAccess";


export async function deleteClientAction(
  clientId: string
) {
  const currentUser =
    await requirePermission(
      "social.manage"
    );

  const client =
    await prisma.client.findFirst({
      where: {
        id: clientId,
        agencyId:
          currentUser.agencyId,
      },

      select: {
        id: true,
        name: true,
      },
    });


  if (!client) {
    revalidatePath(
      "/clientes"
    );

    return;
  }


  /*
   * CaptureSchedule e CaptureDateSuggestion
   * possuem clientId, mas nao possuem uma
   * relation Prisma com Client.
   *
   * Por isso removemos manualmente antes
   * de excluir o cliente.
   *
   * O restante ligado ao Client/Content
   * possui onDelete: Cascade no schema.
   */
  await prisma.$transaction([
    prisma.captureSchedule.deleteMany({
      where: {
        clientId,
      },
    }),

    prisma.captureDateSuggestion.deleteMany({
      where: {
        clientId,
      },
    }),

    prisma.client.delete({
      where: {
        id: clientId,
        agencyId:
          currentUser.agencyId,
      },
    }),

    prisma.historyLog.create({
      data: {
        entityType:
          "CLIENT",

        entityId:
          clientId,

        action:
          "DELETED",

        description:
          `Cliente excluido: ${client.name}.`,

        authorName:
          currentUser.name ||
          currentUser.email ||
          "Diretoria",
      },
    }),
  ]);


  revalidatePath(
    "/clientes"
  );

  revalidatePath(
    "/operacao"
  );

  revalidatePath(
    "/social-media"
  );

  revalidatePath(
    "/design"
  );

  revalidatePath(
    "/filmmaker"
  );

  redirect(
    "/clientes"
  );
}
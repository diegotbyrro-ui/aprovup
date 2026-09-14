"use server";

import {
  redirect,
} from "next/navigation";

import {
  revalidatePath,
} from "next/cache";

import {
  prisma,
} from "@/lib/prisma";

import {
  canAccessClient,
} from "@/lib/clientAccess";

import {
  requirePermission,
} from "@/lib/userAccess";


function text(
  formData: FormData,
  name: string
) {
  return String(
    formData.get(name) ||
    ""
  ).trim();
}


export async function createGraphicDesignDemandAction(
  formData: FormData
) {
  const currentUser =
    await requirePermission(
      "social.manage"
    );


  const clientId =
    text(
      formData,
      "clientId"
    );

  const title =
    text(
      formData,
      "title"
    );

  const materialType =
    text(
      formData,
      "materialType"
    );

  const dimensions =
    text(
      formData,
      "dimensions"
    );

  const quantity =
    text(
      formData,
      "quantity"
    );

  const briefing =
    text(
      formData,
      "briefing"
    );

  const references =
    text(
      formData,
      "references"
    );

  const deadline =
    text(
      formData,
      "deadline"
    );

  const requester =
    text(
      formData,
      "requester"
    ) ||
    currentUser.name ||
    currentUser.email ||
    "Social Media";

  const requestedPriority =
    text(
      formData,
      "priority"
    ).toUpperCase();


  const priority =
    [
      "BAIXA",
      "MEDIA",
      "ALTA",
      "URGENTE",
    ].includes(
      requestedPriority
    )
      ? requestedPriority
      : "MEDIA";


  if (
    !clientId ||
    !title ||
    !materialType ||
    !briefing ||
    !deadline
  ) {
    redirect(
      `/design-grafico/nova?cliente=${clientId}&error=required`
    );
  }


  const client =
    await prisma.client.findFirst({
      where: {
        id:
          clientId,

        agencyId:
          currentUser.agencyId,
      },
    });


  if (
    !client ||
    !canAccessClient(
      currentUser,
      client
    )
  ) {
    redirect(
      "/design-grafico/nova?error=access"
    );
  }


  const deadlineDate =
    new Date(
      `${deadline}T12:00:00`
    );


  if (
    Number.isNaN(
      deadlineDate.getTime()
    )
  ) {
    redirect(
      `/design-grafico/nova?cliente=${clientId}&error=date`
    );
  }


  const briefingParts = [
    `TIPO DE MATERIAL: ${materialType}`,

    dimensions
      ? `MEDIDAS / FORMATO: ${dimensions}`
      : "",

    quantity
      ? `QUANTIDADE / VERSÕES: ${quantity}`
      : "",

    "",

    briefing,
  ];


  const structuredBriefing =
    briefingParts
      .filter(
        (
          item,
          index
        ) =>
          item ||
          index ===
            briefingParts.length - 2
      )
      .join(
        "\n"
      )
      .trim();


  const content =
    await prisma.content.create({
      data: {
        clientId,

        title,

        objective:
          materialType,

        format:
          "DESIGN_GRAFICO",

        platform:
          "OFFLINE",

        /*
         * Design gráfico não possui
         * data de publicação.
         */
        plannedDate:
          null,

        productionDeadline:
          deadlineDate,

        responsible:
          requester,

        area:
          "DESIGN",

        priority,

        artText:
          briefing,

        briefing:
          structuredBriefing,

        fileLinks:
          references,

        /*
         * Vai direto para a coluna inicial
         * do Design.
         */
        status:
          "APROVADO",
      },
    });


  await prisma.historyLog
    .create({
      data: {
        entityType:
          "CONTENT",

        entityId:
          content.id,

        action:
          "GRAPHIC_DESIGN_DEMAND_CREATED",

        description:
          `Solicitação de Design Gráfico criada por ${requester}. Material: ${materialType}. Prazo: ${deadline}.`,

        authorName:
          currentUser.name ||
          currentUser.email ||
          requester,
      },
    })
    .catch(
      () =>
        null
    );


  revalidatePath(
    "/design"
  );

  revalidatePath(
    "/calendario-editorial"
  );

  revalidatePath(
    `/clientes/${clientId}`
  );

  revalidatePath(
    `/clientes/${clientId}/visao`
  );


  redirect(
    "/design?aba=grafico"
  );
}
"use server";

import { prisma } from "@/lib/prisma";
import {
  hasAnyPermission,
} from "@/lib/userAccess";

import {
  isDirector,
  isSocialMedia,
  requireCurrentUser,
} from "@/lib/auth";

import {
  canAccessClient,
} from "@/lib/clientAccess";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function text(
  formData: FormData,
  name: string
) {
  return String(
    formData.get(name) || ""
  ).trim();
}

export async function createEmergencyDemandAction(
  formData: FormData
) {
  const currentUser =
    await requireCurrentUser();


  const canCreateEmergency =
    isDirector(
      currentUser.role
    ) ||
    isSocialMedia(
      currentUser.role
    ) ||
    hasAnyPermission(
      currentUser,
      [
        "social.view",
        "social.manage",
      ]
    );


  if (
    !canCreateEmergency
  ) {
    redirect(
      "/acesso-bloqueado"
    );
  }

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

  const briefing =
    text(
      formData,
      "briefing"
    );

  const caption =
    text(
      formData,
      "caption"
    );

  const requester =
    text(
      formData,
      "requester"
    ) ||
    currentUser.name ||
    currentUser.email ||
    "Social Media";

  const requestedArea =
    text(
      formData,
      "area"
    ).toUpperCase();

  const deadline =
    text(
      formData,
      "deadline"
    );

  const validArea =
    requestedArea === "DESIGN" ||
    requestedArea === "FILMMAKER";

  if (
    !clientId ||
    !title ||
    !briefing ||
    !requester ||
    !deadline ||
    !validArea
  ) {
    redirect(
      `/demandas-emergenciais/nova?cliente=${clientId}&error=required`
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
      "/acesso-bloqueado"
    );
  }

  const deadlineDate =
    new Date(
      `${deadline}T23:59:00-03:00`
    );

  if (
    Number.isNaN(
      deadlineDate.getTime()
    )
  ) {
    redirect(
      `/demandas-emergenciais/nova?cliente=${clientId}&error=required`
    );
  }

  const area =
    requestedArea === "FILMMAKER"
      ? "FILMMAKER"
      : "DESIGN";

  const content =
    await prisma.content.create({
      data: {
        clientId,

        title,

        objective: "",

        format:
          "DEMANDA_EMERGENCIAL",

        platform: "",

        plannedDate:
          null,

        productionDeadline:
          deadlineDate,

        responsible:
          requester,

        area,

        priority:
          "URGENTE",

        caption,

        artText:
          area === "DESIGN"
            ? briefing
            : "",

        script:
          area === "FILMMAKER"
            ? briefing
            : "",

        briefing,

        fileLinks: "",

        coverImageUrl: "",

        // APROVADO e a coluna inicial
        // de demandas do Design / Filmaker.
        // Assim nao passa pela aprovacao mensal.
        status:
          "APROVADO",
      },
    });

  const areaLabel =
    area === "DESIGN"
      ? "Design"
      : "Filmmaker";

  await prisma.historyLog.create({
    data: {
      entityType:
        "CONTENT",

      entityId:
        content.id,

      action:
        "EMERGENCY_DEMAND_CREATED",

      description:
        `Demanda emergencial enviada por ${requester} para ${areaLabel}. Prazo: ${deadline}.`,

      authorName:
        currentUser.name ||
        currentUser.email ||
        requester,
    },
  });

  revalidatePath(
    "/design"
  );

  revalidatePath(
    "/filmmaker"
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

  revalidatePath(
    `/clientes/${clientId}/calendario`
  );

  const destination =
    area === "FILMMAKER"
      ? `/filmmaker?cliente=${clientId}`
      : `/design?cliente=${clientId}`;

  redirect(
    destination
  );
}
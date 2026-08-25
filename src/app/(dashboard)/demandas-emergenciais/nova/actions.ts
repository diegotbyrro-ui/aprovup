"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/userAccess";
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
    await prisma.client.findUnique({
      where: {
        id: clientId,
      },
    });

  if (!client) {
    redirect(
      "/demandas-emergenciais/nova?error=required"
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
      : "Filmaker";

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

  const month =
    deadlineDate.getMonth() + 1;

  const year =
    deadlineDate.getFullYear();

  redirect(
    `/calendario-editorial?cliente=${clientId}&mes=${month}&ano=${year}`
  );
}
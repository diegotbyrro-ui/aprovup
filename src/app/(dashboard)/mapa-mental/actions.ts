"use server";

import {
  randomUUID,
} from "node:crypto";

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
  canAccessClient,
} from "@/lib/clientAccess";

import {
  requirePermission,
} from "@/lib/userAccess";


export async function createMindMapAction(
  formData: FormData
) {
  const user =
    await requirePermission(
      "mindmap.manage"
    );


  const requestedTitle =
    String(
      formData.get(
        "title"
      ) ||
      ""
    ).trim();


  const description =
    String(
      formData.get(
        "description"
      ) ||
      ""
    ).trim();


  const clientId =
    String(
      formData.get(
        "clientId"
      ) ||
      ""
    ).trim();


  const client =
    clientId
      ? await prisma.client.findFirst({
          where: {
            id:
              clientId,

            agencyId:
              user.agencyId,
          },

          select: {
            id:
              true,

            name:
              true,

            agencyId:
              true,

            internalResponsible:
              true,
          },
        })
      : null;


  if (
    clientId &&
    (
      !client ||
      !canAccessClient(
        user,
        client
      )
    )
  ) {
    redirect(
      "/mapa-mental?error=client"
    );
  }


  const title =
    requestedTitle ||
    (
      client
        ? "Mapa - " +
          client.name
        : "Novo mapa mental"
    );


  const rootId =
    randomUUID();


  const map =
    await prisma.mindMap.create({
      data: {
        agencyId:
          user.agencyId,

        clientId:
          client?.id ||
          null,

        title,

        description:
          description ||
          null,

        createdByUserId:
          user.id,

        createdByName:
          user.name ||
          user.email ||
          "AprovUp",

        nodes: [
          {
            id:
              rootId,

            type:
              "mindNode",

            position: {
              x:
                0,

              y:
                0,
            },

            data: {
              title:
                client?.name ||
                "Ideia principal",

              content:
                client
                  ? "Comece a organizar as ideias, campanhas e entregas deste cliente."
                  : "Comece por aqui e conecte novas ideias.",

              kind:
                client
                  ? "CLIENTE"
                  : "IDEIA",

              color:
                client
                  ? "#2563eb"
                  : "#7c3aed",
            },
          },
        ],

        edges: [],

        viewport: {
          x:
            0,

          y:
            0,

          zoom:
            1,
        },
      },
    });


  try {
    await prisma.historyLog.create({
      data: {
        entityType:
          "MIND_MAP",

        entityId:
          map.id,

        action:
          "CREATED",

        description:
          "Mapa mental criado: " +
          map.title +
          ".",

        authorName:
          user.name ||
          user.email ||
          "AprovUp",
      },
    });
  }
  catch (error) {
    console.error(
      "[MIND MAP] Historico:",
      error
    );
  }


  revalidatePath(
    "/mapa-mental"
  );


  redirect(
    "/mapa-mental/" +
    map.id
  );
}


export async function deleteMindMapAction(
  mapId: string
) {
  const user =
    await requirePermission(
      "mindmap.manage"
    );


  const map =
    await prisma.mindMap.findFirst({
      where: {
        id:
          mapId,

        agencyId:
          user.agencyId,
      },

      select: {
        id:
          true,

        title:
          true,

        client: {
          select: {
            agencyId:
              true,

            internalResponsible:
              true,
          },
        },
      },
    });


  if (!map) {
    return;
  }


  if (
    map.client &&
    !canAccessClient(
      user,
      map.client
    )
  ) {
    return;
  }


  await prisma.mindMap.delete({
    where: {
      id:
        map.id,
    },
  });


  try {
    await prisma.historyLog.create({
      data: {
        entityType:
          "MIND_MAP",

        entityId:
          map.id,

        action:
          "DELETED",

        description:
          "Mapa mental excluido: " +
          map.title +
          ".",

        authorName:
          user.name ||
          user.email ||
          "AprovUp",
      },
    });
  }
  catch (error) {
    console.error(
      "[MIND MAP] Historico:",
      error
    );
  }


  revalidatePath(
    "/mapa-mental"
  );
}

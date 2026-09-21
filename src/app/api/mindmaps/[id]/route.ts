import {
  Prisma,
} from "@prisma/client";

import {
  NextResponse,
} from "next/server";

import {
  getCurrentUser,
} from "@/lib/auth";

import {
  prisma,
} from "@/lib/prisma";

import {
  canAccessClient,
} from "@/lib/clientAccess";

import {
  hasPermission,
} from "@/lib/userAccess";


function errorResponse(
  message: string,
  status: number
) {
  return NextResponse.json(
    {
      ok:
        false,

      error:
        message,
    },
    {
      status,
    }
  );
}


export async function PATCH(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const user =
    await getCurrentUser();


  if (
    !user ||
    user.status !==
      "APROVADO" ||
    !user.agencyId
  ) {
    return errorResponse(
      "Nao autorizado.",
      401
    );
  }


  if (
    !hasPermission(
      user,
      "mindmap.manage"
    )
  ) {
    return errorResponse(
      "Sem permissao.",
      403
    );
  }


  const {
    id,
  } =
    await context.params;


  const map =
    await prisma.mindMap.findFirst({
      where: {
        id,

        agencyId:
          user.agencyId,
      },

      include: {
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
    return errorResponse(
      "Mapa nao encontrado.",
      404
    );
  }


  if (
    map.client &&
    !canAccessClient(
      user,
      map.client
    )
  ) {
    return errorResponse(
      "Sem acesso.",
      403
    );
  }


  const body =
    await request.json();


  const nodes =
    Array.isArray(
      body?.nodes
    )
      ? body.nodes.slice(
          0,
          500
        )
      : [];


  const edges =
    Array.isArray(
      body?.edges
    )
      ? body.edges.slice(
          0,
          1000
        )
      : [];


  const totalSize =
    JSON.stringify({
      nodes,
      edges,
    }).length;


  if (
    totalSize >
    2500000
  ) {
    return errorResponse(
      "Mapa grande demais.",
      413
    );
  }


  const title =
    typeof body?.title ===
      "string"
      ? body.title
          .trim()
          .slice(
            0,
            180
          )
      : map.title;


  const description =
    typeof body?.description ===
      "string"
      ? body.description
          .trim()
          .slice(
            0,
            2000
          )
      : map.description;


  const viewport =
    body?.viewport &&
    typeof body.viewport ===
      "object"
      ? body.viewport
      : {
          x:
            0,

          y:
            0,

          zoom:
            1,
        };


  const updated =
    await prisma.mindMap.update({
      where: {
        id:
          map.id,
      },

      data: {
        title:
          title ||
          "Mapa mental",

        description:
          description ||
          null,

        nodes:
          nodes as Prisma.InputJsonValue,

        edges:
          edges as Prisma.InputJsonValue,

        viewport:
          viewport as Prisma.InputJsonValue,
      },

      select: {
        updatedAt:
          true,
      },
    });


  return NextResponse.json({
    ok:
      true,

    updatedAt:
      updated.updatedAt.toISOString(),
  });
}

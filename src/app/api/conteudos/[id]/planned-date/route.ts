import {
  revalidatePath,
} from "next/cache";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getCurrentUser,
} from "@/lib/auth";

import {
  canAccessClient,
} from "@/lib/clientAccess";

import {
  prisma,
} from "@/lib/prisma";

import {
  hasPermission,
} from "@/lib/userAccess";


export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


function parsePlannedDate(
  value: unknown
) {
  const raw =
    typeof value ===
    "string"
      ? value.trim()
      : "";


  const match =
    raw.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );


  if (
    !match
  ) {
    return null;
  }


  const year =
    Number(
      match[1]
    );

  const month =
    Number(
      match[2]
    );

  const day =
    Number(
      match[3]
    );


  const parsed =
    new Date(
      year,
      month - 1,
      day,
      12,
      0,
      0,
      0
    );


  if (
    parsed.getFullYear() !==
      year ||
    parsed.getMonth() !==
      month - 1 ||
    parsed.getDate() !==
      day
  ) {
    return null;
  }


  return parsed;
}


function formatHistoryDate(
  value:
    Date |
    null
) {
  if (
    !value
  ) {
    return "Sem data";
  }


  return value.toLocaleDateString(
    "pt-BR",
    {
      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",
    }
  );
}


export async function POST(
  request:
    NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const currentUser =
      await getCurrentUser();


    if (
      !currentUser ||
      currentUser.status !==
        "APROVADO" ||
      !currentUser.agencyId
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            "Sessão expirada ou usuário sem acesso.",
        },
        {
          status:
            401,
        }
      );
    }


    if (
      !hasPermission(
        currentUser,
        "social.manage"
      )
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            "Você não tem permissão para alterar datas do calendário.",
        },
        {
          status:
            403,
        }
      );
    }


    const {
      id,
    } =
      await context.params;


    const body =
      await request.json();


    const plannedDate =
      parsePlannedDate(
        body?.plannedDate
      );


    if (
      !plannedDate
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            "Data de destino inválida.",
        },
        {
          status:
            400,
        }
      );
    }


    const content =
      await prisma.content.findFirst({
        where: {
          id,

          client: {
            agencyId:
              currentUser.agencyId,
          },
        },

        select: {
          id:
            true,

          title:
            true,

          clientId:
            true,

          plannedDate:
            true,

          client: {
            select: {
              id:
                true,

              agencyId:
                true,

              internalResponsible:
                true,
            },
          },
        },
      });


    if (
      !content
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            "Conteúdo não encontrado.",
        },
        {
          status:
            404,
        }
      );
    }


    if (
      !canAccessClient(
        currentUser,
        content.client
      )
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            "Você não tem acesso a este cliente.",
        },
        {
          status:
            403,
        }
      );
    }


    const oldTime =
      content.plannedDate
        ?.getTime() ||
      null;


    const newTime =
      plannedDate.getTime();


    if (
      oldTime !==
      newTime
    ) {
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
              plannedDate,
            },
          });


          await transaction.historyLog.create({
            data: {
              entityType:
                "CONTENT",

              entityId:
                content.id,

              action:
                "PLANNED_DATE_UPDATED",

              description:
                `Data prevista alterada de "${formatHistoryDate(
                  content.plannedDate
                )}" para "${formatHistoryDate(
                  plannedDate
                )}" pelo calendário.`,

              authorName:
                currentUser.name ||
                currentUser.email ||
                "Equipe AprovUp",
            },
          });
        }
      );
    }


    revalidatePath(
      "/calendario-editorial"
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
      `/clientes/${content.clientId}/calendario`
    );

    revalidatePath(
      "/operacao"
    );

    revalidatePath(
      "/social-media"
    );

    revalidatePath(
      "/social-media/agendamentos"
    );


    return NextResponse.json({
      ok:
        true,

      contentId:
        content.id,

      plannedDate:
        [
          plannedDate.getFullYear(),
          String(
            plannedDate.getMonth() +
            1
          ).padStart(
            2,
            "0"
          ),
          String(
            plannedDate.getDate()
          ).padStart(
            2,
            "0"
          ),
        ].join(
          "-"
        ),
    });
  }
  catch (
    error
  ) {
    console.error(
      "APROVUP CALENDAR MOVE ERROR",
      error
    );


    return NextResponse.json(
      {
        ok:
          false,

        message:
          "Não foi possível alterar a data do conteúdo.",
      },
      {
        status:
          500,
      }
    );
  }
}

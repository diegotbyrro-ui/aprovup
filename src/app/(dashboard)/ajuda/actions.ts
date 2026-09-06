"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  requireCurrentUser,
} from "@/lib/auth";

import {
  prisma,
} from "@/lib/prisma";


const allowedCategories =
  new Set([
    "DUVIDA",
    "PROBLEMA_TECNICO",
    "INTEGRACAO",
    "CONTA_ACESSO",
    "FATURAMENTO",
    "SUGESTAO",
    "OUTRO",
  ]);


const allowedPriorities =
  new Set([
    "BAIXA",
    "NORMAL",
    "ALTA",
    "URGENTE",
  ]);


function readText(
  formData: FormData,
  key: string
) {
  return String(
    formData.get(key) ||
    ""
  ).trim();
}


export async function createSupportTicketAction(
  formData: FormData
) {

  const user =
    await requireCurrentUser();


  const subject =
    readText(
      formData,
      "subject"
    );


  const message =
    readText(
      formData,
      "message"
    );


  const rawCategory =
    readText(
      formData,
      "category"
    ).toUpperCase();


  const rawPriority =
    readText(
      formData,
      "priority"
    ).toUpperCase();


  const category =
    allowedCategories.has(
      rawCategory
    )
      ? rawCategory
      : "DUVIDA";


  const priority =
    allowedPriorities.has(
      rawPriority
    )
      ? rawPriority
      : "NORMAL";


  if (
    subject.length < 5 ||
    subject.length > 120
  ) {
    redirect(
      "/ajuda?error=subject"
    );
  }


  if (
    message.length < 10 ||
    message.length > 5000
  ) {
    redirect(
      "/ajuda?error=message"
    );
  }


  const ticket =
    await prisma
      .supportTicket
      .create({

        data: {

          agencyId:
            user.agencyId,

          createdByUserId:
            user.id,

          createdByName:
            user.name ||
            user.email ||
            "Usuário AprovUp",

          createdByEmail:
            user.email,

          subject,

          category,

          priority,

          status:
            "ABERTO",

          messages: {

            create: {

              authorType:
                "CLIENTE",

              authorUserId:
                user.id,

              authorName:
                user.name ||
                user.email ||
                "Usuário AprovUp",

              message,
            },

          },

        },

      });


  revalidatePath(
    "/ajuda"
  );

  revalidatePath(
    "/central"
  );

  revalidatePath(
    "/central/chamados"
  );


  redirect(
    `/ajuda?ticket=${ticket.id}&created=1`
  );
}


export async function replySupportTicketAction(
  formData: FormData
) {

  const user =
    await requireCurrentUser();


  const ticketId =
    readText(
      formData,
      "ticketId"
    );


  const message =
    readText(
      formData,
      "message"
    );


  if (
    !ticketId ||
    message.length < 2 ||
    message.length > 5000
  ) {
    redirect(
      `/ajuda?ticket=${encodeURIComponent(
        ticketId
      )}&error=reply`
    );
  }


  const ticket =
    await prisma
      .supportTicket
      .findFirst({

        where: {

          id:
            ticketId,

          agencyId:
            user.agencyId,

          ...(
            user.role ===
            "DIRECTOR"
              ? {}
              : {
                  createdByUserId:
                    user.id,
                }
          ),

        },

        select: {
          id:
            true,
        },

      });


  if (!ticket) {
    redirect(
      "/ajuda?error=ticket"
    );
  }


  await prisma
    .$transaction([

      prisma
        .supportTicketMessage
        .create({

          data: {

            ticketId,

            authorType:
              "CLIENTE",

            authorUserId:
              user.id,

            authorName:
              user.name ||
              user.email ||
              "Usuário AprovUp",

            message,

          },

        }),


      prisma
        .supportTicket
        .update({

          where: {
            id:
              ticketId,
          },

          data: {
            status:
              "ABERTO",
          },

        }),

    ]);


  revalidatePath(
    "/ajuda"
  );

  revalidatePath(
    "/central/chamados"
  );


  redirect(
    `/ajuda?ticket=${ticketId}&sent=1`
  );
}
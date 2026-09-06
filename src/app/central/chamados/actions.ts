"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  requireCommanderAccess,
} from "@/lib/commanderAccess";

import {
  prisma,
} from "@/lib/prisma";


const allowedStatuses =
  new Set([
    "ABERTO",
    "EM_ATENDIMENTO",
    "AGUARDANDO_CLIENTE",
    "RESOLVIDO",
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


export async function adminReplySupportTicketAction(
  formData: FormData
) {

  const user =
    await requireCommanderAccess();


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
      `/central/chamados?ticket=${encodeURIComponent(
        ticketId
      )}&error=reply`
    );
  }


  const exists =
    await prisma
      .supportTicket
      .findUnique({

        where: {
          id:
            ticketId,
        },

        select: {
          id:
            true,
        },

      });


  if (!exists) {
    redirect(
      "/central/chamados?error=ticket"
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
              "ADMIN",

            authorUserId:
              user.id,

            authorName:
              user.name ||
              "Suporte AprovUp",

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
              "AGUARDANDO_CLIENTE",
          },

        }),

    ]);


  revalidatePath(
    "/central"
  );

  revalidatePath(
    "/central/chamados"
  );

  revalidatePath(
    "/ajuda"
  );


  redirect(
    `/central/chamados?ticket=${ticketId}&sent=1`
  );
}


export async function updateSupportTicketStatusAction(
  formData: FormData
) {

  await requireCommanderAccess();


  const ticketId =
    readText(
      formData,
      "ticketId"
    );


  const rawStatus =
    readText(
      formData,
      "status"
    ).toUpperCase();


  if (
    !ticketId ||
    !allowedStatuses.has(
      rawStatus
    )
  ) {
    redirect(
      "/central/chamados?error=status"
    );
  }


  await prisma
    .supportTicket
    .update({

      where: {
        id:
          ticketId,
      },

      data: {
        status:
          rawStatus,
      },

    });


  revalidatePath(
    "/central"
  );

  revalidatePath(
    "/central/chamados"
  );

  revalidatePath(
    "/ajuda"
  );


  redirect(
    `/central/chamados?ticket=${ticketId}&statusUpdated=1`
  );
}
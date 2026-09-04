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

import {
  decryptGoogleToken,
} from "@/lib/googleCalendar";


export async function disconnectGoogleCalendarAction() {

  const user =
    await requireCurrentUser();


  if (
    user.role !==
    "DIRECTOR"
  ) {
    redirect(
      "/acesso-bloqueado"
    );
  }


  const connection =
    await prisma.googleCalendarConnection.findUnique({
      where: {
        agencyId:
          user.agencyId,
      },
    });


  if (connection) {

    try {

      const refreshToken =
        decryptGoogleToken(
          connection.encryptedRefreshToken
        );


      await fetch(
        `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(
          refreshToken
        )}`,
        {
          method:
            "POST",
        }
      );

    }
    catch (error) {

      console.error(
        "[GOOGLE CALENDAR] Falha ao revogar token:",
        error
      );
    }


    await prisma.googleCalendarConnection.deleteMany({
      where: {
        agencyId:
          user.agencyId,
      },
    });
  }


  revalidatePath(
    "/configuracoes/integracoes"
  );
}
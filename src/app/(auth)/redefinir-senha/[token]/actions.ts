"use server";

import {
  createHash,
} from "node:crypto";

import bcrypt from "bcryptjs";

import {
  redirect,
} from "next/navigation";

import {
  prisma,
} from "@/lib/prisma";

import {
  syncAprovupUserToCrm,
} from "@/lib/crm-supabase/syncAprovupUser";


function hashResetToken(
  token: string
) {
  return createHash(
    "sha256"
  )
    .update(token)
    .digest("hex");
}


export async function resetPasswordAction(
  token: string,
  formData: FormData
) {

  const password =
    String(
      formData.get(
        "password"
      ) || ""
    );


  const confirmation =
    String(
      formData.get(
        "confirmation"
      ) || ""
    );


  if (
    password.length <
    8
  ) {
    redirect(
      `/redefinir-senha/${token}?error=password`
    );
  }


  if (
    password !==
    confirmation
  ) {
    redirect(
      `/redefinir-senha/${token}?error=confirmation`
    );
  }


  const tokenHash =
    hashResetToken(
      token
    );


  const now =
    new Date();


  const user =
    await prisma.user.findUnique({
      where: {
        resetPasswordTokenHash:
          tokenHash,
      },

      select: {
        id:
          true,

        name:
          true,

        email:
          true,

        status:
          true,

        resetPasswordExpiresAt:
          true,
      },
    });


  if (!user) {
    redirect(
      `/redefinir-senha/${token}?error=invalid`
    );
  }


  if (
    user.status !==
    "APROVADO"
  ) {
    redirect(
      `/redefinir-senha/${token}?error=inactive`
    );
  }


  if (
    !user.resetPasswordExpiresAt ||
    user.resetPasswordExpiresAt <=
      now
  ) {
    redirect(
      `/redefinir-senha/${token}?error=expired`
    );
  }


  if (!user.email) {
    redirect(
      `/redefinir-senha/${token}?error=invalid`
    );
  }


  const hashedPassword =
    await bcrypt.hash(
      password,
      10
    );


  /*
   * Consome o token atomicamente.
   *
   * Se duas requisicoes tentarem usar o mesmo
   * link ao mesmo tempo, apenas uma consegue.
   */
  const consumeResult =
    await prisma.user.updateMany({
      where: {
        id:
          user.id,

        resetPasswordTokenHash:
          tokenHash,

        resetPasswordExpiresAt: {
          gt:
            now,
        },
      },

      data: {
        password:
          hashedPassword,

        resetPasswordTokenHash:
          null,

        resetPasswordExpiresAt:
          null,
      },
    });


  if (
    consumeResult.count !==
    1
  ) {
    redirect(
      `/redefinir-senha/${token}?error=invalid`
    );
  }


  /*
   * AprovUp = autenticacao primaria.
   *
   * Em seguida sincronizamos a senha do CRM.
   */
  try {

    await syncAprovupUserToCrm({
      aprovupUserId:
        user.id,

      email:
        user.email,

      password,

      name:
        user.name,
    });


    console.log(
      "[PASSWORD RESET] CRM sincronizado."
    );

  }
  catch (error) {

    /*
     * Falha no CRM nao desfaz a senha principal.
     *
     * O login normal tambem possui sincronizacao
     * como fallback.
     */
    console.error(
      "[PASSWORD RESET] Falha ao sincronizar CRM:",
      error
    );
  }


  try {

    await prisma.historyLog.create({
      data: {
        entityType:
          "USER",

        entityId:
          user.id,

        action:
          "PASSWORD_RESET_COMPLETED",

        description:
          "Senha redefinida através de link temporário.",

        authorName:
          user.name ||
          user.email ||
          "Usuário",
      },
    });

  }
  catch (error) {

    console.error(
      "[PASSWORD RESET] Falha ao registrar histórico:",
      error
    );
  }


  redirect(
    "/login?passwordReset=true"
  );
}
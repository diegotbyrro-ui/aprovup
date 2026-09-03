"use server";

import {
  createHash,
  randomBytes,
} from "node:crypto";

import {
  getCurrentUser,
} from "@/lib/auth";

import {
  prisma,
} from "@/lib/prisma";


export type GeneratePasswordResetResult =
  | {
      ok: true;
      path: string;
      expiresAt: string;
    }
  | {
      ok: false;
      error: string;
    };


function hashResetToken(
  token: string
) {
  return createHash(
    "sha256"
  )
    .update(token)
    .digest("hex");
}


export async function generatePasswordResetLinkAction(
  userId: string
): Promise<GeneratePasswordResetResult> {

  const currentUser =
    await getCurrentUser();


  if (
    !currentUser ||
    currentUser.status !==
      "APROVADO"
  ) {
    return {
      ok: false,
      error:
        "Sua sessão não é válida.",
    };
  }


  /*
   * Regra especial desta funcionalidade:
   *
   * SOMENTE DIRECTOR.
   *
   * Mesmo que outro cargo receba users.manage,
   * ele nao consegue gerar redefinicao.
   */
  if (
    currentUser.role !==
    "DIRECTOR"
  ) {
    return {
      ok: false,
      error:
        "Somente o diretor pode gerar links de redefinição.",
    };
  }


  if (
    !currentUser.agencyId
  ) {
    return {
      ok: false,
      error:
        "Sua conta não possui agência vinculada.",
    };
  }


  /*
   * O filtro por agencyId impede que um diretor
   * de uma agencia redefina usuario de outra.
   */
  const targetUser =
    await prisma.user.findFirst({
      where: {
        id:
          userId,

        agencyId:
          currentUser.agencyId,
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
      },
    });


  if (!targetUser) {
    return {
      ok: false,
      error:
        "Usuário não encontrado nesta agência.",
    };
  }


  if (
    !targetUser.email
  ) {
    return {
      ok: false,
      error:
        "Este usuário não possui e-mail cadastrado.",
    };
  }


  if (
    targetUser.status !==
    "APROVADO"
  ) {
    return {
      ok: false,
      error:
        "Só é possível redefinir a senha de usuários aprovados.",
    };
  }


  /*
   * 256 bits de aleatoriedade.
   */
  const token =
    randomBytes(32)
      .toString("hex");


  /*
   * O banco recebe somente o HASH.
   *
   * Se o banco fosse exposto, os links originais
   * nao poderiam ser recuperados diretamente.
   */
  const tokenHash =
    hashResetToken(
      token
    );


  const expiresAt =
    new Date(
      Date.now() +
      30 * 60 * 1000
    );


  /*
   * Gerar um novo link substitui o anterior.
   *
   * Portanto o link antigo deixa de funcionar.
   */
  await prisma.user.update({
    where: {
      id:
        targetUser.id,
    },

    data: {
      resetPasswordTokenHash:
        tokenHash,

      resetPasswordExpiresAt:
        expiresAt,
    },
  });


  /*
   * Registro de seguranca.
   *
   * O token jamais e salvo no historico.
   */
  try {

    await prisma.historyLog.create({
      data: {
        entityType:
          "USER",

        entityId:
          targetUser.id,

        action:
          "PASSWORD_RESET_LINK_GENERATED",

        description:
          `Link de redefinição de senha gerado para ${targetUser.email}. Validade: 30 minutos.`,

        authorName:
          currentUser.name ||
          currentUser.email ||
          "Diretor",
      },
    });

  }
  catch (error) {

    console.error(
      "[PASSWORD RESET] Falha ao registrar histórico:",
      error
    );
  }


  return {
    ok: true,

    path:
      `/redefinir-senha/${token}`,

    expiresAt:
      expiresAt.toISOString(),
  };
}
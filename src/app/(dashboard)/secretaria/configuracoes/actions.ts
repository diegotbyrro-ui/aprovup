"use server";

import {
  randomBytes,
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
  requirePermission,
} from "@/lib/userAccess";

import {
  decryptMetaSecret,
  encryptMetaSecret,
} from "@/lib/metaCrypto";

import {
  normalizeWhatsappPhone,
} from "@/lib/secretaryWhatsApp";


function cleanGraphVersion(
  value:
    string
) {
  const candidate =
    value.trim();

  return /^v\d+\.\d+$/
    .test(
      candidate
    )
      ? candidate
      : String(
          process.env
            .META_GRAPH_VERSION ||
          "v26.0"
        ).trim();
}


function newVerifyToken() {
  return randomBytes(
    24
  ).toString(
    "hex"
  );
}


async function requireSettingsUser() {
  return requirePermission(
    "settings.manage"
  );
}


export async function saveWhatsappConnectionAction(
  formData:
    FormData
) {
  const user =
    await requireSettingsUser();


  const wabaId =
    String(
      formData.get(
        "wabaId"
      ) ||
      ""
    ).trim();

  const phoneNumberId =
    String(
      formData.get(
        "phoneNumberId"
      ) ||
      ""
    ).trim();

  const displayPhoneNumber =
    String(
      formData.get(
        "displayPhoneNumber"
      ) ||
      ""
    ).trim();

  const accessToken =
    String(
      formData.get(
        "accessToken"
      ) ||
      ""
    ).trim();

  const graphVersion =
    cleanGraphVersion(
      String(
        formData.get(
          "graphVersion"
        ) ||
        "v26.0"
      )
    );

  const alertTemplateName =
    String(
      formData.get(
        "alertTemplateName"
      ) ||
      ""
    ).trim();

  const alertTemplateLanguage =
    String(
      formData.get(
        "alertTemplateLanguage"
      ) ||
      "pt_BR"
    ).trim();

  const proactiveEnabled =
    formData.get(
      "proactiveEnabled"
    ) ===
    "on";


  if (
    !wabaId ||
    !phoneNumberId
  ) {
    redirect(
      "/secretaria/configuracoes?wa=required"
    );
  }


  const existing =
    await prisma
      .secretaryWhatsappConnection
      .findUnique({
        where: {
          agencyId:
            user.agencyId,
        },
      });


  let encryptedAccessToken =
    existing
      ?.encryptedAccessToken ||
    null;


  if (accessToken) {
    encryptedAccessToken =
      encryptMetaSecret(
        accessToken
      );
  }


  if (!encryptedAccessToken) {
    redirect(
      "/secretaria/configuracoes?wa=token-required"
    );
  }


  const encryptedVerifyToken =
    existing
      ?.encryptedVerifyToken ||
    encryptMetaSecret(
      newVerifyToken()
    );


  await prisma
    .secretaryWhatsappConnection
    .upsert({
      where: {
        agencyId:
          user.agencyId,
      },

      update: {
        wabaId,
        phoneNumberId,
        displayPhoneNumber:
          displayPhoneNumber ||
          null,

        encryptedAccessToken,
        encryptedVerifyToken,

        graphVersion,

        alertTemplateName:
          alertTemplateName ||
          null,

        alertTemplateLanguage:
          alertTemplateLanguage ||
          "pt_BR",

        proactiveEnabled,

        status:
          "PENDENTE",
      },

      create: {
        agencyId:
          user.agencyId,

        wabaId,
        phoneNumberId,

        displayPhoneNumber:
          displayPhoneNumber ||
          null,

        encryptedAccessToken,
        encryptedVerifyToken,

        graphVersion,

        alertTemplateName:
          alertTemplateName ||
          null,

        alertTemplateLanguage:
          alertTemplateLanguage ||
          "pt_BR",

        proactiveEnabled,

        status:
          "PENDENTE",
      },
    });


  await prisma.historyLog
    .create({
      data: {
        entityType:
          "AGENCY",

        entityId:
          user.agencyId,

        action:
          "SECRETARY_WHATSAPP_SAVED",

        description:
          "Configuração do WhatsApp da Secretária IA atualizada.",

        authorName:
          user.name ||
          user.email ||
          "Diretoria",
      },
    })
    .catch(
      () =>
        null
    );


  revalidatePath(
    "/secretaria/configuracoes"
  );


  redirect(
    "/secretaria/configuracoes?wa=saved"
  );
}


export async function testWhatsappConnectionAction() {
  const user =
    await requireSettingsUser();


  const connection =
    await prisma
      .secretaryWhatsappConnection
      .findUnique({
        where: {
          agencyId:
            user.agencyId,
        },
      });


  if (
    !connection
      ?.phoneNumberId ||
    !connection
      .encryptedAccessToken
  ) {
    redirect(
      "/secretaria/configuracoes?wa=not-configured"
    );
  }


  const token =
    decryptMetaSecret(
      connection
        .encryptedAccessToken
    );


  const response =
    await fetch(
      "https://graph.facebook.com/" +
      cleanGraphVersion(
        connection
          .graphVersion
      ) +
      "/" +
      connection
        .phoneNumberId +
      "?fields=display_phone_number,verified_name",
      {
        headers: {
          Authorization:
            "Bearer " +
            token,
        },
      }
    );


  const payload =
    await response
      .json() as {
        display_phone_number?:
          string;

        verified_name?:
          string;

        error?: {
          message?:
            string;
        };
      };


  if (!response.ok) {
    console.error(
      "WHATSAPP CONNECTION TEST ERROR",
      payload
    );


    redirect(
      "/secretaria/configuracoes?wa=test-error"
    );
  }


  await prisma
    .secretaryWhatsappConnection
    .update({
      where: {
        id:
          connection.id,
      },

      data: {
        status:
          "ATIVO",

        displayPhoneNumber:
          payload
            .display_phone_number ||
          connection
            .displayPhoneNumber,

        connectedAt:
          new Date(),
      },
    });


  revalidatePath(
    "/secretaria/configuracoes"
  );


  redirect(
    "/secretaria/configuracoes?wa=connected"
  );
}


export async function subscribeWhatsappAppAction() {
  const user =
    await requireSettingsUser();


  const connection =
    await prisma
      .secretaryWhatsappConnection
      .findUnique({
        where: {
          agencyId:
            user.agencyId,
        },
      });


  if (
    !connection
      ?.wabaId ||
    !connection
      .encryptedAccessToken
  ) {
    redirect(
      "/secretaria/configuracoes?wa=not-configured"
    );
  }


  const token =
    decryptMetaSecret(
      connection
        .encryptedAccessToken
    );


  const response =
    await fetch(
      "https://graph.facebook.com/" +
      cleanGraphVersion(
        connection
          .graphVersion
      ) +
      "/" +
      connection.wabaId +
      "/subscribed_apps",
      {
        method:
          "POST",

        headers: {
          Authorization:
            "Bearer " +
            token,
        },
      }
    );


  if (!response.ok) {
    const payload =
      await response
        .text();

    console.error(
      "WHATSAPP SUBSCRIBE APP ERROR",
      payload
    );


    redirect(
      "/secretaria/configuracoes?wa=subscribe-error"
    );
  }


  redirect(
    "/secretaria/configuracoes?wa=subscribed"
  );
}


export async function regenerateWhatsappVerifyTokenAction() {
  const user =
    await requireSettingsUser();


  await prisma
    .secretaryWhatsappConnection
    .update({
      where: {
        agencyId:
          user.agencyId,
      },

      data: {
        encryptedVerifyToken:
          encryptMetaSecret(
            newVerifyToken()
          ),
      },
    });


  revalidatePath(
    "/secretaria/configuracoes"
  );


  redirect(
    "/secretaria/configuracoes?wa=verify-regenerated"
  );
}


export async function pauseWhatsappConnectionAction() {
  const user =
    await requireSettingsUser();


  await prisma
    .secretaryWhatsappConnection
    .updateMany({
      where: {
        agencyId:
          user.agencyId,
      },

      data: {
        status:
          "PAUSADO",

        proactiveEnabled:
          false,
      },
    });


  revalidatePath(
    "/secretaria/configuracoes"
  );


  redirect(
    "/secretaria/configuracoes?wa=paused"
  );
}


export async function saveWhatsappMemberAction(
  formData:
    FormData
) {
  const user =
    await requireSettingsUser();


  const userId =
    String(
      formData.get(
        "userId"
      ) ||
      ""
    ).trim();

  const phoneE164 =
    normalizeWhatsappPhone(
      String(
        formData.get(
          "phoneE164"
        ) ||
        ""
      )
    );

  const displayName =
    String(
      formData.get(
        "displayName"
      ) ||
      ""
    ).trim();

  const canUseSecretary =
    formData.get(
      "canUseSecretary"
    ) ===
    "on";

  const canConfirmActions =
    formData.get(
      "canConfirmActions"
    ) ===
    "on";

  const receiveAlerts =
    formData.get(
      "receiveAlerts"
    ) ===
    "on";


  if (
    !userId ||
    phoneE164.length <
      10
  ) {
    redirect(
      "/secretaria/configuracoes?member=required"
    );
  }


  const target =
    await prisma.user
      .findFirst({
        where: {
          id:
            userId,

          agencyId:
            user.agencyId,

          status:
            "APROVADO",
        },
      });


  if (!target) {
    redirect(
      "/secretaria/configuracoes?member=user-invalid"
    );
  }


  await prisma
    .secretaryWhatsappMember
    .upsert({
      where: {
        agencyId_phoneE164: {
          agencyId:
            user.agencyId,

          phoneE164,
        },
      },

      update: {
        userId,

        displayName:
          displayName ||
          target.name ||
          target.email,

        isActive:
          true,

        canUseSecretary,
        canConfirmActions,
        receiveAlerts,
      },

      create: {
        agencyId:
          user.agencyId,

        userId,
        phoneE164,

        displayName:
          displayName ||
          target.name ||
          target.email,

        isActive:
          true,

        canUseSecretary,
        canConfirmActions,
        receiveAlerts,
      },
    });


  revalidatePath(
    "/secretaria/configuracoes"
  );


  redirect(
    "/secretaria/configuracoes?member=saved"
  );
}


export async function deleteWhatsappMemberAction(
  memberId:
    string
) {
  const user =
    await requireSettingsUser();


  await prisma
    .secretaryWhatsappMember
    .deleteMany({
      where: {
        id:
          memberId,

        agencyId:
          user.agencyId,
      },
    });


  revalidatePath(
    "/secretaria/configuracoes"
  );
}

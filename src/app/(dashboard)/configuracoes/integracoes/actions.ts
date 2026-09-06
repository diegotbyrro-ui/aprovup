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
  encryptGoogleToken,
  getGoogleCalendarSystemConfig,
} from "@/lib/googleCalendar";

import {
  encryptAiSecret,
  getAiProviderSystemConfig,
} from "@/lib/aiProviderCredentials";


async function requireDirector() {

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


  return user;
}


async function revokeRefreshToken(
  encryptedRefreshToken:
    string |
    null |
    undefined
) {

  if (!encryptedRefreshToken) {
    return;
  }


  try {

    const refreshToken =
      decryptGoogleToken(
        encryptedRefreshToken
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
}


export async function saveGoogleCalendarCredentialsAction(
  formData:
    FormData
) {

  const user =
    await requireDirector();


  const system =
    getGoogleCalendarSystemConfig();


  if (!system.ready) {

    redirect(
      "/configuracoes/integracoes?google=server-config"
    );
  }


  const clientId =
    String(
      formData.get(
        "googleClientId"
      ) ||
      ""
    ).trim();


  const clientSecret =
    String(
      formData.get(
        "googleClientSecret"
      ) ||
      ""
    ).trim();


  if (!clientId) {

    redirect(
      "/configuracoes/integracoes?google=credentials-required"
    );
  }


  const existing =
    await prisma.googleCalendarConnection.findUnique({
      where: {
        agencyId:
          user.agencyId,
      },
    });


  let encryptedClientSecret =
    existing?.encryptedClientSecret ||
    null;


  if (clientSecret) {

    encryptedClientSecret =
      encryptGoogleToken(
        clientSecret
      );
  }


  if (!encryptedClientSecret) {

    redirect(
      "/configuracoes/integracoes?google=credentials-required"
    );
  }


  /*
   * Sempre que as credenciais OAuth sao salvas novamente,
   * removemos a autorizacao anterior.
   * Assim nunca fica um refresh token associado
   * a outro Client ID/Secret.
   */
  await revokeRefreshToken(
    existing?.encryptedRefreshToken
  );


  await prisma.googleCalendarConnection.upsert({
    where: {
      agencyId:
        user.agencyId,
    },

    update: {
      googleClientId:
        clientId,

      encryptedClientSecret,

      googleAccountEmail:
        null,

      calendarId:
        "primary",

      encryptedRefreshToken:
        null,

      connectedAt:
        null,
    },

    create: {
      agencyId:
        user.agencyId,

      googleClientId:
        clientId,

      encryptedClientSecret,

      googleAccountEmail:
        null,

      calendarId:
        "primary",

      encryptedRefreshToken:
        null,

      connectedAt:
        null,
    },
  });


  await prisma.historyLog.create({
    data: {
      entityType:
        "AGENCY",

      entityId:
        user.agencyId,

      action:
        "GOOGLE_CALENDAR_CREDENTIALS_SAVED",

      description:
        "Credenciais OAuth do Google Calendar configuradas para a agencia.",

      authorName:
        user.name ||
        user.email ||
        "Diretoria",
    },
  }).catch(
    () =>
      null
  );


  revalidatePath(
    "/configuracoes/integracoes"
  );


  redirect(
    "/configuracoes/integracoes?google=credentials-saved"
  );
}


export async function disconnectGoogleCalendarAction() {

  const user =
    await requireDirector();


  const connection =
    await prisma.googleCalendarConnection.findUnique({
      where: {
        agencyId:
          user.agencyId,
      },
    });


  if (
    connection
  ) {

    await revokeRefreshToken(
      connection.encryptedRefreshToken
    );


    /*
     * Desconecta a conta,
     * mas preserva Client ID e Client Secret.
     * A agencia pode conectar novamente sem
     * redigitar as credenciais.
     */
    await prisma.googleCalendarConnection.update({
      where: {
        agencyId:
          user.agencyId,
      },

      data: {
        googleAccountEmail:
          null,

        encryptedRefreshToken:
          null,

        connectedAt:
          null,

        calendarId:
          "primary",
      },
    });
  }


  revalidatePath(
    "/configuracoes/integracoes"
  );


  redirect(
    "/configuracoes/integracoes?google=disconnected"
  );
}


export async function saveOpenAiCredentialsAction(
  formData:
    FormData
) {
  const user =
    await requireDirector();

  const system =
    getAiProviderSystemConfig();

  if (
    !system.ready
  ) {
    redirect(
      "/configuracoes/integracoes?ai=server-config"
    );
  }

  const apiKey =
    String(
      formData.get(
        "openAiApiKey"
      ) ||
      ""
    ).trim();

  const model =
    String(
      formData.get(
        "openAiModel"
      ) ||
      "gpt-5.6-luna"
    ).trim();

  const existing =
    await prisma
      .aiProviderConnection
      .findUnique({
        where: {
          agencyId:
            user.agencyId,
        },
      });

  let encryptedApiKey =
    existing
      ?.encryptedOpenAiApiKey ||
    null;

  if (
    apiKey
  ) {
    encryptedApiKey =
      encryptAiSecret(
        apiKey
      );
  }

  if (
    !encryptedApiKey
  ) {
    redirect(
      "/configuracoes/integracoes?ai=openai-key-required"
    );
  }

  await prisma
    .aiProviderConnection
    .upsert({
      where: {
        agencyId:
          user.agencyId,
      },

      update: {
        encryptedOpenAiApiKey:
          encryptedApiKey,

        openAiModel:
          model ||
          "gpt-5.6-luna",
      },

      create: {
        agencyId:
          user.agencyId,

        encryptedOpenAiApiKey:
          encryptedApiKey,

        openAiModel:
          model ||
          "gpt-5.6-luna",
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
          "OPENAI_CREDENTIALS_SAVED",

        description:
          "Credenciais OpenAI configuradas para a agencia.",

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
    "/configuracoes/integracoes"
  );

  redirect(
    "/configuracoes/integracoes?ai=openai-saved"
  );
}


export async function saveAnthropicCredentialsAction(
  formData:
    FormData
) {
  const user =
    await requireDirector();

  const system =
    getAiProviderSystemConfig();

  if (
    !system.ready
  ) {
    redirect(
      "/configuracoes/integracoes?ai=server-config"
    );
  }

  const apiKey =
    String(
      formData.get(
        "anthropicApiKey"
      ) ||
      ""
    ).trim();

  const model =
    String(
      formData.get(
        "anthropicModel"
      ) ||
      "claude-sonnet-4-6"
    ).trim();

  const existing =
    await prisma
      .aiProviderConnection
      .findUnique({
        where: {
          agencyId:
            user.agencyId,
        },
      });

  let encryptedApiKey =
    existing
      ?.encryptedAnthropicApiKey ||
    null;

  if (
    apiKey
  ) {
    encryptedApiKey =
      encryptAiSecret(
        apiKey
      );
  }

  if (
    !encryptedApiKey
  ) {
    redirect(
      "/configuracoes/integracoes?ai=anthropic-key-required"
    );
  }

  await prisma
    .aiProviderConnection
    .upsert({
      where: {
        agencyId:
          user.agencyId,
      },

      update: {
        encryptedAnthropicApiKey:
          encryptedApiKey,

        anthropicModel:
          model ||
          "claude-sonnet-4-6",
      },

      create: {
        agencyId:
          user.agencyId,

        encryptedAnthropicApiKey:
          encryptedApiKey,

        anthropicModel:
          model ||
          "claude-sonnet-4-6",
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
          "ANTHROPIC_CREDENTIALS_SAVED",

        description:
          "Credenciais Claude Anthropic configuradas para a agencia.",

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
    "/configuracoes/integracoes"
  );

  redirect(
    "/configuracoes/integracoes?ai=anthropic-saved"
  );
}

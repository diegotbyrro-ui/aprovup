import {
  prisma,
} from "@/lib/prisma";

import {
  getGoogleCalendarAccessTokenForAgency,
} from "@/lib/googleCalendar";

import {
  getAnthropicConfigForAgency,
  getOpenAiConfigForAgency,
} from "@/lib/aiProviderCredentials";


export type IntegrationHealthStatus =
  | "healthy"
  | "warning"
  | "error"
  | "inactive";


export type IntegrationHealthItem = {
  key:
    | "meta"
    | "google"
    | "openai"
    | "anthropic";

  name:
    string;

  status:
    IntegrationHealthStatus;

  summary:
    string;

  details:
    Array<{
      label:
        string;

      value:
        string;
    }>;

  actionHref?:
    string;

  actionLabel?:
    string;
};


export type IntegrationHealthSummary = {
  overall:
    "healthy" |
    "warning" |
    "error";

  checkedAt:
    Date;

  items:
    IntegrationHealthItem[];
};


function getGraphVersion() {
  return String(
    process.env
      .META_GRAPH_VERSION ||
    "v26.0"
  ).trim();
}


function readGraphVersionNumber(
  value:
    string
) {
  const match =
    value.match(
      /v?(\d+)\.0/i
    );

  if (!match) {
    return null;
  }

  const parsed =
    Number(
      match[1]
    );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
}


async function detectLatestMetaVersion(
  currentVersion:
    string
) {
  const currentNumber =
    readGraphVersionNumber(
      currentVersion
    );

  if (
    currentNumber ===
    null
  ) {
    return null;
  }

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      6500
    );

  try {
    const response =
      await fetch(
        "https://developers.facebook.com/docs/graph-api/changelog/",
        {
          cache:
            "no-store",

          signal:
            controller.signal,

          headers: {
            "User-Agent":
              "AprovUp-Integration-Monitor/1.0",
          },
        }
      );

    if (
      !response.ok
    ) {
      return null;
    }

    const html =
      await response.text();

    const candidates =
      Array.from(
        html.matchAll(
          /\bv(\d+)\.0\b/gi
        )
      )
        .map(
          (match) =>
            Number(
              match[1]
            )
        )
        .filter(
          (number) =>
            Number.isFinite(
              number
            ) &&
            number >=
              currentNumber &&
            number <=
              currentNumber +
                5
        );

    if (
      candidates.length ===
      0
    ) {
      return null;
    }

    const latest =
      Math.max(
        ...candidates
      );

    return `v${latest}.0`;
  }
  catch {
    return null;
  }
  finally {
    clearTimeout(
      timeout
    );
  }
}


async function getMetaHealth(
  agencyId:
    string,
  live:
    boolean
): Promise<
  IntegrationHealthItem
> {
  const graphVersion =
    getGraphVersion();

  const appIdConfigured =
    Boolean(
      String(
        process.env
          .META_APP_ID ||
        ""
      ).trim()
    );

  const appSecretConfigured =
    Boolean(
      String(
        process.env
          .META_APP_SECRET ||
        ""
      ).trim()
    );

  const encryptionConfigured =
    Boolean(
      String(
        process.env
          .META_TOKEN_ENCRYPTION_KEY ||
        ""
      ).trim()
    );

  const businessLoginConfigured =
    Boolean(
      String(
        process.env
          .META_FACEBOOK_LOGIN_CONFIG_ID ||
        ""
      ).trim()
    );

  const technicalReady =
    appIdConfigured &&
    appSecretConfigured &&
    encryptionConfigured &&
    businessLoginConfigured;

  try {
    const now =
      new Date();

    const twentyFourHoursAgo =
      new Date(
        now.getTime() -
          24 *
            60 *
            60 *
            1000
      );

    const sevenDaysFromNow =
      new Date(
        now.getTime() +
          7 *
            24 *
            60 *
            60 *
            1000
      );

    const [
      activeConnections,
      expiringTokens,
      recentPublicationErrors,
      latestDetectedVersion,
    ] =
      await Promise.all([
        prisma
          .instagramConnection
          .count({
            where: {
              status:
                "ATIVO",

              client: {
                agencyId,
              },
            },
          }),

        prisma
          .instagramConnection
          .count({
            where: {
              status:
                "ATIVO",

              tokenExpiresAt: {
                not:
                  null,

                lte:
                  sevenDaysFromNow,
              },

              client: {
                agencyId,
              },
            },
          }),

        prisma
          .instagramPublication
          .count({
            where: {
              status:
                "ERRO",

              lastAttemptAt: {
                gte:
                  twentyFourHoursAgo,
              },

              content: {
                client: {
                  agencyId,
                },
              },
            },
          }),

        live
          ? detectLatestMetaVersion(
              graphVersion
            )
          : Promise.resolve(
              null
            ),
      ]);

    const currentVersionNumber =
      readGraphVersionNumber(
        graphVersion
      );

    const detectedVersionNumber =
      latestDetectedVersion
        ? readGraphVersionNumber(
            latestDetectedVersion
          )
        : null;

    const updateDetected =
      currentVersionNumber !==
        null &&
      detectedVersionNumber !==
        null &&
      detectedVersionNumber >
        currentVersionNumber;

    let status:
      IntegrationHealthStatus =
        "healthy";

    let summary =
      "Meta configurada e sem falhas operacionais recentes.";

    if (
      !technicalReady
    ) {
      status =
        "error";

      summary =
        "A configuracao tecnica da Meta esta incompleta.";
    }
    else if (
      recentPublicationErrors >
        0
    ) {
      status =
        "warning";

      summary =
        `${recentPublicationErrors} publicacao(oes) com erro nas ultimas 24 horas.`;
    }
    else if (
      expiringTokens >
        0
    ) {
      status =
        "warning";

      summary =
        `${expiringTokens} conexao(oes) com token proximo do vencimento.`;
    }
    else if (
      updateDetected
    ) {
      status =
        "warning";

      summary =
        `Nova versao da Graph API detectada: ${latestDetectedVersion}.`;
    }

    return {
      key:
        "meta",

      name:
        "Meta / Instagram",

      status,

      summary,

      details: [
        {
          label:
            "Graph API em uso",

          value:
            graphVersion,
        },

        {
          label:
            "Versao mais recente detectada",

          value:
            latestDetectedVersion ||
            "Sem nova versao detectada",
        },

        {
          label:
            "Conexoes Instagram ativas",

          value:
            String(
              activeConnections
            ),
        },

        {
          label:
            "Erros de publicacao em 24h",

          value:
            String(
              recentPublicationErrors
            ),
        },

        {
          label:
            "Tokens vencendo em ate 7 dias",

          value:
            String(
              expiringTokens
            ),
        },

        {
          label:
            "Facebook Login for Business",

          value:
            businessLoginConfigured
              ? "Configurado"
              : "Pendente",
        },
      ],

      actionHref:
        "https://developers.facebook.com/docs/graph-api/changelog/",

      actionLabel:
        "Abrir changelog da Meta",
    };
  }
  catch {
    return {
      key:
        "meta",

      name:
        "Meta / Instagram",

      status:
        technicalReady
          ? "warning"
          : "error",

      summary:
        "Nao foi possivel concluir o diagnostico da integracao Meta.",

      details: [
        {
          label:
            "Graph API em uso",

          value:
            graphVersion,
        },

        {
          label:
            "Configuracao tecnica",

          value:
            technicalReady
              ? "Configurada"
              : "Incompleta",
        },
      ],

      actionHref:
        "https://developers.facebook.com/docs/graph-api/changelog/",

      actionLabel:
        "Abrir changelog da Meta",
    };
  }
}


async function getGoogleHealth(
  agencyId:
    string,
  live:
    boolean
): Promise<
  IntegrationHealthItem
> {
  try {
    const connection =
      await prisma
        .googleCalendarConnection
        .findUnique({
          where: {
            agencyId,
          },
        });

    if (
      !connection ||
      !connection
        .googleClientId ||
      !connection
        .encryptedClientSecret
    ) {
      return {
        key:
          "google",

        name:
          "Google Calendar",

        status:
          "inactive",

        summary:
          "Google Calendar ainda nao foi configurado para esta agencia.",

        details: [
          {
            label:
              "Credenciais OAuth",

            value:
              "Nao configuradas",
          },

          {
            label:
              "Conta conectada",

            value:
              "Nenhuma",
          },
        ],
      };
    }

    if (
      !connection
        .encryptedRefreshToken ||
      !connection
        .connectedAt
    ) {
      return {
        key:
          "google",

        name:
          "Google Calendar",

        status:
          "inactive",

        summary:
          "Credenciais salvas, aguardando conexao da conta Google.",

        details: [
          {
            label:
              "Credenciais OAuth",

            value:
              "Configuradas",
          },

          {
            label:
              "Conta conectada",

            value:
              "Ainda nao",
          },
        ],
      };
    }

    if (
      !live
    ) {
      return {
        key:
          "google",

        name:
          "Google Calendar",

        status:
          "healthy",

        summary:
          "Google Calendar conectado.",

        details: [
          {
            label:
              "Conta",

            value:
              connection
                .googleAccountEmail ||
              "Conta Google conectada",
          },

          {
            label:
              "Calendario",

            value:
              connection
                .calendarId ||
              "primary",
          },
        ],
      };
    }

    const auth =
      await getGoogleCalendarAccessTokenForAgency(
        agencyId
      );

    if (
      !auth
    ) {
      throw new Error(
        "Token Google indisponivel."
      );
    }

    return {
      key:
        "google",

      name:
        "Google Calendar",

      status:
        "healthy",

      summary:
        "Autorizacao Google validada com sucesso.",

      details: [
        {
          label:
            "Conta",

          value:
            auth.googleAccountEmail ||
            connection
              .googleAccountEmail ||
            "Conta Google conectada",
        },

        {
          label:
            "Calendario",

          value:
            auth.calendarId ||
            "primary",
        },

        {
          label:
            "Refresh token",

          value:
            "Valido",
        },
      ],
    };
  }
  catch {
    return {
      key:
        "google",

      name:
        "Google Calendar",

      status:
        "error",

      summary:
        "A autorizacao do Google Calendar precisa de atencao.",

      details: [
        {
          label:
            "Teste de autenticacao",

          value:
            "Falhou",
        },
      ],
    };
  }
}


async function getOpenAiHealth(
  agencyId:
    string,
  live:
    boolean
): Promise<
  IntegrationHealthItem
> {
  const config =
    await getOpenAiConfigForAgency(
      agencyId
    );

  const apiKey =
    config.apiKey ||
    "";

  const model =
    config.model;

  if (
    !apiKey
  ) {
    return {
      key:
        "openai",

      name:
        "IA / OpenAI",

      status:
        "inactive",

      summary:
        "A IA Comercial esta sem OPENAI_API_KEY configurada.",

      details: [
        {
          label:
            "Modelo do CRM",

          value:
            model,
        },

        {
          label:
            "API Key",

          value:
            "Nao configurada",
        },
      ],

      actionHref:
        "https://developers.openai.com/api/docs/models",

      actionLabel:
        "Ver modelos da OpenAI",
    };
  }

  if (
    !live
  ) {
    return {
      key:
        "openai",

      name:
        "IA / OpenAI",

      status:
        "healthy",

      summary:
        "Chave da OpenAI configurada para a IA Comercial.",

      details: [
        {
          label:
            "Modelo do CRM",

          value:
            model,
        },

        {
          label:
            "API Key",

          value:
            "Configurada",
        },
      ],

      actionHref:
        "https://developers.openai.com/api/docs/models",

      actionLabel:
        "Ver modelos da OpenAI",
    };
  }

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      8000
    );

  try {
    const response =
      await fetch(
        `https://api.openai.com/v1/models/${encodeURIComponent(
          model
        )}`,
        {
          method:
            "GET",

          cache:
            "no-store",

          signal:
            controller.signal,

          headers: {
            Authorization:
              `Bearer ${apiKey}`,
          },
        }
      );

    const payload =
      await response.json() as {
        id?:
          string;

        owned_by?:
          string;

        shutdown_date?:
          string |
          null;

        error?: {
          message?:
            string;
        };
      };

    if (
      !response.ok
    ) {
      return {
        key:
          "openai",

        name:
          "IA / OpenAI",

        status:
          "error",

        summary:
          payload
            .error
            ?.message ||
          "A OpenAI recusou o teste da integracao.",

        details: [
          {
            label:
              "Modelo do CRM",

            value:
              model,
          },

          {
            label:
              "API Key",

            value:
              "Configurada, mas o teste falhou",
          },
        ],

        actionHref:
          "https://developers.openai.com/api/docs/models",

        actionLabel:
          "Ver modelos da OpenAI",
      };
    }

    let status:
      IntegrationHealthStatus =
        "healthy";

    let summary =
      "OpenAI respondendo normalmente para o modelo usado pelo CRM.";

    let shutdownText =
      "Nenhum desligamento anunciado";

    if (
      payload
        .shutdown_date
    ) {
      shutdownText =
        payload
          .shutdown_date;

      const shutdownAt =
        Date.parse(
          payload
            .shutdown_date
        );

      if (
        Number.isFinite(
          shutdownAt
        )
      ) {
        const daysRemaining =
          Math.ceil(
            (
              shutdownAt -
              Date.now()
            ) /
            (
              24 *
              60 *
              60 *
              1000
            )
          );

        if (
          daysRemaining <=
            0
        ) {
          status =
            "error";

          summary =
            "O modelo configurado possui data de desligamento vencida.";
        }
        else if (
          daysRemaining <=
            90
        ) {
          status =
            "warning";

          summary =
            `O modelo da IA possui desligamento anunciado em ${daysRemaining} dia(s).`;
        }
      }
    }

    return {
      key:
        "openai",

      name:
        "IA / OpenAI",

      status,

      summary,

      details: [
        {
          label:
            "Modelo do CRM",

          value:
            payload.id ||
            model,
        },

        {
          label:
            "API Key",

          value:
            "Valida",
        },

        {
          label:
            "Desligamento anunciado",

          value:
            shutdownText,
        },
      ],

      actionHref:
        "https://developers.openai.com/api/docs/models",

      actionLabel:
        "Ver modelos da OpenAI",
    };
  }
  catch {
    return {
      key:
        "openai",

      name:
        "IA / OpenAI",

      status:
        "error",

      summary:
        "Nao foi possivel validar a conexao com a OpenAI.",

      details: [
        {
          label:
            "Modelo do CRM",

          value:
            model,
        },

        {
          label:
            "API Key",

          value:
            "Configurada",
        },
      ],

      actionHref:
        "https://status.openai.com/",

      actionLabel:
        "Ver status da OpenAI",
    };
  }
  finally {
    clearTimeout(
      timeout
    );
  }
}


async function getAnthropicHealth(
  agencyId:
    string,
  live:
    boolean
): Promise<
  IntegrationHealthItem
> {
  const config =
    await getAnthropicConfigForAgency(
      agencyId
    );

  const apiKey =
    config.apiKey ||
    "";

  const model =
    config.model;

  if (
    !apiKey
  ) {
    return {
      key:
        "anthropic",

      name:
        "IA / Claude",

      status:
        "inactive",

      summary:
        "Claude ainda nao possui uma API Key configurada no AprovUp.",

      details: [
        {
          label:
            "Modelo configurado",

          value:
            model,
        },

        {
          label:
            "API Key",

          value:
            "Nao configurada",
        },
      ],

      actionHref:
        "https://platform.claude.com/docs/en/api/models",

      actionLabel:
        "Ver modelos do Claude",
    };
  }

  if (
    !live
  ) {
    return {
      key:
        "anthropic",

      name:
        "IA / Claude",

      status:
        "healthy",

      summary:
        "Chave da Anthropic configurada.",

      details: [
        {
          label:
            "Modelo configurado",

          value:
            model,
        },

        {
          label:
            "API Key",

          value:
            "Configurada",
        },
      ],

      actionHref:
        "https://platform.claude.com/docs/en/api/models",

      actionLabel:
        "Ver modelos do Claude",
    };
  }

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      8000
    );

  try {
    const response =
      await fetch(
        `https://api.anthropic.com/v1/models/${encodeURIComponent(
          model
        )}`,
        {
          method:
            "GET",

          cache:
            "no-store",

          signal:
            controller.signal,

          headers: {
            "x-api-key":
              apiKey,

            "anthropic-version":
              "2023-06-01",
          },
        }
      );

    const payload =
      await response.json() as {
        id?:
          string;

        display_name?:
          string;

        created_at?:
          string;

        type?:
          string;

        error?: {
          type?:
            string;

          message?:
            string;
        };
      };

    if (
      !response.ok
    ) {
      return {
        key:
          "anthropic",

        name:
          "IA / Claude",

        status:
          "error",

        summary:
          payload
            .error
            ?.message ||
          "A Anthropic recusou o teste da integracao.",

        details: [
          {
            label:
              "Modelo configurado",

            value:
              model,
          },

          {
            label:
              "API Key",

            value:
              "Configurada, mas o teste falhou",
          },

          {
            label:
              "HTTP",

            value:
              String(
                response.status
              ),
          },
        ],

        actionHref:
          "https://status.anthropic.com/",

        actionLabel:
          "Ver status da Anthropic",
      };
    }

    return {
      key:
        "anthropic",

      name:
        "IA / Claude",

      status:
        "healthy",

      summary:
        "Anthropic respondendo normalmente e o modelo configurado esta disponivel.",

      details: [
        {
          label:
            "Modelo",

          value:
            payload.id ||
            model,
        },

        {
          label:
            "Nome",

          value:
            payload.display_name ||
            "Claude",
        },

        {
          label:
            "API Key",

          value:
            "Valida",
        },

        {
          label:
            "API",

          value:
            "Anthropic v1",
        },
      ],

      actionHref:
        "https://docs.anthropic.com/en/docs/about-claude/model-deprecations",

      actionLabel:
        "Ver ciclo de vida dos modelos",
    };
  }
  catch {
    return {
      key:
        "anthropic",

      name:
        "IA / Claude",

      status:
        "error",

      summary:
        "Nao foi possivel validar a conexao com a Anthropic.",

      details: [
        {
          label:
            "Modelo configurado",

          value:
            model,
        },

        {
          label:
            "API Key",

          value:
            "Configurada",
        },
      ],

      actionHref:
        "https://status.anthropic.com/",

      actionLabel:
        "Ver status da Anthropic",
    };
  }
  finally {
    clearTimeout(
      timeout
    );
  }
}


export async function getIntegrationHealthSummary(
  agencyId:
    string,
  live =
    true,
  includeMeta =
    true
): Promise<
  IntegrationHealthSummary
> {
  const checks:
    Array<
      Promise<
        IntegrationHealthItem
      >
    > =
      [];


  if (
    includeMeta
  ) {
    checks.push(
      getMetaHealth(
        agencyId,
        live
      )
    );
  }


  checks.push(
    getGoogleHealth(
      agencyId,
      live
    ),

    getOpenAiHealth(
      agencyId,
      live
    ),

    getAnthropicHealth(
      agencyId,
      live
    )
  );


  const items =
    await Promise.all(
      checks
    );

  const hasError =
    items.some(
      (item) =>
        item.status ===
        "error"
    );

  const hasWarning =
    items.some(
      (item) =>
        item.status ===
        "warning"
    );

  return {
    overall:
      hasError
        ? "error"
        : hasWarning
          ? "warning"
          : "healthy",

    checkedAt:
      new Date(),

    items,
  };
}


export async function getDirectorIntegrationAlerts(
  agencyId:
    string,
  includeGlobalMetaStatus =
    false
) {
  const alerts:
    string[] =
      [];

  if (
    includeGlobalMetaStatus
  ) {
    const metaReady =
      Boolean(
        process.env
          .META_APP_ID &&
        process.env
          .META_APP_SECRET &&
        process.env
          .META_TOKEN_ENCRYPTION_KEY &&
        process.env
          .META_FACEBOOK_LOGIN_CONFIG_ID
      );

    if (
      !metaReady
    ) {
      alerts.push(
        "Configuracao da Meta incompleta"
      );
    }
  }

  const [
    openAiConfig,
    anthropicConfig,
  ] =
    await Promise.all([
      getOpenAiConfigForAgency(
        agencyId
      ),

      getAnthropicConfigForAgency(
        agencyId
      ),
    ]);

  if (
    !openAiConfig.apiKey &&
    !anthropicConfig.apiKey
  ) {
    alerts.push(
      "IA Comercial sem provedor configurado"
    );
  }

  try {
    const since =
      new Date(
        Date.now() -
          24 *
            60 *
            60 *
            1000
      );

    const publicationErrors =
      await prisma
        .instagramPublication
        .count({
          where: {
            status:
              "ERRO",

            lastAttemptAt: {
              gte:
                since,
            },

            content: {
              client: {
                agencyId,
              },
            },
          },
        });

    if (
      publicationErrors >
        0
    ) {
      alerts.push(
        `${publicationErrors} erro(s) de publicacao Meta nas ultimas 24h`
      );
    }
  }
  catch {
    // O monitor nunca deve derrubar o AprovUp.
  }

  return alerts;
}
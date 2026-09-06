import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

import {
  prisma,
} from "@/lib/prisma";


export function getAiProviderSystemConfig() {
  const encryptionSecret =
    String(
      process.env
        .APROVUP_INTEGRATION_ENCRYPTION_KEY ||
      ""
    ).trim();

  return {
    encryptionSecret,

    ready:
      Boolean(
        encryptionSecret
      ),
  };
}


function getEncryptionKey() {
  const {
    encryptionSecret,
  } =
    getAiProviderSystemConfig();

  if (
    !encryptionSecret
  ) {
    throw new Error(
      "APROVUP_INTEGRATION_ENCRYPTION_KEY nao configurada."
    );
  }

  return createHash(
    "sha256"
  )
    .update(
      encryptionSecret
    )
    .digest();
}


export function encryptAiSecret(
  value:
    string
) {
  const key =
    getEncryptionKey();

  const iv =
    randomBytes(12);

  const cipher =
    createCipheriv(
      "aes-256-gcm",
      key,
      iv
    );

  const encrypted =
    Buffer.concat([
      cipher.update(
        value,
        "utf8"
      ),

      cipher.final(),
    ]);

  const authTag =
    cipher.getAuthTag();

  return [
    "v1",

    iv.toString(
      "base64url"
    ),

    authTag.toString(
      "base64url"
    ),

    encrypted.toString(
      "base64url"
    ),
  ].join(".");
}


export function decryptAiSecret(
  value:
    string
) {
  const [
    version,
    ivText,
    tagText,
    encryptedText,
  ] =
    value.split(".");

  if (
    version !== "v1" ||
    !ivText ||
    !tagText ||
    !encryptedText
  ) {
    throw new Error(
      "Segredo de IA invalido."
    );
  }

  const key =
    getEncryptionKey();

  const decipher =
    createDecipheriv(
      "aes-256-gcm",
      key,

      Buffer.from(
        ivText,
        "base64url"
      )
    );

  decipher.setAuthTag(
    Buffer.from(
      tagText,
      "base64url"
    )
  );

  return Buffer.concat([
    decipher.update(
      Buffer.from(
        encryptedText,
        "base64url"
      )
    ),

    decipher.final(),
  ]).toString(
    "utf8"
  );
}


async function getConnection(
  agencyId:
    string
) {
  return prisma
    .aiProviderConnection
    .findUnique({
      where: {
        agencyId,
      },
    });
}


export async function getOpenAiConfigForAgency(
  agencyId:
    string
) {
  const connection =
    await getConnection(
      agencyId
    );

  let storedApiKey:
    string |
    null =
      null;

  if (
    connection
      ?.encryptedOpenAiApiKey
  ) {
    try {
      storedApiKey =
        decryptAiSecret(
          connection
            .encryptedOpenAiApiKey
        );
    }
    catch {
      storedApiKey =
        null;
    }
  }

  const environmentApiKey =
    String(
      process.env
        .OPENAI_API_KEY ||
      ""
    ).trim();

  return {
    apiKey:
      storedApiKey ||
      environmentApiKey ||
      null,

    model:
      connection
        ?.openAiModel
        ?.trim() ||
      String(
        process.env
          .OPENAI_MODEL ||
        "gpt-5.6-luna"
      ).trim(),

    source:
      storedApiKey
        ? "agency"
        : environmentApiKey
          ? "environment"
          : "none",
  } as const;
}


export async function getAnthropicConfigForAgency(
  agencyId:
    string
) {
  const connection =
    await getConnection(
      agencyId
    );

  let storedApiKey:
    string |
    null =
      null;

  if (
    connection
      ?.encryptedAnthropicApiKey
  ) {
    try {
      storedApiKey =
        decryptAiSecret(
          connection
            .encryptedAnthropicApiKey
        );
    }
    catch {
      storedApiKey =
        null;
    }
  }

  const environmentApiKey =
    String(
      process.env
        .ANTHROPIC_API_KEY ||
      ""
    ).trim();

  return {
    apiKey:
      storedApiKey ||
      environmentApiKey ||
      null,

    model:
      connection
        ?.anthropicModel
        ?.trim() ||
      String(
        process.env
          .ANTHROPIC_MODEL ||
        "claude-sonnet-4-6"
      ).trim(),

    source:
      storedApiKey
        ? "agency"
        : environmentApiKey
          ? "environment"
          : "none",
  } as const;
}

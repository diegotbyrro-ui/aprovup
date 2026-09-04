import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

import {
  prisma,
} from "@/lib/prisma";


export const GOOGLE_CALENDAR_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events",
];


export function getGoogleCalendarSystemConfig() {

  const encryptionSecret =
    String(
      process.env.APROVUP_INTEGRATION_ENCRYPTION_KEY ||
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
    getGoogleCalendarSystemConfig();


  if (!encryptionSecret) {

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


export function encryptGoogleToken(
  value: string
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


export function decryptGoogleToken(
  value: string
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
      "Segredo Google invalido."
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


export async function getAgencyGoogleOAuthCredentials(
  agencyId: string
) {

  const connection =
    await prisma.googleCalendarConnection.findUnique({
      where: {
        agencyId,
      },

      select: {
        googleClientId:
          true,

        encryptedClientSecret:
          true,
      },
    });


  if (
    !connection?.googleClientId ||
    !connection.encryptedClientSecret
  ) {

    return null;
  }


  return {
    clientId:
      connection.googleClientId,

    clientSecret:
      decryptGoogleToken(
        connection.encryptedClientSecret
      ),
  };
}


export async function getGoogleCalendarAccessTokenForAgency(
  agencyId: string
) {

  const connection =
    await prisma.googleCalendarConnection.findUnique({
      where: {
        agencyId,
      },
    });


  if (
    !connection ||
    !connection.googleClientId ||
    !connection.encryptedClientSecret ||
    !connection.encryptedRefreshToken
  ) {

    return null;
  }


  const clientSecret =
    decryptGoogleToken(
      connection.encryptedClientSecret
    );


  const refreshToken =
    decryptGoogleToken(
      connection.encryptedRefreshToken
    );


  const response =
    await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },

        body:
          new URLSearchParams({
            client_id:
              connection.googleClientId,

            client_secret:
              clientSecret,

            refresh_token:
              refreshToken,

            grant_type:
              "refresh_token",
          }),
      }
    );


  const data =
    await response.json() as {
      access_token?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
    };


  if (
    !response.ok ||
    !data.access_token
  ) {

    throw new Error(
      `Falha ao renovar Google Calendar: ${
        data.error_description ||
        data.error ||
        response.status
      }`
    );
  }


  return {
    accessToken:
      data.access_token,

    calendarId:
      connection.calendarId ||
      "primary",

    googleAccountEmail:
      connection.googleAccountEmail,
  };
}


type CreateGoogleCalendarEventInput = {
  agencyId: string;

  title: string;

  description?: string;

  location?: string;

  startDate: Date;

  endDate: Date;
};


export async function createGoogleCalendarEvent({
  agencyId,
  title,
  description,
  location,
  startDate,
  endDate,
}: CreateGoogleCalendarEventInput) {

  const auth =
    await getGoogleCalendarAccessTokenForAgency(
      agencyId
    );


  if (!auth) {

    console.log(
      `[GOOGLE CALENDAR] Agencia ${agencyId} sem Calendar conectado.`
    );

    return null;
  }


  const calendarId =
    encodeURIComponent(
      auth.calendarId
    );


  const response =
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${auth.accessToken}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            summary:
              title,

            description:
              description ||
              "",

            location:
              location ||
              "",

            start: {
              dateTime:
                startDate.toISOString(),

              timeZone:
                "America/Maceio",
            },

            end: {
              dateTime:
                endDate.toISOString(),

              timeZone:
                "America/Maceio",
            },

            reminders: {
              useDefault:
                true,
            },
          }),
      }
    );


  const result =
    await response.json() as {
      id?: string;
      htmlLink?: string;

      error?: {
        message?: string;
      };
    };


  if (!response.ok) {

    throw new Error(
      `Google Calendar recusou o evento: ${
        result.error?.message ||
        response.status
      }`
    );
  }


  return result;
}
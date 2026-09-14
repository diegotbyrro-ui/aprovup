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


type SecretaryCalendarEvent = {
  id: string;
  summary: string;
  description: string;
  location: string;
  start: string | null;
  end: string | null;
  created: string | null;
  updated: string | null;
  htmlLink: string | null;
};

function normalizeCalendarText(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export async function findGoogleCalendarEvents({
  agencyId,
  query,
  timeMin,
  timeMax,
}: {
  agencyId: string;
  query: string;
  timeMin: Date;
  timeMax: Date;
}): Promise<SecretaryCalendarEvent[]> {
  const auth = await getGoogleCalendarAccessTokenForAgency(agencyId);
  if (!auth) return [];

  // O TypeScript nao preserva o narrowing de auth
  // dentro de uma funcao interna assincrona. Copiamos
  // os valores ja validados para constantes nao anulaveis.
  const calendarId =
    auth.calendarId;

  const accessToken =
    auth.accessToken;

  async function load(q: string) {
    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '80',
    });
    if (q.trim()) params.set('q', q.trim());

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/' +
        encodeURIComponent(calendarId) + '/events?' + params.toString(),
      { headers: { Authorization: 'Bearer ' + accessToken } }
    );
    const payload = await response.json() as {
      items?: Array<{
        id?: string;
        summary?: string;
        description?: string;
        location?: string;
        htmlLink?: string;
        status?: string;
        created?: string;
        updated?: string;
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
      }>;
      error?: { message?: string };
    };
    if (!response.ok) throw new Error(payload.error?.message || 'Erro ao consultar Google Agenda.');

    return (payload.items || [])
      .filter((item) => item.status !== 'cancelled' && Boolean(item.id))
      .map((item) => ({
        id: item.id || '',
        summary: item.summary || 'Sem título',
        description: item.description || '',
        location: item.location || '',
        start: item.start?.dateTime || item.start?.date || null,
        end: item.end?.dateTime || item.end?.date || null,
        created: item.created || null,
        updated: item.updated || null,
        htmlLink: item.htmlLink || null,
      }));
  }

  const direct = await load(query);
  if (direct.length > 0 || !query.trim()) return direct;

  const all = await load('');
  const tokens = normalizeCalendarText(query).split(' ').filter((token) => token.length >= 4);
  if (!tokens.length) return [];
  return all.filter((event) => {
    const title = normalizeCalendarText(event.summary);
    return tokens.some((token) => title.includes(token));
  });
}

export async function updateGoogleCalendarEvent({
  agencyId,
  eventId,
  title,
  description,
  location,
  startDate,
  endDate,
}: {
  agencyId: string;
  eventId: string;
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
}) {
  const auth = await getGoogleCalendarAccessTokenForAgency(agencyId);
  if (!auth) return null;

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/' +
      encodeURIComponent(auth.calendarId) + '/events/' + encodeURIComponent(eventId),
    {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer ' + auth.accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: title,
        description: description || '',
        location: location || '',
        start: { dateTime: startDate.toISOString(), timeZone: 'America/Maceio' },
        end: { dateTime: endDate.toISOString(), timeZone: 'America/Maceio' },
      }),
    }
  );
  const result = await response.json() as { id?: string; htmlLink?: string; error?: { message?: string } };
  if (!response.ok) throw new Error('Google Calendar recusou a alteração: ' + (result.error?.message || response.status));
  return result;
}

type EnsureWeeklyMeetingResult = {
  created: boolean;
  eventId: string | null;
  htmlLink: string | null;
  start: string | null;
};

function maceioDatePartsNow() {
  const parts = new Intl.DateTimeFormat(
    'en-US',
    {
      timeZone: 'America/Maceio',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }
  ).formatToParts(new Date());

  const map = new Map(
    parts.map((item) => [item.type, item.value])
  );

  return {
    year: Number(map.get('year') || 0),
    month: Number(map.get('month') || 0),
    day: Number(map.get('day') || 0),
    hour: Number(map.get('hour') || 0),
    minute: Number(map.get('minute') || 0),
  };
}

export async function ensureWeeklyAgencyMeeting(
  agencyId: string
): Promise<EnsureWeeklyMeetingResult> {
  const auth =
    await getGoogleCalendarAccessTokenForAgency(
      agencyId
    );

  if (!auth) {
    return {
      created: false,
      eventId: null,
      htmlLink: null,
      start: null,
    };
  }

  const now =
    new Date();

  const existing =
    await findGoogleCalendarEvents({
      agencyId,
      query:
        'Reunião semanal Level UP',
      timeMin:
        new Date(
          now.getTime() -
            24 *
              60 *
              60 *
              1000
        ),
      timeMax:
        new Date(
          now.getTime() +
            120 *
              24 *
              60 *
              60 *
              1000
        ),
    });

  const match =
    existing.find(
      (
        item
      ) =>
        normalizeCalendarText(
          item.summary
        ).includes(
          'reuniao semanal level up'
        )
    );

  if (match) {
    return {
      created: false,
      eventId: match.id,
      htmlLink: match.htmlLink,
      start: match.start,
    };
  }

  const local =
    maceioDatePartsNow();

  const todayUtc =
    new Date(
      Date.UTC(
        local.year,
        local.month - 1,
        local.day
      )
    );

  const weekday =
    todayUtc.getUTCDay();

  let daysUntilMonday =
    (
      1 -
      weekday +
      7
    ) %
    7;

  if (
    daysUntilMonday === 0 &&
    (
      local.hour > 9 ||
      (
        local.hour === 9 &&
        local.minute >= 0
      )
    )
  ) {
    daysUntilMonday =
      7;
  }

  const target =
    new Date(
      Date.UTC(
        local.year,
        local.month - 1,
        local.day +
          daysUntilMonday
      )
    );

  const dateKey =
    target
      .toISOString()
      .slice(
        0,
        10
      );

  const startText =
    dateKey +
    'T09:00:00-03:00';

  const endText =
    dateKey +
    'T10:00:00-03:00';

  const response =
    await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/' +
        encodeURIComponent(
          auth.calendarId
        ) +
        '/events',
      {
        method:
          'POST',

        headers: {
          Authorization:
            'Bearer ' +
            auth.accessToken,

          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify({
            summary:
              'Reunião semanal Level UP - Equipe',

            description:
              'Reunião semanal da equipe Level UP Marketing Digital.',

            start: {
              dateTime:
                startText,

              timeZone:
                'America/Maceio',
            },

            end: {
              dateTime:
                endText,

              timeZone:
                'America/Maceio',
            },

            recurrence: [
              'RRULE:FREQ=WEEKLY;BYDAY=MO',
            ],

            reminders: {
              useDefault:
                true,
            },
          }),
      }
    );

  const payload =
    await response.json() as {
      id?: string;
      htmlLink?: string;
      error?: {
        message?: string;
      };
    };

  if (!response.ok) {
    throw new Error(
      'Google Calendar recusou a reunião semanal: ' +
        (
          payload.error?.message ||
          response.status
        )
    );
  }

  return {
    created: true,
    eventId:
      payload.id ||
      null,
    htmlLink:
      payload.htmlLink ||
      null,
    start:
      startText,
  };
}

import {
  timingSafeEqual,
} from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getCurrentUser,
} from "@/lib/auth";

import {
  prisma,
} from "@/lib/prisma";

import {
  encryptGoogleToken,
  getAgencyGoogleOAuthCredentials,
  getGoogleCalendarSystemConfig,
} from "@/lib/googleCalendar";


function appOrigin(
  request:
    NextRequest
) {

  return String(
    process.env.APP_ORIGIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    request.nextUrl.origin
  ).replace(
    /\/$/,
    ""
  );
}


function sameState(
  first:
    string,

  second:
    string
) {

  const a =
    Buffer.from(
      first
    );


  const b =
    Buffer.from(
      second
    );


  if (
    a.length !==
    b.length
  ) {

    return false;
  }


  return timingSafeEqual(
    a,
    b
  );
}


export async function GET(
  request:
    NextRequest
) {

  const user =
    await getCurrentUser();


  if (
    !user ||
    user.status !==
      "APROVADO" ||
    user.role !==
      "DIRECTOR" ||
    !user.agencyId
  ) {

    return NextResponse.redirect(
      new URL(
        "/acesso-bloqueado",
        request.url
      )
    );
  }


  const system =
    getGoogleCalendarSystemConfig();


  if (!system.ready) {

    return NextResponse.redirect(
      new URL(
        "/configuracoes/integracoes?google=server-config",
        request.url
      )
    );
  }


  const credentials =
    await getAgencyGoogleOAuthCredentials(
      user.agencyId
    );


  if (!credentials) {

    return NextResponse.redirect(
      new URL(
        "/configuracoes/integracoes?google=credentials-required",
        request.url
      )
    );
  }


  const url =
    new URL(
      request.url
    );


  const code =
    String(
      url.searchParams.get(
        "code"
      ) ||
      ""
    );


  const state =
    String(
      url.searchParams.get(
        "state"
      ) ||
      ""
    );


  const savedState =
    String(
      request.cookies.get(
        "aprovup_google_calendar_state"
      )?.value ||
      ""
    );


  if (
    !code ||
    !state ||
    !savedState ||
    !sameState(
      state,
      savedState
    )
  ) {

    return NextResponse.redirect(
      new URL(
        "/configuracoes/integracoes?google=state",
        request.url
      )
    );
  }


  const redirectUri =
    `${appOrigin(
      request
    )}/api/integrations/google-calendar/callback`;


  const tokenResponse =
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
            code,

            client_id:
              credentials.clientId,

            client_secret:
              credentials.clientSecret,

            redirect_uri:
              redirectUri,

            grant_type:
              "authorization_code",
          }),
      }
    );


  const tokenData =
    await tokenResponse.json() as {
      access_token?: string;
      refresh_token?: string;
      error?: string;
      error_description?: string;
    };


  if (
    !tokenResponse.ok ||
    !tokenData.access_token
  ) {

    console.error(
      "[GOOGLE CALENDAR] OAuth token:",
      tokenData
    );


    return NextResponse.redirect(
      new URL(
        "/configuracoes/integracoes?google=token",
        request.url
      )
    );
  }


  if (
    !tokenData.refresh_token
  ) {

    return NextResponse.redirect(
      new URL(
        "/configuracoes/integracoes?google=refresh",
        request.url
      )
    );
  }


  let email =
    "";


  try {

    const profileResponse =
      await fetch(
        "https://openidconnect.googleapis.com/v1/userinfo",
        {
          headers: {
            Authorization:
              `Bearer ${tokenData.access_token}`,
          },
        }
      );


    if (
      profileResponse.ok
    ) {

      const profile =
        await profileResponse.json() as {
          email?: string;
        };


      email =
        String(
          profile.email ||
          ""
        );
    }

  }
  catch (error) {

    console.error(
      "[GOOGLE CALENDAR] User info:",
      error
    );
  }


  await prisma.googleCalendarConnection.update({
    where: {
      agencyId:
        user.agencyId,
    },

    data: {
      googleAccountEmail:
        email ||
        null,

      calendarId:
        "primary",

      encryptedRefreshToken:
        encryptGoogleToken(
          tokenData.refresh_token
        ),

      connectedAt:
        new Date(),
    },
  });


  await prisma.historyLog.create({
    data: {
      entityType:
        "AGENCY",

      entityId:
        user.agencyId,

      action:
        "GOOGLE_CALENDAR_CONNECTED",

      description:
        `Google Calendar conectado${
          email
            ? `: ${email}`
            : "."
        }`,

      authorName:
        user.name ||
        user.email ||
        "Diretoria",
    },
  }).catch(
    () =>
      null
  );


  const response =
    NextResponse.redirect(
      new URL(
        "/configuracoes/integracoes?google=connected",
        request.url
      )
    );


  response.cookies.set(
    "aprovup_google_calendar_state",
    "",
    {
      path:
        "/",

      maxAge:
        0,
    }
  );


  return response;
}
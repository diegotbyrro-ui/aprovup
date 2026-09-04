import {
  randomBytes,
} from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getCurrentUser,
} from "@/lib/auth";

import {
  getGoogleCalendarOAuthConfig,
  GOOGLE_CALENDAR_SCOPES,
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


  const config =
    getGoogleCalendarOAuthConfig();


  if (!config.ready) {

    return NextResponse.redirect(
      new URL(
        "/configuracoes/integracoes?google=config",
        request.url
      )
    );
  }


  const state =
    randomBytes(32)
      .toString("hex");


  const redirectUri =
    `${appOrigin(
      request
    )}/api/integrations/google-calendar/callback`;


  const googleUrl =
    new URL(
      "https://accounts.google.com/o/oauth2/v2/auth"
    );


  googleUrl.search =
    new URLSearchParams({
      client_id:
        config.clientId,

      redirect_uri:
        redirectUri,

      response_type:
        "code",

      scope:
        GOOGLE_CALENDAR_SCOPES.join(
          " "
        ),

      access_type:
        "offline",

      prompt:
        "consent",

      include_granted_scopes:
        "true",

      state,
    }).toString();


  const response =
    NextResponse.redirect(
      googleUrl
    );


  response.cookies.set(
    "aprovup_google_calendar_state",
    state,
    {
      httpOnly:
        true,

      secure:
        process.env.NODE_ENV ===
        "production",

      sameSite:
        "lax",

      path:
        "/",

      maxAge:
        60 * 10,
    }
  );


  return response;
}
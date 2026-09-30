import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  prisma,
} from '@/lib/prisma';

import {
  requirePermission,
} from '@/lib/userAccess';

import {
  canAccessClient,
} from '@/lib/clientAccess';

import {
  createSocialOauthCookie,
  createSocialOauthState,
  YOUTUBE_OAUTH_COOKIE,
  youtubeOauthConfig,
} from '@/lib/socialOAuth';


export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';


export async function GET(
  request:
    NextRequest
) {

  const user =
    await requirePermission(
      'social.manage'
    );


  const clientId =
    String(
      request.nextUrl
        .searchParams
        .get(
          'clientId'
        ) ||
      ''
    ).trim();


  const fallbackUrl =
    new URL(
      '/configuracoes/integracoes/redes-sociais',
      request.url
    );


  if (clientId) {

    fallbackUrl
      .searchParams
      .set(
        'cliente',
        clientId
      );
  }


  const client =
    clientId
      ? await prisma.client
          .findFirst({
            where: {
              id:
                clientId,

              agencyId:
                user.agencyId,
            },

            select: {
              id:
                true,

              agencyId:
                true,

              internalResponsible:
                true,
            },
          })
      : null;


  if (
    !client ||
    !canAccessClient(
      user,
      client
    )
  ) {

    fallbackUrl
      .searchParams
      .set(
        'youtube',
        'client'
      );


    return NextResponse.redirect(
      fallbackUrl
    );
  }


  const config =
    youtubeOauthConfig();


  if (
    !config.ready
  ) {

    fallbackUrl
      .searchParams
      .set(
        'youtube',
        'server-config'
      );


    return NextResponse.redirect(
      fallbackUrl
    );
  }


  const state =
    createSocialOauthState();


  const authUrl =
    new URL(
      'https://accounts.google.com/o/oauth2/v2/auth'
    );


  authUrl.searchParams.set(
    'client_id',
    config.clientId
  );

  authUrl.searchParams.set(
    'redirect_uri',
    config.redirectUri
  );

  authUrl.searchParams.set(
    'response_type',
    'code'
  );

  authUrl.searchParams.set(
    'access_type',
    'offline'
  );

  authUrl.searchParams.set(
    'prompt',
    'consent'
  );

  authUrl.searchParams.set(
    'include_granted_scopes',
    'true'
  );

  authUrl.searchParams.set(
    'scope',
    [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/yt-analytics.readonly',
    ].join(
      ' '
    )
  );

  authUrl.searchParams.set(
    'state',
    state
  );


  const response =
    NextResponse.redirect(
      authUrl
    );


  response.cookies.set(
    YOUTUBE_OAUTH_COOKIE,
    createSocialOauthCookie({
      platform:
        'YOUTUBE',

      clientId:
        client.id,

      userId:
        user.id,

      state,

      expiresAt:
        Date.now() +
        10 *
          60 *
          1000,
    }),
    {
      httpOnly:
        true,

      secure:
        config.origin.startsWith(
          'https://'
        ),

      sameSite:
        'lax',

      path:
        '/',

      maxAge:
        10 *
        60,
    }
  );


  return response;
}
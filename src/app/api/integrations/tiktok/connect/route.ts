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
  TIKTOK_OAUTH_COOKIE,
  tiktokOauthConfig,
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
      tiktokOauthConfig().origin
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
        'tiktok',
        'client'
      );


    return NextResponse.redirect(
      fallbackUrl
    );
  }


  const config =
    tiktokOauthConfig();


  if (
    !config.ready
  ) {

    fallbackUrl
      .searchParams
      .set(
        'tiktok',
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
      'https://www.tiktok.com/v2/auth/authorize/'
    );


  authUrl.searchParams.set(
    'client_key',
    config.clientKey
  );

  authUrl.searchParams.set(
    'response_type',
    'code'
  );

  authUrl.searchParams.set(
    'scope',
    [
      'user.info.basic',
      'video.publish',
    ].join(
      ','
    )
  );

  authUrl.searchParams.set(
    'redirect_uri',
    config.redirectUri
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
    TIKTOK_OAUTH_COOKIE,
    createSocialOauthCookie({
      platform:
        'TIKTOK',

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
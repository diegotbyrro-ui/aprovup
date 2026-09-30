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
  createSocialOauthState,
  encryptSocialSecret,
  readSocialOauthCookie,
  TIKTOK_OAUTH_COOKIE,
  tiktokOauthConfig,
} from '@/lib/socialOAuth';


export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';


type TikTokTokenResponse = {
  access_token?:
    string;

  expires_in?:
    number;

  open_id?:
    string;

  refresh_expires_in?:
    number;

  refresh_token?:
    string;

  scope?:
    string;

  token_type?:
    string;

  error?:
    string;

  error_description?:
    string;

  log_id?:
    string;
};


type TikTokUserResponse = {
  data?: {
    user?: {
      open_id?:
        string;

      union_id?:
        string;

      avatar_url?:
        string;

      display_name?:
        string;
    };
  };

  error?: {
    code?:
      string;

    message?:
      string;

    log_id?:
      string;
  };
};


function destination(
  request:
    NextRequest,

  clientId:
    string,

  status:
    string
) {

  const url =
    new URL(
      '/configuracoes/integracoes/redes-sociais',
      request.url
    );


  if (clientId) {

    url.searchParams.set(
      'cliente',
      clientId
    );
  }


  url.searchParams.set(
    'tiktok',
    status
  );


  return url;
}


export async function GET(
  request:
    NextRequest
) {

  const user =
    await requirePermission(
      'social.manage'
    );


  const cookieValue =
    request.cookies
      .get(
        TIKTOK_OAUTH_COOKIE
      )
      ?.value || '';


  let session:

    ReturnType<
      typeof readSocialOauthCookie
    >;


  try {

    session =
      readSocialOauthCookie(
        cookieValue
      );

  }
  catch {

    return NextResponse.redirect(
      destination(
        request,
        '',
        'state'
      )
    );
  }


  const fail =
    (
      status:
        string
    ) => {

      const response =
        NextResponse.redirect(
          destination(
            request,
            session.clientId,
            status
          )
        );


      response.cookies.set(
        TIKTOK_OAUTH_COOKIE,
        '',
        {
          path:
            '/',

          maxAge:
            0,
        }
      );


      return response;
    };


  const providerError =
    request.nextUrl
      .searchParams
      .get(
        'error'
      );


  if (providerError) {

    return fail(
      'denied'
    );
  }


  const state =
    String(
      request.nextUrl
        .searchParams
        .get(
          'state'
        ) ||
      ''
    );


  const code =
    String(
      request.nextUrl
        .searchParams
        .get(
          'code'
        ) ||
      ''
    );


  if (
    session.platform !==
      'TIKTOK' ||
    session.userId !==
      user.id ||
    session.state !==
      state ||
    session.expiresAt <
      Date.now() ||
    !code
  ) {

    return fail(
      'state'
    );
  }


  const client =
    await prisma.client
      .findFirst({
        where: {
          id:
            session.clientId,

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
      });


  if (
    !client ||
    !canAccessClient(
      user,
      client
    )
  ) {

    return fail(
      'client'
    );
  }


  const config =
    tiktokOauthConfig();


  if (
    !config.ready
  ) {

    return fail(
      'server-config'
    );
  }


  const tokenBody =
    new URLSearchParams({
      client_key:
        config.clientKey,

      client_secret:
        config.clientSecret,

      code,

      grant_type:
        'authorization_code',

      redirect_uri:
        config.redirectUri,
    });


  const tokenResponse =
    await fetch(
      'https://open.tiktokapis.com/v2/oauth/token/',
      {
        method:
          'POST',

        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded',

          'Cache-Control':
            'no-cache',
        },

        body:
          tokenBody.toString(),

        cache:
          'no-store',
      }
    );


  const tokenPayload =
    await tokenResponse
      .json() as
        TikTokTokenResponse;


  if (
    !tokenResponse.ok ||
    !tokenPayload
      .access_token ||
    !tokenPayload
      .open_id
  ) {

    console.error(
      'TIKTOK OAUTH TOKEN ERROR',
      tokenPayload
    );


    return fail(
      'token'
    );
  }


  const userInfoUrl =
    new URL(
      'https://open.tiktokapis.com/v2/user/info/'
    );


  userInfoUrl.searchParams.set(
    'fields',
    [
      'open_id',
      'union_id',
      'avatar_url',
      'display_name',
    ].join(
      ','
    )
  );


  const userResponse =
    await fetch(
      userInfoUrl,
      {
        headers: {
          Authorization:
            'Bearer ' +
            tokenPayload
              .access_token,
        },

        cache:
          'no-store',
      }
    );


  const userPayload =
    await userResponse
      .json() as
        TikTokUserResponse;


  const profile =
    userPayload
      .data
      ?.user;


  if (
    !userResponse.ok ||
    !profile?.open_id
  ) {

    console.error(
      'TIKTOK USER LOOKUP ERROR',
      userPayload
    );


    return fail(
      'profile'
    );
  }


  const existing =
    await prisma
      .socialConnection
      .findUnique({
        where: {
          clientId_platform: {
            clientId:
              client.id,

            platform:
              'TIKTOK',
          },
        },
      });


  const encryptedRefreshToken =
    tokenPayload
      .refresh_token
      ? encryptSocialSecret(
          tokenPayload
            .refresh_token
        )
      : existing
          ?.encryptedRefreshToken ||
        null;


  await prisma
    .socialConnection
    .upsert({
      where: {
        clientId_platform: {
          clientId:
            client.id,

          platform:
            'TIKTOK',
        },
      },

      create: {
        clientId:
          client.id,

        platform:
          'TIKTOK',

        accountId:
          profile.open_id,

        accountName:
          profile.display_name ||
          'Conta TikTok',

        accountUsername:
          null,

        encryptedAccessToken:
          encryptSocialSecret(
            tokenPayload
              .access_token
          ),

        encryptedRefreshToken,

        tokenExpiresAt:
          new Date(
            Date.now() +
            Number(
              tokenPayload
                .expires_in ||
              86400
            ) *
              1000
          ),

        scopes:
          tokenPayload.scope ||
          'user.info.basic,video.publish',

        status:
          'ATIVO',

        connectedByUserId:
          user.id,

        connectedAt:
          new Date(),

        lastSyncAt:
          new Date(),

        metadata: {
          provider:
            'TIKTOK',

          openId:
            profile.open_id,

          unionId:
            profile.union_id ||
            null,

          avatarUrl:
            profile.avatar_url ||
            null,
        },
      },

      update: {
        accountId:
          profile.open_id,

        accountName:
          profile.display_name ||
          'Conta TikTok',

        encryptedAccessToken:
          encryptSocialSecret(
            tokenPayload
              .access_token
          ),

        encryptedRefreshToken,

        tokenExpiresAt:
          new Date(
            Date.now() +
            Number(
              tokenPayload
                .expires_in ||
              86400
            ) *
              1000
          ),

        scopes:
          tokenPayload.scope ||
          existing?.scopes ||
          null,

        status:
          'ATIVO',

        connectedByUserId:
          user.id,

        connectedAt:
          new Date(),

        lastSyncAt:
          new Date(),

        metadata: {
          provider:
            'TIKTOK',

          openId:
            profile.open_id,

          unionId:
            profile.union_id ||
            null,

          avatarUrl:
            profile.avatar_url ||
            null,
        },
      },
    });


  const response =
    NextResponse.redirect(
      destination(
        request,
        client.id,
        'connected'
      )
    );


  response.cookies.set(
    TIKTOK_OAUTH_COOKIE,
    createSocialOauthState(),
    {
      path:
        '/',

      maxAge:
        0,
    }
  );


  return response;
}
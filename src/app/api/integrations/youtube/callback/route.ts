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
  YOUTUBE_OAUTH_COOKIE,
  youtubeOauthConfig,
} from '@/lib/socialOAuth';


export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';


type GoogleTokenResponse = {
  access_token?:
    string;

  expires_in?:
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
};


type YoutubeChannelResponse = {
  items?:
    Array<{
      id?:
        string;

      snippet?: {
        title?:
          string;

        customUrl?:
          string;

        thumbnails?:
          Record<
            string,
            {
              url?:
                string;
            }
          >;
      };
    }>;

  error?: {
    message?:
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
      youtubeOauthConfig().origin
    );


  if (clientId) {

    url.searchParams.set(
      'cliente',
      clientId
    );
  }


  url.searchParams.set(
    'youtube',
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
        YOUTUBE_OAUTH_COOKIE
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
        YOUTUBE_OAUTH_COOKIE,
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
      'YOUTUBE' ||
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
    youtubeOauthConfig();


  if (
    !config.ready
  ) {

    return fail(
      'server-config'
    );
  }


  const tokenBody =
    new URLSearchParams({
      client_id:
        config.clientId,

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
      'https://oauth2.googleapis.com/token',
      {
        method:
          'POST',

        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded',
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
        GoogleTokenResponse;


  if (
    !tokenResponse.ok ||
    !tokenPayload
      .access_token
  ) {

    console.error(
      'YOUTUBE OAUTH TOKEN ERROR',
      tokenPayload
    );


    return fail(
      'token'
    );
  }


  const channelResponse =
    await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true',
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


  const channelPayload =
    await channelResponse
      .json() as
        YoutubeChannelResponse;


  const channel =
    channelPayload
      .items?.[0];


  if (
    !channelResponse.ok ||
    !channel?.id
  ) {

    console.error(
      'YOUTUBE CHANNEL LOOKUP ERROR',
      channelPayload
    );


    return fail(
      'channel'
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
              'YOUTUBE',
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
            'YOUTUBE',
        },
      },

      create: {
        clientId:
          client.id,

        platform:
          'YOUTUBE',

        accountId:
          channel.id,

        accountName:
          channel
            .snippet
            ?.title ||
          'Canal do YouTube',

        accountUsername:
          channel
            .snippet
            ?.customUrl ||
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
              3600
            ) *
              1000
          ),

        scopes:
          tokenPayload.scope ||
          [
            'https://www.googleapis.com/auth/youtube.readonly',
            'https://www.googleapis.com/auth/youtube.upload',
          ].join(
            ' '
          ),

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
            'YOUTUBE',

          channelId:
            channel.id,
        },
      },

      update: {
        accountId:
          channel.id,

        accountName:
          channel
            .snippet
            ?.title ||
          'Canal do YouTube',

        accountUsername:
          channel
            .snippet
            ?.customUrl ||
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
              3600
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
            'YOUTUBE',

          channelId:
            channel.id,
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
    YOUTUBE_OAUTH_COOKIE,
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
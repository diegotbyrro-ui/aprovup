import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  getCurrentUser,
} from '@/lib/auth';

import {
  prisma,
} from '@/lib/prisma';

import {
  encryptMetaSecret,
} from '@/lib/metaCrypto';

import {
  exchangeMetaCode,
  getManagedInstagramAccounts,
  getMetaRedirectUri,
} from '@/lib/metaInstagram';


function instagramUrl(
  request:
    NextRequest,
  clientId:
    string,
  params:
    string
) {
  return new URL(
    `/clientes/${clientId}/instagram?${params}`,
    request.url
  );
}


export async function GET(
  request: NextRequest
) {
  const code =
    request.nextUrl
      .searchParams
      .get(
        'code'
      );

  const state =
    request.nextUrl
      .searchParams
      .get(
        'state'
      );

  const oauthError =
    request.nextUrl
      .searchParams
      .get(
        'error'
      );

  if (!state) {
    return NextResponse.redirect(
      new URL(
        '/clientes',
        request.url
      )
    );
  }

  const session =
    await prisma
      .metaOAuthSession
      .findUnique({
        where: {
          id:
            state,
        },
      });

  if (!session) {
    return NextResponse.redirect(
      new URL(
        '/clientes',
        request.url
      )
    );
  }

  if (
    session.expiresAt <
    new Date()
  ) {
    await prisma
      .metaOAuthSession
      .deleteMany({
        where: {
          id:
            session.id,
        },
      });

    return NextResponse.redirect(
      instagramUrl(
        request,
        session.clientId,
        'error=expired'
      )
    );
  }

  const user =
    await getCurrentUser();

  if (
    !user ||
    user.id !==
      session.userId
  ) {
    return NextResponse.redirect(
      instagramUrl(
        request,
        session.clientId,
        'error=session'
      )
    );
  }

  if (
    oauthError ||
    !code
  ) {
    await prisma
      .metaOAuthSession
      .deleteMany({
        where: {
          id:
            session.id,
        },
      });

    return NextResponse.redirect(
      instagramUrl(
        request,
        session.clientId,
        'error=cancelled'
      )
    );
  }

  try {
    const redirectUri =
      getMetaRedirectUri(
        request
          .nextUrl
          .origin
      );

    const token =
      await exchangeMetaCode({
        code,
        redirectUri,
      });

    const accounts =
      await getManagedInstagramAccounts(
        token.accessToken
      );

    if (
      accounts.length ===
      0
    ) {
      return NextResponse.redirect(
        instagramUrl(
          request,
          session.clientId,
          'error=no_accounts'
        )
      );
    }

    const tokenExpiresAt =
      token.expiresIn
        ? new Date(
            Date.now() +
              token.expiresIn *
                1000
          ).toISOString()
        : null;

    const encryptedPayload =
      encryptMetaSecret(
        JSON.stringify({
          userAccessToken:
            token.accessToken,

          tokenExpiresAt,

          accounts,
        })
      );

    await prisma
      .metaOAuthSession
      .update({
        where: {
          id:
            session.id,
        },

        data: {
          encryptedPayload,

          expiresAt:
            new Date(
              Date.now() +
                15 *
                  60 *
                  1000
            ),
        },
      });

    return NextResponse.redirect(
      new URL(
        `/clientes/${session.clientId}/instagram/selecionar?session=${session.id}`,
        request.url
      )
    );
  }
  catch (
    error
  ) {
    console.error(
      'META CALLBACK ERROR',
      error
    );

    return NextResponse.redirect(
      instagramUrl(
        request,
        session.clientId,
        'error=meta'
      )
    );
  }
}

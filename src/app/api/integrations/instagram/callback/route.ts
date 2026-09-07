import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  getCurrentUser,
} from '@/lib/auth';
import {
  canUseMetaIntegration,
} from '@/lib/metaAccess';

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


function publicOrigin(
  request:
    NextRequest
) {

  const metaRedirectUri =
    process.env
      .META_INSTAGRAM_REDIRECT_URI;


  if (
    metaRedirectUri
  ) {

    try {

      return new URL(
        metaRedirectUri
      ).origin;

    }
    catch {
      // continua para o proximo fallback
    }

  }


  const siteUrl =
    process.env
      .NEXT_PUBLIC_SITE_URL;


  if (
    siteUrl
  ) {

    try {

      return new URL(
        siteUrl
      ).origin;

    }
    catch {
      // continua para a origem recebida
    }

  }


  return request
    .nextUrl
    .origin;
}


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
    publicOrigin(request)
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
        publicOrigin(request)
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
        publicOrigin(request)
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
    user.status !==
      'APROVADO' ||
    !user.agencyId ||
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
    !canUseMetaIntegration(
      user
    )
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
        'error=meta_review'
      )
    );
  }

  const client =
    await prisma.client.findFirst({
      where: {
        id:
          session.clientId,

        agencyId:
          user.agencyId,
      },

      select: {
        id:
          true,
      },
    });

  if (!client) {
    await prisma
      .metaOAuthSession
      .deleteMany({
        where: {
          id:
            session.id,
        },
      });

    return NextResponse.redirect(
      new URL(
        '/clientes',
        publicOrigin(request)
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
        publicOrigin(request)
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

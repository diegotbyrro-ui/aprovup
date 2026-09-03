import {
  randomBytes,
} from 'node:crypto';

import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  getCurrentUser,
} from '@/lib/auth';

import {
  hasPermission,
} from '@/lib/userAccess';

import {
  prisma,
} from '@/lib/prisma';

import {
  buildMetaLoginUrl,
  getMetaRedirectUri,
} from '@/lib/metaInstagram';


export async function GET(
  request: NextRequest
) {
  const user =
    await getCurrentUser();

  if (
    !user ||
    user.status !==
      'APROVADO' ||
    !hasPermission(
      user,
      'social.manage'
    )
  ) {
    return NextResponse.redirect(
      new URL(
        '/login',
        request.url
      )
    );
  }

  if (!user.agencyId) {
    return NextResponse.redirect(
      new URL(
        '/acesso-bloqueado',
        request.url
      )
    );
  }

  const clientId =
    request.nextUrl
      .searchParams
      .get(
        'clientId'
      );

  if (!clientId) {
    return NextResponse.redirect(
      new URL(
        '/clientes',
        request.url
      )
    );
  }

  const client =
    await prisma.client.findFirst({
      where: {
        id:
          clientId,

        agencyId:
          user.agencyId,
      },
      select: {
        id:
          true,
      },
    });

  if (!client) {
    return NextResponse.redirect(
      new URL(
        '/clientes',
        request.url
      )
    );
  }

  await prisma
    .metaOAuthSession
    .deleteMany({
      where: {
        expiresAt: {
          lt:
            new Date(),
        },
      },
    });

  const state =
    randomBytes(
      32
    ).toString(
      'hex'
    );

  await prisma
    .metaOAuthSession
    .create({
      data: {
        id:
          state,

        clientId,

        userId:
          user.id,

        expiresAt:
          new Date(
            Date.now() +
            10 *
              60 *
              1000
          ),
      },
    });

  try {
    const redirectUri =
      getMetaRedirectUri(
        request
          .nextUrl
          .origin
      );

    const loginUrl =
      buildMetaLoginUrl({
        state,
        redirectUri,
      });

    return NextResponse.redirect(
      loginUrl
    );
  }
  catch (
    error
  ) {
    console.error(
      'META CONNECT ERROR',
      error
    );

    await prisma
      .metaOAuthSession
      .deleteMany({
        where: {
          id:
            state,
        },
      });

    return NextResponse.redirect(
      new URL(
        `/clientes/${clientId}/instagram?error=config`,
        request.url
      )
    );
  }
}

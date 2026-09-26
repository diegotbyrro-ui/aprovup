import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  prisma,
} from '@/lib/prisma';

import {
  hasPermission,
} from '@/lib/userAccess';

import {
  executeSecretaryPendingAction,
} from '@/lib/secretaryActions';

import {
  readMeetAddonBearerToken,
  verifyMeetAddonToken,
} from '@/lib/meetAddonAuth';


export const runtime =
  'nodejs';


export const dynamic =
  'force-dynamic';


export async function POST(
  request:
    NextRequest,
  context: {
    params:
      Promise<{
        id:
          string;
      }>;
  }
) {

  try {

    const claims =
      verifyMeetAddonToken(
        readMeetAddonBearerToken(
          request
        )
      );


    if (
      !claims
    ) {

      return NextResponse.json(
        {
          ok:
            false,

          message:
            'Autorização expirada.',
        },
        {
          status:
            401,
        }
      );
    }


    const user =
      await prisma.user
        .findFirst({
          where: {
            id:
              claims.userId,

            agencyId:
              claims.agencyId,

            status:
              'APROVADO',
          },
        });


    if (
      !user ||
      !hasPermission(
        user,
        'secretary.act'
      )
    ) {

      return NextResponse.json(
        {
          ok:
            false,

          message:
            'Você não possui permissão para confirmar ações.',
        },
        {
          status:
            403,
        }
      );
    }


    const {
      id,
    } =
      await context.params;


    const body =
      await request
        .json();


    const decision =
      body?.decision ===
        'confirm'
        ? 'confirm'
        : body?.decision ===
            'cancel'
          ? 'cancel'
          : null;


    if (
      !decision
    ) {

      return NextResponse.json(
        {
          ok:
            false,

          message:
            'Decisão inválida.',
        },
        {
          status:
            400,
        }
      );
    }


    const result =
      await executeSecretaryPendingAction({
        agencyId:
          claims.agencyId,

        userId:
          user.id,

        actionId:
          id,

        decision,

        channel:
          'WEB',

        authorName:
          user.name ||
          user.email ||
          'Usuário via Google Meet',
      });


    return NextResponse.json({
      ok:
        true,

      ...result,
    });

  }
  catch (
    error
  ) {

    console.error(
      'MEET ADDON ACTION ERROR',
      error
    );


    return NextResponse.json(
      {
        ok:
          false,

        message:
          error instanceof Error
            ? error.message
            : 'Erro ao executar a ação.',
      },
      {
        status:
          500,
      }
    );
  }
}

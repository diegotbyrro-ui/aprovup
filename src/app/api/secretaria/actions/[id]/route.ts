import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  getSecretaryApiUser,
} from '@/lib/secretaryAccess';

import {
  executeSecretaryPendingAction,
} from '@/lib/secretaryActions';


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
    const access =
      await getSecretaryApiUser();


    if (!access.ok) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            access.message,
        },
        {
          status:
            access.status,
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


    if (!decision) {
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
          access
            .user
            .agencyId,

        userId:
          access
            .user
            .id,

        actionId:
          id,

        decision,

        channel:
          'WEB',

        authorName:
          access
            .user
            .name ||
          access
            .user
            .email,
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
      'SECRETARY ACTION ERROR',
      error
    );


    const message =
      error instanceof Error
        ? error.message
        : 'Erro ao executar a ação.';


    const status =
      message.includes(
        'permissão'
      )
        ? 403
        : message.includes(
              'não está mais'
            )
          ? 404
          : 500;


    return NextResponse.json(
      {
        ok:
          false,

        message,
      },
      {
        status,
      }
    );
  }
}

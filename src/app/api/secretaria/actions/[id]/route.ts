import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  prisma,
} from '@/lib/prisma';

import {
  getSecretaryApiUser,
} from '@/lib/secretaryAccess';

import {
  createGoogleCalendarEvent,
} from '@/lib/googleCalendar';


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


    const pending =
      await prisma
        .secretaryPendingAction
        .findFirst({
          where: {
            id,

            agencyId:
              access
                .user
                .agencyId,

            userId:
              access
                .user
                .id,

            status:
              'PENDING',
          },
        });


    if (!pending) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            'Essa aÃ§Ã£o nÃ£o estÃ¡ mais disponÃ­vel.',
        },
        {
          status:
            404,
        }
      );
    }


    if (
      body?.decision ===
      'cancel'
    ) {
      await prisma
        .secretaryPendingAction
        .update({
          where: {
            id:
              pending.id,
          },

          data: {
            status:
              'CANCELED',
          },
        });


      return NextResponse.json({
        ok:
          true,

        content:
          'Agendamento cancelado. Nenhuma alteraÃ§Ã£o foi feita no Google Agenda.',
      });
    }


    if (
      body?.decision !==
      'confirm'
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            'DecisÃ£o invÃ¡lida.',
        },
        {
          status:
            400,
        }
      );
    }


    if (
      pending.expiresAt &&
      pending.expiresAt <
        new Date()
    ) {
      await prisma
        .secretaryPendingAction
        .update({
          where: {
            id:
              pending.id,
          },

          data: {
            status:
              'EXPIRED',
          },
        });


      return NextResponse.json(
        {
          ok:
            false,

          message:
            'Essa confirmaÃ§Ã£o expirou. PeÃ§a o agendamento novamente.',
        },
        {
          status:
            410,
        }
      );
    }


    if (
      pending.type !==
      'GOOGLE_CALENDAR_CREATE'
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            'Tipo de aÃ§Ã£o nÃ£o suportado.',
        },
        {
          status:
            400,
        }
      );
    }


    const payload =
      pending.payload as
        unknown as
        Record<
          string,
          unknown
        >;


    const startDate =
      new Date(
        String(
          payload.startDate ||
          ''
        )
      );


    const endDate =
      new Date(
        String(
          payload.endDate ||
          ''
        )
      );


    if (
      Number.isNaN(
        startDate.getTime()
      ) ||
      Number.isNaN(
        endDate.getTime()
      ) ||
      endDate <=
        startDate
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            'As datas do agendamento sÃ£o invÃ¡lidas.',
        },
        {
          status:
            400,
        }
      );
    }


    const event =
      await createGoogleCalendarEvent({
        agencyId:
          access
            .user
            .agencyId,

        title:
          String(
            payload.title ||
            'Compromisso'
          ),

        description:
          String(
            payload.description ||
            ''
          ),

        location:
          String(
            payload.location ||
            ''
          ),

        startDate,
        endDate,
      });


    if (!event) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            'O Google Agenda da agÃªncia nÃ£o estÃ¡ conectado.',
        },
        {
          status:
            409,
        }
      );
    }


    await prisma
      .secretaryPendingAction
      .update({
        where: {
          id:
            pending.id,
        },

        data: {
          status:
            'EXECUTED',

          result: {
            googleEventId:
              event.id ||
              null,

            htmlLink:
              event.htmlLink ||
              null,
          },
        },
      });


    return NextResponse.json({
      ok:
        true,

      content:
        'âœ… Compromisso criado no Google Agenda.',

      htmlLink:
        event.htmlLink ||
        null,
    });
  }
  catch (
    error
  ) {
    console.error(
      'SECRETARY ACTION ERROR',
      error
    );


    return NextResponse.json(
      {
        ok:
          false,

        message:
          error instanceof Error
            ? error.message
            : 'Erro ao executar a aÃ§Ã£o.',
      },
      {
        status:
          500,
      }
    );
  }
}
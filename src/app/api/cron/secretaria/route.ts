import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  prisma,
} from '@/lib/prisma';

import {
  runSecretaryAutomation,
} from '@/lib/secretaryAutomation';

import {
  processPendingWhatsappEvents,
  sendSecretaryIntroductionToTeam,
} from '@/lib/secretaryWhatsApp';


export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';

export const maxDuration =
  300;


function authorized(
  request:
    NextRequest
) {
  const secret =
    String(
      process.env
        .SECRETARY_CRON_SECRET ||
      process.env
        .INSTAGRAM_CRON_SECRET ||
      ''
    ).trim();


  if (!secret) {
    return false;
  }


  return request.headers
    .get(
      'authorization'
    ) ===
    'Bearer ' +
    secret;
}


export async function GET(
  request:
    NextRequest
) {
  if (
    !authorized(
      request
    )
  ) {
    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Não autorizado.',
      },
      {
        status:
          401,
      }
    );
  }


  const result =
    await runSecretaryAutomation();


  return NextResponse.json({
    ok:
      true,

    checkedAt:
      new Date()
        .toISOString(),

    ...result,
  });
}


export async function POST(
  request:
    NextRequest
) {
  if (
    !authorized(
      request
    )
  ) {
    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Não autorizado.',
      },
      {
        status:
          401,
      }
    );
  }

  const body =
    await request
      .json()
      .catch(
        () => ({})
      ) as {
        action?:
          string;

        agencyName?:
          string;
      };

  if (
    body.action ===
    'WHATSAPP_STATUS'
  ) {
    const connection =
      await prisma
        .secretaryWhatsappConnection
        .findFirst({
          where: {
            status:
              'ATIVO',
          },

          select: {
            agencyId:
              true,

            displayPhoneNumber:
              true,

            lastWebhookAt:
              true,
          },
        });

    if (!connection) {
      return NextResponse.json({
        ok:
          false,

        message:
          'Nenhuma conexão ativa encontrada.',
      });
    }

    const since =
      new Date(
        Date.now() -
        60 *
          60 *
          1000
      );

    const [
      events,
      members,
    ] =
      await Promise.all([
        prisma
          .secretaryWhatsappEvent
          .findMany({
            where: {
              agencyId:
                connection.agencyId,

              createdAt: {
                gte:
                  since,
              },
            },

            orderBy: {
              createdAt:
                'desc',
            },

            take:
              50,

            select: {
              id:
                true,

              fromPhone:
                true,

              messageType:
                true,

              status:
                true,

              createdAt:
                true,

              processedAt:
                true,

              error:
                true,

              transcript:
                true,
            },
          }),

        prisma
          .secretaryWhatsappMember
          .findMany({
            where: {
              agencyId:
                connection.agencyId,

              isActive:
                true,
            },

            orderBy: {
              displayName:
                'asc',
            },

            select: {
              displayName:
                true,

              phoneE164:
                true,

              canUseSecretary:
                true,

              lastInboundAt:
                true,

              userId:
                true,
            },
          }),
      ]);

    const maskPhone =
      (
        value:
          string
      ) => {
        const clean =
          String(
            value ||
            ''
          );

        return clean.length >
          4
          ? '***' +
              clean.slice(
                -4
              )
          : clean;
      };

    const counts =
      events.reduce(
        (
          acc,
          event
        ) => {
          acc[
            event.status
          ] =
            (
              acc[
                event.status
              ] ||
              0
            ) + 1;

          return acc;
        },
        {} as
          Record<
            string,
            number
          >
      );

    return NextResponse.json({
      ok:
        true,

      action:
        'WHATSAPP_STATUS',

      checkedAt:
        new Date()
          .toISOString(),

      lastWebhookAt:
        connection
          .lastWebhookAt
          ?.toISOString() ||
        null,

      counts,

      events:
        events.map(
          (
            event
          ) => ({
            id:
              event.id,

            phone:
              maskPhone(
                event.fromPhone
              ),

            type:
              event.messageType,

            status:
              event.status,

            createdAt:
              event
                .createdAt
                .toISOString(),

            processedAt:
              event
                .processedAt
                ?.toISOString() ||
              null,

            error:
              event.error ||
              null,

            transcript:
              event.transcript ||
              null,
          })
        ),

      members:
        members.map(
          (
            member
          ) => ({
            name:
              member.displayName,

            phone:
              maskPhone(
                member.phoneE164
              ),

            authorized:
              member
                .canUseSecretary,

            linked:
              Boolean(
                member.userId
              ),

            lastInboundAt:
              member
                .lastInboundAt
                ?.toISOString() ||
              null,
          })
        ),
    });
  }

  if (
    body.action ===
    'PROCESS_WHATSAPP'
  ) {
    const processed =
      await processPendingWhatsappEvents(
        50
      );

    return NextResponse.json({
      ok:
        true,

      action:
        'PROCESS_WHATSAPP',

      processed,

      executedAt:
        new Date()
          .toISOString(),
    });
  }

  if (
    body.action ===
    'INTRODUCE_TEAM'
  ) {
    const result =
      await sendSecretaryIntroductionToTeam({
        agencyName:
          String(
            body.agencyName ||
            ''
          ),
      });

    return NextResponse.json({
      ok:
        true,

      executedAt:
        new Date()
          .toISOString(),

      ...result,
    });
  }

  return NextResponse.json(
    {
      ok:
        false,

      message:
        'Ação inválida.',
    },
    {
      status:
        400,
    }
  );
}

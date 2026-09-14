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
    'WHATSAPP_EVENT_PHONES'
  ) {
    try {
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
            },
          });

      if (!connection) {
        return NextResponse.json({
          ok:
            false,

          message:
            'Conexão ativa não encontrada.',
        });
      }

      const events =
        await prisma
          .secretaryWhatsappEvent
          .findMany({
            where: {
              agencyId:
                connection.agencyId,
            },

            orderBy: {
              createdAt:
                'desc',
            },

            take:
              30,

            select: {
              fromPhone:
                true,

              status:
                true,

              messageType:
                true,

              createdAt:
                true,

              error:
                true,
            },
          });

      const describePhone =
        (value: string) => {
          const digits =
            String(
              value ||
              ''
            ).replace(
              /\D/g,
              ''
            );

          return {
            masked:
              digits.length >= 6
                ? digits.slice(0, 4) +
                    '*****' +
                    digits.slice(-4)
                : digits,

            length:
              digits.length,

            starts55:
              digits.startsWith(
                '55'
              ),

            suffix:
              digits.slice(-4),
          };
        };

      return NextResponse.json({
        ok:
          true,

        action:
          'WHATSAPP_EVENT_PHONES',

        events:
          events.map(
            (event) => ({
              ...describePhone(
                event.fromPhone
              ),

              status:
                event.status,

              type:
                event.messageType,

              createdAt:
                event
                  .createdAt
                  .toISOString(),

              error:
                event.error ||
                null,
            })
          ),
      });
    }
    catch (error) {
      return NextResponse.json(
        {
          ok:
            false,

          action:
            'WHATSAPP_EVENT_PHONES',

          error:
            error instanceof Error
              ? error.message
              : String(error),
        },
        {
          status:
            500,
        }
      );
    }
  }


  if (
    body.action ===
    'WHATSAPP_STATUS_LIGHT'
  ) {
    try {
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

              secretaryName:
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
            'Nenhuma conexão ativa.',
        });
      }

      const members =
        await prisma
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

              receiveAlerts:
                true,

              lastInboundAt:
                true,

              userId:
                true,
            },
          });

      const maskPhone =
        (value: string) => {
          const clean =
            String(
              value ||
              ''
            );

          return clean.length > 4
            ? '***' +
                clean.slice(-4)
            : clean;
        };

      return NextResponse.json({
        ok:
          true,

        action:
          'WHATSAPP_STATUS_LIGHT',

        secretary:
          connection
            .secretaryName,

        lastWebhookAt:
          connection
            .lastWebhookAt
            ?.toISOString() ||
          null,

        members:
          members.map(
            (member) => ({
              name:
                member
                  .displayName,

              phone:
                maskPhone(
                  member
                    .phoneE164
                ),

              authorized:
                member
                  .canUseSecretary,

              alerts:
                member
                  .receiveAlerts,

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
    catch (error) {
      return NextResponse.json(
        {
          ok:
            false,

          action:
            'WHATSAPP_STATUS_LIGHT',

          error:
            error instanceof Error
              ? error.message
              : String(
                  error
                ),
        },
        {
          status:
            500,
        }
      );
    }
  }


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

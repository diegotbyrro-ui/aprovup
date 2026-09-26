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
  extractGoogleMeetCode,
} from '@/lib/googleMeet';

import {
  readMeetAddonBearerToken,
  verifyMeetAddonToken,
} from '@/lib/meetAddonAuth';

import {
  runSecretaryTurn,
} from '@/lib/secretaryAi';


export const runtime =
  'nodejs';


export const dynamic =
  'force-dynamic';


export const maxDuration =
  300;


export async function POST(
  request:
    NextRequest
) {

  try {

    const token =
      readMeetAddonBearerToken(
        request
      );


    const claims =
      verifyMeetAddonToken(
        token
      );


    if (
      !claims
    ) {

      return NextResponse.json(
        {
          ok:
            false,

          message:
            'Autorização da Liv expirada. Conecte o AprovUp novamente.',
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
        'secretary.use'
      )
    ) {

      return NextResponse.json(
        {
          ok:
            false,

          message:
            'Usuário sem acesso à Liv.',
        },
        {
          status:
            403,
        }
      );
    }


    const body =
      await request
        .json();


    const message =
      String(
        body?.message ||
        ''
      ).trim();


    const meetingCode =
      extractGoogleMeetCode(
        String(
          body?.meetingCode ||
          ''
        )
      );


    if (
      !message
    ) {

      return NextResponse.json(
        {
          ok:
            false,

          message:
            'Digite ou fale um comando para a Liv.',
        },
        {
          status:
            400,
        }
      );
    }


    if (
      message.length >
        4000
    ) {

      return NextResponse.json(
        {
          ok:
            false,

          message:
            'O comando é muito longo.',
        },
        {
          status:
            400,
        }
      );
    }


    if (
      !meetingCode
    ) {

      return NextResponse.json(
        {
          ok:
            false,

          message:
            'A Liv não conseguiu identificar esta reunião.',
        },
        {
          status:
            400,
        }
      );
    }


    const meeting =
      await prisma
        .secretaryMeeting
        .findFirst({
          where: {
            agencyId:
              claims.agencyId,

            googleMeetCode:
              meetingCode,
          },

          select: {
            id:
              true,

            title:
              true,

            googleMeetCode:
              true,
          },
        });


    if (
      !meeting
    ) {

      return NextResponse.json(
        {
          ok:
            false,

          message:
            'Esta reunião não foi criada pelo AprovUp.',
        },
        {
          status:
            404,
        }
      );
    }


    let thread =
      await prisma
        .secretaryThread
        .findFirst({
          where: {
            agencyId:
              claims.agencyId,

            userId:
              user.id,

            channel:
              'MEET',

            externalConversationId:
              meeting.id,
          },
        });


    if (
      !thread
    ) {

      thread =
        await prisma
          .secretaryThread
          .create({
            data: {
              agencyId:
                claims.agencyId,

              userId:
                user.id,

              channel:
                'MEET',

              externalConversationId:
                meeting.id,

              title:
                'Meet - ' +
                meeting.title,
            },
          });
    }


    await prisma
      .secretaryMessage
      .create({
        data: {
          threadId:
            thread.id,

          role:
            'USER',

          content:
            message,

          inputType:
            'TEXT',

          metadata: {
            source:
              'GOOGLE_MEET_ADDON',

            meetingId:
              meeting.id,

            meetingCode,
          },
        },
      });


    const recentRaw =
      await prisma
        .secretaryMessage
        .findMany({
          where: {
            threadId:
              thread.id,
          },

          orderBy: {
            createdAt:
              'desc',
          },

          take:
            16,
        });


    const conversation =
      [
        {
          role:
            'CONTEXT',

          content:
            'Você está dentro da reunião do Google Meet "' +
            meeting.title +
            '". Quando o usuário pedir agenda, tarefa operacional, consulta ou alteração, interprete como comando da reunião atual. Ações que alteram dados devem continuar exigindo confirmação.',
        },

        ...recentRaw
          .reverse()
          .map(
            (
              item
            ) => ({
              role:
                item.role,

              content:
                item.content,
            })
          ),
      ];


    const result =
      await runSecretaryTurn({
        agencyId:
          claims.agencyId,

        userId:
          user.id,

        threadId:
          thread.id,

        conversation,

        canExecuteActions:
          hasPermission(
            user,
            'secretary.act'
          ),
      });


    const assistant =
      await prisma
        .secretaryMessage
        .create({
          data: {
            threadId:
              thread.id,

            role:
              'ASSISTANT',

            content:
              result.answer,

            inputType:
              'TEXT',

            metadata:
              result.pendingAction
                ? {
                    pendingActionId:
                      result
                        .pendingAction
                        .id,

                    source:
                      'GOOGLE_MEET_ADDON',
                  }
                : {
                    source:
                      'GOOGLE_MEET_ADDON',
                  },
          },
        });


    await prisma
      .secretaryThread
      .update({
        where: {
          id:
            thread.id,
        },

        data: {
          updatedAt:
            new Date(),
        },
      });


    return NextResponse.json({
      ok:
        true,

      meeting: {
        id:
          meeting.id,

        title:
          meeting.title,

        code:
          meeting.googleMeetCode,
      },

      threadId:
        thread.id,

      assistantMessage: {
        id:
          assistant.id,

        content:
          assistant.content,

        createdAt:
          assistant
            .createdAt
            .toISOString(),
      },

      pendingAction:
        result.pendingAction,
    });

  }
  catch (
    error
  ) {

    console.error(
      'MEET ADDON COMMAND ERROR',
      error
    );


    return NextResponse.json(
      {
        ok:
          false,

        message:
          error instanceof Error
            ? error.message
            : 'Erro ao conversar com a Liv.',
      },
      {
        status:
          500,
      }
    );
  }
}

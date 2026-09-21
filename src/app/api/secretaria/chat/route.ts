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
  getSecretaryApiUser,
} from '@/lib/secretaryAccess';

import {
  runSecretaryTurn,
} from '@/lib/secretaryAi';

import {
  executeSecretaryPendingAction,
} from '@/lib/secretaryActions';

import {
  sendDirectorTeamAnnouncement,
} from '@/lib/secretaryWhatsApp';


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


    const body =
      await request
        .json();


    const message =
      typeof body?.message ===
        'string'
        ? body.message
            .trim()
        : '';


    if (!message) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            'Escreva ou grave uma mensagem.',
        },
        {
          status:
            400,
        }
      );
    }


    if (
      message.length >
      6000
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            'A mensagem é muito longa.',
        },
        {
          status:
            400,
        }
      );
    }


    const inputType =
      body?.inputType ===
        'AUDIO'
        ? 'AUDIO'
        : 'TEXT';


    let thread =
      null as
        Awaited<
          ReturnType<
            typeof prisma.secretaryThread.findFirst
          >
        >;


    if (
      typeof body?.threadId ===
        'string' &&
      body.threadId
    ) {
      thread =
        await prisma
          .secretaryThread
          .findFirst({
            where: {
              id:
                body.threadId,

              agencyId:
                access
                  .user
                  .agencyId,

              userId:
                access
                  .user
                  .id,

              channel:
                'WEB',
            },
          });
    }


    if (!thread) {
      thread =
        await prisma
          .secretaryThread
          .create({
            data: {
              agencyId:
                access
                  .user
                  .agencyId,

              userId:
                access
                  .user
                  .id,

              channel:
                'WEB',

              title:
                message.slice(
                  0,
                  80
                ),
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

          inputType,
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
      recentRaw
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
        );


    const result =
      await runSecretaryTurn({
        agencyId:
          access
            .user
            .agencyId,

        userId:
          access
            .user
            .id,

        threadId:
          thread.id,

        conversation,

        canExecuteActions:
          hasPermission(
            access.user,
            'secretary.act'
          ),
      });


    const directorOverride =
      access.user.role ===
        'DIRECTOR';


    let answer =
      result.answer;


    let pendingAction =
      result.pendingAction;


    if (
      directorOverride &&
      pendingAction
    ) {
      try {
        const executed =
          await executeSecretaryPendingAction({
            agencyId:
              access.user.agencyId,

            userId:
              access.user.id,

            actionId:
              pendingAction.id,

            decision:
              'confirm',

            channel:
              'WEB',

            authorName:
              access.user.name ||
              access.user.email,
          });


        answer +=
          '\n\nOrdem da diretoria executada.\n' +
          executed.content +
          (
            executed.htmlLink
              ? '\n' +
                executed.htmlLink
              : ''
          );


        pendingAction =
          null;
      }
      catch (
        actionError
      ) {
        answer +=
          '\n\nNao consegui executar a acao: ' +
          (
            actionError instanceof Error
              ? actionError.message
              : String(
                  actionError
                )
          );
      }
    }


    if (
      directorOverride &&
      result.teamAnnouncement
    ) {
      try {
        const delivery =
          await sendDirectorTeamAnnouncement({
            agencyId:
              access.user.agencyId,

            requestedByUserId:
              access.user.id,

            message:
              result.teamAnnouncement,
          });


        answer +=
          '\n\nAviso da diretoria processado. Enviados: ' +
          String(
            delivery.sent
          ) +
          '/' +
          String(
            delivery.total
          ) +
          (
            delivery.waitingTemplate >
              0
              ? '. Aguardando template do WhatsApp: ' +
                String(
                  delivery.waitingTemplate
                )
              : ''
          );
      }
      catch (
        announceError
      ) {
        answer +=
          '\n\nNao consegui avisar a equipe: ' +
          (
            announceError instanceof Error
              ? announceError.message
              : String(
                  announceError
                )
          );
      }
    }


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
              answer,

            inputType:
              'TEXT',

            metadata:
              pendingAction
                ? {
                    pendingActionId:
                      pendingAction.id,
                  }
                : undefined,
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

      threadId:
        thread.id,

      assistantMessage: {
        id:
          assistant.id,

        role:
          assistant.role,

        content:
          assistant.content,

        inputType:
          assistant.inputType,

        createdAt:
          assistant
            .createdAt
            .toISOString(),
      },

      pendingAction,
    });
  }
  catch (
    error
  ) {
    console.error(
      'SECRETARY CHAT ERROR',
      error
    );


    return NextResponse.json(
      {
        ok:
          false,

        message:
          error instanceof Error
            ? error.message
            : 'Erro ao conversar com a Secretária.',
      },
      {
        status:
          500,
      }
    );
  }
}

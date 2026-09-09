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
  runSecretaryTurn,
} from '@/lib/secretaryAi';


export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';

export const maxDuration =
  120;


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
              result
                .pendingAction
                ? {
                    pendingActionId:
                      result
                        .pendingAction
                        .id,
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

      pendingAction:
        result
          .pendingAction,
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
import {
  prisma,
} from '@/lib/prisma';

import {
  hasPermission,
} from '@/lib/userAccess';

import {
  createGoogleCalendarEvent,
} from '@/lib/googleCalendar';


type Decision =
  | 'confirm'
  | 'cancel';


export async function executeSecretaryPendingAction({
  agencyId,
  userId,
  actionId,
  decision,
  channel,
  authorName,
}: {
  agencyId:
    string;

  userId:
    string;

  actionId:
    string;

  decision:
    Decision;

  channel:
    'WEB' |
    'WHATSAPP';

  authorName?:
    string |
    null;
}) {
  const user =
    await prisma.user
      .findFirst({
        where: {
          id:
            userId,

          agencyId,

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
    throw new Error(
      'Você não tem permissão para executar ações pela Secretária IA.'
    );
  }


  const pending =
    await prisma
      .secretaryPendingAction
      .findFirst({
        where: {
          id:
            actionId,

          agencyId,

          userId,

          status:
            'PENDING',
        },
      });


  if (!pending) {
    throw new Error(
      'Essa ação não está mais disponível.'
    );
  }


  if (
    decision ===
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


    await prisma.historyLog
      .create({
        data: {
          entityType:
            'SECRETARY_ACTION',

          entityId:
            pending.id,

          action:
            'SECRETARY_ACTION_CANCELED',

          description:
            'Ação da Secretária cancelada pelo canal ' +
            channel +
            '.',

          authorName:
            authorName ||
            user.name ||
            user.email ||
            'Usuário',
        },
      })
      .catch(
        () =>
          null
      );


    return {
      content:
        'Agendamento cancelado. Nenhuma alteração foi feita no Google Agenda.',

      htmlLink:
        null as
          string |
          null,
    };
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


    throw new Error(
      'Essa confirmação expirou. Peça o agendamento novamente.'
    );
  }


  if (
    pending.type !==
    'GOOGLE_CALENDAR_CREATE'
  ) {
    throw new Error(
      'Tipo de ação não suportado.'
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
    throw new Error(
      'As datas do agendamento são inválidas.'
    );
  }


  const event =
    await createGoogleCalendarEvent({
      agencyId,

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
    throw new Error(
      'O Google Agenda da agência não está conectado.'
    );
  }


  await prisma
    .$transaction([
      prisma
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

              executedChannel:
                channel,
            },
          },
        }),

      prisma.historyLog
        .create({
          data: {
            entityType:
              'SECRETARY_ACTION',

            entityId:
              pending.id,

            action:
              'SECRETARY_GOOGLE_CALENDAR_CREATED',

            description:
              'Compromisso criado no Google Agenda pela Secretária IA via ' +
              channel +
              ': ' +
              String(
                payload.title ||
                'Compromisso'
              ) +
              '.',

            authorName:
              authorName ||
              user.name ||
              user.email ||
              'Usuário',
          },
        }),
    ]);


  return {
    content:
      '✅ Compromisso criado no Google Agenda.',

    htmlLink:
      event.htmlLink ||
      null,
  };
}

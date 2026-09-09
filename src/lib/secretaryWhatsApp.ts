import {
  prisma,
} from '@/lib/prisma';

import {
  decryptMetaSecret,
} from '@/lib/metaCrypto';

import {
  hasPermission,
} from '@/lib/userAccess';

import {
  transcribeSecretaryAudio,
} from '@/lib/secretaryAudio';

import {
  runSecretaryTurn,
} from '@/lib/secretaryAi';

import {
  executeSecretaryPendingAction,
} from '@/lib/secretaryActions';


type JsonRecord =
  Record<
    string,
    unknown
  >;


export function normalizeWhatsappPhone(
  value:
    string
) {
  return String(
    value ||
    ''
  )
    .replace(
      /\D/g,
      ''
    )
    .replace(
      /^0+/,
      ''
    );
}


function getObject(
  value:
    unknown
):
  JsonRecord |
  null {
  return typeof value ===
      'object' &&
    value !==
      null &&
    !Array.isArray(
      value
    )
      ? value as
          JsonRecord
      : null;
}


function getArray(
  value:
    unknown
) {
  return Array.isArray(
    value
  )
    ? value
    : [];
}


function graphVersion(
  value?:
    string |
    null
) {
  const candidate =
    String(
      value ||
      process.env
        .META_GRAPH_VERSION ||
      'v26.0'
    ).trim();


  return /^v\d+\.\d+$/
    .test(
      candidate
    )
      ? candidate
      : 'v26.0';
}


async function getWhatsappConnection(
  agencyId:
    string
) {
  const connection =
    await prisma
      .secretaryWhatsappConnection
      .findUnique({
        where: {
          agencyId,
        },
      });


  if (
    !connection ||
    connection.status !==
      'ATIVO' ||
    !connection.phoneNumberId ||
    !connection
      .encryptedAccessToken
  ) {
    return null;
  }


  return {
    ...connection,

    accessToken:
      decryptMetaSecret(
        connection
          .encryptedAccessToken
      ),
  };
}


async function graphRequest({
  connection,
  path,
  method,
  body,
}: {
  connection:
    NonNullable<
      Awaited<
        ReturnType<
          typeof getWhatsappConnection
        >
      >
    >;

  path:
    string;

  method?:
    string;

  body?:
    unknown;
}) {
  const response =
    await fetch(
      'https://graph.facebook.com/' +
      graphVersion(
        connection
          .graphVersion
      ) +
      '/' +
      path,
      {
        method:
          method ||
          'GET',

        headers: {
          Authorization:
            'Bearer ' +
            connection
              .accessToken,

          ...(body
            ? {
                'Content-Type':
                  'application/json',
              }
            : {}),
        },

        ...(body
          ? {
              body:
                JSON.stringify(
                  body
                ),
            }
          : {}),
      }
    );


  const payload =
    await response
      .json() as
        JsonRecord;


  if (!response.ok) {
    const error =
      payload.error as
        JsonRecord |
        undefined;


    throw new Error(
      typeof error?.message ===
        'string'
        ? error.message
        : 'WhatsApp Cloud API recusou a requisição.'
    );
  }


  return payload;
}


export function whatsappMarkdown(
  value:
    string
) {
  return value
    .replace(
      /^#{1,4}\s+/gm,
      ''
    )
    .replace(
      /\*\*([^*]+)\*\*/g,
      '*$1*'
    );
}


function splitWhatsappText(
  value:
    string
) {
  const text =
    whatsappMarkdown(
      value
    ).trim();


  if (
    text.length <=
    3900
  ) {
    return [
      text,
    ];
  }


  const chunks:
    string[] =
    [];

  let remaining =
    text;


  while (
    remaining.length >
    3900
  ) {
    let cut =
      remaining
        .lastIndexOf(
          '\n',
          3900
        );


    if (
      cut <
      2500
    ) {
      cut =
        remaining
          .lastIndexOf(
            ' ',
            3900
          );
    }


    if (
      cut <
      2500
    ) {
      cut =
        3900;
    }


    chunks.push(
      remaining
        .slice(
          0,
          cut
        )
        .trim()
    );


    remaining =
      remaining
        .slice(
          cut
        )
        .trim();
  }


  if (remaining) {
    chunks.push(
      remaining
    );
  }


  return chunks;
}


export async function sendWhatsappText({
  agencyId,
  to,
  text,
}: {
  agencyId:
    string;

  to:
    string;

  text:
    string;
}) {
  const connection =
    await getWhatsappConnection(
      agencyId
    );


  if (!connection) {
    throw new Error(
      'WhatsApp da agência não está ativo.'
    );
  }


  let lastMessageId:
    string |
    null =
      null;


  for (
    const chunk
    of splitWhatsappText(
      text
    )
  ) {
    const result =
      await graphRequest({
        connection,

        path:
          connection
            .phoneNumberId +
          '/messages',

        method:
          'POST',

        body: {
          messaging_product:
            'whatsapp',

          recipient_type:
            'individual',

          to:
            normalizeWhatsappPhone(
              to
            ),

          type:
            'text',

          text: {
            preview_url:
              false,

            body:
              chunk,
          },
        },
      });


    const messages =
      result.messages as
        Array<
          JsonRecord
        > |
        undefined;


    if (
      Array.isArray(
        messages
      ) &&
      typeof messages[0]?.id ===
        'string'
    ) {
      lastMessageId =
        messages[0].id;
    }
  }


  return {
    messageId:
      lastMessageId,
  };
}


async function sendWhatsappTemplate({
  agencyId,
  to,
  title,
  message,
}: {
  agencyId:
    string;

  to:
    string;

  title:
    string;

  message:
    string;
}) {
  const connection =
    await getWhatsappConnection(
      agencyId
    );


  if (!connection) {
    throw new Error(
      'WhatsApp da agência não está ativo.'
    );
  }


  if (
    !connection
      .alertTemplateName
  ) {
    return {
      sent:
        false as const,
    };
  }


  const result =
    await graphRequest({
      connection,

      path:
        connection
          .phoneNumberId +
        '/messages',

      method:
        'POST',

      body: {
        messaging_product:
          'whatsapp',

        recipient_type:
          'individual',

        to:
          normalizeWhatsappPhone(
            to
          ),

        type:
          'template',

        template: {
          name:
            connection
              .alertTemplateName,

          language: {
            code:
              connection
                .alertTemplateLanguage ||
              'pt_BR',
          },

          components: [
            {
              type:
                'body',

              parameters: [
                {
                  type:
                    'text',

                  text:
                    title
                      .slice(
                        0,
                        250
                      ),
                },

                {
                  type:
                    'text',

                  text:
                    message
                      .slice(
                        0,
                        900
                      ),
                },
              ],
            },
          ],
        },
      },
    });


  const messages =
    result.messages as
      Array<
        JsonRecord
      > |
      undefined;


  return {
    sent:
      true as const,

    messageId:
      Array.isArray(
        messages
      ) &&
      typeof messages[0]?.id ===
        'string'
        ? messages[0].id
        : null,
  };
}


async function downloadWhatsappMedia({
  agencyId,
  mediaId,
}: {
  agencyId:
    string;

  mediaId:
    string;
}) {
  const connection =
    await getWhatsappConnection(
      agencyId
    );


  if (!connection) {
    throw new Error(
      'WhatsApp da agência não está ativo.'
    );
  }


  const metadata =
    await graphRequest({
      connection,

      path:
        mediaId,
    });


  const url =
    typeof metadata.url ===
      'string'
      ? metadata.url
      : '';


  if (!url) {
    throw new Error(
      'A Meta não retornou a URL do áudio.'
    );
  }


  const response =
    await fetch(
      url,
      {
        headers: {
          Authorization:
            'Bearer ' +
            connection
              .accessToken,
        },
      }
    );


  if (!response.ok) {
    throw new Error(
      'Não foi possível baixar o áudio recebido no WhatsApp.'
    );
  }


  return response.blob();
}


export async function ingestWhatsappWebhook(
  payload:
    unknown
) {
  const root =
    getObject(
      payload
    );


  if (!root) {
    return [];
  }


  const eventIds:
    string[] =
    [];


  for (
    const entryRaw
    of getArray(
      root.entry
    )
  ) {
    const entry =
      getObject(
        entryRaw
      );


    if (!entry) {
      continue;
    }


    for (
      const changeRaw
      of getArray(
        entry.changes
      )
    ) {
      const change =
        getObject(
          changeRaw
        );

      const value =
        getObject(
          change?.value
        );

      const metadata =
        getObject(
          value?.metadata
        );


      const phoneNumberId =
        typeof metadata
          ?.phone_number_id ===
          'string'
          ? metadata
              .phone_number_id
          : '';


      if (!phoneNumberId) {
        continue;
      }


      const connection =
        await prisma
          .secretaryWhatsappConnection
          .findUnique({
            where: {
              phoneNumberId,
            },
          });


      if (!connection) {
        continue;
      }


      await prisma
        .secretaryWhatsappConnection
        .update({
          where: {
            id:
              connection.id,
          },

          data: {
            lastWebhookAt:
              new Date(),
          },
        });


      for (
        const messageRaw
        of getArray(
          value?.messages
        )
      ) {
        const message =
          getObject(
            messageRaw
          );


        if (!message) {
          continue;
        }


        const providerMessageId =
          typeof message.id ===
            'string'
            ? message.id
            : '';


        const fromPhone =
          typeof message.from ===
            'string'
            ? normalizeWhatsappPhone(
                message.from
              )
            : '';


        const messageType =
          typeof message.type ===
            'string'
            ? message.type
            : 'unknown';


        if (
          !providerMessageId ||
          !fromPhone
        ) {
          continue;
        }


        const existing =
          await prisma
            .secretaryWhatsappEvent
            .findUnique({
              where: {
                providerMessageId,
              },

              select: {
                id:
                  true,
              },
            });


        if (existing) {
          continue;
        }


        const created =
          await prisma
            .secretaryWhatsappEvent
            .create({
              data: {
                agencyId:
                  connection
                    .agencyId,

                providerMessageId,
                phoneNumberId,
                fromPhone,
                messageType,

                status:
                  'RECEIVED',

                metadata:
                  JSON.parse(
                    JSON.stringify(
                      message
                    )
                  ),
              },
            });


        eventIds.push(
          created.id
        );
      }
    }
  }


  return eventIds;
}


function extractInboundText(
  message:
    JsonRecord
) {
  const type =
    typeof message.type ===
      'string'
      ? message.type
      : '';


  if (
    type ===
    'text'
  ) {
    const text =
      getObject(
        message.text
      );


    return typeof text
      ?.body ===
      'string'
      ? text.body
      : '';
  }


  if (
    type ===
    'interactive'
  ) {
    const interactive =
      getObject(
        message.interactive
      );

    const buttonReply =
      getObject(
        interactive
          ?.button_reply
      );

    const listReply =
      getObject(
        interactive
          ?.list_reply
      );


    if (
      typeof buttonReply
        ?.title ===
        'string'
    ) {
      return buttonReply
        .title;
    }


    if (
      typeof listReply
        ?.title ===
        'string'
    ) {
      return listReply
        .title;
    }
  }


  if (
    type ===
    'button'
  ) {
    const button =
      getObject(
        message.button
      );


    return typeof button
      ?.text ===
      'string'
      ? button.text
      : '';
  }


  return '';
}


async function findOrCreateWhatsappThread({
  agencyId,
  userId,
  phone,
}: {
  agencyId:
    string;

  userId:
    string;

  phone:
    string;
}) {
  const existing =
    await prisma
      .secretaryThread
      .findFirst({
        where: {
          agencyId,
          userId,

          channel:
            'WHATSAPP',

          externalConversationId:
            phone,
        },

        orderBy: {
          updatedAt:
            'desc',
        },
      });


  if (existing) {
    return existing;
  }


  return prisma
    .secretaryThread
    .create({
      data: {
        agencyId,
        userId,

        channel:
          'WHATSAPP',

        externalConversationId:
          phone,

        title:
          'WhatsApp ' +
          phone,
      },
    });
}


async function latestPendingAction({
  agencyId,
  userId,
  threadId,
}: {
  agencyId:
    string;

  userId:
    string;

  threadId:
    string;
}) {
  return prisma
    .secretaryPendingAction
    .findFirst({
      where: {
        agencyId,
        userId,
        threadId,

        status:
          'PENDING',

        OR: [
          {
            expiresAt:
              null,
          },

          {
            expiresAt: {
              gt:
                new Date(),
            },
          },
        ],
      },

      orderBy: {
        createdAt:
          'desc',
      },
    });
}


export async function processWhatsappEvent(
  eventId:
    string
) {
  const event =
    await prisma
      .secretaryWhatsappEvent
      .findUnique({
        where: {
          id:
            eventId,
        },
      });


  if (
    !event ||
    event.status ===
      'PROCESSED'
  ) {
    return;
  }


  try {
    const message =
      getObject(
        event.metadata
      );


    if (!message) {
      throw new Error(
        'Payload de mensagem inválido.'
      );
    }


    const member =
      await prisma
        .secretaryWhatsappMember
        .findUnique({
          where: {
            agencyId_phoneE164: {
              agencyId:
                event.agencyId,

              phoneE164:
                event.fromPhone,
            },
          },
        });


    if (
      !member ||
      !member.isActive ||
      !member.canUseSecretary ||
      !member.userId
    ) {
      await sendWhatsappText({
        agencyId:
          event.agencyId,

        to:
          event.fromPhone,

        text:
          'Este número ainda não está autorizado a usar a Secretária IA. Peça à administração para vinculá-lo a um usuário do AprovUp.',
      })
        .catch(
          () =>
            null
        );


      await prisma
        .secretaryWhatsappEvent
        .update({
          where: {
            id:
              event.id,
          },

          data: {
            status:
              'UNAUTHORIZED',

            processedAt:
              new Date(),
          },
        });


      return;
    }


    const user =
      await prisma.user
        .findFirst({
          where: {
            id:
              member.userId,

            agencyId:
              event.agencyId,

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
      throw new Error(
        'Usuário vinculado sem permissão para usar a Secretária IA.'
      );
    }


    await prisma
      .secretaryWhatsappMember
      .update({
        where: {
          id:
            member.id,
        },

        data: {
          lastInboundAt:
            new Date(),
        },
      });


    let text =
      extractInboundText(
        message
      );

    let inputType =
      'TEXT';


    if (
      event.messageType ===
      'audio'
    ) {
      const audio =
        getObject(
          message.audio
        );

      const mediaId =
        typeof audio?.id ===
          'string'
          ? audio.id
          : '';


      if (!mediaId) {
        throw new Error(
          'Áudio recebido sem media ID.'
        );
      }


      const blob =
        await downloadWhatsappMedia({
          agencyId:
            event.agencyId,

          mediaId,
        });


      text =
        await transcribeSecretaryAudio({
          agencyId:
            event.agencyId,

          blob,

          fileName:
            'whatsapp-audio',
        });


      inputType =
        'AUDIO';
    }


    if (!text.trim()) {
      await sendWhatsappText({
        agencyId:
          event.agencyId,

        to:
          event.fromPhone,

        text:
          'No momento eu entendo mensagens de texto e áudio. Envie sua solicitação em um desses formatos.',
      });


      await prisma
        .secretaryWhatsappEvent
        .update({
          where: {
            id:
              event.id,
          },

          data: {
            status:
              'PROCESSED',

            processedAt:
              new Date(),
          },
        });


      return;
    }


    const thread =
      await findOrCreateWhatsappThread({
        agencyId:
          event.agencyId,

        userId:
          user.id,

        phone:
          event.fromPhone,
      });


    const normalizedCommand =
      text
        .trim()
        .normalize(
          'NFD'
        )
        .replace(
          /[\u0300-\u036f]/g,
          ''
        )
        .toUpperCase();


    if (
      normalizedCommand ===
        'CONFIRMAR' ||
      normalizedCommand ===
        'CANCELAR'
    ) {
      if (
        !member
          .canConfirmActions ||
        !hasPermission(
          user,
          'secretary.act'
        )
      ) {
        await sendWhatsappText({
          agencyId:
            event.agencyId,

          to:
            event.fromPhone,

          text:
            'Você não tem permissão para confirmar ações pelo WhatsApp.',
        });
      }
      else {
        const pending =
          await latestPendingAction({
            agencyId:
              event.agencyId,

            userId:
              user.id,

            threadId:
              thread.id,
          });


        if (!pending) {
          await sendWhatsappText({
            agencyId:
              event.agencyId,

            to:
              event.fromPhone,

            text:
              'Não encontrei nenhuma ação aguardando confirmação.',
          });
        }
        else {
          const result =
            await executeSecretaryPendingAction({
              agencyId:
                event.agencyId,

              userId:
                user.id,

              actionId:
                pending.id,

              decision:
                normalizedCommand ===
                  'CONFIRMAR'
                  ? 'confirm'
                  : 'cancel',

              channel:
                'WHATSAPP',

              authorName:
                member
                  .displayName ||
                user.name ||
                user.email,
            });


          await prisma
            .secretaryMessage
            .create({
              data: {
                threadId:
                  thread.id,

                role:
                  'USER',

                content:
                  text,

                inputType:
                  'TEXT',
              },
            });


          await prisma
            .secretaryMessage
            .create({
              data: {
                threadId:
                  thread.id,

                role:
                  'ASSISTANT',

                content:
                  result.content,

                inputType:
                  'TEXT',
              },
            });


          await sendWhatsappText({
            agencyId:
              event.agencyId,

            to:
              event.fromPhone,

            text:
              result.content,
          });
        }
      }


      await prisma
        .secretaryWhatsappEvent
        .update({
          where: {
            id:
              event.id,
          },

          data: {
            status:
              'PROCESSED',

            transcript:
              inputType ===
                'AUDIO'
                ? text
                : null,

            processedAt:
              new Date(),
          },
        });


      return;
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
            text,

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
          event.agencyId,

        userId:
          user.id,

        threadId:
          thread.id,

        conversation,

        canExecuteActions:
          member
            .canConfirmActions &&
          hasPermission(
            user,
            'secretary.act'
          ),
      });


    let answer =
      result.answer;


    if (
      result.pendingAction
    ) {
      answer +=
        '\n\n*Confirmação necessária:* responda *CONFIRMAR* para executar ou *CANCELAR* para desistir.';
    }


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


    const sent =
      await sendWhatsappText({
        agencyId:
          event.agencyId,

        to:
          event.fromPhone,

        text:
          answer,
      });


    await prisma
      .secretaryWhatsappEvent
      .update({
        where: {
          id:
            event.id,
        },

        data: {
          status:
            'PROCESSED',

          transcript:
            inputType ===
              'AUDIO'
              ? text
              : null,

          responseMessageId:
            sent.messageId,

          processedAt:
            new Date(),
        },
      });
  }
  catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : 'Erro desconhecido.';


    await prisma
      .secretaryWhatsappEvent
      .update({
        where: {
          id:
            event.id,
        },

        data: {
          status:
            'ERROR',

          error:
            message.slice(
              0,
              2000
            ),

          processedAt:
            new Date(),
        },
      });


    console.error(
      'SECRETARY WHATSAPP EVENT ERROR',
      event.id,
      error
    );
  }
}


export async function processPendingWhatsappEvents(
  limit =
    10
) {
  const events =
    await prisma
      .secretaryWhatsappEvent
      .findMany({
        where: {
          status:
            'RECEIVED',
        },

        orderBy: {
          createdAt:
            'asc',
        },

        take:
          limit,
      });


  for (
    const event
    of events
  ) {
    await processWhatsappEvent(
      event.id
    );
  }


  return events.length;
}


async function sendProactive({
  agencyId,
  memberId,
  toPhone,
  title,
  message,
  dedupKey,
}: {
  agencyId:
    string;

  memberId:
    string;

  toPhone:
    string;

  title:
    string;

  message:
    string;

  dedupKey:
    string;
}) {
  const member =
    await prisma
      .secretaryWhatsappMember
      .findUnique({
        where: {
          id:
            memberId,
        },
      });


  if (!member) {
    return {
      status:
        'SKIPPED',
    };
  }


  const existing =
    await prisma
      .secretaryWhatsappDelivery
      .findUnique({
        where: {
          agencyId_dedupKey: {
            agencyId,
            dedupKey,
          },
        },
      });


  if (
    existing?.status ===
    'SENT'
  ) {
    return {
      status:
        'SENT',
    };
  }


  const insideWindow =
    Boolean(
      member
        .lastInboundAt &&
      member
        .lastInboundAt
        .getTime() >=
        Date.now() -
          24 *
            60 *
            60 *
            1000
    );


  try {
    let providerMessageId:
      string |
      null =
        null;

    let templateUsed =
      false;


    if (insideWindow) {
      const result =
        await sendWhatsappText({
          agencyId,
          to:
            toPhone,

          text:
            '*Secretária IA*\n\n*' +
            title +
            '*\n' +
            message,
        });


      providerMessageId =
        result.messageId;
    }
    else {
      const result =
        await sendWhatsappTemplate({
          agencyId,
          to:
            toPhone,
          title,
          message,
        });


      if (!result.sent) {
        await prisma
          .secretaryWhatsappDelivery
          .upsert({
            where: {
              agencyId_dedupKey: {
                agencyId,
                dedupKey,
              },
            },

            create: {
              agencyId,
              dedupKey,
              memberId,
              toPhone,

              status:
                'WAITING_TEMPLATE',

              templateUsed:
                false,
            },

            update: {
              status:
                'WAITING_TEMPLATE',

              error:
                null,
            },
          });


        return {
          status:
            'WAITING_TEMPLATE',
        };
      }


      templateUsed =
        true;

      providerMessageId =
        result.messageId;
    }


    await prisma
      .secretaryWhatsappDelivery
      .upsert({
        where: {
          agencyId_dedupKey: {
            agencyId,
            dedupKey,
          },
        },

        create: {
          agencyId,
          dedupKey,
          memberId,
          toPhone,

          status:
            'SENT',

          providerMessageId,

          templateUsed,

          sentAt:
            new Date(),
        },

        update: {
          status:
            'SENT',

          providerMessageId,

          templateUsed,

          sentAt:
            new Date(),

          error:
            null,
        },
      });


    return {
      status:
        'SENT',
    };
  }
  catch (
    error
  ) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Erro desconhecido.';


    await prisma
      .secretaryWhatsappDelivery
      .upsert({
        where: {
          agencyId_dedupKey: {
            agencyId,
            dedupKey,
          },
        },

        create: {
          agencyId,
          dedupKey,
          memberId,
          toPhone,

          status:
            'ERROR',

          error:
            errorMessage.slice(
              0,
              2000
            ),
        },

        update: {
          status:
            'ERROR',

          error:
            errorMessage.slice(
              0,
              2000
            ),
        },
      });


    return {
      status:
        'ERROR',
    };
  }
}


export async function deliverSecretaryAlertsToWhatsapp() {
  const connections =
    await prisma
      .secretaryWhatsappConnection
      .findMany({
        where: {
          status:
            'ATIVO',

          proactiveEnabled:
            true,

          encryptedAccessToken: {
            not:
              null,
          },

          phoneNumberId: {
            not:
              null,
          },
        },
      });


  let attempts =
    0;


  for (
    const connection
    of connections
  ) {
    const [
      alerts,
      members,
    ] =
      await Promise.all([
        prisma
          .secretaryAlert
          .findMany({
            where: {
              agencyId:
                connection
                  .agencyId,

              status:
                'OPEN',
            },

            orderBy: {
              createdAt:
                'asc',
            },

            take:
              50,
          }),

        prisma
          .secretaryWhatsappMember
          .findMany({
            where: {
              agencyId:
                connection
                  .agencyId,

              isActive:
                true,

              receiveAlerts:
                true,
            },
          }),
      ]);


    for (
      const alert
      of alerts
    ) {
      for (
        const member
        of members
      ) {
        attempts +=
          1;


        await sendProactive({
          agencyId:
            connection
              .agencyId,

          memberId:
            member.id,

          toPhone:
            member
              .phoneE164,

          title:
            alert.title,

          message:
            alert.message,

          dedupKey:
            'alert:' +
            alert.id +
            ':' +
            member.id,
        });
      }
    }
  }


  return attempts;
}


function maceioParts() {
  const parts =
    new Intl
      .DateTimeFormat(
        'en-CA',
        {
          timeZone:
            'America/Maceio',

          year:
            'numeric',

          month:
            '2-digit',

          day:
            '2-digit',

          hour:
            '2-digit',

          hourCycle:
            'h23',
        }
      )
      .formatToParts(
        new Date()
      );


  const map =
    new Map(
      parts.map(
        (
          item
        ) => [
          item.type,
          item.value,
        ]
      )
    );


  return {
    dateKey:
      (
        map.get(
          'year'
        ) ||
        ''
      ) +
      '-' +
      (
        map.get(
          'month'
        ) ||
        ''
      ) +
      '-' +
      (
        map.get(
          'day'
        ) ||
        ''
      ),

    hour:
      Number(
        map.get(
          'hour'
        ) ||
        0
      ),
  };
}


export async function deliverSecretaryDailyBriefs() {
  const local =
    maceioParts();


  if (
    local.hour !==
    8
  ) {
    return 0;
  }


  const start =
    new Date(
      local.dateKey +
      'T03:00:00.000Z'
    );

  const end =
    new Date(
      start.getTime() +
      24 *
        60 *
        60 *
        1000
    );


  const connections =
    await prisma
      .secretaryWhatsappConnection
      .findMany({
        where: {
          status:
            'ATIVO',

          proactiveEnabled:
            true,
        },
      });


  let sent =
    0;


  for (
    const connection
    of connections
  ) {
    const members =
      await prisma
        .secretaryWhatsappMember
        .findMany({
          where: {
            agencyId:
              connection
                .agencyId,

            isActive:
              true,

            receiveAlerts:
              true,
          },
        });


    if (
      members.length ===
      0
    ) {
      continue;
    }


    const [
      planned,
      pendingApprovals,
      publications,
      openAlerts,
    ] =
      await Promise.all([
        prisma.content
          .count({
            where: {
              client: {
                agencyId:
                  connection
                    .agencyId,
              },

              plannedDate: {
                gte:
                  start,

                lt:
                  end,
              },
            },
          }),

        prisma.approval
          .count({
            where: {
              status:
                'PENDENTE',

              content: {
                client: {
                  agencyId:
                    connection
                      .agencyId,
                },
              },
            },
          }),

        prisma
          .instagramPublication
          .findMany({
            where: {
              content: {
                client: {
                  agencyId:
                    connection
                      .agencyId,
                },
              },

              OR: [
                {
                  scheduledFor: {
                    gte:
                      start,

                    lt:
                      end,
                  },
                },

                {
                  publishedAt: {
                    gte:
                      start,

                    lt:
                      end,
                  },
                },
              ],
            },

            select: {
              status:
                true,
            },
          }),

        prisma
          .secretaryAlert
          .count({
            where: {
              agencyId:
                connection
                  .agencyId,

              status:
                'OPEN',
            },
          }),
      ]);


    const published =
      publications
        .filter(
          (
            item
          ) =>
            item.status ===
            'PUBLICADO'
        )
        .length;

    const errors =
      publications
        .filter(
          (
            item
          ) =>
            item.status ===
            'ERRO'
        )
        .length;

    const scheduled =
      publications
        .filter(
          (
            item
          ) =>
            item.status ===
            'AGENDADO'
        )
        .length;


    const message =
      [
        'Conteúdos planejados hoje: ' +
          planned,

        'Aprovações pendentes: ' +
          pendingApprovals,

        'Instagram hoje — publicados: ' +
          published +
          ', agendados: ' +
          scheduled +
          ', erros: ' +
          errors,

        'Alertas operacionais abertos: ' +
          openAlerts,
      ].join(
        '\n'
      );


    for (
      const member
      of members
    ) {
      const result =
        await sendProactive({
          agencyId:
            connection
              .agencyId,

          memberId:
            member.id,

          toPhone:
            member
              .phoneE164,

          title:
            'Resumo da operação — ' +
            local.dateKey,

          message,

          dedupKey:
            'daily:' +
            local.dateKey +
            ':' +
            member.id,
        });


      if (
        result.status ===
        'SENT'
      ) {
        sent +=
          1;
      }
    }
  }


  return sent;
}

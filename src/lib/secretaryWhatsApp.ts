import {
  prisma,
} from '@/lib/prisma';

import {
  canAccessClient,
} from '@/lib/clientAccess';

import {
  decryptMetaSecret,
} from '@/lib/metaCrypto';

import {
  hasPermission,
} from '@/lib/userAccess';

import {
  ensureWeeklyAgencyMeeting,
  findGoogleCalendarEvents,
} from '@/lib/googleCalendar';

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
                    String(
                      title ??
                      ''
                    )
                      .replace(
                        /[\r\n\t]+/g,
                        ' '
                      )
                      .replace(
                        /\s{2,}/g,
                        ' '
                      )
                      .trim()
                      .slice(
                        0,
                        900
                      ) ||
                    '-',
                },

                {
                  type:
                    'text',

                  text:
                    String(
                      message ??
                      ''
                    )
                      .replace(
                        /[\r\n\t]+/g,
                        ' '
                      )
                      .replace(
                        /\s{2,}/g,
                        ' '
                      )
                      .trim()
                      .slice(
                        0,
                        900
                      ) ||
                    '-',
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


      /*
       * SECRETARY WHATSAPP STATUS TRACKING
       * Atualiza a entrega com o retorno real da Meta:
       * sent, delivered, read ou failed.
       */
      for (
        const statusRaw
        of getArray(
          value?.statuses
        )
      ) {
        const messageStatus =
          getObject(
            statusRaw
          );

        if (!messageStatus) {
          continue;
        }

        const providerMessageId =
          typeof messageStatus.id ===
            'string'
            ? messageStatus.id
            : '';

        const providerStatus =
          typeof messageStatus.status ===
            'string'
            ? messageStatus.status.toLowerCase()
            : '';

        if (
          !providerMessageId ||
          !providerStatus
        ) {
          continue;
        }

        const mappedStatus =
          providerStatus ===
            'delivered'
            ? 'DELIVERED'
            : providerStatus ===
                'read'
              ? 'READ'
              : providerStatus ===
                  'failed'
                ? 'FAILED'
                : providerStatus ===
                    'sent'
                  ? 'SENT'
                  : providerStatus.toUpperCase();

        const providerErrors =
          getArray(
            messageStatus.errors
          )
            .map(
              (item) =>
                getObject(
                  item
                )
            )
            .filter(
              (item): item is JsonRecord =>
                Boolean(
                  item
                )
            );

        const providerError =
          providerErrors
            .map(
              (item) =>
                typeof item.message ===
                  'string'
                  ? item.message
                  : typeof item.title ===
                      'string'
                    ? item.title
                    : typeof item.code ===
                        'number'
                      ? 'Meta error ' +
                        String(
                          item.code
                        )
                      : ''
            )
            .filter(
              Boolean
            )
            .join(
              ' | '
            );

        await prisma
          .secretaryWhatsappDelivery
          .updateMany({
            where: {
              agencyId:
                connection.agencyId,

              providerMessageId,
            },

            data: {
              status:
                mappedStatus,

              error:
                mappedStatus ===
                  'FAILED'
                  ? (
                      providerError ||
                      'Meta marcou a mensagem como failed.'
                    )
                  : null,
            },
          });
      }


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


    /*
     * No WhatsApp, a autorização é controlada
     * pelo cadastro SecretaryWhatsappMember.
     *
     * O usuário já passou acima pelas validações:
     * - membro ativo
     * - canUseSecretary = true
     * - usuário vinculado
     *
     * A permissão secretary.use continua sendo
     * utilizada para controlar o acesso pela WEB,
     * mas não deve bloquear um membro explicitamente
     * autorizado no canal WhatsApp.
     */
    if (!user) {
      throw new Error(
        'Usuário vinculado não está aprovado ou não pertence à agência.'
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
  /*
   * LIV_PROACTIVE_HOURS_MACEIO
   *
   * Avisos automáticos só podem sair entre
   * 08:00 e 17:59 no horário de Maceió.
   *
   * Fora desse período a LIV continua respondendo
   * normalmente às mensagens recebidas.
   */
  const proactiveHourPart =
    new Intl.DateTimeFormat(
      'en-US',
      {
        timeZone:
          'America/Maceio',

        hour:
          '2-digit',

        hourCycle:
          'h23',
      }
    )
      .formatToParts(
        new Date()
      )
      .find(
        (
          part
        ) =>
          part.type ===
          'hour'
      );


  const proactiveHour =
    Number(
      proactiveHourPart
        ?.value ??
      '-1'
    );


  const isEveningAgenda =
    proactiveHour ===
      18 &&
    (
      dedupKey.startsWith(
        'calendar-tomorrow:'
      ) ||
      dedupKey.startsWith(
        'capture-tomorrow:'
      )
    );


  if (
    proactiveHour <
      8 ||
    (
      proactiveHour >=
        18 &&
      !isEveningAgenda
    )
  ) {
    return {
      status:
        'SKIPPED',
    };
  }


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
    [
      'SENT',
      'DELIVERED',
      'READ',
    ].includes(
      existing?.status ||
      ''
    )
  ) {
    return {
      status:
        'SENT',
    };
  }


  if (
    [
      'FAILED',
      'ERROR',
    ].includes(
      existing?.status ||
      ''
    )
  ) {
    return {
      status:
        'SKIPPED',
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


    if (
      member.userId
    ) {
      try {
        const thread =
          await findOrCreateWhatsappThread({
            agencyId,
            userId:
              member.userId,
            phone:
              toPhone,
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
                '*Secretária IA*\n\n*' +
                title +
                '*\n' +
                message,

              inputType:
                'TEXT',

              metadata: {
                proactive:
                  true,

                dedupKey,
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
      }
      catch (
        historyError
      ) {
        console.error(
          'SECRETARY WHATSAPP HISTORY ERROR',
          historyError
        );
      }
    }


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



export async function notifyEmergencyDemandReadyToSocialMedia({
  agencyId,
  contentId,
  uploadKey,
}: {
  agencyId: string;
  contentId: string;
  uploadKey: string;
}) {
  const content =
    await prisma.content
      .findFirst({
        where: {
          id:
            contentId,

          client: {
            agencyId,
          },
        },

        include: {
          client:
            true,
        },
      });


  const isEmergencyDemand =
    content?.format ===
    'DEMANDA_EMERGENCIAL';


  const isGraphicDesign =
    content?.format ===
    'DESIGN_GRAFICO';


  if (
    !content ||
    (
      !isEmergencyDemand &&
      !isGraphicDesign
    ) ||
    ![
      'DESIGN',
      'FILMMAKER',
    ].includes(
      content.area
    )
  ) {
    return {
      status:
        'SKIPPED' as const,

      recipients:
        0,

      sent:
        0,
    };
  }


  /*
   * Usa exatamente a mesma regra de acesso
   * dos clientes para descobrir qual Social Media
   * é responsável por este cliente.
   */
  const socialUsers =
    await prisma.user
      .findMany({
        where: {
          agencyId,

          role:
            'SOCIAL_MEDIA',

          status:
            'APROVADO',
        },

        select: {
          id:
            true,

          name:
            true,

          email:
            true,

          role:
            true,

          agencyId:
            true,
        },
      });


  const responsibleUsers =
    socialUsers.filter(
      (
        user
      ) =>
        canAccessClient(
          user,
          content.client
        )
    );


  if (
    responsibleUsers.length ===
    0
  ) {
    console.warn(
      'LIV EMERGENCY READY: nenhum Social Media responsável encontrado.',
      content.id,
      content.client.name
    );

    return {
      status:
        'NO_RESPONSIBLE_SOCIAL' as const,

      recipients:
        0,

      sent:
        0,
    };
  }


  const responsibleUserIds =
    responsibleUsers.map(
      (
        user
      ) =>
        user.id
    );


  const members =
    await prisma
      .secretaryWhatsappMember
      .findMany({
        where: {
          agencyId,

          isActive:
            true,

          receiveAlerts:
            true,

          userId: {
            in:
              responsibleUserIds,
          },
        },
      });


  if (
    members.length ===
    0
  ) {
    console.warn(
      'LIV EMERGENCY READY: Social Media responsável não possui WhatsApp ativo para alertas.',
      content.id
    );

    return {
      status:
        'NO_WHATSAPP_MEMBER' as const,

      recipients:
        responsibleUsers.length,

      sent:
        0,
    };
  }


  const areaLabel =
    content.area ===
      'DESIGN'
      ? 'Design'
      : 'Filmmaker';


  const title =
    isGraphicDesign
      ? '🎨 Design gráfico pronto'
      : '🚨 Demanda emergencial pronta';


  const message =
    isGraphicDesign
      ? [
          'O material *' +
            content.title +
            '*, do cliente *' +
            content.client.name +
            '*, acabou de ser finalizado pelo Design.',

          'Já está disponível no AprovUp para você conferir e baixar pelo calendário.',
        ].join(
          '\n\n'
        )
      : [
          'O material de *' +
            content.title +
            '*, do cliente *' +
            content.client.name +
            '*, acabou de ser finalizado pelo ' +
            areaLabel +
            '.',

          'Já está disponível no AprovUp para você revisar e encaminhar ao cliente para aprovação.',
        ].join(
          '\n\n'
        );


  let sent =
    0;

  let waitingTemplate =
    0;

  let errors =
    0;


  for (
    const member
    of members
  ) {
    const result =
      await sendProactive({
        agencyId,

        memberId:
          member.id,

        toPhone:
          member.phoneE164,

        title,

        message,

        /*
         * uploadKey identifica a versão enviada.
         * O mesmo upload nunca dispara duas vezes,
         * mas uma nova versão poderá avisar novamente.
         */
        dedupKey:
          (
            isGraphicDesign
              ? 'graphic-ready:'
              : 'emergency-ready:'
          ) +
          content.id +
          ':' +
          uploadKey +
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
    else if (
      result.status ===
      'WAITING_TEMPLATE'
    ) {
      waitingTemplate +=
        1;
    }
    else if (
      result.status ===
      'ERROR'
    ) {
      errors +=
        1;
    }
  }


  await prisma.historyLog
    .create({
      data: {
        entityType:
          'CONTENT',

        entityId:
          content.id,

        action:
          isGraphicDesign
            ? 'GRAPHIC_DESIGN_READY_SOCIAL_NOTIFIED'
            : 'EMERGENCY_READY_SOCIAL_NOTIFIED',

        description:
          (
            isGraphicDesign
              ? 'LIV processou o aviso do Design Gráfico pronto para a Social Media responsável. '
              : 'LIV processou o aviso da demanda emergencial pronta para a Social Media responsável. '
          ) +
          'Enviados: ' +
          sent +
          '. Aguardando template: ' +
          waitingTemplate +
          '. Erros: ' +
          errors +
          '.',

        authorName:
          'LIV',
      },
    })
    .catch(
      () =>
        null
    );


  return {
    status:
      'PROCESSED' as const,

    recipients:
      members.length,

    sent,

    waitingTemplate,

    errors,
  };
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


  const local =
    maceioParts();


  for (
    const connection
    of connections
  ) {
    const [
      alerts,
      members,
    ] =
      await Promise.all([
        prisma.secretaryAlert
          .findMany({
            where: {
              agencyId:
                connection.agencyId,

              status:
                'OPEN',
            },

            orderBy: {
              createdAt:
                'asc',
            },

            take:
              200,
          }),

        prisma
          .secretaryWhatsappMember
          .findMany({
            where: {
              agencyId:
                connection.agencyId,

              isActive:
                true,

              receiveAlerts:
                true,

              userId: {
                not:
                  null,
              },
            },
          }),
      ]);


    if (
      !alerts.length ||
      !members.length
    ) {
      continue;
    }


    const userIds =
      members
        .map(
          (
            member
          ) =>
            member.userId
        )
        .filter(
          (
            value
          ): value is string =>
            Boolean(
              value
            )
        );


    const users =
      userIds.length
        ? await prisma.user
            .findMany({
              where: {
                agencyId:
                  connection.agencyId,

                id: {
                  in:
                    userIds,
                },

                status:
                  'APROVADO',
              },

              select: {
                id:
                  true,

                name:
                  true,

                email:
                  true,

                role:
                  true,

                agencyId:
                  true,
              },
            })
        : [];


    const userById =
      new Map(
        users.map(
          (
            user
          ) => [
            user.id,
            user,
          ] as const
        )
      );


    const clientIds =
      Array.from(
        new Set(
          alerts
            .map(
              (
                alert
              ) =>
                alert.clientId
            )
            .filter(
              (
                value
              ): value is string =>
                Boolean(
                  value
                )
            )
        )
      );


    const clients =
      clientIds.length
        ? await prisma.client
            .findMany({
              where: {
                agencyId:
                  connection.agencyId,

                id: {
                  in:
                    clientIds,
                },
              },

              select: {
                id:
                  true,

                name:
                  true,

                agencyId:
                  true,

                internalResponsible:
                  true,
              },
            })
        : [];


    const clientById =
      new Map(
        clients.map(
          (
            client
          ) => [
            client.id,
            client,
          ] as const
        )
      );


    const recipients =
      members
        .map(
          (
            member
          ) => {
            if (
              !member.userId
            ) {
              return null;
            }


            const user =
              userById.get(
                member.userId
              );


            if (!user) {
              return null;
            }


            return {
              member,
              user,
            };
          }
        )
        .filter(
          (
            value
          ): value is NonNullable<typeof value> =>
            Boolean(
              value
            )
        );


    function memberCanReceiveAlert(
      recipient:
        typeof recipients[number],

      alert:
        typeof alerts[number]
    ) {
      if (
        recipient.user.role ===
        'DIRECTOR'
      ) {
        return true;
      }


      if (
        recipient.user.role !==
        'SOCIAL_MEDIA'
      ) {
        return false;
      }


      if (
        !alert.clientId
      ) {
        return false;
      }


      const client =
        clientById.get(
          alert.clientId
        );


      if (!client) {
        return false;
      }


      return canAccessClient(
        recipient.user,
        client
      );
    }


    /*
     * Aprovações antigas não precisam gerar
     * vários balões individuais.
     *
     * Cada pessoa recebe no máximo UM resumo
     * por dia com apenas os clientes que pode ver.
     */
    const approvalAlerts =
      alerts.filter(
        (
          alert
        ) =>
          [
            'APPROVAL_WAITING',
            'MONTHLY_APPROVAL_WAITING',
          ].includes(
            alert.type
          )
      );


    for (
      const recipient
      of recipients
    ) {
      if (
        ![
          'DIRECTOR',
          'SOCIAL_MEDIA',
        ].includes(
          recipient.user.role
        )
      ) {
        continue;
      }


      const personalApprovals =
        approvalAlerts.filter(
          (
            alert
          ) =>
            memberCanReceiveAlert(
              recipient,
              alert
            )
        );


      if (
        personalApprovals.length ===
        0
      ) {
        continue;
      }


      const lines =
        personalApprovals
          .slice(
            0,
            25
          )
          .map(
            (
              alert,
              index
            ) => {
              const client =
                alert.clientId
                  ? clientById.get(
                      alert.clientId
                    )
                  : null;

              const clientName =
                client?.name ||
                'Cliente';

              let detail =
                String(
                  alert.message ||
                  ''
                ).trim();

              for (
                const prefix
                of [
                  clientName + ':',
                  clientName + ' —',
                  clientName + ' -',
                ]
              ) {
                if (
                  detail
                    .toLowerCase()
                    .startsWith(
                      prefix
                        .toLowerCase()
                    )
                ) {
                  detail =
                    detail
                      .slice(
                        prefix.length
                      )
                      .trim();

                  break;
                }
              }

              return (
                String(
                  index +
                  1
                ) +
                ') ' +
                clientName +
                (
                  detail
                    ? ' — ' +
                      detail
                    : ''
                )
              );
            }
          );


      if (
        personalApprovals.length >
        25
      ) {
        lines.push(
          '➕ Mais ' +
          String(
            personalApprovals.length -
            25
          ) +
          ' pendência(s).'
        );
      }


      const result =
        await sendProactive({
          agencyId:
            connection.agencyId,

          memberId:
            recipient.member.id,

          toPhone:
            recipient.member.phoneE164,

          title:
            '⚠️ Aprovações que precisam de atenção',

          message:
            [
              '📋 ' +
                String(
                  personalApprovals.length
                ) +
                ' aprovação(ões) pendente(s) há mais de 48h.',

              '👥 ' +
                lines.join(
                  ' • '
                ),

              '👉 Consulte o AprovUp para acompanhar.',
            ].join(
              '  '
            ),

          dedupKey:
            'approval-digest:' +
            local.dateKey +
            ':' +
            recipient.member.id,
        });


      attempts +=
        1;


      /*
       * O sendProactive já controla duplicidade.
       * Não precisamos mandar cada alerta separadamente.
       */
      void result;
    }


    /*
     * Alertas de publicação são operacionais e
     * podem ser urgentes.
     *
     * Apenas alertas criados depois da última
     * alteração da conexão são elegíveis.
     * Assim, reativar a LIV não despeja backlog antigo.
     */
    const publicationAlerts =
      alerts.filter(
        (
          alert
        ) =>
          [
            'INSTAGRAM_PUBLICATION_ERROR',
            'INSTAGRAM_PUBLICATION_OVERDUE',
          ].includes(
            alert.type
          ) &&
          alert.createdAt >=
            connection.updatedAt
      );


    for (
      const alert
      of publicationAlerts
    ) {
      for (
        const recipient
        of recipients
      ) {
        if (
          !memberCanReceiveAlert(
            recipient,
            alert
          )
        ) {
          continue;
        }


        attempts +=
          1;


        await sendProactive({
          agencyId:
            connection.agencyId,

          memberId:
            recipient.member.id,

          toPhone:
            recipient.member.phoneE164,

          title:
            alert.title,

          message:
            alert.message,

          dedupKey:
            'alert:' +
            alert.id +
            ':' +
            recipient.member.id,
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

          weekday:
            'short',

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

    weekday:
      map.get(
        'weekday'
      ) ||
      '',
  };
}


export async function deliverSecretaryDailyBriefs() {
  const local =
    maceioParts();


  /*
   * O resumo é enviado somente na janela das 08h.
   * O dedup individual impede mais de uma mensagem
   * para a mesma pessoa no mesmo dia.
   */
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
              connection.agencyId,

            isActive:
              true,

            receiveAlerts:
              true,

            userId: {
              not:
                null,
            },
          },
        });


    if (
      !members.length
    ) {
      continue;
    }


    const userIds =
      members
        .map(
          (
            member
          ) =>
            member.userId
        )
        .filter(
          (
            value
          ): value is string =>
            Boolean(
              value
            )
        );


    const [
      users,
      clients,
    ] =
      await Promise.all([
        prisma.user
          .findMany({
            where: {
              agencyId:
                connection.agencyId,

              id: {
                in:
                  userIds,
              },

              status:
                'APROVADO',

              role: {
                in: [
                  'DIRECTOR',
                  'SOCIAL_MEDIA',
                ],
              },
            },

            select: {
              id:
                true,

              name:
                true,

              email:
                true,

              role:
                true,

              agencyId:
                true,
            },
          }),

        prisma.client
          .findMany({
            where: {
              agencyId:
                connection.agencyId,
            },

            select: {
              id:
                true,

              name:
                true,

              agencyId:
                true,

              internalResponsible:
                true,
            },

            orderBy: {
              name:
                'asc',
            },
          }),
      ]);


    const userById =
      new Map(
        users.map(
          (
            user
          ) => [
            user.id,
            user,
          ] as const
        )
      );


    for (
      const member
      of members
    ) {
      if (
        !member.userId
      ) {
        continue;
      }


      const user =
        userById.get(
          member.userId
        );


      if (!user) {
        continue;
      }


      const isDirector =
        user.role ===
        'DIRECTOR';


      /*
       * Diretoria enxerga todos os clientes.
       * Social Media usa exatamente a mesma regra
       * oficial de carteira do restante do AprovUp.
       */
      const accessibleClients =
        isDirector
          ? clients
          : clients.filter(
              (
                client
              ) =>
                canAccessClient(
                  user,
                  client
                )
            );


      const clientIds =
        accessibleClients.map(
          (
            client
          ) =>
            client.id
        );


      const [
        planned,
        pendingApprovals,
        pendingMonthlyApprovals,
        publications,
        openAlerts,
        socialAttention,
      ] =
        await Promise.all([
          clientIds.length
            ? prisma.content
                .count({
                  where: {
                    clientId: {
                      in:
                        clientIds,
                    },

                    plannedDate: {
                      gte:
                        start,

                      lt:
                        end,
                    },
                  },
                })
            : Promise.resolve(
                0
              ),

          clientIds.length
            ? prisma.approval
                .count({
                  where: {
                    status:
                      'PENDENTE',

                    content: {
                      clientId: {
                        in:
                          clientIds,
                      },
                    },
                  },
                })
            : Promise.resolve(
                0
              ),

          clientIds.length
            ? prisma.monthlyApproval
                .count({
                  where: {
                    status:
                      'PENDENTE',

                    clientId: {
                      in:
                        clientIds,
                    },
                  },
                })
            : Promise.resolve(
                0
              ),

          clientIds.length
            ? prisma
                .instagramPublication
                .findMany({
                  where: {
                    content: {
                      clientId: {
                        in:
                          clientIds,
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
                })
            : Promise.resolve(
                []
              ),

          isDirector
            ? prisma
                .secretaryAlert
                .count({
                  where: {
                    agencyId:
                      connection.agencyId,

                    status:
                      'OPEN',
                  },
                })
            : clientIds.length
              ? prisma
                  .secretaryAlert
                  .count({
                    where: {
                      agencyId:
                        connection.agencyId,

                      status:
                        'OPEN',

                      clientId: {
                        in:
                          clientIds,
                      },
                    },
                  })
              : Promise.resolve(
                  0
                ),

          clientIds.length
            ? prisma.content
                .count({
                  where: {
                    clientId: {
                      in:
                        clientIds,
                    },

                    status: {
                      in: [
                        'ALTERACAO_SOLICITADA',
                        'DESIGN_DUVIDA',
                        'FILMMAKER_DUVIDA_SOCIAL',
                      ],
                    },
                  },
                })
            : Promise.resolve(
                0
              ),
        ]);


      const published =
        publications.filter(
          (
            item
          ) =>
            item.status ===
            'PUBLICADO'
        ).length;


      const errors =
        publications.filter(
          (
            item
          ) =>
            item.status ===
            'ERRO'
        ).length;


      const scheduled =
        publications.filter(
          (
            item
          ) =>
            item.status ===
            'AGENDADO'
        ).length;


      const firstName =
        String(
          user.name ||
          ''
        )
          .trim()
          .split(
            /\s+/
          )[0] ||
        'Equipe';


      const intro =
        isDirector
          ? 'Visão geral da agência.'
          : (
              'Sua carteira possui ' +
              String(
                accessibleClients.length
              ) +
              ' cliente(s).'
            );


      const attentionLabel =
        isDirector
          ? 'Itens aguardando ação da Social Media: '
          : 'Itens que precisam da sua atenção: ';


      const message =
        [
          'Bom dia, ' +
            firstName +
            '!',

          intro,

          'Conteúdos planejados hoje: ' +
            String(
              planned
            ),

          'Aprovações pendentes — conteúdos: ' +
            String(
              pendingApprovals
            ) +
            ', calendários mensais: ' +
            String(
              pendingMonthlyApprovals
            ),

          'Instagram hoje — publicados: ' +
            String(
              published
            ) +
            ', agendados: ' +
            String(
              scheduled
            ) +
            ', erros: ' +
            String(
              errors
            ),

          attentionLabel +
            String(
              socialAttention
            ),

          'Alertas operacionais abertos: ' +
            String(
              openAlerts
            ),
        ].join(
          '\n'
        );


      const result =
        await sendProactive({
          agencyId:
            connection.agencyId,

          memberId:
            member.id,

          toPhone:
            member.phoneE164,

          title:
            isDirector
              ? (
                  'Resumo da operação — ' +
                  local.dateKey
                )
              : (
                  'Resumo da sua carteira — ' +
                  local.dateKey
                ),

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


function formatCaptureWhatsappTime(value: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Maceio', hour: '2-digit', minute: '2-digit',
  }).format(value);
}

function captureMessage(schedule: {
  clientName: string;
  scheduledAt: Date;
  location: string | null;
  notes: string | null;
}) {
  return [
    '*Cliente:* ' + schedule.clientName,
    '*Horário:* ' + formatCaptureWhatsappTime(schedule.scheduledAt),
    schedule.location ? '*Local:* ' + schedule.location : '',
    schedule.notes ? '*Observações:* ' + schedule.notes : '',
  ].filter(Boolean).join('\n');
}

export async function deliverSecretaryCaptureReminders() {
  const now =
    new Date();

  const local =
    maceioParts();

  const dayStart =
    new Date(
      local.dateKey +
      'T03:00:00.000Z'
    );

  const tomorrowStart =
    new Date(
      dayStart.getTime() +
      24 *
        60 *
        60 *
        1000
    );

  const dayAfterTomorrow =
    new Date(
      tomorrowStart.getTime() +
      24 *
        60 *
        60 *
        1000
    );

  const tomorrowKey =
    tomorrowStart
      .toISOString()
      .slice(
        0,
        10
      );

  const upcomingStart =
    new Date(
      now.getTime() +
      45 *
        60 *
        1000
    );

  const upcomingEnd =
    new Date(
      now.getTime() +
      75 *
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
    const clients =
      await prisma.client
        .findMany({
          where: {
            agencyId:
              connection.agencyId,
          },

          select: {
            id:
              true,
          },
        });


    const clientIds =
      clients.map(
        (
          client
        ) =>
          client.id
      );


    if (
      !clientIds.length
    ) {
      continue;
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

            receiveAlerts:
              true,

            userId: {
              not:
                null,
            },
          },
        });


    if (
      !members.length
    ) {
      continue;
    }


    const users =
      await prisma.user
        .findMany({
          where: {
            agencyId:
              connection.agencyId,

            status:
              'APROVADO',

            role:
              'FILMMAKER',

            id: {
              in:
                members
                  .map(
                    (
                      member
                    ) =>
                      member.userId
                  )
                  .filter(
                    (
                      value
                    ): value is string =>
                      Boolean(
                        value
                      )
                  ),
            },
          },

          select: {
            id:
              true,
          },
        });


    const filmmakerIds =
      new Set(
        users.map(
          (
            user
          ) =>
            user.id
        )
      );


    const filmmakers =
      members.filter(
        (
          member
        ) =>
          Boolean(
            member.userId &&
            filmmakerIds.has(
              member.userId
            )
          )
      );


    if (
      !filmmakers.length
    ) {
      continue;
    }


    /*
     * 18H DO DIA ANTERIOR
     *
     * Esta é a mensagem principal da agenda.
     * Depois vamos anexar aqui também o PDF
     * com os roteiros da captação.
     */
    const tomorrowSchedules =
      local.hour ===
        18
        ? await prisma
            .captureSchedule
            .findMany({
              where: {
                clientId: {
                  in:
                    clientIds,
                },

                status: {
                  not:
                    'CANCELADO',
                },

                scheduledAt: {
                  gte:
                    tomorrowStart,

                  lt:
                    dayAfterTomorrow,
                },
              },

              orderBy: {
                scheduledAt:
                  'asc',
              },
            })
        : [];


    if (
      tomorrowSchedules.length
    ) {
      const message =
        tomorrowSchedules
          .map(
            (
              schedule,
              index
            ) =>
              String(
                index +
                1
              ) +
              '. ' +
              captureMessage(
                schedule
              )
          )
          .join(
            '\n\n'
          );


      for (
        const member
        of filmmakers
      ) {
        const result =
          await sendProactive({
            agencyId:
              connection.agencyId,

            memberId:
              member.id,

            toPhone:
              member.phoneE164,

            title:
              'Suas captações de amanhã',

            message,

            dedupKey:
              'capture-tomorrow:' +
              tomorrowKey +
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


    /*
     * LEMBRETE CERCA DE 1 HORA ANTES
     */
    const upcoming =
      await prisma
        .captureSchedule
        .findMany({
          where: {
            clientId: {
              in:
                clientIds,
            },

            status: {
              not:
                'CANCELADO',
            },

            scheduledAt: {
              gte:
                upcomingStart,

              lte:
                upcomingEnd,
            },
          },

          orderBy: {
            scheduledAt:
              'asc',
          },
        });


    for (
      const schedule
      of upcoming
    ) {
      for (
        const member
        of filmmakers
      ) {
        const result =
          await sendProactive({
            agencyId:
              connection.agencyId,

            memberId:
              member.id,

            toPhone:
              member.phoneE164,

            title:
              'Captação em cerca de 1 hora',

            message:
              captureMessage(
                schedule
              ),

            dedupKey:
              'capture-upcoming:' +
              schedule.id +
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
  }


  return sent;
}

function formatProductionDeadline(
  value:
    Date
) {
  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      timeZone:
        'America/Maceio',

      day:
        '2-digit',

      month:
        '2-digit',

      hour:
        '2-digit',

      minute:
        '2-digit',
    }
  ).format(value);
}


export async function deliverSecretaryProductionDeadlineReminders() {
  const now =
    new Date();

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
              connection.agencyId,

            isActive:
              true,

            receiveAlerts:
              true,

            userId: {
              not:
                null,
            },
          },
        });


    const userIds =
      members
        .map(
          (member) =>
            member.userId
        )
        .filter(
          (value): value is string =>
            Boolean(value)
        );


    if (!userIds.length) {
      continue;
    }


    const users =
      await prisma.user
        .findMany({
          where: {
            agencyId:
              connection.agencyId,

            id: {
              in:
                userIds,
            },

            status:
              'APROVADO',

            role: {
              in: [
                'DESIGN',
                'FILMMAKER',
              ],
            },
          },

          select: {
            id:
              true,

            role:
              true,
          },
        });


    const roleByUserId =
      new Map(
        users.map(
          (user) =>
            [
              user.id,
              user.role,
            ] as const
        )
      );


    const productionMembers =
      members.filter(
        (member) =>
          Boolean(
            member.userId &&
            roleByUserId.has(
              member.userId
            )
          )
      );


    if (!productionMembers.length) {
      continue;
    }


    const [
      activeDesignColumns,
      activeFilmmakerColumns,
    ] =
      await Promise.all([
        prisma.designKanbanColumn
          .findMany({
            where: {
              agencyId:
                connection.agencyId,

              isActive:
                true,
            },

            select: {
              statusKey:
                true,
            },
          }),

        prisma.filmmakerKanbanColumn
          .findMany({
            where: {
              agencyId:
                connection.agencyId,

              isActive:
                true,
            },

            select: {
              statusKey:
                true,
            },
          }),
      ]);


    const completedProductionStatuses =
      new Set([
        'PRONTO_PARA_POSTAR',
        'PUBLICADO',
        'PUBLICADO_MANUALMENTE',
        'ENVIADO_CLIENTE',
      ]);


    const designStatusKeys =
      (
        activeDesignColumns.length
          ? activeDesignColumns.map(
              (
                column
              ) =>
                column.statusKey
            )
          : [
              'APROVADO',
              'DESIGN_GRAFICO',
              'DESIGN_FAZENDO',
              'DESIGN_ANALISE',
              'DESIGN_DUVIDA',
            ]
      ).filter(
        (
          status
        ) =>
          !completedProductionStatuses.has(
            status
          )
      );


    const filmmakerStatusKeys =
      (
        activeFilmmakerColumns.length
          ? activeFilmmakerColumns.map(
              (
                column
              ) =>
                column.statusKey
            )
          : [
              'APROVADO',
              'FILMMAKER_PRE_PRODUCAO',
              'FILMMAKER_AGENDAMENTO',
              'FILMMAKER_GRAVANDO',
              'FILMMAKER_EDICAO',
              'FILMMAKER_ANALISE',
              'FILMMAKER_DUVIDA_SOCIAL',
              'ALTERACAO_SOLICITADA',
            ]
      ).filter(
        (
          status
        ) =>
          !completedProductionStatuses.has(
            status
          )
      );


    const contents =
      await prisma.content
        .findMany({
          where: {
            client: {
              agencyId:
                connection.agencyId,
            },

            OR: [
              {
                area:
                  'DESIGN',

                status: {
                  in:
                    designStatusKeys,
                },
              },

              {
                area:
                  'FILMMAKER',

                status: {
                  in:
                    filmmakerStatusKeys,
                },
              },
            ],
          },

          select: {
            id:
              true,

            title:
              true,

            area:
              true,

            status:
              true,

            priority:
              true,

            productionDeadline:
              true,

            plannedDate:
              true,

            client: {
              select: {
                name:
                  true,
              },
            },
          },

          take:
            500,
        });


    for (
      const content
      of contents
    ) {
      const deadline =
        content.productionDeadline ||
        content.plannedDate;

      if (!deadline) {
        continue;
      }


      const remaining =
        deadline.getTime() -
        now.getTime();

      const hour =
        60 * 60 * 1000;

      let stage =
        '';

      let title =
        '';


      if (remaining <= 0) {
        stage =
          'OVERDUE';

        title =
          '⚠️ Demanda atrasada';
      }
      else if (
        remaining >
          5 * hour &&
        remaining <=
          7 * hour
      ) {
        stage =
          '6H';

        title =
          'Entrega em cerca de 6 horas';
      }
      else if (
        remaining >
          23 * hour &&
        remaining <=
          25 * hour
      ) {
        stage =
          '24H';

        title =
          'Entrega em cerca de 24 horas';
      }
      else {
        continue;
      }


      for (
        const member
        of productionMembers
      ) {
        if (!member.userId) {
          continue;
        }


        const role =
          roleByUserId.get(
            member.userId
          );

        const correctArea =
          (
            role ===
              'DESIGN' &&
            content.area ===
              'DESIGN'
          ) ||
          (
            role ===
              'FILMMAKER' &&
            content.area ===
              'FILMMAKER'
          );


        if (!correctArea) {
          continue;
        }


        const message =
          [
            '*Cliente:* ' +
              content.client.name,

            '*Demanda:* ' +
              content.title,

            '*Etapa:* ' +
              String(content.status)
                .replace(/_/g, ' '),

            '*Prazo:* ' +
              formatProductionDeadline(
                deadline
              ),

            '*Prioridade:* ' +
              String(
                content.priority ||
                'MEDIA'
              ),
          ].join('\n');


        const result =
          await sendProactive({
            agencyId:
              connection.agencyId,

            memberId:
              member.id,

            toPhone:
              member.phoneE164,

            title,

            message,

            dedupKey:
              'production-deadline:' +
              stage +
              ':' +
              content.id +
              ':' +
              deadline.toISOString() +
              ':' +
              member.id,
          });


        if (
          result.status ===
          'SENT'
        ) {
          sent += 1;
        }
      }
    }
  }


  return sent;
}

type SecretaryCalendarReminderEvent =
  Awaited<
    ReturnType<
      typeof findGoogleCalendarEvents
    >
  >[number];

function normalizeCalendarAssignmentText(
  value:
    string
) {
  return (
    ' ' +
    String(
      value ||
      ''
    )
      .normalize(
        'NFD'
      )
      .replace(
        /[\u0300-\u036f]/g,
        ''
      )
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        ' '
      )
      .trim() +
    ' '
  );
}

function calendarMemberAliases({
  displayName,
  userName,
}: {
  displayName:
    string |
    null;

  userName:
    string |
    null;
}) {
  const raw =
    [
      displayName,
      userName,
    ]
      .filter(
        Boolean
      )
      .map(
        (
          value
        ) =>
          normalizeCalendarAssignmentText(
            String(
              value
            )
          ).trim()
      )
      .filter(
        Boolean
      );

  const aliases =
    new Set<string>();

  for (
    const value
    of raw
  ) {
    aliases.add(
      value
    );

    const first =
      value
        .split(
          /\s+/
        )[0];

    if (first) {
      aliases.add(
        first
      );
    }

    if (
      first?.startsWith(
        'gabri'
      )
    ) {
      aliases.add(
        'gabi'
      );
    }

    if (
      first ===
        'bia' ||
      first?.startsWith(
        'beatriz'
      ) ||
      first?.startsWith(
        'bianca'
      )
    ) {
      aliases.add(
        'bia'
      );
    }

    if (
      first?.startsWith(
        'leonio'
      )
    ) {
      aliases.add(
        'leo'
      );
    }
  }

  return [
    ...aliases,
  ];
}

function calendarEventMatchesMember({
  summary,
  description,
  displayName,
  userName,
}: {
  summary:
    string;

  description?:
    string |
    null;

  displayName:
    string |
    null;

  userName:
    string |
    null;
}) {
  const normalized =
    normalizeCalendarAssignmentText(
      [
        summary,
        description || '',
      ]
        .filter(Boolean)
        .join(' ')
    );

  if (
    normalized.includes(
      ' equipe '
    ) ||
    normalized.includes(
      ' todos '
    ) ||
    normalized.includes(
      ' toda equipe '
    )
  ) {
    return true;
  }

  return calendarMemberAliases({
    displayName,
    userName,
  }).some(
    (
      alias
    ) =>
      normalized.includes(
        ' ' +
          alias +
          ' '
      )
  );
}

function formatCalendarReminderTime(
  value:
    string |
    null
) {
  if (!value) {
    return 'Sem horário';
  }

  if (
    !value.includes(
      'T'
    )
  ) {
    return 'Dia inteiro';
  }

  const parsed =
    new Date(
      value
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      timeZone:
        'America/Maceio',

      hour:
        '2-digit',

      minute:
        '2-digit',
    }
  ).format(
    parsed
  );
}

function calendarReminderMessage(
  event:
    SecretaryCalendarReminderEvent
) {
  return [
    '*Compromisso:* ' +
      event.summary,

    '*Horário:* ' +
      formatCalendarReminderTime(
        event.start
      ),

    event.location
      ? '*Local:* ' +
        event.location
      : '',
  ]
    .filter(
      Boolean
    )
    .join(
      '\n'
    );
}

export async function deliverSecretaryCalendarReminders() {
  const now =
    new Date();

  const local =
    maceioParts();

  const dayStart =
    new Date(
      local.dateKey +
      'T03:00:00.000Z'
    );

  const tomorrowStart =
    new Date(
      dayStart.getTime() +
      24 * 60 * 60 * 1000
    );

  const dayAfterTomorrow =
    new Date(
      tomorrowStart.getTime() +
      24 * 60 * 60 * 1000
    );

  const tomorrowKey =
    tomorrowStart
      .toISOString()
      .slice(0, 10);

  const upcomingStart =
    new Date(
      now.getTime() +
      45 * 60 * 1000
    );

  const upcomingEnd =
    new Date(
      now.getTime() +
      75 * 60 * 1000
    );

  const morningCutoff =
    new Date(
      dayStart.getTime() +
      8 * 60 * 60 * 1000
    );


  const eveningCutoff =
    new Date(
      dayStart.getTime() +
      18 * 60 * 60 * 1000
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

    /*
     * A reunião semanal precisa existir
     * antes de buscarmos os compromissos
     * de segunda-feira.
     */
    if (
      local.weekday ===
        'Sun' &&
      local.hour ===
        18
    ) {
      await ensureWeeklyAgencyMeeting(
        connection.agencyId
      ).catch(
        (error) => {
          console.error(
            'SECRETARY WEEKLY MEETING ENSURE ERROR',
            connection.agencyId,
            error
          );
        }
      );
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

            receiveAlerts:
              true,

            userId: {
              not:
                null,
            },
          },
        });

    if (!members.length) {
      continue;
    }


    const userIds =
      members
        .map(
          (member) =>
            member.userId
        )
        .filter(
          (value): value is string =>
            Boolean(value)
        );


    const users =
      await prisma.user
        .findMany({
          where: {
            agencyId:
              connection.agencyId,

            id: {
              in:
                userIds,
            },

            status:
              'APROVADO',
          },

          select: {
            id:
              true,

            name:
              true,
          },
        });


    const userById =
      new Map(
        users.map(
          (user) =>
            [
              user.id,
              user,
            ] as const
        )
      );


    const recipients =
      members
        .map(
          (member) => {
            const user =
              member.userId
                ? userById.get(
                    member.userId
                  )
                : null;

            return user
              ? { member, user }
              : null;
          }
        )
        .filter(
          (value): value is NonNullable<typeof value> =>
            Boolean(value)
        );


    if (!recipients.length) {
      continue;
    }


    const events =
      await findGoogleCalendarEvents({
        agencyId:
          connection.agencyId,

        query:
          '',

        timeMin:
          dayStart,

        timeMax:
          dayAfterTomorrow,
      }).catch(
        (error) => {
          console.error(
            'SECRETARY GOOGLE CALENDAR LIST ERROR',
            connection.agencyId,
            error
          );

          return [] as SecretaryCalendarReminderEvent[];
        }
      );


    const todayEvents =
      events.filter(
        (event) => {
          if (!event.start) {
            return false;
          }


          if (
            !event.start.includes(
              'T'
            )
          ) {
            return event.start ===
              local.dateKey;
          }


          const start =
            new Date(
              event.start
            );


          return (
            !Number.isNaN(
              start.getTime()
            ) &&
            start >=
              dayStart &&
            start <
              tomorrowStart
          );
        }
      );


    const tomorrowEvents =
      events.filter(
        (event) => {
          if (!event.start) {
            return false;
          }

          if (
            !event.start.includes('T')
          ) {
            return event.start ===
              tomorrowKey;
          }

          const start =
            new Date(event.start);

          return (
            !Number.isNaN(start.getTime()) &&
            start >= tomorrowStart &&
            start < dayAfterTomorrow
          );
        }
      );


    /*
     * O resumo di?rio de compromissos n?o ? mais
     * enviado pela manh?.
     *
     * A agenda principal chega ?s 18h do dia anterior.
     */


    /* ================================================
       NOVO / ALTERADO HOJE DEPOIS DAS 08H
       ================================================ */

    if (
      local.hour >=
        8 &&
      todayEvents.length
    ) {
      const changedToday =
        todayEvents.filter(
          (
            event
          ) => {
            if (
              !event.updated
            ) {
              return false;
            }


            const updated =
              new Date(
                event.updated
              );


            return (
              !Number.isNaN(
                updated.getTime()
              ) &&
              updated >
                morningCutoff
            );
          }
        );


      for (
        const event
        of changedToday
      ) {
        for (
          const recipient
          of recipients
        ) {
          if (
            !calendarEventMatchesMember({
              summary:
                event.summary,

              description:
                event.description,

              displayName:
                recipient.member.displayName,

              userName:
                recipient.user.name,
            })
          ) {
            continue;
          }


          const created =
            event.created
              ? new Date(
                  event.created
                )
              : null;


          const updated =
            event.updated
              ? new Date(
                  event.updated
                )
              : null;


          const isNew =
            Boolean(
              created &&
              updated &&
              Math.abs(
                created.getTime() -
                updated.getTime()
              ) <
                5000
            );


          const result =
            await sendProactive({
              agencyId:
                connection.agencyId,

              memberId:
                recipient.member.id,

              toPhone:
                recipient.member.phoneE164,

              title:
                isNew
                  ? 'Novo compromisso para hoje'
                  : 'Compromisso de hoje atualizado',

              message:
                calendarReminderMessage(
                  event
                ),

              dedupKey:
                'calendar-today-change:' +
                event.id +
                ':' +
                String(
                  event.updated ||
                  ''
                ) +
                ':' +
                recipient.member.id,
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
    }


    /* ================================================
       18H - COMPROMISSOS DO DIA SEGUINTE
       ================================================ */

    if (
      local.hour ===
        18 &&
      tomorrowEvents.length
    ) {
      for (
        const recipient
        of recipients
      ) {
        const personalEvents =
          tomorrowEvents.filter(
            (event) =>
              calendarEventMatchesMember({
                summary:
                  event.summary,

                description:
                  event.description,

                displayName:
                  recipient.member.displayName,

                userName:
                  recipient.user.name,
              })
          );


        if (!personalEvents.length) {
          continue;
        }


        const message =
          personalEvents
            .map(
              (event, index) =>
                String(index + 1) +
                '. ' +
                calendarReminderMessage(event)
            )
            .join('\n\n');


        const result =
          await sendProactive({
            agencyId:
              connection.agencyId,

            memberId:
              recipient.member.id,

            toPhone:
              recipient.member.phoneE164,

            title:
              'Seus compromissos de amanhã',

            message,

            dedupKey:
              'calendar-tomorrow:' +
              tomorrowKey +
              ':' +
              recipient.member.id,
          });


        if (
          result.status ===
          'SENT'
        ) {
          sent += 1;
        }
      }
    }


    /* ================================================
       ALTERAÇÃO / NOVO EVENTO DEPOIS DAS 18H
       ================================================ */

    if (
      local.hour > 18 &&
      tomorrowEvents.length
    ) {
      const changedAfter18 =
        tomorrowEvents.filter(
          (event) => {
            if (!event.updated) {
              return false;
            }

            const updated =
              new Date(event.updated);

            return (
              !Number.isNaN(updated.getTime()) &&
              updated > eveningCutoff
            );
          }
        );


      for (
        const event
        of changedAfter18
      ) {
        for (
          const recipient
          of recipients
        ) {
          if (
            !calendarEventMatchesMember({
              summary:
                event.summary,

              description:
                event.description,

              displayName:
                recipient.member.displayName,

              userName:
                recipient.user.name,
            })
          ) {
            continue;
          }


          const created =
            event.created
              ? new Date(event.created)
              : null;

          const updated =
            event.updated
              ? new Date(event.updated)
              : null;

          const isNew =
            Boolean(
              created &&
              updated &&
              Math.abs(
                created.getTime() -
                updated.getTime()
              ) <
                5000
            );


          const result =
            await sendProactive({
              agencyId:
                connection.agencyId,

              memberId:
                recipient.member.id,

              toPhone:
                recipient.member.phoneE164,

              title:
                isNew
                  ? 'Novo compromisso para amanhã'
                  : 'Compromisso de amanhã atualizado',

              message:
                calendarReminderMessage(event),

              dedupKey:
                'calendar-late-change:' +
                event.id +
                ':' +
                String(event.updated || '') +
                ':' +
                recipient.member.id,
            });


          if (
            result.status ===
            'SENT'
          ) {
            sent += 1;
          }
        }
      }
    }


    /* ================================================
       CERCA DE 1 HORA ANTES
       ================================================ */

    const upcoming =
      events.filter(
        (event) => {
          if (
            !event.start ||
            !event.start.includes('T')
          ) {
            return false;
          }

          const start =
            new Date(event.start);

          return (
            !Number.isNaN(start.getTime()) &&
            start >= upcomingStart &&
            start <= upcomingEnd
          );
        }
      );


    for (
      const event
      of upcoming
    ) {
      for (
        const recipient
        of recipients
      ) {
        if (
          !calendarEventMatchesMember({
            summary:
              event.summary,

            description:
              event.description,

            displayName:
              recipient.member.displayName,

            userName:
              recipient.user.name,
          })
        ) {
          continue;
        }


        const result =
          await sendProactive({
            agencyId:
              connection.agencyId,

            memberId:
              recipient.member.id,

            toPhone:
              recipient.member.phoneE164,

            title:
              'Compromisso em cerca de 1 hora',

            message:
              calendarReminderMessage(event),

            dedupKey:
              'calendar-1h:' +
              event.id +
              ':' +
              String(event.start || '') +
              ':' +
              recipient.member.id,
          });


        if (
          result.status ===
          'SENT'
        ) {
          sent += 1;
        }
      }
    }
  }


  return sent;
}

export async function sendSecretaryIntroductionToTeam({
  agencyName,
}: {
  agencyName: string;
}) {
  const requestedAgency =
    agencyName.trim();

  if (!requestedAgency) {
    throw new Error(
      'Informe a agência.'
    );
  }

  const agency =
    await prisma.agency.findFirst({
      where: {
        name: {
          contains:
            requestedAgency,

          mode:
            'insensitive',
        },
      },

      select: {
        id:
          true,

        name:
          true,
      },
    });

  if (!agency) {
    throw new Error(
      'Agência não encontrada: ' +
        requestedAgency
    );
  }

  const connection =
    await prisma
      .secretaryWhatsappConnection
      .findUnique({
        where: {
          agencyId:
            agency.id,
        },
      });

  if (
    !connection ||
    connection.status !==
      'ATIVO' ||
    !connection
      .encryptedAccessToken ||
    !connection
      .phoneNumberId
  ) {
    throw new Error(
      'O WhatsApp da LIV não está ativo para ' +
        agency.name +
        '.'
    );
  }

  const members =
    await prisma
      .secretaryWhatsappMember
      .findMany({
        where: {
          agencyId:
            agency.id,

          isActive:
            true,
        },

        orderBy: {
          displayName:
            'asc',
        },
      });

  const userIds =
    members
      .map(
        (member) =>
          member.userId
      )
      .filter(
        (
          value
        ): value is string =>
          Boolean(value)
      );

  const users =
    userIds.length
      ? await prisma.user.findMany({
          where: {
            agencyId:
              agency.id,

            id: {
              in:
                userIds,
            },

            status:
              'APROVADO',
          },

          select: {
            id:
              true,

            name:
              true,
          },
        })
      : [];

  const userById =
    new Map(
      users.map(
        (user) => [
          user.id,
          user,
        ] as const
      )
    );

  const secretaryName =
    connection
      .secretaryName
      ?.trim() ||
    'LIV';

  const companyName =
    connection
      .secretaryCompanyName
      ?.trim() ||
    agency.name;

  let sent =
    0;

  let waitingTemplate =
    0;

  let errors =
    0;

  const results:
    Array<{
      name: string;
      status: string;
    }> = [];

  for (
    const member
    of members
  ) {
    const user =
      member.userId
        ? userById.get(
            member.userId
          )
        : null;

    const fullName =
      (
        member.displayName ||
        user?.name ||
        'Equipe'
      ).trim();

    const firstName =
      fullName
        .split(/\s+/)[0] ||
      fullName;

    const message =
      'Eu sou a ' +
      secretaryName +
      ', assistente virtual da ' +
      companyName +
      '.\n\n' +
      'A partir de agora, vou estar por aqui ajudando nossa equipe com lembretes, organização, compromissos, avisos e informações importantes do dia a dia.\n\n' +
      'É um prazer falar com você pela primeira vez! 💙';

    const result =
      await sendProactive({
        agencyId:
          agency.id,

        memberId:
          member.id,

        toPhone:
          member.phoneE164,

        title:
          'Oi, ' +
          firstName +
          '! Eu sou a ' +
          secretaryName +
          ' 👋',

        message,

        dedupKey:
          'liv-team-introduction-v1:' +
          member.id,
      });

    results.push({
      name:
        fullName,

      status:
        result.status,
    });

    if (
      result.status ===
      'SENT'
    ) {
      sent += 1;
    }
    else if (
      result.status ===
      'WAITING_TEMPLATE'
    ) {
      waitingTemplate +=
        1;
    }
    else {
      errors +=
        1;
    }
  }

  return {
    agency:
      agency.name,

    secretary:
      secretaryName,

    total:
      members.length,

    sent,
    waitingTemplate,
    errors,
    results,
  };
}



type ContentQuestionSource =
  | 'CLIENTE'
  | 'DESIGN'
  | 'FILMMAKER';


/*
 * LIV avisa somente a Social Media responsável
 * pelo cliente relacionado ao conteúdo.
 *
 * Usa a mesma regra de carteira do restante do AprovUp.
 */
export async function notifyResponsibleSocialMediaAboutQuestion({
  agencyId,
  contentId,
  source,
  message,
}: {
  agencyId:
    string |
    null |
    undefined;

  contentId:
    string;

  source:
    ContentQuestionSource;

  message:
    string;
}) {

  /*
   * Alguns clientes antigos podem não possuir agencyId.
   * Sem agência não existe conexão WhatsApp para notificar.
   */
  if (
    !agencyId
  ) {
    return {
      attempted:
        0,

      sent:
        0,
    };
  }

  const connection =
    await getWhatsappConnection(
      agencyId
    );


  if (!connection) {
    return {
      attempted:
        0,

      sent:
        0,
    };
  }


  const content =
    await prisma.content
      .findFirst({
        where: {
          id:
            contentId,

          client: {
            agencyId,
          },
        },

        include: {
          client:
            true,
        },
      });


  if (
    !content ||
    !content.client
  ) {
    return {
      attempted:
        0,

      sent:
        0,
    };
  }


  const members =
    await prisma
      .secretaryWhatsappMember
      .findMany({
        where: {
          agencyId,

          isActive:
            true,

          receiveAlerts:
            true,

          userId: {
            not:
              null,
          },
        },
      });


  if (
    members.length ===
    0
  ) {
    return {
      attempted:
        0,

      sent:
        0,
    };
  }


  const memberByUserId =
    new Map<
      string,
      (typeof members)[number]
    >();


  for (
    const member
    of members
  ) {
    if (
      member.userId
    ) {
      memberByUserId.set(
        member.userId,
        member
      );
    }
  }


  const userIds =
    Array.from(
      memberByUserId.keys()
    );


  if (
    userIds.length ===
    0
  ) {
    return {
      attempted:
        0,

      sent:
        0,
    };
  }


  const socialUsers =
    await prisma.user
      .findMany({
        where: {
          agencyId,

          status:
            'APROVADO',

          role:
            'SOCIAL_MEDIA',

          id: {
            in:
              userIds,
          },
        },
      });


  const recipients =
    socialUsers
      .filter(
        (
          user
        ) =>
          hasPermission(
            user,
            'social.manage'
          ) &&
          canAccessClient(
            user,
            content.client
          )
      )
      .map(
        (
          user
        ) =>
          memberByUserId.get(
            user.id
          )
      )
      .filter(
        (
          member
        ): member is
          (typeof members)[number] =>
            Boolean(
              member
            )
      );


  if (
    recipients.length ===
    0
  ) {
    return {
      attempted:
        0,

      sent:
        0,
    };
  }


  const sourceTitle =
    source ===
      'CLIENTE'
      ? '💬 Retorno do cliente'
      : source ===
          'DESIGN'
        ? '🎨 Dúvida do Design'
        : '🎥 Dúvida do Filmmaker';


  const sourceText =
    source ===
      'CLIENTE'
      ? 'O cliente deixou um novo ajuste ou dúvida.'
      : source ===
          'DESIGN'
        ? 'O Design enviou uma dúvida que precisa da sua resposta.'
        : 'O Filmmaker enviou uma dúvida que precisa da sua resposta.';


  const cleanMessage =
    String(
      message ||
      ''
    )
      .trim()
      .slice(
        0,
        1600
      );


  const whatsappMessage =
    [
      sourceText,

      '',

      'Cliente: ' +
        (
          content.client.name ||
          'Cliente'
        ),

      'Conteúdo: ' +
        (
          content.title ||
          'Sem título'
        ),

      '',

      cleanMessage
        ? 'Mensagem: ' +
          cleanMessage
        : 'Existe um novo retorno aguardando sua atenção.',

      '',

      'Abra o AprovUp > Social Media para responder.',
    ].join(String.fromCharCode(10));


  /*
   * O comentário recém-criado vira a chave de deduplicação.
   * Assim a mesma dúvida não gera dois avisos.
   */
  const latestComment =
    await prisma.comment
      .findFirst({
        where: {
          contentId,
        },

        orderBy: {
          createdAt:
            'desc',
        },

        select: {
          id:
            true,
        },
      });


  const eventKey =
    latestComment?.id ||
    (
      source +
      ':' +
      contentId +
      ':' +
      Date.now()
    );


  let attempted =
    0;

  let sent =
    0;


  for (
    const member
    of recipients
  ) {
    attempted +=
      1;


    try {
      const result =
        await sendProactive({
          agencyId,

          memberId:
            member.id,

          toPhone:
            member.phoneE164,

          title:
            sourceTitle,

          message:
            whatsappMessage,

          dedupKey:
            'content-question:' +
            eventKey +
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
    catch (
      error
    ) {
      console.error(
        'LIV question alert:',
        error
      );
    }
  }


  return {
    attempted,
    sent,
  };
}

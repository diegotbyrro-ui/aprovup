'use server';

import {
  prisma,
} from '@/lib/prisma';

import {
  FINAL_PENDING_STATUSES,
  resolveFinalApprovalContext,
} from '@/lib/finalMonthlyApproval';

import {
  aprovUpFileExists,
  getAprovUpPublicUrl,
} from '@/lib/aprovupStorage';

import {
  notifyResponsibleSocialMediaAboutQuestion,
} from '@/lib/secretaryWhatsApp';

import {
  revalidatePath,
} from 'next/cache';

import {
  redirect,
} from 'next/navigation';


export async function approveFinalContentAction(
  token:
    string,
  contentId:
    string,
  _formData:
    FormData
) {

  const context =
    await resolveFinalApprovalContext(
      token
    );


  if (
    !context
  ) {

    redirect(
      '/aprovacao-final/' +
      token
    );
  }


  const {
    client,
    start,
    end,
  } =
    context;


  const content =
    await prisma.content.findFirst({
      where: {
        id:
          contentId,

        clientId:
          client.id,

        plannedDate: {
          gte:
            start,

          lt:
            end,
        },

        status: {
          in:
            FINAL_PENDING_STATUSES,
        },
      },
    });


  if (
    !content
  ) {

    redirect(
      '/aprovacao-final/' +
      token
    );
  }


  /*
   * Approval individual antigo continua sendo atualizado
   * quando existir, preservando o historico anterior.
   */
  const legacyApproval =
    await prisma.approval.findFirst({
      where: {
        contentId,

        status:
          'PENDENTE',
      },

      orderBy: {
        createdAt:
          'desc',
      },
    });


  await prisma.$transaction(
    async (
      transaction
    ) => {

      if (
        legacyApproval
      ) {

        await transaction
          .approval
          .update({
            where: {
              id:
                legacyApproval.id,
            },

            data: {
              status:
                'APROVADO',

              clientComment:
                null,
            },
          });
      }


      await transaction
        .content
        .update({
          where: {
            id:
              contentId,
          },

          data: {
            status:
              'PRONTO_PARA_POSTAR',
          },
        });


      await transaction
        .comment
        .create({
          data: {
            contentId,

            authorName:
              client.name,

            authorRole:
              'CLIENTE',

            message:
              'APROVAÇÃO FINAL: material aprovado na 2ª Etapa de Aprovação.',
          },
        });


      await transaction
        .historyLog
        .create({
          data: {
            entityType:
              'CONTENT',

            entityId:
              contentId,

            action:
              'FINAL_APPROVAL_APPROVED',

            description:
              'Cliente aprovou o material final: ' +
              content.title +
              '.',

            authorName:
              client.name,
          },
        });
    }
  );


  revalidatePath(
    '/aprovacao-final/' +
    token
  );

  revalidatePath(
    '/clientes/' +
    client.id +
    '/aprovacao-final'
  );

  revalidatePath(
    '/design'
  );

  revalidatePath(
    '/filmmaker'
  );

  revalidatePath(
    '/social-media'
  );

  revalidatePath(
    '/social-media/avisos'
  );

  revalidatePath(
    '/pronto-para-postar'
  );


  redirect(
    '/aprovacao-final/' +
    token +
    '?feedback=aprovado'
  );
}


export async function reopenFinalContentAction(
  token:
    string,
  contentId:
    string,
  _formData:
    FormData
) {

  const context =
    await resolveFinalApprovalContext(
      token
    );


  if (
    !context
  ) {

    redirect(
      '/aprovacao-final/' +
      token
    );
  }


  const {
    client,
    start,
    end,
  } =
    context;


  const content =
    await prisma.content.findFirst({
      where: {
        id:
          contentId,

        clientId:
          client.id,

        plannedDate: {
          gte:
            start,

          lt:
            end,
        },

        status:
          'PRONTO_PARA_POSTAR',
      },

      include: {
        instagramPublication:
          true,

        instagramStoryPublication:
          true,
      },
    });


  if (
    !content
  ) {

    redirect(
      '/aprovacao-final/' +
      token
    );
  }


  const blockedStatuses =
    [
      'AGENDADO',
      'PUBLICANDO',
      'PUBLICADO',
    ];


  const feedStatus =
    content
      .instagramPublication
      ?.status ||
    '';


  const storyStatus =
    content
      .instagramStoryPublication
      ?.status ||
    '';


  if (
    blockedStatuses.includes(
      feedStatus
    ) ||
    blockedStatuses.includes(
      storyStatus
    )
  ) {

    redirect(
      '/aprovacao-final/' +
      token +
      '?error=publication-locked'
    );
  }


  const legacyApproval =
    await prisma.approval.findFirst({
      where: {
        contentId,

        status:
          'APROVADO',
      },

      orderBy: {
        updatedAt:
          'desc',
      },
    });


  await prisma.$transaction(
    async (
      transaction
    ) => {

      if (
        legacyApproval
      ) {

        await transaction
          .approval
          .update({
            where: {
              id:
                legacyApproval.id,
            },

            data: {
              status:
                'PENDENTE',

              clientComment:
                null,
            },
          });
      }


      await transaction
        .content
        .update({
          where: {
            id:
              contentId,
          },

          data: {
            status:
              'ENVIADO_CLIENTE',
          },
        });


      await transaction
        .comment
        .create({
          data: {
            contentId,

            authorName:
              client.name,

            authorRole:
              'CLIENTE',

            message:
              'APROVAÇÃO DESFEITA: o cliente marcou este material como não aprovado e ele retornou para a 2ª Etapa de Aprovação.',
          },
        });


      await transaction
        .historyLog
        .create({
          data: {
            entityType:
              'CONTENT',

            entityId:
              contentId,

            action:
              'FINAL_APPROVAL_REOPENED_BY_CLIENT',

            description:
              'Cliente desfez a aprovação final do conteúdo "' +
              content.title +
              '". Material retornado para a 2ª Etapa de Aprovação.',

            authorName:
              client.name,
          },
        });
    }
  );


  revalidatePath(
    '/aprovacao-final/' +
    token
  );

  revalidatePath(
    '/clientes/' +
    client.id +
    '/aprovacao-final'
  );

  revalidatePath(
    '/social-media'
  );

  revalidatePath(
    '/social-media/avisos'
  );

  revalidatePath(
    '/pronto-para-postar'
  );


  redirect(
    '/aprovacao-final/' +
    token +
    '?feedback=reaberto'
  );
}


export async function requestFinalChangesAction(
  token:
    string,
  contentId:
    string,
  formData:
    FormData
) {

  const message =
    String(
      formData.get(
        'message'
      ) ||
      ''
    ).trim();


  const audioPath =
    String(
      formData.get(
        'audioPath'
      ) ||
      ''
    ).trim();


  const audioMimeType =
    String(
      formData.get(
        'audioMimeType'
      ) ||
      ''
    )
      .split(
        ';'
      )[0]
      .trim()
      .toLowerCase();


  const rawDuration =
    Number(
      formData.get(
        'audioDurationMs'
      ) ||
      0
    );


  const audioDurationMs =
    Number.isFinite(
      rawDuration
    )
      ? Math.max(
          0,
          Math.min(
            Math.round(
              rawDuration
            ),
            180000
          )
        )
      : 0;


  if (
    !message &&
    !audioPath
  ) {

    return {
      ok:
        false,

      message:
        'Escreva o ajuste ou grave um áudio.',
    };
  }


  if (
    message.length >
    2000
  ) {

    return {
      ok:
        false,

      message:
        'O ajuste deve ter no máximo 2000 caracteres.',
    };
  }


  const allowedAudioTypes =
    new Set([
      'audio/webm',
      'audio/ogg',
      'audio/mp4',
      'audio/mpeg',
      'audio/wav',
      'audio/x-m4a',
    ]);


  if (
    audioPath &&
    !allowedAudioTypes.has(
      audioMimeType
    )
  ) {

    return {
      ok:
        false,

      message:
        'Formato de áudio não permitido.',
    };
  }


  const context =
    await resolveFinalApprovalContext(
      token
    );


  if (
    !context
  ) {

    redirect(
      '/aprovacao-final/' +
      token
    );
  }


  const {
    client,
    start,
    end,
  } =
    context;


  const content =
    await prisma.content.findFirst({
      where: {
        id:
          contentId,

        clientId:
          client.id,

        plannedDate: {
          gte:
            start,

          lt:
            end,
        },

        status: {
          in:
            FINAL_PENDING_STATUSES,
        },
      },
    });


  if (
    !content
  ) {

    redirect(
      '/aprovacao-final/' +
      token
    );
  }


  const legacyApproval =
    await prisma.approval.findFirst({
      where: {
        contentId,

        status:
          'PENDENTE',
      },

      orderBy: {
        createdAt:
          'desc',
      },
    });


  let audioUrl =
    '';


  if (
    audioPath
  ) {

    const expectedPrefix =
      'client-review-audio/ajuste-cliente-' +
      contentId +
      '-';


    if (
      !audioPath.startsWith(
        expectedPrefix
      )
    ) {

      return {
        ok:
          false,

        message:
          'Caminho do áudio inválido.',
      };
    }


    const exists =
      await aprovUpFileExists(
        audioPath
      );


    if (
      !exists
    ) {

      return {
        ok:
          false,

        message:
          'O áudio ainda não chegou ao Storage.',
      };
    }


    audioUrl =
      getAprovUpPublicUrl(
        audioPath
      );
  }


  const visibleMessage =
    message ||
    'Áudio de ajuste anexado.';


  const normalizedFormat =
    String(
      content.format ||
      ''
    ).toUpperCase();


  const returnsToSocialMedia =
    content.area ===
    'SOCIAL_MEDIA';


  const returnsToFilmmaker =
    !returnsToSocialMedia &&
    (
      content.area ===
        'FILMMAKER' ||
      [
        'REEL',
        'VIDEO',
        'TIKTOK',
        'SHORT',
      ].some(
        (
          format
        ) =>
          normalizedFormat.includes(
            format
          )
      )
    );


  const returnLabel =
    returnsToSocialMedia
      ? 'Social Media'
      : returnsToFilmmaker
        ? 'Filmmaker / Edição'
        : content.area ===
            'DESIGN'
          ? 'Design / Fazendo'
          : 'Produção';


  await prisma.$transaction(
    async (
      transaction
    ) => {

      if (
        legacyApproval
      ) {

        await transaction
          .approval
          .update({
            where: {
              id:
                legacyApproval.id,
            },

            data: {
              status:
                'ALTERACAO_SOLICITADA',

              clientComment:
                visibleMessage,
            },
          });
      }


      await transaction
        .content
        .update({
          where: {
            id:
              contentId,
          },

          data:
            returnsToSocialMedia
              ? {
                  status:
                    'ALTERACAO_SOLICITADA',

                  area:
                    'SOCIAL_MEDIA',
                }
              : returnsToFilmmaker
                ? {
                    status:
                      'FILMMAKER_EDICAO',

                    area:
                      'FILMMAKER',
                  }
                : content.area ===
                    'DESIGN'
                  ? {
                      status:
                        'DESIGN_FAZENDO',

                      area:
                        'DESIGN',
                    }
                  : {
                      status:
                        'ALTERACAO_SOLICITADA',
                    },
        });


      await transaction
        .comment
        .create({
          data: {
            contentId,

            authorName:
              client.name,

            authorRole:
              'CLIENTE',

            message:
              'ALTERACAO FINAL SOLICITADA PELO CLIENTE: ' +
              visibleMessage,

            audioUrl:
              audioUrl ||
              null,

            audioMimeType:
              audioMimeType ||
              null,

            audioDurationMs:
              audioDurationMs ||
              null,
          },
        });


      await transaction
        .historyLog
        .create({
          data: {
            entityType:
              'CONTENT',

            entityId:
              contentId,

            action:
              'FINAL_APPROVAL_CHANGE_REQUESTED',

            description:
              'Cliente solicitou alteração no material final: ' +
              content.title +
              '. Retornado para ' +
              returnLabel +
              '.',

            authorName:
              client.name,
          },
        });
    }
  );


  await notifyResponsibleSocialMediaAboutQuestion({
    agencyId:
      client.agencyId,

    contentId,

    source:
      'CLIENTE',

    message:
      visibleMessage,
  })
    .catch(
      (
        error
      ) => {

        console.error(
          'LIV final client adjustment:',
          error
        );
      }
    );


  revalidatePath(
    '/aprovacao-final/' +
    token
  );

  revalidatePath(
    '/clientes/' +
    client.id +
    '/aprovacao-final'
  );

  revalidatePath(
    '/design'
  );

  revalidatePath(
    '/filmmaker'
  );

  revalidatePath(
    '/social-media'
  );

  revalidatePath(
    '/social-media/avisos'
  );

  revalidatePath(
    '/pronto-para-postar'
  );


  return {
    ok:
      true,
  };
}

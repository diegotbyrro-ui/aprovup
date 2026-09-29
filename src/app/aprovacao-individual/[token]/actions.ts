'use server';

import {
  prisma,
} from '@/lib/prisma';

import {
  FINAL_PENDING_STATUSES,
} from '@/lib/finalMonthlyApproval';

import {
  notifyResponsibleSocialMediaAboutQuestion,
} from '@/lib/secretaryWhatsApp';

import {
  revalidatePath,
} from 'next/cache';

import {
  redirect,
} from 'next/navigation';


async function resolveApproval(
  token:
    string
) {

  return prisma.approval.findUnique({
    where: {
      token,
    },

    include: {
      content: {
        include: {
          client:
            true,
        },
      },
    },
  });
}


function refreshPaths(
  contentId:
    string,
  clientId:
    string,
  token:
    string
) {

  revalidatePath(
    `/aprovacao-individual/${token}`
  );

  revalidatePath(
    `/conteudos/${contentId}`
  );

  revalidatePath(
    `/clientes/${clientId}/aprovacao-final`
  );

  revalidatePath('/design');
  revalidatePath('/filmmaker');
  revalidatePath('/social-media');
  revalidatePath('/social-media/avisos');
  revalidatePath('/pronto-para-postar');
  revalidatePath('/calendario-editorial');
}


export async function approveIndividualContentAction(
  token:
    string
) {

  const approval =
    await resolveApproval(
      token
    );


  if (
    !approval ||
    !approval.content
  ) {

    redirect(
      `/aprovacao-individual/${token}`
    );
  }


  const content =
    approval.content;


  if (
    approval.status !==
      'PENDENTE' ||
    !FINAL_PENDING_STATUSES.includes(
      content.status
    )
  ) {

    redirect(
      `/aprovacao-individual/${token}`
    );
  }


  await prisma.$transaction(
    async (
      transaction
    ) => {

      await transaction.approval.update({
        where: {
          id:
            approval.id,
        },

        data: {
          status:
            'APROVADO',

          clientComment:
            null,
        },
      });


      await transaction.content.update({
        where: {
          id:
            content.id,
        },

        data: {
          status:
            'PRONTO_PARA_POSTAR',
        },
      });


      await transaction.comment.create({
        data: {
          contentId:
            content.id,

          authorName:
            content.client.name,

          authorRole:
            'CLIENTE',

          message:
            'APROVAÇÃO FINAL: material aprovado pelo link individual de aprovação.',
        },
      });


      await transaction.historyLog.create({
        data: {
          entityType:
            'CONTENT',

          entityId:
            content.id,

          action:
            'INDIVIDUAL_FINAL_APPROVAL_APPROVED',

          description:
            `Cliente aprovou individualmente o material final "${content.title}".`,

          authorName:
            content.client.name,
        },
      });
    }
  );


  refreshPaths(
    content.id,
    content.clientId,
    token
  );


  redirect(
    `/aprovacao-individual/${token}?feedback=aprovado`
  );
}


export async function requestIndividualChangesAction(
  token:
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


  if (!message) {

    redirect(
      `/aprovacao-individual/${token}?error=empty-adjustment`
    );
  }


  const approval =
    await resolveApproval(
      token
    );


  if (
    !approval ||
    !approval.content
  ) {

    redirect(
      `/aprovacao-individual/${token}`
    );
  }


  const content =
    approval.content;


  if (
    approval.status !==
      'PENDENTE' ||
    !FINAL_PENDING_STATUSES.includes(
      content.status
    )
  ) {

    redirect(
      `/aprovacao-individual/${token}`
    );
  }


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

      await transaction.approval.update({
        where: {
          id:
            approval.id,
        },

        data: {
          status:
            'ALTERACAO_SOLICITADA',

          clientComment:
            message,
        },
      });


      await transaction.content.update({
        where: {
          id:
            content.id,
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


      await transaction.comment.create({
        data: {
          contentId:
            content.id,

          authorName:
            content.client.name,

          authorRole:
            'CLIENTE',

          message:
            'ALTERACAO FINAL SOLICITADA PELO CLIENTE: ' +
            message,
        },
      });


      await transaction.historyLog.create({
        data: {
          entityType:
            'CONTENT',

          entityId:
            content.id,

          action:
            'INDIVIDUAL_FINAL_APPROVAL_CHANGE_REQUESTED',

          description:
            'Cliente solicitou alteração pelo link individual no conteúdo "' +
            content.title +
            '". Retornado para ' +
            returnLabel +
            '.',

          authorName:
            content.client.name,
        },
      });
    }
  );


  await notifyResponsibleSocialMediaAboutQuestion({
    agencyId:
      content.client.agencyId,

    contentId:
      content.id,

    source:
      'CLIENTE',

    message,
  }).catch(
    (
      error
    ) => {

      console.error(
        'LIV individual client adjustment:',
        error
      );
    }
  );


  refreshPaths(
    content.id,
    content.clientId,
    token
  );


  redirect(
    `/aprovacao-individual/${token}?feedback=ajuste`
  );
}
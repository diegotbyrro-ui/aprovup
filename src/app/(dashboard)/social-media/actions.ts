'use server';

import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';

import {
  aprovUpFileExists,
  getAprovUpPublicUrl,
} from '@/lib/aprovupStorage';
import { requirePermission } from '@/lib/userAccess';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';


const FINAL_READY_STATUSES = [
  'REVISAO_INTERNA',
  'DESIGN_ANALISE',
  'FILMMAKER_ANALISE',
];


export async function answerDesignQuestionAction(
  contentId: string,
  formData: FormData
) {
  const currentUser =
    await requirePermission('social.manage');
const answer =
    String(
      formData.get('answer') || ''
    ).trim();

  if (!answer) {
    redirect('/social-media');
  }

  const content =
    await prisma.content.findFirst({
      where: {
        id:
          contentId,

        client: {
          agencyId:
            currentUser.agencyId,
        },
      },
    });

  if (!content) {
    redirect('/social-media');
  }

  await prisma.comment.create({
    data: {
      contentId,
      authorName:
        currentUser.name ||
        currentUser.email ||
        'Social Media',

      authorRole:
        'SOCIAL_MEDIA',

      message:
        `RESPOSTA DA SOCIAL MEDIA: ${answer}`,
    },
  });

  await prisma.content.update({
    where: {
      id: contentId,
    },

    data: {
      status:
        'DESIGN_FAZENDO',

      area:
        'DESIGN',
    },
  });

  await prisma.historyLog.create({
    data: {
      entityType:
        'CONTENT',

      entityId:
        contentId,

      action:
        'SOCIAL_MEDIA_ANSWERED_DESIGN',

      description:
        'Social Media respondeu uma dúvida do Design.',

      authorName:
        currentUser.name ||
        currentUser.email ||
        'Social Media',
    },
  });

  revalidatePath('/social-media');
  revalidatePath('/design');
  revalidatePath(`/conteudos/${contentId}`);
  revalidatePath(`/clientes/${content.clientId}`);

  redirect(
    `/social-media?cliente=${content.clientId}`
  );
}


export async function answerFilmmakerQuestionAction(
  contentId: string,
  formData: FormData
) {
  const currentUser =
    await requirePermission('social.manage');
const answer =
    String(
      formData.get('answer') || ''
    ).trim();


  if (!answer) {
    redirect('/clientes');
  }


  const content =
    await prisma.content.findFirst({
      where: {
        id:
          contentId,

        client: {
          agencyId:
            currentUser.agencyId,
        },
      },
    });


  if (!content) {
    redirect('/clientes');
  }


  const originHistory =
    await prisma.historyLog.findFirst({
      where: {
        entityType:
          'CONTENT',

        entityId:
          contentId,

        action:
          'FILMMAKER_QUESTION_SENT',
      },

      orderBy: {
        createdAt:
          'desc',
      },
    });


  const originMatch =
    String(
      originHistory?.description ||
      ''
    ).match(
      /Origem:s*([A-Z0-9_]+)/
    );


  const candidateStatus =
    originMatch?.[1] ||
    'FILMMAKER_EDICAO';


  const allowedStatuses = [
    'FILMMAKER_PRE_PRODUCAO',
    'FILMMAKER_AGENDAMENTO',
    'FILMMAKER_GRAVANDO',
    'FILMMAKER_EDICAO',
    'FILMMAKER_ANALISE',
  ];


  const returnStatus =
    allowedStatuses.includes(
      candidateStatus
    )
      ? candidateStatus
      : 'FILMMAKER_EDICAO';


  await prisma.comment.create({
    data: {
      contentId,

      authorName:
        currentUser.name ||
        currentUser.email ||
        'Social Media',

      authorRole:
        'SOCIAL_MEDIA',

      message:
        `RESPOSTA DA SOCIAL MEDIA: ${answer}`,
    },
  });


  await prisma.content.update({
    where: {
      id:
        contentId,
    },

    data: {
      status:
        returnStatus,

      area:
        'FILMMAKER',
    },
  });


  await prisma.historyLog.create({
    data: {
      entityType:
        'CONTENT',

      entityId:
        contentId,

      action:
        'SOCIAL_MEDIA_ANSWERED_FILMMAKER',

      description:
        `Social Media respondeu ao Filmmaker e devolveu a demanda para ${returnStatus}.`,

      authorName:
        currentUser.name ||
        currentUser.email ||
        'Social Media',
    },
  });


  revalidatePath('/social-media');
  revalidatePath('/filmmaker');
  revalidatePath(
    `/conteudos/${contentId}`
  );

  revalidatePath(
    `/clientes/${content.clientId}`
  );


  redirect(
    `/social-media?cliente=${content.clientId}`
  );
}


export async function requestInternalAdjustmentAction(
  contentId: string,
  clientId: string,
  formData: FormData
) {
  const currentUser =
    await requirePermission(
      'social.manage'
    );

  const adjustment =
    String(
      formData.get(
        'adjustment'
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
      .split(';')[0]
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
    !adjustment &&
    !audioPath
  ) {
    throw new Error(
      'Escreva o ajuste ou grave um áudio.'
    );
  }

  if (
    adjustment.length >
    2000
  ) {
    throw new Error(
      'O ajuste deve ter no máximo 2000 caracteres.'
    );
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
    throw new Error(
      'Formato de áudio não permitido.'
    );
  }

  const content =
    await prisma.content.findFirst({
      where: {
        id:
          contentId,

        clientId,

        client: {
          agencyId:
            currentUser.agencyId,
        },
      },
    });

  if (!content) {
    throw new Error(
      'Conteúdo não encontrado.'
    );
  }

  if (
    !FINAL_READY_STATUSES.includes(
      content.status
    )
  ) {
    throw new Error(
      'Este conteúdo não está aguardando revisão da Social Media.'
    );
  }

  let audioUrl =
    '';

  if (audioPath) {
    const expectedPrefix =
      `review-audio/ajuste-social-${contentId}-`;

    if (
      !audioPath.startsWith(
        expectedPrefix
      )
    ) {
      throw new Error(
        'Caminho do áudio inválido.'
      );
    }

    const exists =
      await aprovUpFileExists(
        audioPath
      );

    if (!exists) {
      throw new Error(
        'O áudio ainda não chegou ao Storage.'
      );
    }

    audioUrl =
      getAprovUpPublicUrl(
        audioPath
      );
  }

  const returnToDesign =
    content.status ===
      'DESIGN_ANALISE' ||
    content.area ===
      'DESIGN';

  const targetArea =
    returnToDesign
      ? 'DESIGN'
      : 'FILMMAKER';

  const targetStatus =
    returnToDesign
      ? 'DESIGN_FAZENDO'
      : 'FILMMAKER_EDICAO';

  const targetLabel =
    returnToDesign
      ? 'Design'
      : 'Filmmaker';

  const authorName =
    currentUser.name ||
    currentUser.email ||
    'Social Media';

  const visibleMessage =
    adjustment ||
    'Áudio de revisão anexado.';

  await prisma.$transaction(
    async (
      transaction
    ) => {
      await transaction.comment.create({
        data: {
          contentId,

          authorName,

          authorRole:
            'SOCIAL_MEDIA',

          message:
            `AJUSTE INTERNO SOLICITADO PELA SOCIAL MEDIA: ${visibleMessage}`,

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

      await transaction.content.update({
        where: {
          id:
            contentId,
        },

        data: {
          status:
            targetStatus,

          area:
            targetArea,
        },
      });

      await transaction.historyLog.create({
        data: {
          entityType:
            'CONTENT',

          entityId:
            contentId,

          action:
            'SOCIAL_MEDIA_REQUESTED_INTERNAL_ADJUSTMENT',

          description:
            `Social Media solicitou ajuste interno ao ${targetLabel} antes do envio ao cliente.`,

          authorName,
        },
      });
    }
  );

  revalidatePath(
    '/social-media'
  );

  revalidatePath(
    '/design'
  );

  revalidatePath(
    '/filmmaker'
  );

  revalidatePath(
    `/conteudos/${contentId}`
  );

  revalidatePath(
    `/clientes/${clientId}`
  );

  return {
    ok: true,
  };
}

export async function sendContentToFinalApprovalAction(
  contentId: string,
  clientId: string,
  _formData: FormData
) {
  const currentUser =
    await requirePermission('social.manage');
const content =
    await prisma.content.findFirst({
      where: {
        id:
          contentId,

        clientId,

        client: {
          agencyId:
            currentUser.agencyId,
        },
      },
    });


  if (!content) {
    throw new Error(
      'Conteúdo não encontrado.'
    );
  }


  if (
    !FINAL_READY_STATUSES.includes(
      content.status
    )
  ) {
    throw new Error(
      'Este conteúdo ainda não está finalizado pela produção.'
    );
  }


  if (
    !content.finalMediaUrl &&
    !content.finalCoverUrl
  ) {
    throw new Error(
      'O material final ainda não foi anexado.'
    );
  }


  if (
    !String(
      content.caption || ''
    ).trim()
  ) {
    throw new Error(
      'A legenda precisa estar pronta antes da aprovação final.'
    );
  }


  const existingPendingApproval =
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


  if (!existingPendingApproval) {

    await prisma.approval.create({
      data: {
        contentId,
        token:
          randomUUID(),

        status:
          'PENDENTE',
      },
    });
  }


  await prisma.content.update({
    where: {
      id:
        contentId,
    },

    data: {
      status:
        'ENVIADO_CLIENTE',
    },
  });


  await prisma.historyLog.create({
    data: {
      entityType:
        'CONTENT',

      entityId:
        contentId,

      action:
        'FINAL_APPROVAL_SENT_BY_SOCIAL',

      description:
        `Social Media enviou o material para a 2ª Etapa de Aprovação: ${content.title}.`,

      authorName:
        currentUser.name ||
        currentUser.email ||
        'Social Media',
    },
  });


  revalidatePath('/social-media');

  revalidatePath(
    `/clientes/${clientId}/aprovacao-final`
  );

  revalidatePath('/design');
  revalidatePath('/filmmaker');

  revalidatePath(
    `/conteudos/${contentId}`
  );
}
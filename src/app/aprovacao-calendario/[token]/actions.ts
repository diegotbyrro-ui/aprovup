'use server';

import { prisma } from '@/lib/prisma';
import { getApprovedContentDestination } from '@/lib/contentRouting';

import {
  aprovUpFileExists,
  getAprovUpPublicUrl,
} from '@/lib/aprovupStorage';

import {
  notifyResponsibleSocialMediaAboutQuestion,
} from '@/lib/secretaryWhatsApp';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

function getMonthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  return {
    start,
    end,
  };
}

async function validateMonthlyApproval(
  token: string,
  contentId: string
) {
  const monthlyApproval = await prisma.monthlyApproval.findUnique({
    where: {
      token,
    },
    include: {
      client: true,
    },
  });

  if (!monthlyApproval) {
    throw new Error('Calendário de aprovação não encontrado.');
  }

  const { start, end } = getMonthRange(
    monthlyApproval.year,
    monthlyApproval.month
  );

  const content = await prisma.content.findFirst({
    where: {
      id: contentId,
      clientId: monthlyApproval.clientId,
      plannedDate: {
        gte: start,
        lte: end,
      },
    },
    include: {
      client: true,
    },
  });

  if (!content) {
    throw new Error(
      'Conteúdo não encontrado neste calendário mensal.'
    );
  }

  return {
    monthlyApproval,
    content,
  };
}

export async function approvePlanningContent(
  token: string,
  contentId: string
) {
  const { monthlyApproval, content } =
    await validateMonthlyApproval(token, contentId);

  const destination =
    getApprovedContentDestination(content);

  await prisma.content.update({
    where: {
      id: contentId,
    },
    data: {
      status: 'APROVADO',
      area: destination,
    },
  });

  const destinationLabel =
    destination === 'SOCIAL_MEDIA'
      ? 'Social Media'
      : destination === 'FILMMAKER'
        ? 'Filmmaker'
        : 'Design';

  await prisma.historyLog.create({
    data: {
      entityType: 'CONTENT',
      entityId: contentId,
      action: 'MONTHLY_PLANNING_APPROVED',
      description:
        `Cliente aprovou o planejamento do conteúdo "${content.title}". Demanda encaminhada para ${destinationLabel}.`,
      authorName: 'Cliente',
    },
  });

  await prisma.comment.create({
    data: {
      contentId,
      authorName: 'Cliente',
      authorRole: 'CLIENTE',
      message:
        `Planejamento aprovado. Conteúdo encaminhado para ${destinationLabel}.`,
    },
  });

  revalidatePath(`/aprovacao-calendario/${token}`);
  revalidatePath(`/conteudos/${contentId}`);
  revalidatePath('/clientes');
  revalidatePath('/calendario-editorial');
  revalidatePath('/social-media');
  revalidatePath('/design');
  revalidatePath('/filmmaker');
  revalidatePath('/social-media/agendamentos');

  if (monthlyApproval.clientId) {
    revalidatePath(
      `/clientes/${monthlyApproval.clientId}`
    );

    revalidatePath(
      `/clientes/${monthlyApproval.clientId}/visao`
    );
  }

  redirect(
    `/aprovacao-calendario/${token}?feedback=aprovado`
  );
}

export async function requestPlanningChanges(
  token: string,
  contentId: string,
  formData: FormData
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
    !message &&
    !audioPath
  ) {
    return {
      ok: false,
      message:
        'Escreva o ajuste ou grave um áudio.',
    };
  }

  if (
    message.length >
    2000
  ) {
    return {
      ok: false,
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
      ok: false,
      message:
        'Formato de áudio não permitido.',
    };
  }

  const {
    monthlyApproval,
    content,
  } =
    await validateMonthlyApproval(
      token,
      contentId
    );

  if (
    [
      'AGENDAMENTO_PRODUCAO',
      'DESIGN',
      'EDICAO',
      'REVISAO_INTERNA',
      'ENVIADO_CLIENTE',
      'APROVADO',
      'PRONTO_PARA_POSTAR',
      'PUBLICADO',
      'PUBLICADO_MANUALMENTE',
      'ARQUIVADO',
      'ALTERACAO_SOLICITADA',
    ].includes(
      content.status
    )
  ) {
    return {
      ok: false,
      message:
        'Este conteúdo não está mais pendente da primeira aprovação.',
    };
  }

  let audioUrl =
    '';

  if (audioPath) {
    const expectedPrefix =
      'client-planning-audio/ajuste-planejamento-' +
      contentId +
      '-';

    if (
      !audioPath.startsWith(
        expectedPrefix
      )
    ) {
      return {
        ok: false,
        message:
          'Caminho do áudio inválido.',
      };
    }

    const exists =
      await aprovUpFileExists(
        audioPath
      );

    if (!exists) {
      return {
        ok: false,
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

  await prisma.$transaction(
    async (
      transaction
    ) => {
      await transaction
        .content
        .update({
          where: {
            id:
              contentId,
          },

          data: {
            status:
              'ALTERACAO_SOLICITADA',

            area:
              'SOCIAL_MEDIA',
          },
        });

      await transaction
        .comment
        .create({
          data: {
            contentId,

            authorName:
              content.client?.name ||
              'Cliente',

            authorRole:
              'CLIENTE',

            message:
              'ALTERACAO SOLICITADA PELO CLIENTE: ' +
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
              'MONTHLY_PLANNING_CHANGE_REQUESTED',

            description:
              'Cliente solicitou alteração no planejamento do conteúdo "' +
              content.title +
              '".',

            authorName:
              content.client?.name ||
              'Cliente',
          },
        });
    }
  );

  await notifyResponsibleSocialMediaAboutQuestion({
    agencyId:
      monthlyApproval.client.agencyId,

    contentId,

    source:
      'CLIENTE',

    message:
      visibleMessage,
  }).catch(
    (
      error
    ) => {
      console.error(
        'LIV planning client adjustment:',
        error
      );
    }
  );


  revalidatePath(
    '/aprovacao-calendario/' +
    token
  );

  revalidatePath(
    '/conteudos/' +
    contentId
  );

  revalidatePath(
    '/clientes'
  );

  revalidatePath(
    '/calendario-editorial'
  );

  revalidatePath(
    '/social-media'
  );

  revalidatePath(
    '/social-media/avisos'
  );

  revalidatePath(
    '/design'
  );

  revalidatePath(
    '/filmmaker'
  );

  revalidatePath(
    '/social-media/agendamentos'
  );

  if (
    monthlyApproval.clientId
  ) {
    revalidatePath(
      '/clientes/' +
      monthlyApproval.clientId
    );

    revalidatePath(
      '/clientes/' +
      monthlyApproval.clientId +
      '/visao'
    );
  }

  return {
    ok: true,
  };
}

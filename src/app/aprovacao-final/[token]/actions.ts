'use server';

import { prisma } from '@/lib/prisma';

import {
  aprovUpFileExists,
  getAprovUpPublicUrl,
} from '@/lib/aprovupStorage';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

async function resolveClientByToken(token: string) {
  const gatewayApproval =
    await prisma.approval.findUnique({
      where: {
        token,
      },
      include: {
        content: {
          include: {
            client: true,
          },
        },
      },
    });

  return gatewayApproval?.content?.client || null;
}

export async function approveFinalContentAction(
  token: string,
  contentId: string,
  _formData: FormData
) {
  const client = await resolveClientByToken(token);

  if (!client) {
    redirect(`/aprovacao-final/${token}`);
  }

  const content = await prisma.content.findFirst({
    where: {
      id: contentId,
      clientId: client.id,
    },
  });

  if (!content) {
    redirect(`/aprovacao-final/${token}`);
  }

  const approval = await prisma.approval.findFirst({
    where: {
      contentId,
      status: 'PENDENTE',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!approval) {
    redirect(
      `/aprovacao-final/${token}?error=not-pending`
    );
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.approval.update({
      where: {
        id: approval.id,
      },
      data: {
        status: 'APROVADO',
        clientComment: null,
      },
    });

    await transaction.content.update({
      where: {
        id: contentId,
      },
      data: {
        status: 'PRONTO_PARA_POSTAR',
      },
    });

    await transaction.comment.create({
      data: {
        contentId,
        authorName: client.name,
        authorRole: 'CLIENTE',
        message:
          'APROVACAO FINAL: material aprovado na 2a Etapa de Aprovacao.',
      },
    });

    await transaction.historyLog.create({
      data: {
        entityType: 'CONTENT',
        entityId: contentId,
        action: 'FINAL_APPROVAL_APPROVED',
        description:
          `Cliente aprovou o material final: ${content.title}.`,
        authorName: client.name,
      },
    });
  });

  revalidatePath(
    `/aprovacao-final/${token}`
  );

  revalidatePath(
    `/clientes/${client.id}/aprovacao-final`
  );

  revalidatePath('/design');
  revalidatePath('/filmmaker');
  revalidatePath('/social-media');
  revalidatePath('/social-media/avisos');
  revalidatePath('/pronto-para-postar');

  redirect(
    `/aprovacao-final/${token}?feedback=aprovado`
  );
}

export async function requestFinalChangesAction(
  token: string,
  contentId: string,
  formData: FormData
) {
  const message = String(
    formData.get('message') || ''
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

  const client = await resolveClientByToken(token);

  if (!client) {
    redirect(`/aprovacao-final/${token}`);
  }

  const content = await prisma.content.findFirst({
    where: {
      id: contentId,
      clientId: client.id,
    },
  });

  if (!content) {
    redirect(`/aprovacao-final/${token}`);
  }

  const approval = await prisma.approval.findFirst({
    where: {
      contentId,
      status: 'PENDENTE',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!approval) {
    redirect(
      `/aprovacao-final/${token}?error=not-pending`
    );
  }

  let audioUrl =
    '';

  if (audioPath) {
    const expectedPrefix =
      `client-review-audio/ajuste-cliente-${contentId}-`;

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

  const normalizedFormat =
    String(
      content.format || ''
    ).toUpperCase();


  const returnsToFilmmaker =
    content.area === 'FILMMAKER' ||
    [
      'REEL',
      'VIDEO',
      'TIKTOK',
      'SHORT',
    ].some(
      (format) =>
        normalizedFormat.includes(
          format
        )
    );


  const returnLabel =
    returnsToFilmmaker
      ? 'Filmmaker / Edição'
      : content.area === 'DESIGN'
        ? 'Design / Fazendo'
        : 'Produção';


  await prisma.$transaction(async (transaction) => {
    await transaction.approval.update({
      where: {
        id: approval.id,
      },
      data: {
        status: 'ALTERACAO_SOLICITADA',
        clientComment: visibleMessage,
      },
    });

    await transaction.content.update({
      where: {
        id: contentId,
      },

      data: returnsToFilmmaker
        ? {
            status: 'FILMMAKER_EDICAO',
            area: 'FILMMAKER',
          }
        : content.area === 'DESIGN'
          ? {
              status: 'DESIGN_FAZENDO',
              area: 'DESIGN',
            }
          : {
              status: 'ALTERACAO_SOLICITADA',
            },
    });

    await transaction.comment.create({
      data: {
        contentId,
        authorName: client.name,
        authorRole: 'CLIENTE',
        message:
          `ALTERACAO FINAL SOLICITADA PELO CLIENTE: ${visibleMessage}`,

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

    await transaction.historyLog.create({
      data: {
        entityType: 'CONTENT',
        entityId: contentId,
        action: 'FINAL_APPROVAL_CHANGE_REQUESTED',
        description:
          `Cliente solicitou alteracao no material final: ${content.title}. Retornado para ${returnLabel}.`,
        authorName: client.name,
      },
    });
  });

  revalidatePath(
    `/aprovacao-final/${token}`
  );

  revalidatePath(
    `/clientes/${client.id}/aprovacao-final`
  );

  revalidatePath('/design');
  revalidatePath('/filmmaker');
  revalidatePath('/social-media');
  revalidatePath('/social-media/avisos');
  revalidatePath('/pronto-para-postar');

  return {
    ok: true,
  };
}
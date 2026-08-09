'use server';

import { prisma } from '@/lib/prisma';
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

  if (!message) {
    redirect(
      `/aprovacao-final/${token}?error=empty`
    );
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

  await prisma.$transaction(async (transaction) => {
    await transaction.approval.update({
      where: {
        id: approval.id,
      },
      data: {
        status: 'ALTERACAO_SOLICITADA',
        clientComment: message,
      },
    });

    await transaction.content.update({
      where: {
        id: contentId,
      },
      data: {
        status: 'ALTERACAO_SOLICITADA',
      },
    });

    await transaction.comment.create({
      data: {
        contentId,
        authorName: client.name,
        authorRole: 'CLIENTE',
        message:
          `ALTERACAO FINAL SOLICITADA PELO CLIENTE: ${message}`,
      },
    });

    await transaction.historyLog.create({
      data: {
        entityType: 'CONTENT',
        entityId: contentId,
        action: 'FINAL_APPROVAL_CHANGE_REQUESTED',
        description:
          `Cliente solicitou alteracao no material final: ${content.title}.`,
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

  redirect(
    `/aprovacao-final/${token}?feedback=alteracao`
  );
}
'use server';

import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/userAccess';
import { revalidatePath } from 'next/cache';

const READY_STATUSES = [
  'REVISAO_INTERNA',
  'DESIGN_ANALISE',
  'FILMMAKER_ANALISE',
];

async function sendContentToClient(
  contentId: string,
  clientId: string,
  agencyId: string,
  authorName: string
) {
  const content = await prisma.content.findFirst({
    where: {
      id:
        contentId,

      clientId,

      client: {
        agencyId,
      },
    },
  });

  if (!content) {
    throw new Error('Conteudo nao encontrado.');
  }

  if (content.format === 'DEMANDA_EMERGENCIAL') {
    return;
  }

  if (!READY_STATUSES.includes(content.status)) {
    return;
  }

  if (!content.finalMediaUrl && !content.finalCoverUrl) {
    return;
  }

  const existingPendingApproval =
    await prisma.approval.findFirst({
      where: {
        contentId:
          content.id,

        status:
          'PENDENTE',
      },
    });

  if (!existingPendingApproval) {
    await prisma.approval.create({
      data: {
        contentId:
          content.id,

        token: randomUUID(),
        status: 'PENDENTE',
      },
    });
  }

  await prisma.content.update({
    where: {
      id:
        content.id,
    },
    data: {
      status: 'ENVIADO_CLIENTE',
    },
  });

  await prisma.historyLog.create({
    data: {
      entityType: 'CONTENT',

      entityId:
        content.id,
      action: 'FINAL_APPROVAL_SENT',
      description:
        `Material final enviado para a 2\u00aa Etapa de Aprova\u00e7\u00e3o: ${content.title}.`,
      authorName,
    },
  });
}

export async function sendContentToFinalApprovalAction(
  contentId: string,
  clientId: string,
  _formData: FormData
) {
  const currentUser = await requirePermission('social.manage');

  await sendContentToClient(
    contentId,
    clientId,
    currentUser.agencyId,
    currentUser.name ||
      currentUser.email ||
      'Equipe AprovUp'
  );

  revalidatePath(
    `/clientes/${clientId}/aprovacao-final`
  );

  revalidatePath('/design');
  revalidatePath('/filmmaker');
}

export async function sendAllReadyToFinalApprovalAction(
  clientId: string,
  _formData: FormData
) {
  const currentUser = await requirePermission('social.manage');

  const contents = await prisma.content.findMany({
    where: {
      clientId,

      client: {
        agencyId:
          currentUser.agencyId,
      },
      format: { not: "DEMANDA_EMERGENCIAL" },
      status: {
        in: READY_STATUSES,
      },
    },
  });

  for (const content of contents) {
    await sendContentToClient(
      content.id,
      clientId,
      currentUser.agencyId,
      currentUser.name ||
        currentUser.email ||
        'Equipe AprovUp'
    );
  }

  revalidatePath(
    `/clientes/${clientId}/aprovacao-final`
  );

  revalidatePath('/design');
  revalidatePath('/filmmaker');
}
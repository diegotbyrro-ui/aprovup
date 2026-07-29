'use server';

import { prisma } from '@/lib/prisma';
import { requireCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

async function logHistory(
  entityType: string,
  entityId: string,
  action: string,
  description: string,
  authorName: string
) {
  await prisma.historyLog.create({
    data: {
      entityType,
      entityId,
      action,
      description,
      authorName,
    },
  });
}

export async function applyAssistantDraftToContent(
  contentId: string,
  field: string,
  value: string
) {
  const currentUser = await requireCurrentUser();

  const allowedFields = [
    'caption',
    'script',
    'artText',
    'briefing',
    'objective',
    'title',
  ];

  if (!allowedFields.includes(field)) {
    return {
      success: false,
      message: 'Campo inválido.',
    };
  }

  const content = await prisma.content.findUnique({
    where: {
      id: contentId,
    },
  });

  if (!content) {
    return {
      success: false,
      message: 'Conteúdo não encontrado.',
    };
  }

  await prisma.content.update({
    where: {
      id: contentId,
    },
    data: {
      [field]: value,
    },
  });

  await logHistory(
    'CONTENT',
    contentId,
    'ASSISTANT_DRAFT_APPLIED',
    `Texto aplicado no campo ${field}.`,
    currentUser.name || currentUser.email || 'Equipe Level UP'
  );

  revalidatePath(`/conteudos/${contentId}`);
  revalidatePath(`/clientes/${content.clientId}`);

  return {
    success: true,
    message: 'Texto aplicado com sucesso.',
  };
}

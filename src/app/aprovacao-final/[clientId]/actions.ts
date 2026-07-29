'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

function getText(formData: FormData, name: string) {
  return String(formData.get(name) || '').trim();
}

export async function approveFinalContentAction(contentId: string, clientId: string, formData: FormData) {
  const month = getText(formData, 'month');

  await prisma.content.update({
    where: {
      id: contentId,
    },
    data: {
      status: 'PRONTO_PARA_POSTAR',
    },
  });

  await prisma.comment.create({
    data: {
      contentId,
      authorName: 'Cliente',
      authorRole: 'CLIENTE',
      message: 'APROVAÇÃO FINAL DO CLIENTE: conteúdo aprovado para publicação.',
    },
  });

  revalidatePath(`/aprovacao-final/${clientId}`);
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath('/design');
  revalidatePath('/filmmaker');
}

export async function requestFinalAdjustmentAction(contentId: string, clientId: string, formData: FormData) {
  const message = getText(formData, 'message');

  if (!message) {
    return;
  }

  const content = await prisma.content.findUnique({
    where: {
      id: contentId,
    },
  });

  await prisma.content.update({
    where: {
      id: contentId,
    },
    data: {
      status: 'ALTERACAO_SOLICITADA',
      area: content?.area || 'DESIGN',
    },
  });

  await prisma.comment.create({
    data: {
      contentId,
      authorName: 'Cliente',
      authorRole: 'CLIENTE',
      message: `ALTERAÇÃO SOLICITADA NA APROVAÇÃO FINAL: ${message}`,
    },
  });

  revalidatePath(`/aprovacao-final/${clientId}`);
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath('/design');
  revalidatePath('/filmmaker');
}

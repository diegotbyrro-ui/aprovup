'use server';

import { prisma } from '@/lib/prisma';
import { requireCurrentUser, isDirector, isSocialMedia } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function answerDesignQuestionAction(
  contentId: string,
  formData: FormData
) {
  const currentUser = await requireCurrentUser();

  if (!isDirector(currentUser.role) && !isSocialMedia(currentUser.role)) {
    redirect('/clientes');
  }

  const answer = String(formData.get('answer') || '').trim();

  if (!answer) {
    redirect('/social-media');
  }

  const content = await prisma.content.findUnique({
    where: {
      id: contentId,
    },
  });

  if (!content) {
    redirect('/social-media');
  }

  await prisma.comment.create({
    data: {
      contentId,
      authorName: currentUser.name || currentUser.email || 'Social Media',
      authorRole: 'SOCIAL_MEDIA',
      message: `RESPOSTA DA SOCIAL MEDIA: ${answer}`,
    },
  });

  await prisma.content.update({
    where: {
      id: contentId,
    },
    data: {
      status: 'DESIGN_FAZENDO',
      area: 'DESIGN',
    },
  });

  await prisma.historyLog.create({
    data: {
      entityType: 'CONTENT',
      entityId: contentId,
      action: 'SOCIAL_MEDIA_ANSWERED_DESIGN',
      description: 'Social Media respondeu uma dúvida do Design.',
      authorName: currentUser.name || currentUser.email || 'Social Media',
    },
  });

  revalidatePath('/social-media');
  revalidatePath('/design');
  revalidatePath(`/conteudos/${contentId}`);
  revalidatePath(`/clientes/${content.clientId}`);

  redirect('/social-media');
}

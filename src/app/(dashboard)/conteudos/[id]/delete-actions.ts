'use server';

import { prisma } from '@/lib/prisma';
import { requireCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function deleteContentAction(contentId: string) {
  const currentUser = await requireCurrentUser();

  const content = await prisma.content.findUnique({
    where: {
      id: contentId,
    },
  });

  if (!content) {
    redirect('/clientes');
  }

  await prisma.comment.deleteMany({
    where: {
      contentId,
    },
  }).catch(() => null);

  await prisma.historyLog.create({
    data: {
      entityType: 'CONTENT',
      entityId: contentId,
      action: 'DELETED',
      description: `Conteúdo excluído: ${content.title || 'Sem título'}.`,
      authorName: currentUser.name || currentUser.email || 'Equipe Level UP',
    },
  }).catch(() => null);

  await prisma.content.delete({
    where: {
      id: contentId,
    },
  });

  revalidatePath(`/clientes/${content.clientId}`);
  revalidatePath('/clientes');
  revalidatePath('/design');
  revalidatePath('/filmmaker');

  redirect(`/clientes/${content.clientId}`);
}

'use server';

import { prisma } from '@/lib/prisma';
import { requireCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

function getCalendarRedirect(
  clientId: string,
  plannedDate?: Date | null
) {
  if (!plannedDate) {
    return `/calendario-editorial?cliente=${clientId}`;
  }

  const date = new Date(plannedDate);

  return (
    `/calendario-editorial?cliente=${clientId}` +
    `&mes=${date.getMonth() + 1}` +
    `&ano=${date.getFullYear()}`
  );
}

export async function deleteContentAction(
  contentId: string
) {
  const currentUser = await requireCurrentUser();

  const content = await prisma.content.findUnique({
    where: {
      id: contentId,
    },
  });

  if (!content) {
    redirect('/clientes');
  }

  const redirectUrl = getCalendarRedirect(
    content.clientId,
    content.plannedDate
  );

  await prisma.$transaction(async (transaction) => {
    await transaction.captureSchedule.updateMany({
      where: {
        contentId,
      },
      data: {
        contentId: null,
      },
    });

    await transaction.approval.deleteMany({
      where: {
        contentId,
      },
    });

    await transaction.task.deleteMany({
      where: {
        contentId,
      },
    });

    await transaction.comment.deleteMany({
      where: {
        contentId,
      },
    });

    await transaction.content.delete({
      where: {
        id: contentId,
      },
    });

    await transaction.historyLog.create({
      data: {
        entityType: 'CONTENT',
        entityId: contentId,
        action: 'DELETED',
        description:
          `Conteúdo excluído: ${
            content.title || 'Sem título'
          }.`,
        authorName:
          currentUser.name ||
          currentUser.email ||
          'Equipe AprovUp',
      },
    });
  });

  revalidatePath('/clientes');
  revalidatePath(`/clientes/${content.clientId}`);
  revalidatePath('/calendario-editorial');
  revalidatePath('/design');
  revalidatePath('/filmmaker');
  revalidatePath('/social-media/agendamentos');

  redirect(redirectUrl);
}
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

  const date =
    new Date(plannedDate);

  return (
    `/calendario-editorial?cliente=${clientId}` +
    `&mes=${date.getMonth() + 1}` +
    `&ano=${date.getFullYear()}`
  );
}

export async function deleteContentAction(
  contentId: string
) {
  const currentUser =
    await requireCurrentUser();

  if (
    currentUser.status !==
    'APROVADO'
  ) {
    redirect('/acesso-bloqueado');
  }

  /*
   * Na producao atual existe apenas uma agencia.
   * Qualquer funcionario aprovado pode excluir.
   *
   * O isolamento entre agencias fica exclusivamente
   * na branch multiagencia ate o deploy completo.
   */
  const content =
    await prisma.content.findUnique({
      where: {
        id: contentId,
      },
    });

  if (!content) {
    redirect('/clientes');
  }

  const redirectUrl =
    getCalendarRedirect(
      content.clientId,
      content.plannedDate
    );

  await prisma.$transaction(
    async (transaction) => {

      await transaction.captureSchedule.updateMany({
        where: {
          contentId:
            content.id,
        },

        data: {
          contentId: null,
        },
      });

      await transaction.approval.deleteMany({
        where: {
          contentId:
            content.id,
        },
      });

      await transaction.task.deleteMany({
        where: {
          contentId:
            content.id,
        },
      });

      await transaction.comment.deleteMany({
        where: {
          contentId:
            content.id,
        },
      });

      await transaction.content.delete({
        where: {
          id:
            content.id,
        },
      });

      await transaction.historyLog.create({
        data: {
          entityType:
            'CONTENT',

          entityId:
            content.id,

          action:
            'DELETED',

          description:
            `ConteÃºdo excluÃ­do permanentemente: ${
              content.title ||
              'Sem tÃ­tulo'
            }.`,

          authorName:
            currentUser.name ||
            currentUser.email ||
            'Equipe AprovUp',
        },
      });
    }
  );

  revalidatePath('/clientes');

  revalidatePath(
    `/clientes/${content.clientId}`
  );

  revalidatePath(
    `/clientes/${content.clientId}/visao`
  );

  revalidatePath(
    `/clientes/${content.clientId}/calendario`
  );

  revalidatePath('/conteudos');
  revalidatePath('/calendario');
  revalidatePath('/calendario-editorial');
  revalidatePath('/operacao');
  revalidatePath('/design');
  revalidatePath('/filmmaker');
  revalidatePath('/social-media');
  revalidatePath('/social-media/agendamentos');

  redirect(redirectUrl);
}

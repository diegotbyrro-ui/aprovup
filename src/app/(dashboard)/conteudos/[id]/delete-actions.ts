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

function formatHistoryDate(
  value: Date | null
) {
  if (!value) {
    return 'Sem data';
  }

  return new Date(value).toLocaleDateString(
    'pt-BR',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }
  );
}

function parsePlannedDate(
  value: string
): Date | null {

  const clean =
    String(value || '').trim();

  if (!clean) {
    return null;
  }

  const match =
    clean.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (!match) {
    throw new Error(
      'Data prevista inválida.'
    );
  }

  const year =
    Number(match[1]);

  const month =
    Number(match[2]);

  const day =
    Number(match[3]);

  const parsed =
    new Date(
      year,
      month - 1,
      day,
      12,
      0,
      0,
      0
    );

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    throw new Error(
      'Data prevista inválida.'
    );
  }

  return parsed;
}

export async function updateContentPlannedDateAction(
  contentId: string,
  formData: FormData
) {
  const currentUser =
    await requireCurrentUser();

  const content =
    await prisma.content.findFirst({
      where: {
        id: contentId,

        client: {
          agencyId:
            currentUser.agencyId,
        },
      },

      select: {
        id: true,
        title: true,
        clientId: true,
        plannedDate: true,
      },
    });

  if (!content) {
    redirect('/clientes');
  }

  const plannedDate =
    parsePlannedDate(
      String(
        formData.get(
          'plannedDate'
        ) || ''
      )
    );

  const oldTimestamp =
    content.plannedDate
      ? content.plannedDate.getTime()
      : null;

  const newTimestamp =
    plannedDate
      ? plannedDate.getTime()
      : null;

  if (
    oldTimestamp !==
    newTimestamp
  ) {

    await prisma.$transaction(
      async (transaction) => {

        await transaction.content.update({
          where: {
            id: content.id,
            clientId:
              content.clientId,
          },

          data: {
            plannedDate,
          },
        });

        await transaction.historyLog.create({
          data: {
            entityType:
              'CONTENT',

            entityId:
              content.id,

            action:
              'PLANNED_DATE_UPDATED',

            description:
              `Data prevista alterada de "${formatHistoryDate(
                content.plannedDate
              )}" para "${formatHistoryDate(
                plannedDate
              )}".`,

            authorName:
              currentUser.name ||
              currentUser.email ||
              'Equipe AprovUp',
          },
        });
      }
    );
  }

  revalidatePath(
    `/conteudos/${content.id}`
  );

  revalidatePath(
    `/clientes/${content.clientId}`
  );

  revalidatePath(
    `/clientes/${content.clientId}/visao`
  );

  revalidatePath(
    `/clientes/${content.clientId}/calendario`
  );

  revalidatePath(
    '/calendario'
  );

  revalidatePath(
    '/calendario-editorial'
  );

  revalidatePath(
    '/conteudos'
  );

  revalidatePath(
    '/operacao'
  );

  revalidatePath(
    '/design'
  );

  revalidatePath(
    '/filmmaker'
  );

  revalidatePath(
    '/social-media'
  );

  revalidatePath(
    '/social-media/agendamentos'
  );

  redirect(
    `/conteudos/${content.id}`
  );
}

export async function deleteContentAction(
  contentId: string
) {
  const currentUser =
    await requireCurrentUser();

  /*
   * Qualquer funcionário autenticado pode excluir,
   * mas SOMENTE conteúdo da própria agência.
   */
  const content =
    await prisma.content.findFirst({
      where: {
        id: contentId,

        client: {
          agencyId:
            currentUser.agencyId,
        },
      },

      select: {
        id: true,
        title: true,
        clientId: true,
        plannedDate: true,
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

          clientId:
            content.clientId,
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
            `Conteúdo excluído permanentemente: ${
              content.title ||
              'Sem título'
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

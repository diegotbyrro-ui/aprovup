'use server';

import { prisma } from '@/lib/prisma';
import { getApprovedContentDestination } from '@/lib/contentRouting';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

function getMonthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  return {
    start,
    end,
  };
}

async function validateMonthlyApproval(
  token: string,
  contentId: string
) {
  if (!token || !contentId) {
    throw new Error('Link de aprova??o inv?lido.');
  }

  const monthlyApproval =
    await prisma.monthlyApproval.findUnique({
      where: {
        token,
      },
      include: {
        client: true,
      },
    });

  if (!monthlyApproval) {
    throw new Error('Calend?rio de aprova??o n?o encontrado.');
  }

  const { start, end } = getMonthRange(
    monthlyApproval.year,
    monthlyApproval.month
  );

  const content = await prisma.content.findFirst({
    where: {
      id: contentId,
      clientId: monthlyApproval.clientId,
      plannedDate: {
        gte: start,
        lte: end,
      },
    },
  });

  if (!content) {
    throw new Error(
      'Este conte?do n?o pertence ao calend?rio autorizado por este link.'
    );
  }

  return {
    monthlyApproval,
    content,
  };
}

async function approveContentBase(
  contentId: string,
  token: string
) {
  const {
    monthlyApproval,
    content,
  } = await validateMonthlyApproval(
    token,
    contentId
  );

  const destination =
    getApprovedContentDestination(content);

  await prisma.$transaction(async (transaction) => {
    await transaction.content.update({
      where: {
        id: content.id,
      },
      data: {
        status: 'APROVADO',
        area: destination,
      },
    });

    await transaction.comment.create({
      data: {
        contentId: content.id,
        authorName: monthlyApproval.client.name,
        authorRole: 'CLIENTE',
        message:
          `APROVA??O DO CLIENTE: conte?do aprovado na Etapa 1 e encaminhado para ${
            destination === 'FILMMAKER'
              ? 'Filmaker'
              : 'Design'
          }.`,
      },
    });

    await transaction.historyLog.create({
      data: {
        entityType: 'CONTENT',
        entityId: content.id,
        action: 'PLANNING_APPROVED_AND_ROUTED',
        description:
          `Conte?do aprovado pelo cliente e encaminhado para ${
            destination === 'FILMMAKER'
              ? 'Filmaker'
              : 'Design'
          }.`,
        authorName: monthlyApproval.client.name,
      },
    });
  });

  revalidatePath(
    `/aprovacao-mensal/${token}`
  );

  revalidatePath(
    `/clientes/${monthlyApproval.clientId}`
  );

  revalidatePath('/clientes');
  revalidatePath('/calendario-editorial');
  revalidatePath('/design');
  revalidatePath('/filmmaker');
  revalidatePath('/social-media/agendamentos');
}

async function requestAdjustmentBase(
  contentId: string,
  token: string,
  formData: FormData
) {
  const message = String(
    formData.get('message') ||
    formData.get('adjustment') ||
    formData.get('adjustmentMessage') ||
    formData.get('comment') ||
    formData.get('reason') ||
    ''
  ).trim();

  if (!message) {
    redirect(
      `/aprovacao-mensal/${token}?error=empty-adjustment`
    );
  }

  const {
    monthlyApproval,
    content,
  } = await validateMonthlyApproval(
    token,
    contentId
  );

  await prisma.$transaction(async (transaction) => {
    await transaction.content.update({
      where: {
        id: content.id,
      },
      data: {
        status: 'ALTERACAO_SOLICITADA',
        area: 'SOCIAL_MEDIA',
      },
    });

    await transaction.comment.create({
      data: {
        contentId: content.id,
        authorName: monthlyApproval.client.name,
        authorRole: 'CLIENTE',
        message:
          `ALTERA??O SOLICITADA PELO CLIENTE: ${message}`,
      },
    });

    await transaction.historyLog.create({
      data: {
        entityType: 'CONTENT',
        entityId: content.id,
        action: 'PLANNING_CHANGE_REQUESTED',
        description:
          'Cliente solicitou altera??o na primeira etapa de aprova??o.',
        authorName: monthlyApproval.client.name,
      },
    });
  });

  revalidatePath(
    `/aprovacao-mensal/${token}`
  );

  revalidatePath(
    `/clientes/${monthlyApproval.clientId}`
  );

  revalidatePath('/clientes');
  revalidatePath('/calendario-editorial');
  revalidatePath('/social-media/avisos');
  revalidatePath('/design');
  revalidatePath('/filmmaker');
  revalidatePath('/social-media/agendamentos');
}

/*
 * Mantemos estes nomes porque podem existir telas antigas
 * ainda importando algum deles.
 */

export async function approveContentAction(
  contentId: string,
  token: string
) {
  return approveContentBase(contentId, token);
}

export async function approveMonthlyContentAction(
  contentId: string,
  token: string
) {
  return approveContentBase(contentId, token);
}

export async function approveItemAction(
  contentId: string,
  token: string
) {
  return approveContentBase(contentId, token);
}

export async function approvePlanningContentAction(
  contentId: string,
  token: string
) {
  return approveContentBase(contentId, token);
}

export async function approveContent(
  contentId: string,
  token: string
) {
  return approveContentBase(contentId, token);
}

export async function approveMonthlyContentItemAction(
  contentId: string,
  token: string
) {
  return approveContentBase(contentId, token);
}

export async function requestAdjustmentAction(
  contentId: string,
  token: string,
  formData: FormData
) {
  return requestAdjustmentBase(
    contentId,
    token,
    formData
  );
}

export async function requestMonthlyAdjustmentAction(
  contentId: string,
  token: string,
  formData: FormData
) {
  return requestAdjustmentBase(
    contentId,
    token,
    formData
  );
}

export async function requestChangeAction(
  contentId: string,
  token: string,
  formData: FormData
) {
  return requestAdjustmentBase(
    contentId,
    token,
    formData
  );
}

export async function requestContentAdjustmentAction(
  contentId: string,
  token: string,
  formData: FormData
) {
  return requestAdjustmentBase(
    contentId,
    token,
    formData
  );
}

export async function requestMonthlyContentAdjustmentAction(
  contentId: string,
  token: string,
  formData: FormData
) {
  return requestAdjustmentBase(
    contentId,
    token,
    formData
  );
}

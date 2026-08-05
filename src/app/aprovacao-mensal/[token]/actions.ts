'use server';

import { prisma } from '@/lib/prisma';
import { getApprovedContentDestination } from '@/lib/contentRouting';
import { revalidatePath } from 'next/cache';

function getTokenFromArgs(args: any[]) {
  return args.find(
    (arg) => typeof arg === 'string' && arg.length > 10
  ) || '';
}

function getFormDataFromArgs(args: any[]) {
  return args.find(
    (arg) => arg instanceof FormData
  ) as FormData | undefined;
}

function getText(
  formData: FormData | undefined,
  names: string[]
) {
  if (!formData) return '';

  for (const name of names) {
    const value = String(formData.get(name) || '').trim();

    if (value) return value;
  }

  return '';
}

async function routeApprovedContent(contentId: string) {
  const content = await prisma.content.findUnique({
    where: {
      id: contentId,
    },
  });

  if (!content) {
    return null;
  }

  const destination = getApprovedContentDestination(content);

  const updatedContent = await prisma.content.update({
    where: {
      id: contentId,
    },
    data: {
      status: 'APROVADO',
      area: destination,
    },
  });

  return {
    content: updatedContent,
    destination,
  };
}

async function approveContentBase(
  contentId: string,
  args: any[]
) {
  const token = getTokenFromArgs(args);
  const result = await routeApprovedContent(contentId);

  if (result) {
    const destinationLabel =
      result.destination === 'FILMMAKER'
        ? 'Filmmaker'
        : 'Design';

    await prisma.comment.create({
      data: {
        contentId,
        authorName: 'Cliente',
        authorRole: 'CLIENTE',
        message:
          `APROVAÇÃO DO CLIENTE: conteúdo aprovado na Etapa 1 e encaminhado para ${destinationLabel}.`,
      },
    }).catch(() => null);

    await prisma.historyLog.create({
      data: {
        entityType: 'CONTENT',
        entityId: contentId,
        action: 'PLANNING_APPROVED_AND_ROUTED',
        description:
          `Conteúdo aprovado pelo cliente e encaminhado para ${destinationLabel}.`,
        authorName: 'Cliente',
      },
    }).catch(() => null);

    revalidatePath(`/clientes/${result.content.clientId}`);
  }

  if (token) {
    revalidatePath(`/aprovacao-mensal/${token}`);
  }

  revalidatePath('/clientes');
  revalidatePath('/calendario-editorial');
  revalidatePath('/design');
  revalidatePath('/filmmaker');
  revalidatePath('/social-media/agendamentos');
}

async function requestAdjustmentBase(
  contentId: string,
  args: any[]
) {
  const token = getTokenFromArgs(args);
  const formData = getFormDataFromArgs(args);

  const message = getText(formData, [
    'message',
    'adjustment',
    'adjustmentMessage',
    'comment',
    'reason',
  ]);

  const content = await prisma.content.findUnique({
    where: {
      id: contentId,
    },
  });

  if (!content) {
    return;
  }

  await prisma.content.update({
    where: {
      id: contentId,
    },
    data: {
      status: 'ALTERACAO_SOLICITADA',
      area: 'SOCIAL_MEDIA',
    },
  });

  await prisma.comment.create({
    data: {
      contentId,
      authorName: 'Cliente',
      authorRole: 'CLIENTE',
      message:
        `ALTERAÇÃO SOLICITADA PELO CLIENTE: ${
          message || 'Cliente solicitou ajuste neste conteúdo.'
        }`,
    },
  }).catch(() => null);

  await prisma.historyLog.create({
    data: {
      entityType: 'CONTENT',
      entityId: contentId,
      action: 'PLANNING_CHANGE_REQUESTED',
      description:
        'Cliente solicitou alteração na primeira etapa de aprovação.',
      authorName: 'Cliente',
    },
  }).catch(() => null);

  revalidatePath(`/clientes/${content.clientId}`);

  if (token) {
    revalidatePath(`/aprovacao-mensal/${token}`);
  }

  revalidatePath('/clientes');
  revalidatePath('/calendario-editorial');
  revalidatePath('/social-media/avisos');
  revalidatePath('/design');
  revalidatePath('/filmmaker');
  revalidatePath('/social-media/agendamentos');
}

export async function approveContentAction(
  contentId: string,
  ...args: any[]
) {
  return approveContentBase(contentId, args);
}

export async function approveMonthlyContentAction(
  contentId: string,
  ...args: any[]
) {
  return approveContentBase(contentId, args);
}

export async function approveItemAction(
  contentId: string,
  ...args: any[]
) {
  return approveContentBase(contentId, args);
}

export async function approvePlanningContentAction(
  contentId: string,
  ...args: any[]
) {
  return approveContentBase(contentId, args);
}

export async function approveContent(
  contentId: string,
  ...args: any[]
) {
  return approveContentBase(contentId, args);
}

export async function approveMonthlyContentItemAction(
  contentId: string,
  ...args: any[]
) {
  return approveContentBase(contentId, args);
}

export async function requestAdjustmentAction(
  contentId: string,
  ...args: any[]
) {
  return requestAdjustmentBase(contentId, args);
}

export async function requestMonthlyAdjustmentAction(
  contentId: string,
  ...args: any[]
) {
  return requestAdjustmentBase(contentId, args);
}

export async function requestChangeAction(
  contentId: string,
  ...args: any[]
) {
  return requestAdjustmentBase(contentId, args);
}

export async function requestContentAdjustmentAction(
  contentId: string,
  ...args: any[]
) {
  return requestAdjustmentBase(contentId, args);
}

export async function requestMonthlyContentAdjustmentAction(
  contentId: string,
  ...args: any[]
) {
  return requestAdjustmentBase(contentId, args);
}

export async function scheduleClientSuggestedCaptureAction(
  ...args: any[]
) {
  return;
}
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

function getTokenFromArgs(args: any[]) {
  return args.find((arg) => typeof arg === 'string' && arg.length > 10) || '';
}

function getFormDataFromArgs(args: any[]) {
  return args.find((arg) => arg instanceof FormData) as FormData | undefined;
}

function getText(formData: FormData | undefined, names: string[]) {
  if (!formData) return '';

  for (const name of names) {
    const value = String(formData.get(name) || '').trim();

    if (value) return value;
  }

  return '';
}

function isVideoFormat(format?: string | null) {
  const value = String(format || '').toUpperCase();

  return (
    value.includes('REELS') ||
    value.includes('VIDEO') ||
    value.includes('VÍDEO') ||
    value.includes('STORY') ||
    value.includes('STORIES')
  );
}

async function routeApprovedContent(contentId: string) {
  const content = await prisma.content.findUnique({
    where: {
      id: contentId,
    },
  });

  if (!content) return null;

  const video = isVideoFormat((content as any).format);

  if (video) {
    await prisma.content.update({
      where: {
        id: contentId,
      },
      data: {
        status: 'APROVADO',
        area: 'SOCIAL_MEDIA',
      } as any,
    });

    return content;
  }

  await prisma.content.update({
    where: {
      id: contentId,
    },
    data: {
      status: 'APROVADO',
      area: 'DESIGN',
    } as any,
  });

  return content;
}

async function approveContentBase(contentId: string, args: any[]) {
  const token = getTokenFromArgs(args);

  const content = await routeApprovedContent(contentId);

  if (content) {
    await prisma.comment.create({
      data: {
        contentId,
        authorName: 'Cliente',
        authorRole: 'CLIENTE',
        message: 'APROVAÇÃO DO CLIENTE: conteúdo aprovado na Etapa 1 - Planejamento.',
      },
    }).catch(() => null);

    revalidatePath(`/clientes/${(content as any).clientId}`);
  }

  if (token) {
    revalidatePath(`/aprovacao-mensal/${token}`);
  }

  revalidatePath('/design');
  revalidatePath('/filmmaker');

  return;
}

async function requestAdjustmentBase(contentId: string, args: any[]) {
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
    } as any,
  });

  await prisma.comment.create({
    data: {
      contentId,
      authorName: 'Cliente',
      authorRole: 'CLIENTE',
      message: `ALTERAÇÃO SOLICITADA PELO CLIENTE: ${message || 'Cliente solicitou ajuste neste conteúdo.'}`,
    },
  }).catch(() => null);

  revalidatePath(`/clientes/${(content as any).clientId}`);

  if (token) {
    revalidatePath(`/aprovacao-mensal/${token}`);
  }

  revalidatePath('/social-media/avisos');
  revalidatePath('/design');
  revalidatePath('/filmmaker');

  return;
}

// Exportações com vários nomes para cobrir o que a página estiver usando
export async function approveContentAction(contentId: string, ...args: any[]) {
  return approveContentBase(contentId, args);
}

export async function approveMonthlyContentAction(contentId: string, ...args: any[]) {
  return approveContentBase(contentId, args);
}

export async function approveItemAction(contentId: string, ...args: any[]) {
  return approveContentBase(contentId, args);
}

export async function approvePlanningContentAction(contentId: string, ...args: any[]) {
  return approveContentBase(contentId, args);
}

export async function approveContent(contentId: string, ...args: any[]) {
  return approveContentBase(contentId, args);
}

export async function requestAdjustmentAction(contentId: string, ...args: any[]) {
  return requestAdjustmentBase(contentId, args);
}

export async function requestMonthlyAdjustmentAction(contentId: string, ...args: any[]) {
  return requestAdjustmentBase(contentId, args);
}

export async function requestChangeAction(contentId: string, ...args: any[]) {
  return requestAdjustmentBase(contentId, args);
}

export async function requestContentAdjustmentAction(contentId: string, ...args: any[]) {
  return requestAdjustmentBase(contentId, args);
}


export async function approveMonthlyContentItemAction(contentId: string, ...args: any[]) {
  return approveContentBase(contentId, args);
}

export async function requestMonthlyContentAdjustmentAction(contentId: string, ...args: any[]) {
  return requestAdjustmentBase(contentId, args);
}

export async function scheduleClientSuggestedCaptureAction(...args: any[]) {
  return;
}

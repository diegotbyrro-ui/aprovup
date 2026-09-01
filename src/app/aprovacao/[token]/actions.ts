'use server';

import { prisma } from '@/lib/prisma';
import {
  getApprovedContentDestination,
} from '@/lib/contentRouting';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

function text(formData: FormData, name: string) {
  return String(formData.get(name) || '').trim();
}

async function resolveClient(token: string) {
  const approval = await prisma.approval.findUnique({
    where: {
      token,
    },
    include: {
      content: {
        include: {
          client: true,
        },
      },
    },
  });

  return approval?.content?.client || null;
}

export async function approveClientContentAction(
  contentId: string,
  token: string
) {
  const client = await resolveClient(token);

  if (!client) {
    redirect(`/aprovacao/${token}`);
  }

  const content = await prisma.content.findFirst({
    where: {
      id: contentId,
      clientId: client.id,
    },
  });

  if (!content) {
    redirect(`/aprovacao/${token}`);
  }

  const destination =
    getApprovedContentDestination(content);

  await prisma.content.update({
    where: {
      id: contentId,
    },
    data: {
      status: 'APROVADO',
      area: destination,
    },
  });

  await prisma.comment.create({
    data: {
      contentId,
      authorName: client.name,
      authorRole: 'CLIENTE',
      message:
        `APROVAÇÃO DO CLIENTE: conteúdo aprovado e encaminhado para ${
          destination === 'FILMMAKER'
            ? 'Filmaker'
            : 'Design'
        }.`,
    },
  }).catch(() => null);

  await prisma.historyLog.create({
    data: {
      entityType: 'CONTENT',
      entityId: contentId,
      action: 'CLIENT_APPROVED_CONTENT',
      description:
        `Cliente aprovou o conteúdo: ${content.title}.`,
      authorName: client.name,
    },
  });

  revalidatePath(`/aprovacao/${token}`);
  revalidatePath(`/clientes/${client.id}`);
  revalidatePath('/clientes');
  revalidatePath('/calendario-editorial');
  revalidatePath('/design');
  revalidatePath('/filmmaker');
  revalidatePath('/social-media/agendamentos');

  redirect(`/aprovacao/${token}`);
}

export async function requestClientAdjustmentAction(
  contentId: string,
  token: string,
  formData: FormData
) {
  const client = await resolveClient(token);
  const message = text(formData, 'message');

  if (!client) {
    redirect(`/aprovacao/${token}`);
  }

  if (!message) {
    redirect(
      `/aprovacao/${token}?error=empty-adjustment`
    );
  }

  const content = await prisma.content.findFirst({
    where: {
      id: contentId,
      clientId: client.id,
    },
  });

  if (!content) {
    redirect(`/aprovacao/${token}`);
  }

  await prisma.comment.create({
    data: {
      contentId,
      authorName: client.name,
      authorRole: 'CLIENTE',
      message:
        `ALTERAÇÃO SOLICITADA PELO CLIENTE: ${message}`,
    },
  });

  await prisma.content.update({
    where: {
      id: contentId,
    },
    data: {
      status: 'ALTERACAO_SOLICITADA',
      area: 'SOCIAL_MEDIA',
    },
  });

  await prisma.historyLog.create({
    data: {
      entityType: 'CONTENT',
      entityId: contentId,
      action: 'CLIENT_REQUESTED_ADJUSTMENT',
      description:
        `Cliente pediu alteração no conteúdo: ${content.title}.`,
      authorName: client.name,
    },
  });

  revalidatePath(`/aprovacao/${token}`);
  revalidatePath(`/clientes/${client.id}`);
  revalidatePath('/clientes');
  revalidatePath('/calendario-editorial');
  revalidatePath('/social-media');
  revalidatePath('/social-media/agendamentos');
  revalidatePath('/design');
  revalidatePath('/filmmaker');

  redirect(`/aprovacao/${token}`);
}
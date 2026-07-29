'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

function text(formData: FormData, name: string) {
  return String(formData.get(name) || '').trim();
}

async function resolveClient(token: string) {
  // Nesta fase, o token usado será o ID real do cliente.
  return prisma.client.findUnique({
    where: {
      id: token,
    },
  });
}

export async function approveClientContentAction(contentId: string, token: string) {
  const client = await resolveClient(token);

  if (!client) {
    redirect(`/aprovacao/${token}`);
  }

  const content = await prisma.content.findUnique({
    where: {
      id: contentId,
    },
  });

  if (!content) {
    redirect(`/aprovacao/${token}`);
  }

  await prisma.content.update({
    where: {
      id: contentId,
    },
    data: {
      status: 'APROVADO',
    },
  });

  await prisma.historyLog.create({
    data: {
      entityType: 'CONTENT',
      entityId: contentId,
      action: 'CLIENT_APPROVED_CONTENT',
      description: `Cliente aprovou o conteúdo: ${content.title}.`,
      authorName: client.name,
    },
  });

  revalidatePath(`/aprovacao/${token}`);
  revalidatePath(`/clientes/${client.id}`);
  revalidatePath('/clientes');
  revalidatePath('/design');
  revalidatePath('/filmmaker');

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
    redirect(`/aprovacao/${token}?error=empty-adjustment`);
  }

  const content = await prisma.content.findUnique({
    where: {
      id: contentId,
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
      message: `ALTERAÇÃO SOLICITADA PELO CLIENTE: ${message}`,
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
      description: `Cliente pediu alteração no conteúdo: ${content.title}.`,
      authorName: client.name,
    },
  });

  revalidatePath(`/aprovacao/${token}`);
  revalidatePath(`/clientes/${client.id}`);
  revalidatePath('/clientes');
  revalidatePath('/social-media');
  revalidatePath('/dashboard');

  redirect(`/aprovacao/${token}`);
}

export async function scheduleSuggestedCaptureAction(
  token: string,
  formData: FormData
) {
  const client = await resolveClient(token);

  if (!client) {
    redirect(`/aprovacao/${token}`);
  }

  const date = text(formData, 'date');
  const time = text(formData, 'time') || '09:00';

  if (!date) {
    redirect(`/aprovacao/${token}?error=no-date`);
  }

  const dateKey = date;
  const scheduledAt = new Date(`${date}T${time}:00`);

  const existingSameDayOtherClient = await prisma.captureSchedule.findFirst({
    where: {
      dateKey,
      status: {
        not: 'CANCELADO',
      },
      clientId: {
        not: client.id,
      },
    },
  });

  if (existingSameDayOtherClient) {
    redirect(`/aprovacao/${token}?error=busy-date`);
  }

  const existingSameClient = await prisma.captureSchedule.findFirst({
    where: {
      dateKey,
      clientId: client.id,
      status: {
        not: 'CANCELADO',
      },
    },
  });

  if (existingSameClient) {
    redirect(`/aprovacao/${token}?error=same-client-date`);
  }

  const filmmakerContents = await prisma.content.findMany({
    where: {
      clientId: client.id,
      area: 'FILMMAKER',
      status: {
        in: ['APROVADO', 'FILMMAKER_PRE_PRODUCAO', 'FILMMAKER_AGENDAMENTO'],
      },
    },
    orderBy: {
      plannedDate: 'asc',
    },
  });

  const firstContent = filmmakerContents[0];

  const schedule = await prisma.captureSchedule.create({
    data: {
      clientId: client.id,
      contentId: firstContent?.id || null,
      clientName: client.name,
      contentName: firstContent?.title || 'Captação mensal',
      scheduledAt,
      dateKey,
      location: client.companyAddress || '',
      notes: `Captação sugerida após aprovação do calendário mensal. Conteúdos de vídeo vinculados: ${filmmakerContents.map((item) => item.title).join(', ')}`,
      status: 'AGENDADO',
      createdBy: 'Cliente via aprovação mensal',
    },
  });

  await prisma.content.updateMany({
    where: {
      clientId: client.id,
      area: 'FILMMAKER',
      status: 'APROVADO',
    },
    data: {
      status: 'FILMMAKER_AGENDAMENTO',
    },
  });

  await prisma.historyLog.create({
    data: {
      entityType: 'CAPTURE_SCHEDULE',
      entityId: schedule.id,
      action: 'CLIENT_SCHEDULED_CAPTURE',
      description: `Cliente escolheu data sugerida para captação: ${client.name} em ${date} às ${time}.`,
      authorName: client.name,
    },
  });

  revalidatePath(`/aprovacao/${token}`);
  revalidatePath('/filmmaker');
  revalidatePath('/clientes');
  revalidatePath('/dashboard');

  redirect(`/aprovacao/${token}?scheduled=success`);
}

'use server';

import { createGoogleCalendarEvent } from '@/lib/googleCalendar';
import { isVideoContent } from '@/lib/contentRouting';
import { prisma } from '@/lib/prisma';
import { requireAnyPermission } from '@/lib/userAccess';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

function normalizeRole(role?: string | null) {
  return String(role || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isSocialMedia(role?: string | null) {
  const value = normalizeRole(role);

  return (
    value === 'social media' ||
    value === 'social_media' ||
    value === 'socialmedia'
  );
}

function isFilmmaker(role?: string | null) {
  const value = normalizeRole(role);

  return (
    value === 'filmmaker' ||
    value === 'audiovisual' ||
    value === 'video'
  );
}

async function checkAccess() {
  return requireAnyPermission([
    'social.manage',
    'filmmaker.manage',
  ]);
}

function text(formData: FormData, name: string) {
  return String(formData.get(name) || '').trim();
}

function formatCaptureDate(date: Date) {
  return date.toLocaleDateString('pt-BR');
}

function formatCaptureTime(date: Date) {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export async function createCaptureScheduleAction(
  formData: FormData
) {
  const currentUser = await checkAccess();

  const clientId = text(formData, 'clientId');
  const date = text(formData, 'date');
  const time = text(formData, 'time') || '09:00';
  const location = text(formData, 'location');
  const notes = text(formData, 'notes');

  if (!clientId || !date || !time) {
    redirect(
      `/captacoes/nova?cliente=${clientId}&error=missing`
    );
  }

  const client = await prisma.client.findFirst({
    where: {
      id:
        clientId,

      agencyId:
        currentUser.agencyId,
    },
  });

  if (!client) {
    redirect('/clientes');
  }

  const tenantClients =
    await prisma.client.findMany({
      where: {
        agencyId:
          currentUser.agencyId,
      },

      select: {
        id:
          true,
      },
    });

  const tenantClientIds =
    tenantClients.map(
      (item) => item.id
    );

  const scheduledAt = new Date(`${date}T${time}:00`);

  if (Number.isNaN(scheduledAt.getTime())) {
    redirect(
      `/captacoes/nova?cliente=${clientId}&error=missing`
    );
  }

  const existingSameDayOtherClient =
    await prisma.captureSchedule.findFirst({
      where: {
        dateKey: date,
        status: {
          not: 'CANCELADO',
        },
        clientId: {
          in:
            tenantClientIds,

          not:
            clientId,
        },
      },
    });

  if (existingSameDayOtherClient) {
    redirect(
      `/captacoes/nova?cliente=${clientId}&error=busy`
    );
  }

  const approvedContents = await prisma.content.findMany({
    where: {
      clientId,
      status: {
        in: [
          'APROVADO',
          'AGENDAMENTO_PRODUCAO',
          'FILMMAKER_PRE_PRODUCAO',
          'FILMMAKER_AGENDAMENTO',
        ],
      },
    },
    orderBy: {
      plannedDate: 'asc',
    },
  });

  const videoContents =
    approvedContents.filter(isVideoContent);

  if (videoContents.length === 0) {
    redirect(
      `/captacoes/nova?cliente=${clientId}&error=no-video`
    );
  }

  const videoIds =
    videoContents.map((content) => content.id);

  const firstVideo = videoContents[0];

  const existingClientSchedule =
    await prisma.captureSchedule.findFirst({
      where: {
        clientId,
        status: {
          not: 'CANCELADO',
        },
        scheduledAt: {
          gte: new Date(),
        },
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });

  const scheduleData = {
    clientId,
    contentId: firstVideo?.id || null,
    clientName: client.name,
    contentName:
      `${videoContents.length} conteúdo(s) de vídeo`,
    scheduledAt,
    dateKey: date,
    location: location || null,
    notes:
      notes ||
      `Conteúdos previstos: ${videoContents
        .map((item) => item.title)
        .join(', ')}`,
    status: 'AGENDADO',
    createdBy:
      currentUser.name ||
      currentUser.email ||
      'Social Media',
  };

  const schedule = existingClientSchedule
    ? await prisma.captureSchedule.update({
        where: {
          id: existingClientSchedule.id,
        },
        data: scheduleData,
      })
    : await prisma.captureSchedule.create({
        data: scheduleData,
      });

  await prisma.content.updateMany({
    where: {
      id: {
        in: videoIds,
      },
    },
    data: {
      area: 'FILMMAKER',
      status: 'FILMMAKER_AGENDAMENTO',
    },
  });

  const actionLabel =
    existingClientSchedule
      ? 'GRAVAÇÃO REAGENDADA'
      : 'GRAVAÇÃO AGENDADA';

  await prisma.comment.createMany({
    data: videoContents.map((content) => ({
      contentId: content.id,
      authorName: 'Sistema',
      authorRole: 'SISTEMA',
      message:
        `${actionLabel}: ${formatCaptureDate(
          scheduledAt
        )} às ${formatCaptureTime(scheduledAt)}.` +
        `${location ? ` Local: ${location}.` : ''}` +
        `${notes ? ` Observações: ${notes}` : ''}`,
    })),
  }).catch(() => null);

  const googleStart = new Date(scheduledAt);

  const googleEnd = new Date(
    googleStart.getTime() +
    2 * 60 * 60 * 1000
  );

  await createGoogleCalendarEvent({
    title: `Captação - ${client.name}`,
    description: [
      'Agendamento criado pelo AprovUp.',
      `Conteúdos: ${videoContents
        .map((item) => item.title)
        .join(', ')}`,
      location ? `Local: ${location}` : '',
      notes ? `Observações: ${notes}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    location: location || '',
    startDate: googleStart,
    endDate: googleEnd,
  }).catch((error) => {
    console.error(
      'Erro ao criar evento no Google Agenda:',
      error
    );
  });

  await prisma.historyLog.create({
    data: {
      entityType: 'CAPTURE_SCHEDULE',
      entityId: schedule.id,
      action:
        existingClientSchedule
          ? 'UPDATED'
          : 'CREATED',
      description:
        `Captação de ${client.name} marcada para ${date} às ${time}.`,
      authorName:
        currentUser.name ||
        currentUser.email ||
        'Social Media',
    },
  });

  revalidatePath('/filmmaker');
  revalidatePath('/clientes');
  revalidatePath('/calendario-editorial');
  revalidatePath('/social-media/agendamentos');
  revalidatePath(`/clientes/${clientId}`);

  redirect('/filmmaker');
}
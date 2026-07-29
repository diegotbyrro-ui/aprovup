'use server';

import { createGoogleCalendarEvent } from '@/lib/googleCalendar';

import { prisma } from '@/lib/prisma';
import { requireCurrentUser, isDirector } from '@/lib/auth';
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
  return value === 'social media' || value === 'social_media' || value === 'socialmedia';
}

function isFilmmaker(role?: string | null) {
  const value = normalizeRole(role);
  return value === 'filmmaker' || value === 'audiovisual' || value === 'video';
}

async function checkAccess() {
  const currentUser = await requireCurrentUser();

  if (
    !isDirector(currentUser.role) &&
    !isFilmmaker(currentUser.role) &&
    !isSocialMedia(currentUser.role)
  ) {
    redirect('/clientes');
  }

  return currentUser;
}

function text(formData: FormData, name: string) {
  return String(formData.get(name) || '').trim();
}

export async function createCaptureScheduleAction(formData: FormData) {
  const currentUser = await checkAccess();

  const clientId = text(formData, 'clientId');
  const date = text(formData, 'date');
  const time = text(formData, 'time') || '09:00';
  const location = text(formData, 'location');
  const notes = text(formData, 'notes');

  if (!clientId || !date || !time) {
    redirect(`/captacoes/nova?cliente=${clientId}&error=missing`);
  }

  const client = await prisma.client.findUnique({
    where: {
      id: clientId,
    },
  });

  if (!client) {
    redirect('/clientes');
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
        not: clientId,
      },
    },
  });

  if (existingSameDayOtherClient) {
    redirect(`/captacoes/nova?cliente=${clientId}&error=busy`);
  }

  const filmmakerContents = await prisma.content.findMany({
    where: {
      clientId,
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
      clientId,
      contentId: firstContent?.id || null,
      clientName: client.name,
      contentName: 'Captação mensal',
      scheduledAt,
      dateKey,
      location,
      notes:
        notes ||
        `Captação mensal agendada pelo Social Media. Conteúdos vinculados: ${filmmakerContents
          .map((item) => item.title)
          .join(', ')}`,
      status: 'AGENDADO',
      createdBy: currentUser.name || currentUser.email || 'Social Media',
    },
  });

  

  

  // FILMMAKER_AGENDAMENTO_AUTO_UPDATE
  await prisma.content.updateMany({
    where: {
      clientId: client.id,
      OR: [
        { format: 'REELS' },
        { format: 'VIDEO' },
        { format: 'VÍDEO' },
        { format: 'STORY' },
        { format: 'STORIES' },
      ],
      status: {
        notIn: ['POSTADO', 'PRONTO_PARA_POSTAR'],
      },
    },
    data: {
      area: 'FILMMAKER',
      status: 'FILMMAKER_AGENDAMENTO',
    },
  });

  // DESIGN_AFTER_CAPTURE_SCHEDULE_FIX
  await prisma.content.updateMany({
    where: {
      clientId: client.id,
      OR: [
        { format: 'POST_ESTATICO' },
        { format: 'CARROSSEL' },
        { format: 'MOTION' },
      ],
      status: {
        in: ['APROVADO', 'CLIENTE'],
      },
    },
    data: {
      area: 'DESIGN',
      status: 'APROVADO',
    },
  });


  await prisma.comment.createMany({
    data: await prisma.content.findMany({
      where: {
        clientId: client.id,
        area: 'FILMMAKER',
        status: 'FILMMAKER_AGENDAMENTO',
      },
      select: {
        id: true,
      },
    }).then((items) =>
      items.map((item) => ({
        contentId: item.id,
        authorName: 'Sistema',
        authorRole: 'SISTEMA',
        message: `GRAVAÇÃO AGENDADA: ${new Date(scheduledAt).toLocaleDateString('pt-BR')} às ${new Date(scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.${location ? ' Local: ' + location : ''}`,
      }))
    ),
  }).catch(() => null);

const googleStart = new Date(scheduledAt);
  const googleEnd = new Date(googleStart.getTime() + 2 * 60 * 60 * 1000);

  await createGoogleCalendarEvent({
    title: `Captação - ${client.name}`,
    description: [
      'Agendamento criado pelo sistema Level UP.',
      location ? `Local: ${location}` : '',
      notes ? `Observações: ${notes}` : '',
    ].filter(Boolean).join('\n'),
    location: location || '',
    startDate: googleStart,
    endDate: googleEnd,
  }).catch((error) => {
    console.error('Erro ao criar evento no Google Agenda:', error);
  });

await prisma.content.updateMany({
    where: {
      clientId,
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
      action: 'CREATED',
      description: `Captação mensal agendada para ${client.name} em ${date} às ${time}.`,
      authorName: currentUser.name || currentUser.email || 'Social Media',
    },
  });

  revalidatePath('/filmmaker');
  revalidatePath('/clientes');
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath('/social-media/agendamentos');
  revalidatePath('/clientes');

  redirect('/filmmaker');
}

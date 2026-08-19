'use server';

import { prisma } from '@/lib/prisma';
import { requireCurrentUser, isDirector } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const defaultColumns = [
  { title: 'Demandas', statusKey: 'APROVADO', order: 10 },
  { title: 'Pré-produção', statusKey: 'FILMMAKER_PRE_PRODUCAO', order: 20 },
  { title: 'Agendamento', statusKey: 'FILMMAKER_AGENDAMENTO', order: 30 },
  { title: 'Gravando', statusKey: 'FILMMAKER_GRAVANDO', order: 40 },
  { title: 'Edição', statusKey: 'FILMMAKER_EDICAO', order: 50 },
  { title: 'Análise', statusKey: 'FILMMAKER_ANALISE', order: 60 },
  { title: 'Dúvida com Social Media', statusKey: 'FILMMAKER_DUVIDA_SOCIAL', order: 70 },
  { title: 'Alteração', statusKey: 'ALTERACAO_SOLICITADA', order: 80 },
  { title: 'Finalizado', statusKey: 'PRONTO_PARA_POSTAR', order: 90 },
];

function normalizeRole(role?: string | null) {
  return String(role || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isFilmmaker(role?: string | null) {
  const roleValue = normalizeRole(role);
  return roleValue === 'filmmaker' || roleValue === 'audiovisual' || roleValue === 'video';
}

async function checkAccess() {
  const currentUser = await requireCurrentUser();

  if (!isDirector(currentUser.role) && !isFilmmaker(currentUser.role)) {
    redirect('/clientes');
  }

  return currentUser;
}

function slugify(value: string) {
  return value
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export async function ensureDefaultFilmmakerColumns() {
  for (const column of defaultColumns) {
    await prisma.filmmakerKanbanColumn.upsert({
      where: {
        statusKey: column.statusKey,
      },
      create: {
        title: column.title,
        statusKey: column.statusKey,
        order: column.order,
        isActive: true,
      },
      update: {},
    });
  }
}

export async function createFilmmakerColumnAction(formData: FormData) {
  const currentUser = await checkAccess();

  const title = String(formData.get('title') || '').trim();

  if (!title) {
    redirect('/filmmaker');
  }

  const statusKey = `FILMMAKER_CUSTOM_${slugify(title)}_${Date.now()}`;

  const lastColumn = await prisma.filmmakerKanbanColumn.findFirst({
    where: {
      isActive: true,
    },
    orderBy: {
      order: 'desc',
    },
  });

  await prisma.filmmakerKanbanColumn.create({
    data: {
      title,
      statusKey,
      order: (lastColumn?.order || 0) + 10,
      isActive: true,
    },
  });

  await prisma.historyLog.create({
    data: {
      entityType: 'FILMMAKER_COLUMN',
      entityId: statusKey,
      action: 'CREATED',
      description: `Coluna criada no Filmmaker: ${title}.`,
      authorName: currentUser.name || currentUser.email || 'Equipe Level UP',
    },
  });

  revalidatePath('/filmmaker');
  redirect('/filmmaker');
}

export async function updateFilmmakerColumnTitleAction(columnId: string, formData: FormData) {
  const currentUser = await checkAccess();

  const title = String(formData.get('title') || '').trim();

  if (!title) {
    redirect('/filmmaker');
  }

  const column = await prisma.filmmakerKanbanColumn.update({
    where: {
      id: columnId,
    },
    data: {
      title,
    },
  });

  await prisma.historyLog.create({
    data: {
      entityType: 'FILMMAKER_COLUMN',
      entityId: column.id,
      action: 'UPDATED',
      description: `Coluna renomeada para: ${column.title}.`,
      authorName: currentUser.name || currentUser.email || 'Equipe Level UP',
    },
  });

  revalidatePath('/filmmaker');
  redirect('/filmmaker');
}

export async function moveFilmmakerColumnAction(columnId: string, direction: 'left' | 'right') {
  const currentUser = await checkAccess();

  const columns = await prisma.filmmakerKanbanColumn.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      order: 'asc',
    },
  });

  const index = columns.findIndex((column) => column.id === columnId);

  if (index === -1) {
    redirect('/filmmaker');
  }

  const targetIndex = direction === 'left' ? index - 1 : index + 1;

  if (targetIndex < 0 || targetIndex >= columns.length) {
    redirect('/filmmaker');
  }

  const currentColumn = columns[index];
  const targetColumn = columns[targetIndex];

  await prisma.filmmakerKanbanColumn.update({
    where: {
      id: currentColumn.id,
    },
    data: {
      order: targetColumn.order,
    },
  });

  await prisma.filmmakerKanbanColumn.update({
    where: {
      id: targetColumn.id,
    },
    data: {
      order: currentColumn.order,
    },
  });

  await prisma.historyLog.create({
    data: {
      entityType: 'FILMMAKER_COLUMN',
      entityId: currentColumn.id,
      action: 'MOVED',
      description: `Coluna movida para ${direction === 'left' ? 'esquerda' : 'direita'}.`,
      authorName: currentUser.name || currentUser.email || 'Equipe Level UP',
    },
  });

  revalidatePath('/filmmaker');
  redirect('/filmmaker');
}

export async function reorderFilmmakerColumnAction(draggedColumnId: string, targetColumnId: string) {
  const currentUser = await checkAccess();

  if (!draggedColumnId || !targetColumnId || draggedColumnId === targetColumnId) {
    return;
  }

  const columns = await prisma.filmmakerKanbanColumn.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      order: 'asc',
    },
  });

  const draggedIndex = columns.findIndex((column) => column.id === draggedColumnId);
  const targetIndex = columns.findIndex((column) => column.id === targetColumnId);

  if (draggedIndex === -1 || targetIndex === -1) {
    return;
  }

  const reordered = [...columns];
  const [draggedColumn] = reordered.splice(draggedIndex, 1);
  reordered.splice(targetIndex, 0, draggedColumn);

  await Promise.all(
    reordered.map((column, index) =>
      prisma.filmmakerKanbanColumn.update({
        where: {
          id: column.id,
        },
        data: {
          order: (index + 1) * 10,
        },
      })
    )
  );

  await prisma.historyLog.create({
    data: {
      entityType: 'FILMMAKER_COLUMN',
      entityId: draggedColumnId,
      action: 'DRAG_REORDERED',
      description: 'Coluna reorganizada por arrastar e soltar.',
      authorName: currentUser.name || currentUser.email || 'Equipe Level UP',
    },
  });

  revalidatePath('/filmmaker');
}

export async function archiveFilmmakerColumnAction(columnId: string) {
  const currentUser = await checkAccess();

  const column = await prisma.filmmakerKanbanColumn.findUnique({
    where: {
      id: columnId,
    },
  });

  if (!column) {
    redirect('/filmmaker');
  }

  const targetColumn = await prisma.filmmakerKanbanColumn.findFirst({
    where: {
      isActive: true,
      id: {
        not: columnId,
      },
    },
    orderBy: {
      order: 'asc',
    },
  });

  if (targetColumn) {
    await prisma.content.updateMany({
      where: {
        area: 'FILMMAKER',
        status: column.statusKey,
      },
      data: {
        status: targetColumn.statusKey,
      },
    });
  }

  await prisma.filmmakerKanbanColumn.update({
    where: {
      id: columnId,
    },
    data: {
      isActive: false,
    },
  });

  await prisma.historyLog.create({
    data: {
      entityType: 'FILMMAKER_COLUMN',
      entityId: columnId,
      action: 'DELETED',
      description: targetColumn
        ? `Coluna excluída: ${column.title}. Demandas movidas para ${targetColumn.title}.`
        : `Coluna excluída: ${column.title}.`,
      authorName: currentUser.name || currentUser.email || 'Equipe Level UP',
    },
  });

  revalidatePath('/filmmaker');
  redirect('/filmmaker');
}

export async function updateFilmmakerStatusAction(contentId: string, nextStatus: string) {
  const currentUser = await checkAccess();

  const column = await prisma.filmmakerKanbanColumn.findUnique({
    where: {
      statusKey: nextStatus,
    },
  });

  if (!column?.isActive) {
    redirect('/filmmaker');
  }

  const content = await prisma.content.findUnique({
    where: {
      id: contentId,
    },
  });

  if (!content) {
    redirect('/filmmaker');
  }

  await prisma.content.update({
    where: {
      id: contentId,
    },
    data: {
      status: nextStatus,
      area: 'FILMMAKER',
    },
  });

  await prisma.historyLog.create({
    data: {
      entityType: 'CONTENT',
      entityId: contentId,
      action: 'FILMMAKER_STATUS_UPDATED',
      description: `Demanda movida individualmente para ${column.title}.`,
      authorName: currentUser.name || currentUser.email || 'Equipe Level UP',
    },
  });

  revalidatePath('/filmmaker');
  revalidatePath(`/conteudos/${contentId}`);
  revalidatePath(`/clientes/${content.clientId}`);
  revalidatePath('/clientes');
}

export async function sendFilmmakerQuestionAction(contentId: string, formData: FormData) {
  const currentUser = await checkAccess();

  const question = String(formData.get('question') || '').trim();

  if (!question) {
    redirect('/filmmaker');
  }

  const content = await prisma.content.findUnique({
    where: {
      id: contentId,
    },
  });

  if (!content) {
    redirect('/filmmaker');
  }

  const originStatus =
    content.status;


  await prisma.comment.create({
    data: {
      contentId,
      authorName:
        currentUser.name ||
        currentUser.email ||
        'Filmmaker',

      authorRole:
        'FILMMAKER',

      message:
        `DÚVIDA PARA SOCIAL MEDIA: ${question}`,
    },
  });

  await prisma.content.update({
    where: {
      id: contentId,
    },
    data: {
      status: 'FILMMAKER_DUVIDA_SOCIAL',
      area: 'FILMMAKER',
    },
  });

  await prisma.historyLog.create({
    data: {
      entityType:
        'CONTENT',

      entityId:
        contentId,

      action:
        'FILMMAKER_QUESTION_SENT',

      description:
        `Filmmaker enviou uma dúvida para a Social Media. Origem: ${originStatus}.`,

      authorName:
        currentUser.name ||
        currentUser.email ||
        'Filmmaker',
    },
  });


  revalidatePath('/filmmaker');
  revalidatePath('/social-media');
  revalidatePath(`/conteudos/${contentId}`);
  revalidatePath(`/clientes/${content.clientId}`);

  redirect('/filmmaker');
}

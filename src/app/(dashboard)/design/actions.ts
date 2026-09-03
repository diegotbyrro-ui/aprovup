'use server';

import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/userAccess';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

function normalizeRole(role?: string | null) {
  return String(role || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isDesigner(role?: string | null) {
  const value = normalizeRole(role);
  return value === 'design' || value === 'designer';
}

async function checkAccess() {
  return requirePermission('design.manage');
}

function text(formData: FormData, name: string) {
  return String(formData.get(name) || '').trim();
}

function slugifyStatus(title: string) {
  return `DESIGN_${title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')}`;
}

export async function createDesignColumnAction(formData: FormData) {
  const currentUser = await checkAccess();
  const title = text(formData, 'title');

  if (!title) {
    redirect('/design');
  }

  const lastColumn = await prisma.designKanbanColumn.findFirst({
    orderBy: {
      order: 'desc',
    },
  });

  const statusKey = slugifyStatus(title);

  const existing = await prisma.designKanbanColumn.findUnique({
    where: {
      statusKey,
    },
  });

  if (existing) {
    await prisma.designKanbanColumn.update({
      where: {
        id: existing.id,
      },
      data: {
        title,
        isActive: true,
      },
    });
  } else {
    await prisma.designKanbanColumn.create({
      data: {
        title,
        statusKey,
        order: (lastColumn?.order || 0) + 1,
        isActive: true,
      },
    });
  }

  await prisma.historyLog.create({
    data: {
      entityType: 'DESIGN_COLUMN',
      entityId: statusKey,
      action: 'CREATED',
      description: `Coluna criada no Design: ${title}.`,
      authorName: currentUser.name || currentUser.email || 'Equipe Level UP',
    },
  });

  revalidatePath('/design');
  redirect('/design');
}

export async function updateDesignColumnTitleAction(columnId: string, formData: FormData) {
  const currentUser = await checkAccess();
  const title = text(formData, 'title');

  if (!title) {
    redirect('/design');
  }

  await prisma.designKanbanColumn.update({
    where: {
      id: columnId,
    },
    data: {
      title,
    },
  });

  await prisma.historyLog.create({
    data: {
      entityType: 'DESIGN_COLUMN',
      entityId: columnId,
      action: 'UPDATED',
      description: `Nome da coluna atualizado para: ${title}.`,
      authorName: currentUser.name || currentUser.email || 'Equipe Level UP',
    },
  });

  revalidatePath('/design');
  redirect('/design');
}

export async function moveDesignColumnAction(columnId: string, direction: 'left' | 'right') {
  await checkAccess();

  const columns = await prisma.designKanbanColumn.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      order: 'asc',
    },
  });

  const index = columns.findIndex((column) => column.id === columnId);

  if (index === -1) {
    redirect('/design');
  }

  const swapIndex = direction === 'left' ? index - 1 : index + 1;

  if (!columns[swapIndex]) {
    redirect('/design');
  }

  const current = columns[index];
  const target = columns[swapIndex];

  await prisma.designKanbanColumn.update({
    where: {
      id: current.id,
    },
    data: {
      order: target.order,
    },
  });

  await prisma.designKanbanColumn.update({
    where: {
      id: target.id,
    },
    data: {
      order: current.order,
    },
  });

  revalidatePath('/design');
  redirect('/design');
}

export async function archiveDesignColumnAction(columnId: string) {
  const currentUser = await checkAccess();

  const column = await prisma.designKanbanColumn.findUnique({
    where: {
      id: columnId,
    },
  });

  if (!column) {
    redirect('/design');
  }

  const targetColumn = await prisma.designKanbanColumn.findFirst({
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
        client: {
          agencyId:
            currentUser.agencyId,
        },

        area: 'DESIGN',
        status: column.statusKey,
      },
      data: {
        status: targetColumn.statusKey,
      },
    });
  }

  await prisma.designKanbanColumn.update({
    where: {
      id: columnId,
    },
    data: {
      isActive: false,
    },
  });

  await prisma.historyLog.create({
    data: {
      entityType: 'DESIGN_COLUMN',
      entityId: columnId,
      action: 'DELETED',
      description: targetColumn
        ? `Coluna excluída: ${column.title}. Demandas movidas para ${targetColumn.title}.`
        : `Coluna excluída: ${column.title}.`,
      authorName: currentUser.name || currentUser.email || 'Equipe Level UP',
    },
  });

  revalidatePath('/design');
  redirect('/design');
}

export async function updateDesignStatusAction(contentId: string, nextStatus: string) {
  const currentUser = await checkAccess();

  const column = await prisma.designKanbanColumn.findUnique({
    where: {
      statusKey: nextStatus,
    },
  });

  if (!column?.isActive) {
    redirect('/design');
  }

  const content = await prisma.content.findFirst({
    where: {
      id:
        contentId,

      client: {
        agencyId:
          currentUser.agencyId,
      },
    },
  });

  if (!content) {
    redirect('/design');
  }

  await prisma.content.update({
    where: {
      id: contentId,
    },
    data: {
      status: nextStatus,
      area: 'DESIGN',
    },
  });

  await prisma.historyLog.create({
    data: {
      entityType: 'CONTENT',
      entityId: contentId,
      action: 'DESIGN_STATUS_UPDATED',
      description: `Demanda movida individualmente para ${column.title}.`,
      authorName: currentUser.name || currentUser.email || 'Equipe Level UP',
    },
  });

  revalidatePath('/design');
  revalidatePath(`/conteudos/${contentId}`);
  revalidatePath(`/clientes/${content.clientId}`);
  revalidatePath('/clientes');
}

export async function sendDesignQuestionAction(contentId: string, formData: FormData) {
  const currentUser = await checkAccess();
  const message = text(formData, 'message');

  if (!message) {
    redirect('/design');
  }

  const content = await prisma.content.findFirst({
    where: {
      id:
        contentId,

      client: {
        agencyId:
          currentUser.agencyId,
      },
    },
  });

  if (!content) {
    redirect('/design');
  }

  await prisma.comment.create({
    data: {
      contentId,
      authorName: currentUser.name || currentUser.email || 'Design',
      authorRole: 'DESIGN',
      message: `DÚVIDA DO DESIGN: ${message}`,
    },
  });

  await prisma.content.update({
    where: {
      id: contentId,
    },
    data: {
      status: 'DESIGN_DUVIDA',
      area: 'DESIGN',
    },
  });

  await prisma.historyLog.create({
    data: {
      entityType: 'CONTENT',
      entityId: contentId,
      action: 'DESIGN_QUESTION_SENT',
      description: `Design enviou uma dúvida para Social Media.`,
      authorName: currentUser.name || currentUser.email || 'Design',
    },
  });

  revalidatePath('/design');
  revalidatePath('/social-media');
  revalidatePath(`/conteudos/${contentId}`);

  redirect('/design');
}

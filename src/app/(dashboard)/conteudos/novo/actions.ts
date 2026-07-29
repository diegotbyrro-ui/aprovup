'use server';

import { prisma } from '@/lib/prisma';
import { requireCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

async function logHistory(
  entityType: string,
  entityId: string,
  action: string,
  description: string,
  authorName: string
) {
  await prisma.historyLog.create({
    data: {
      entityType,
      entityId,
      action,
      description,
      authorName,
    },
  });
}

export async function createContentAction(formData: FormData) {
  const currentUser = await requireCurrentUser();

  const clientId = String(formData.get('clientId') || '').trim();
  const title = String(formData.get('title') || '').trim();

  if (!clientId || !title) {
    redirect('/conteudos/novo?error=required');
  }

  const plannedDateValue = String(formData.get('plannedDate') || '').trim();

  const content = await prisma.content.create({
    data: {
      clientId,
      title,
      objective: String(formData.get('objective') || '').trim(),
      format: String(formData.get('format') || 'CARROSSEL').trim(),
      platform: String(formData.get('platform') || 'Instagram').trim(),
      plannedDate: plannedDateValue ? new Date(`${plannedDateValue}T12:00:00`) : null,
      responsible: String(formData.get('responsible') || currentUser.name || '').trim(),
      area: String(formData.get('area') || 'GERAL').trim(),
      priority: String(formData.get('priority') || 'MEDIA').trim(),
      caption: String(formData.get('caption') || '').trim(),
      artText: String(formData.get('artText') || '').trim(),
      script: String(formData.get('script') || '').trim(),
      briefing: String(formData.get('briefing') || '').trim(),
      fileLinks: String(formData.get('fileLinks') || '').trim(),
      coverImageUrl: String(formData.get('coverImageUrl') || '').trim(),
      status: String(formData.get('status') || 'IDEIA').trim(),
    },
  });

  await logHistory(
    'CONTENT',
    content.id,
    'CREATED',
    `Conteúdo ${content.title} criado.`,
    currentUser.name || currentUser.email || 'Equipe Level UP'
  );

  revalidatePath('/clientes');
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath('/dashboard');
  revalidatePath('/conteudos/kanban');

  redirect(`/conteudos/${content.id}`);
}


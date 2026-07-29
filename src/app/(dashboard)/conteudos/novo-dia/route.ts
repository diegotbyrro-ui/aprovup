import { prisma } from '@/lib/prisma';
import { requireCurrentUser, isDirector, isSocialMedia } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';

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

export async function GET(request: NextRequest) {
  const currentUser = await requireCurrentUser();

  if (!isDirector(currentUser.role) && !isSocialMedia(currentUser.role)) {
    redirect('/clientes');
  }

  const searchParams = request.nextUrl.searchParams;

  const clientId = String(searchParams.get('cliente') || '').trim();
  const date = String(searchParams.get('data') || '').trim();

  if (!clientId) {
    redirect('/clientes');
  }

  const client = await prisma.client.findUnique({
    where: {
      id: clientId,
    },
  });

  if (!client) {
    redirect('/clientes');
  }

  const plannedDate = date ? new Date(`${date}T12:00:00`) : null;

  const content = await prisma.content.create({
    data: {
      clientId,
      title: 'Novo conteúdo',
      objective: '',
      format: 'CARROSSEL',
      platform: 'Instagram',
      plannedDate,
      responsible: currentUser.name || currentUser.email || '',
      area: 'GERAL',
      priority: 'MEDIA',
      caption: '',
      artText: '',
      script: '',
      briefing: '',
      fileLinks: '',
      coverImageUrl: '',
      status: 'IDEIA',
    },
  });

  await logHistory(
    'CONTENT',
    content.id,
    'CREATED_FROM_CALENDAR',
    `Conteúdo criado pelo calendário para ${client.name}.`,
    currentUser.name || currentUser.email || 'Equipe Level UP'
  );

  redirect(`/conteudos/${content.id}`);
}

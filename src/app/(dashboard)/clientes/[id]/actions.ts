'use server';

import { prisma } from '@/lib/prisma';
import { requireCurrentUser, isDirector, isSocialMedia } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';

export async function generateMonthlyApprovalLinkAction(
  clientId: string,
  formData: FormData
) {
  const currentUser = await requireCurrentUser();

  if (!isDirector(currentUser.role) && !isSocialMedia(currentUser.role)) {
    redirect('/clientes');
  }

  const month = Number(formData.get('month') || 0);
  const year = Number(formData.get('year') || 0);

  if (!clientId || !month || !year) {
    redirect(`/clientes/${clientId}`);
  }

  const client = await prisma.client.findUnique({
    where: {
      id: clientId,
    },
  });

  if (!client) {
    redirect('/clientes');
  }

  const token = randomUUID();

  const approval = await prisma.monthlyApproval.upsert({
    where: {
      clientId_month_year: {
        clientId,
        month,
        year,
      },
    },
    create: {
      clientId,
      month,
      year,
      token,
      status: 'PENDENTE',
    },
    update: {
      token,
      status: 'PENDENTE',
    },
  });

  await prisma.historyLog.create({
    data: {
      entityType: 'MONTHLY_APPROVAL',
      entityId: approval.id,
      action: 'LINK_GENERATED',
      description: `Link mensal gerado para ${client.name} - ${month}/${year}.`,
      authorName: currentUser.name || currentUser.email || 'Equipe Level UP',
    },
  });

  revalidatePath(`/clientes/${clientId}`);

  redirect(`/aprovacao-mensal/${approval.token}`);
}



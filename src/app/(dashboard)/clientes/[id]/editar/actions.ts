'use server';

import { prisma } from '@/lib/prisma';
import { requireClientAccess } from '@/lib/clientAccess';
import { requirePermission } from '@/lib/userAccess';
import { uploadAprovUpFile } from '@/lib/aprovupStorage';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function updateClientAction(clientId: string, formData: FormData) {
  const currentUser = await requirePermission('social.manage');

  await requireClientAccess(currentUser, clientId);
const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      agencyId:
        currentUser.agencyId,
    },
  });

  if (!client) {
    redirect('/clientes');
  }

  function text(name: string) {
    return String(formData.get(name) || '').trim();
  }

  let logoUrl = text('logoUrl') || client.logoUrl || '';

  const file = formData.get('logoFile');

  if (file && typeof file === 'object' && 'arrayBuffer' in file) {
    const uploadedFile = file as File;

    if (uploadedFile.size > 0) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

      if (!allowedTypes.includes(uploadedFile.type)) {
        redirect(`/clientes/${clientId}/editar?error=invalid-logo`);
      }

      logoUrl =
        await uploadAprovUpFile(
          uploadedFile,
          'clients',
          `client-logo-${clientId}`
        );
    }
  }

  const monthlyContentGoalNumber = Number(formData.get('monthlyContentGoal') || 0);

  const updatedClient = await prisma.client.update({
    where: {
      id: clientId,
      agencyId:
        currentUser.agencyId,
    },
    data: {
      name: text('name'),
      segment: text('segment'),
      ...(currentUser.role === 'DIRECTOR' ? {
        internalResponsible: text('internalResponsible'),
      } : {}),
      postingFrequency: text('postingFrequency'),
      monthlyContentGoal: Number.isFinite(monthlyContentGoalNumber) ? monthlyContentGoalNumber : 0,
      toneOfVoice: text('toneOfVoice'),
      contractedServices: text('contractedServices'),
      usefulLinks: text('usefulLinks'),
      databaseLink: text('databaseLink'),
      driveLink: text('driveLink'),
      logoLink: text('logoLink'),
      strategicNotes: text('strategicNotes'),
      clientBriefing: text('clientBriefing'),
      personaNotes: text('personaNotes'),
      brandColor: text('brandColor') || '#2563eb',
      logoUrl,
    },
  });

  await prisma.historyLog.create({
    data: {
      entityType: 'CLIENT',
      entityId: clientId,
      action: 'UPDATED',
      description: `Cliente atualizado: ${updatedClient.name}.`,
      authorName: currentUser.name || currentUser.email || 'Diretoria',
    },
  });

  revalidatePath('/clientes');
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath('/design');
  revalidatePath('/clientes');

  redirect('/clientes');
}

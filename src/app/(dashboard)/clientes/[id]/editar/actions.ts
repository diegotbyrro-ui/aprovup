'use server';

import { prisma } from '@/lib/prisma';
import { requireCurrentUser, isDirector } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function updateClientAction(clientId: string, formData: FormData) {
  const currentUser = await requireCurrentUser();

  if (!isDirector(currentUser.role)) {
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

      const bytes = await uploadedFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const extension = uploadedFile.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `client-logo-${clientId}-${Date.now()}.${extension}`;

      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'clients');
      const uploadPath = path.join(uploadDir, fileName);

      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(uploadPath, buffer);

      logoUrl = `/uploads/clients/${fileName}`;
    }
  }

  const monthlyContentGoalNumber = Number(formData.get('monthlyContentGoal') || 0);

  const updatedClient = await prisma.client.update({
    where: {
      id: clientId,
    },
    data: {
      name: text('name'),
      segment: text('segment'),
      internalResponsible: text('internalResponsible'),
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
  revalidatePath('/dashboard');

  redirect('/clientes');
}

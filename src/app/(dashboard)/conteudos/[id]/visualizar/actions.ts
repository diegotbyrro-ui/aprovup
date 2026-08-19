'use server';

import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/userAccess';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import fs from 'fs/promises';
import path from 'path';

function safeFileName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

function getExtension(name: string) {
  const ext = path.extname(name || '').toLowerCase();

  return ext || '.bin';
}

async function saveUploadedFile(file: File, prefix: string) {
  if (!file || file.size === 0) return '';

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'final-content');

  await fs.mkdir(uploadsDir, {
    recursive: true,
  });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const originalName = safeFileName(file.name || 'arquivo');
  const ext = getExtension(originalName);
  const fileName = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

  const filePath = path.join(uploadsDir, fileName);

  await fs.writeFile(filePath, buffer);

  return `/uploads/final-content/${fileName}`;
}

export async function uploadFinalContentFilesAction(contentId: string, formData: FormData) {
const finalFile = formData.get('finalFile') as File | null;
  const coverFile = formData.get('coverFile') as File | null;

  const content = await prisma.content.findUnique({
    where: {
      id: contentId,
    },
  });

  if (!content) {
    redirect('/design');
  }

  const requiredPermission =
    content.area === 'FILMMAKER'
      ? 'filmmaker.manage'
      : content.area === 'DESIGN'
        ? 'design.manage'
        : 'social.manage';

  const currentUser =
    await requirePermission(
      requiredPermission
    );

  const finalMediaUrl = finalFile && finalFile.size > 0
    ? await saveUploadedFile(finalFile, 'material-final')
    : '';

  const finalCoverUrl = coverFile && coverFile.size > 0
    ? await saveUploadedFile(coverFile, 'capa')
    : '';

  const mediaType = finalFile?.type || '';

  const updateData: any = {
    status: 'ENVIADO_AO_CLIENTE',
    finalUploadedAt: new Date(),
  };

  if (finalMediaUrl) {
    updateData.finalMediaUrl = finalMediaUrl;
    updateData.finalMediaType = mediaType;
  }

  if (finalCoverUrl) {
    updateData.finalCoverUrl = finalCoverUrl;
  }

  await prisma.content.update({
    where: {
      id: contentId,
    },
    data: updateData,
  });

  await prisma.comment.create({
    data: {
      contentId,
      authorName: currentUser.name || currentUser.email || 'Equipe Level UP',
      authorRole: currentUser.role || 'EQUIPE',
      message: finalMediaUrl
        ? 'Material final enviado para aprovação do cliente na Etapa 2.'
        : 'Capa/preview enviado para aprovação do cliente na Etapa 2.',
    },
  });

  revalidatePath(`/conteudos/${contentId}/visualizar`);
  revalidatePath(`/clientes/${content.clientId}`);
  revalidatePath(`/aprovacao-final/${content.clientId}`);
  revalidatePath('/design');
  revalidatePath('/filmmaker');

  redirect(`/conteudos/${contentId}/visualizar`);
}

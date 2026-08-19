'use server';

import { prisma } from '@/lib/prisma';
import { requireAnyPermission } from '@/lib/userAccess';
import { uploadAprovUpFile } from '@/lib/aprovupStorage';
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

export async function uploadContentCoverImage(contentId: string, formData: FormData) {
  const currentUser = await requireAnyPermission([
    'social.manage',
    'design.manage',
    'filmmaker.manage',
  ]);

  const content = await prisma.content.findUnique({
    where: {
      id: contentId,
    },
  });

  if (!content) {
    redirect('/clientes');
  }

  const file =
    formData.get('coverImage') ||
    formData.get('file') ||
    formData.get('image');

  const directUrl = String(formData.get('coverImageUrl') || '').trim();

  let coverImageUrl = directUrl;

  if (file && typeof file === 'object' && 'arrayBuffer' in file) {
    const uploadedFile = file as File;

    if (uploadedFile.size > 0) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

      if (!allowedTypes.includes(uploadedFile.type)) {
        redirect(`/conteudos/${contentId}?error=invalid-image`);
      }

      coverImageUrl =
        await uploadAprovUpFile(
          uploadedFile,
          'covers',
          `cover-${contentId}`
        );
    }
  }

  if (!coverImageUrl) {
    redirect(`/conteudos/${contentId}?error=no-image`);
  }

  await prisma.content.update({
    where: {
      id: contentId,
    },
    data: {
      coverImageUrl,
    },
  });

  await logHistory(
    'CONTENT',
    contentId,
    'COVER_IMAGE_UPDATED',
    'Imagem de capa do conteúdo atualizada.',
    currentUser.name || currentUser.email || 'Equipe Level UP'
  );

  revalidatePath(`/conteudos/${contentId}`);
  revalidatePath(`/clientes/${content.clientId}`);
  revalidatePath('/clientes');
  revalidatePath('/clientes');

  redirect(`/conteudos/${contentId}`);
}

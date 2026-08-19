'use server';

import {
  prisma,
} from '@/lib/prisma';

import {
  requirePermission,
} from '@/lib/userAccess';

import {
  uploadAprovUpFile,
} from '@/lib/aprovupStorage';

import {
  revalidatePath,
} from 'next/cache';

import {
  redirect,
} from 'next/navigation';


export async function uploadFinalContentFilesAction(
  contentId: string,
  formData: FormData
) {
  const finalFile =
    formData.get(
      'finalFile'
    ) as File | null;


  const coverFile =
    formData.get(
      'coverFile'
    ) as File | null;


  const content =
    await prisma.content.findUnique({
      where: {
        id:
          contentId,
      },
    });


  if (!content) {
    redirect(
      '/design'
    );
  }


  const requiredPermission =
    content.area ===
    'FILMMAKER'
      ? 'filmmaker.manage'
      : content.area ===
          'DESIGN'
        ? 'design.manage'
        : 'social.manage';


  const currentUser =
    await requirePermission(
      requiredPermission
    );


  const finalMediaUrl =
    finalFile &&
    finalFile.size > 0
      ? await uploadAprovUpFile(
          finalFile,
          'final-content',
          `material-final-${contentId}`
        )
      : '';


  const finalCoverUrl =
    coverFile &&
    coverFile.size > 0
      ? await uploadAprovUpFile(
          coverFile,
          'final-content',
          `capa-${contentId}`
        )
      : '';


  const mediaType =
    finalFile?.type ||
    '';


  const updateData: any = {
    status:
      'ENVIADO_AO_CLIENTE',

    finalUploadedAt:
      new Date(),
  };


  if (
    finalMediaUrl
  ) {
    updateData.finalMediaUrl =
      finalMediaUrl;

    updateData.finalMediaType =
      mediaType;
  }


  if (
    finalCoverUrl
  ) {
    updateData.finalCoverUrl =
      finalCoverUrl;
  }


  await prisma.content.update({
    where: {
      id:
        contentId,
    },

    data:
      updateData,
  });


  await prisma.comment.create({
    data: {
      contentId,

      authorName:
        currentUser.name ||
        currentUser.email ||
        'Equipe Level UP',

      authorRole:
        currentUser.role ||
        'EQUIPE',

      message:
        finalMediaUrl
          ? 'Material final enviado para aprovação do cliente na Etapa 2.'
          : 'Capa/preview enviado para aprovação do cliente na Etapa 2.',
    },
  });


  revalidatePath(
    `/conteudos/${contentId}/visualizar`
  );

  revalidatePath(
    `/clientes/${content.clientId}`
  );

  revalidatePath(
    `/aprovacao-final/${content.clientId}`
  );

  revalidatePath(
    '/design'
  );

  revalidatePath(
    '/filmmaker'
  );


  redirect(
    `/conteudos/${contentId}/visualizar`
  );
}
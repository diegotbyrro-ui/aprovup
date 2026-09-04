'use server';

import {
  revalidatePath,
} from 'next/cache';

import {
  redirect,
} from 'next/navigation';

import {
  prisma,
} from '@/lib/prisma';

import {
  requirePermission,
} from '@/lib/userAccess';

import {
  uploadAprovUpFile,
} from '@/lib/aprovupStorage';


const MAX_PDF_SIZE =
  15 * 1024 * 1024;


export async function createReportTemplateAction(
  formData: FormData
) {

  const currentUser =
    await requirePermission(
      'settings.manage'
    );


  const name =
    String(
      formData.get('name') || ''
    )
      .trim()
      .slice(0, 80);


  if (!name) {
    redirect(
      '/configuracoes/relatorios?error=name'
    );
  }


  const value =
    formData.get(
      'layoutPdf'
    );


  if (
    !value ||
    typeof value !== 'object' ||
    !('arrayBuffer' in value)
  ) {

    redirect(
      '/configuracoes/relatorios?error=file'
    );
  }


  const file =
    value as File;


  if (!file.size) {
    redirect(
      '/configuracoes/relatorios?error=file'
    );
  }


  const fileName =
    String(
      file.name ||
      'layout.pdf'
    );


  const isPdf =
    file.type ===
      'application/pdf' ||
    fileName
      .toLowerCase()
      .endsWith('.pdf');


  if (!isPdf) {
    redirect(
      '/configuracoes/relatorios?error=type'
    );
  }


  if (
    file.size >
    MAX_PDF_SIZE
  ) {
    redirect(
      '/configuracoes/relatorios?error=size'
    );
  }


  let sourceFileUrl =
    '';


  try {

    sourceFileUrl =
      await uploadAprovUpFile(
        file,
        'report-templates',
        `agency-${currentUser.agencyId}`
      );

  }
  catch (error) {

    console.error(
      'Report template upload:',
      error
    );

    redirect(
      '/configuracoes/relatorios?error=upload'
    );
  }


  const existing =
    await prisma
      .reportTemplate
      .findFirst({

        where: {
          agencyId:
            currentUser.agencyId,

          status:
            'ATIVO',
        },

        select: {
          id:
            true,
        },

      });


  await prisma
    .reportTemplate
    .create({

      data: {

        agencyId:
          currentUser.agencyId,

        name,

        sourceFileUrl,

        originalFileName:
          fileName.slice(
            0,
            255
          ),

        fileSize:
          file.size,

        isDefault:
          !existing,

        status:
          'ATIVO',
      },

    });


  revalidatePath(
    '/configuracoes/relatorios'
  );

  redirect(
    '/configuracoes/relatorios?status=saved'
  );
}


export async function setDefaultReportTemplateAction(
  templateId: string
) {

  const currentUser =
    await requirePermission(
      'settings.manage'
    );


  const template =
    await prisma
      .reportTemplate
      .findFirst({

        where: {

          id:
            templateId,

          agencyId:
            currentUser.agencyId,

          status:
            'ATIVO',
        },

        select: {
          id:
            true,
        },

      });


  if (!template) {
    redirect(
      '/configuracoes/relatorios?error=template'
    );
  }


  await prisma
    .$transaction([

      prisma.reportTemplate.updateMany({

        where: {

          agencyId:
            currentUser.agencyId,

          status:
            'ATIVO',
        },

        data: {
          isDefault:
            false,
        },

      }),

      prisma.reportTemplate.update({

        where: {
          id:
            template.id,
        },

        data: {
          isDefault:
            true,
        },

      }),

    ]);


  revalidatePath(
    '/configuracoes/relatorios'
  );

  redirect(
    '/configuracoes/relatorios?status=default'
  );
}
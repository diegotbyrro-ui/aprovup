'use server';

import {
  revalidatePath,
} from 'next/cache';

import {
  redirect,
} from 'next/navigation';

import {
  PDFDocument,
} from 'pdf-lib';

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


export async function createEditorialCalendarTemplateAction(
  formData:
    FormData
) {
  const currentUser =
    await requirePermission(
      'settings.manage'
    );


  const value =
    formData.get(
      'layoutPdf'
    );


  if (
    !value ||
    typeof value !==
      'object' ||
    !(
      'arrayBuffer'
      in value
    )
  ) {
    redirect(
      '/configuracoes/calendario-editorial?error=file'
    );
  }


  const file =
    value as File;


  const fileName =
    String(
      file.name ||
      'calendario.pdf'
    );


  const nameFromFile =
    fileName
      .replace(
        /\.pdf$/i,
        ''
      )
      .replace(
        /[_-]+/g,
        ' '
      )
      .replace(
        /\s+/g,
        ' '
      )
      .trim();


  const name =
    (
      nameFromFile ||
      'Calendario Editorial'
    )
      .slice(
        0,
        80
      );


  const isPdf =
    file.type ===
      'application/pdf' ||
    fileName
      .toLowerCase()
      .endsWith(
        '.pdf'
      );


  if (
    !file.size ||
    !isPdf
  ) {
    redirect(
      '/configuracoes/calendario-editorial?error=type'
    );
  }


  if (
    file.size >
    MAX_PDF_SIZE
  ) {
    redirect(
      '/configuracoes/calendario-editorial?error=size'
    );
  }


  let pageCount =
    0;


  try {
    const bytes =
      await file
        .arrayBuffer();


    const pdf =
      await PDFDocument.load(
        bytes
      );


    pageCount =
      pdf.getPageCount();
  }
  catch {
    redirect(
      '/configuracoes/calendario-editorial?error=pdf'
    );
  }


  if (
    pageCount <
    2
  ) {
    redirect(
      '/configuracoes/calendario-editorial?error=pages'
    );
  }


  let sourceFileUrl =
    '';


  try {
    sourceFileUrl =
      await uploadAprovUpFile(
        file,
        'editorial-calendar-templates',
        'agency-' +
          currentUser.agencyId
      );
  }
  catch (
    error
  ) {
    console.error(
      'Editorial calendar template upload:',
      error
    );

    redirect(
      '/configuracoes/calendario-editorial?error=upload'
    );
  }


  const existing =
    await prisma
      .editorialCalendarTemplate
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
    .editorialCalendarTemplate
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

        pageCount,

        isDefault:
          !existing,

        status:
          'ATIVO',
      },
    });


  revalidatePath(
    '/configuracoes/calendario-editorial'
  );


  redirect(
    '/configuracoes/calendario-editorial?status=saved'
  );
}


export async function setDefaultEditorialCalendarTemplateAction(
  templateId:
    string
) {
  const currentUser =
    await requirePermission(
      'settings.manage'
    );


  const template =
    await prisma
      .editorialCalendarTemplate
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
      '/configuracoes/calendario-editorial?error=template'
    );
  }


  await prisma
    .$transaction([
      prisma
        .editorialCalendarTemplate
        .updateMany({
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

      prisma
        .editorialCalendarTemplate
        .update({
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
    '/configuracoes/calendario-editorial'
  );


  redirect(
    '/configuracoes/calendario-editorial?status=default'
  );
}

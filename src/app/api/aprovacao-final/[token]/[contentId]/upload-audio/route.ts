import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  prisma,
} from '@/lib/prisma';

import {
  FINAL_PENDING_STATUSES,
  resolveFinalApprovalContext,
} from '@/lib/finalMonthlyApproval';

import {
  createAprovUpSignedUpload,
} from '@/lib/aprovupStorage';


export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';


const MAX_AUDIO_BYTES =
  15 * 1024 * 1024;


const ALLOWED_AUDIO_TYPES =
  new Set([
    'audio/webm',
    'audio/ogg',
    'audio/mp4',
    'audio/mpeg',
    'audio/wav',
    'audio/x-m4a',
  ]);


function normalizeMime(
  value:
    unknown
) {

  return String(
    value ||
    ''
  )
    .split(
      ';'
    )[0]
    .trim()
    .toLowerCase();
}


export async function POST(
  request:
    NextRequest,

  context: {
    params:
      Promise<{
        token:
          string;

        contentId:
          string;
      }>;
  }
) {

  try {

    const {
      token,
      contentId,
    } =
      await context.params;


    if (
      !token ||
      !contentId
    ) {

      return NextResponse.json(
        {
          ok:
            false,

          message:
            'Link de aprovação inválido.',
        },
        {
          status:
            404,
        }
      );
    }


    /*
     * Funciona tanto com o novo token mensal quanto
     * com os links antigos individuais.
     */
    const approvalContext =
      await resolveFinalApprovalContext(
        token
      );


    if (
      !approvalContext
    ) {

      return NextResponse.json(
        {
          ok:
            false,

          message:
            'Link de aprovação inválido.',
        },
        {
          status:
            404,
        }
      );
    }


    const {
      client,
      start,
      end,
    } =
      approvalContext;


    const content =
      await prisma.content.findFirst({
        where: {
          id:
            contentId,

          clientId:
            client.id,

          plannedDate: {
            gte:
              start,

            lt:
              end,
          },

          status: {
            in:
              FINAL_PENDING_STATUSES,
          },
        },

        select: {
          id:
            true,
        },
      });


    if (
      !content
    ) {

      return NextResponse.json(
        {
          ok:
            false,

          message:
            'Este conteúdo não está disponível para ajuste.',
        },
        {
          status:
            409,
        }
      );
    }


    const body =
      await request.json();


    const fileName =
      typeof body
        ?.fileName ===
        'string'
        ? body.fileName
        : '';


    const fileSize =
      Number(
        body
          ?.fileSize ||
        0
      );


    const contentType =
      normalizeMime(
        body
          ?.contentType
      );


    if (
      !fileName ||
      !Number.isFinite(
        fileSize
      ) ||
      fileSize <=
        0 ||
      fileSize >
        MAX_AUDIO_BYTES
    ) {

      return NextResponse.json(
        {
          ok:
            false,

          message:
            'Áudio inválido ou maior que 15 MB.',
        },
        {
          status:
            400,
        }
      );
    }


    if (
      !ALLOWED_AUDIO_TYPES.has(
        contentType
      )
    ) {

      return NextResponse.json(
        {
          ok:
            false,

          message:
            'Formato de áudio não permitido.',
        },
        {
          status:
            400,
        }
      );
    }


    const prepared =
      await createAprovUpSignedUpload({
        folder:
          'client-review-audio',

        prefix:
          'ajuste-cliente-' +
          contentId,

        fileName,
      });


    return NextResponse.json({
      ok:
        true,

      bucket:
        'aprovup-files',

      path:
        prepared.path,

      token:
        prepared.token,
    });

  }
  catch (
    error
  ) {

    console.error(
      'AprovUp client review audio:',
      error
    );


    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Não foi possível preparar o áudio.',
      },
      {
        status:
          500,
      }
    );
  }
}

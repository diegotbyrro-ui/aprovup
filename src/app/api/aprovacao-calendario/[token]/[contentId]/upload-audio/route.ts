import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  prisma,
} from '@/lib/prisma';

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
  value: unknown
) {
  return String(
    value ||
    ''
  )
    .split(';')[0]
    .trim()
    .toLowerCase();
}


function monthRange(
  year: number,
  month: number
) {
  return {
    start:
      new Date(
        year,
        month - 1,
        1
      ),

    end:
      new Date(
        year,
        month,
        0,
        23,
        59,
        59,
        999
      ),
  };
}


export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{
      token: string;
      contentId: string;
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
          ok: false,
          message:
            'Link de aprovação inválido.',
        },
        {
          status: 404,
        }
      );
    }

    const monthlyApproval =
      await prisma
        .monthlyApproval
        .findUnique({
          where: {
            token,
          },

          select: {
            clientId:
              true,

            month:
              true,

            year:
              true,
          },
        });

    if (!monthlyApproval) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'Link de aprovação inválido.',
        },
        {
          status: 404,
        }
      );
    }

    const {
      start,
      end,
    } =
      monthRange(
        monthlyApproval.year,
        monthlyApproval.month
      );

    const content =
      await prisma.content.findFirst({
        where: {
          id:
            contentId,

          clientId:
            monthlyApproval.clientId,

          plannedDate: {
            gte:
              start,

            lte:
              end,
          },

          status: {
            notIn: [
              'AGENDAMENTO_PRODUCAO',
              'DESIGN',
              'EDICAO',
              'REVISAO_INTERNA',
              'ENVIADO_CLIENTE',
              'APROVADO',
              'PRONTO_PARA_POSTAR',
              'PUBLICADO',
              'PUBLICADO_MANUALMENTE',
              'ARQUIVADO',
              'ALTERACAO_SOLICITADA',
            ],
          },
        },

        select: {
          id:
            true,
        },
      });

    if (!content) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'Este conteúdo não está disponível para solicitar ajuste.',
        },
        {
          status: 409,
        }
      );
    }

    const body =
      await request.json();

    const fileName =
      typeof body?.fileName ===
        'string'
        ? body.fileName
        : '';

    const fileSize =
      Number(
        body?.fileSize ||
        0
      );

    const contentType =
      normalizeMime(
        body?.contentType
      );

    if (
      !fileName ||
      !Number.isFinite(
        fileSize
      ) ||
      fileSize <= 0 ||
      fileSize >
        MAX_AUDIO_BYTES
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'Áudio inválido ou maior que 15 MB.',
        },
        {
          status: 400,
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
          ok: false,
          message:
            'Formato de áudio não permitido.',
        },
        {
          status: 400,
        }
      );
    }

    const prepared =
      await createAprovUpSignedUpload({
        folder:
          'client-planning-audio',

        prefix:
          'ajuste-planejamento-' +
          contentId,

        fileName,
      });

    return NextResponse.json({
      ok: true,

      bucket:
        'aprovup-files',

      path:
        prepared.path,

      token:
        prepared.token,
    });
  }
  catch (error) {
    console.error(
      'AprovUp planning review audio:',
      error
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          'Não foi possível preparar o áudio.',
      },
      {
        status: 500,
      }
    );
  }
}

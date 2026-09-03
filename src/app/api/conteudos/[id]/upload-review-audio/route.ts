import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  getCurrentUser,
} from '@/lib/auth';

import {
  prisma,
} from '@/lib/prisma';

import {
  hasPermission,
} from '@/lib/userAccess';

import {
  createAprovUpSignedUpload,
} from '@/lib/aprovupStorage';


export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';


const MAX_AUDIO_BYTES =
  15 * 1024 * 1024;


const READY_STATUSES =
  new Set([
    'REVISAO_INTERNA',
    'DESIGN_ANALISE',
    'FILMMAKER_ANALISE',
  ]);


const ALLOWED_AUDIO_TYPES =
  new Set([
    'audio/webm',
    'audio/ogg',
    'audio/mp4',
    'audio/mpeg',
    'audio/wav',
    'audio/x-m4a',
  ]);


function normalizedMime(
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


export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const {
      id,
    } =
      await context.params;

    const currentUser =
      await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'Sessão expirada.',
        },
        {
          status: 401,
        }
      );
    }

    if (
      currentUser.status !==
        'APROVADO' ||
      !hasPermission(
        currentUser,
        'social.manage'
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'Você não tem permissão para enviar áudio de revisão.',
        },
        {
          status: 403,
        }
      );
    }

    const content =
      await prisma.content.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          status: true,
        },
      });

    if (!content) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'Conteúdo não encontrado.',
        },
        {
          status: 404,
        }
      );
    }

    if (
      !READY_STATUSES.has(
        content.status
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'Este conteúdo não está aguardando revisão da Social Media.',
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
      normalizedMime(
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
            'Arquivo de áudio inválido ou maior que 15 MB.',
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
          'review-audio',

        prefix:
          `ajuste-social-${id}`,

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
      'AprovUp review audio:',
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
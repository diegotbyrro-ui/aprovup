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
  hasAnyPermission,
} from '@/lib/userAccess';

import {
  listAprovUpReferenceFiles,
} from '@/lib/aprovupStorage';


export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';


export async function GET(
  request:
    NextRequest,
  context: {
    params:
      Promise<{
        id:
          string;
      }>;
  }
) {
  const user =
    await getCurrentUser();


  if (
    !user ||
    user.status !==
      'APROVADO' ||
    !user.agencyId
  ) {
    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Sessão inválida.',
      },
      {
        status:
          401,
      }
    );
  }


  if (
    !hasAnyPermission(
      user,
      [
        'social.view',
        'social.manage',
        'design.view',
        'design.manage',
        'filmmaker.view',
        'filmmaker.manage',
      ]
    )
  ) {
    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Sem permissão para baixar este anexo.',
      },
      {
        status:
          403,
      }
    );
  }


  const {
    id,
  } =
    await context.params;


  const content =
    await prisma.content
      .findFirst({
        where: {
          id,

          client: {
            agencyId:
              user.agencyId,
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
        ok:
          false,

        message:
          'Conteúdo não encontrado.',
      },
      {
        status:
          404,
      }
    );
  }


  const requestedUrl =
    String(
      request.nextUrl
        .searchParams
        .get(
          'url'
        ) ||
      ''
    ).trim();


  if (!requestedUrl) {
    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Anexo não informado.',
      },
      {
        status:
          400,
      }
    );
  }


  const files =
    await listAprovUpReferenceFiles(
      content.id
    );


  const file =
    files.find(
      (item) =>
        item.url ===
        requestedUrl
    );


  if (!file) {
    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Anexo não encontrado.',
      },
      {
        status:
          404,
      }
    );
  }


  const response =
    await fetch(
      file.url,
      {
        cache:
          'no-store',
      }
    );


  if (!response.ok) {
    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Não foi possível baixar o arquivo.',
      },
      {
        status:
          502,
      }
    );
  }


  const bytes =
    await response.arrayBuffer();


  const fileName =
    file.originalName ||
    file.name ||
    'referencia';


  return new Response(
    bytes,
    {
      status:
        200,

      headers: {
        'Content-Type':
          file.mimeType ||
          response.headers.get(
            'content-type'
          ) ||
          'application/octet-stream',

        'Content-Length':
          String(
            bytes.byteLength
          ),

        'Content-Disposition':
          "attachment; filename*=UTF-8''" +
          encodeURIComponent(
            fileName
          ),

        'Cache-Control':
          'private, no-store',
      },
    }
  );
}

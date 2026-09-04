import {
  NextResponse,
} from 'next/server';

import {
  getCurrentUser,
} from '@/lib/auth';

import {
  prisma,
} from '@/lib/prisma';


export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';


export async function GET(
  _request: Request,
  context: {
    params:
      Promise<{
        id: string;
      }>;
  }
) {

  const currentUser =
    await getCurrentUser();


  if (
    !currentUser ||
    currentUser.status !==
      'APROVADO' ||
    !currentUser.agencyId
  ) {

    return NextResponse.json(
      {
        message:
          'Acesso não autorizado.',
      },
      {
        status: 401,
      }
    );
  }


  const {
    id,
  } =
    await context.params;


  const template =
    await prisma
      .reportTemplate
      .findFirst({

        where: {

          id,

          agencyId:
            currentUser.agencyId,

          status:
            'ATIVO',
        },

        select: {
          sourceFileUrl:
            true,
        },

      });


  if (!template) {

    return NextResponse.json(
      {
        message:
          'Modelo não encontrado.',
      },
      {
        status: 404,
      }
    );
  }


  const source =
    await fetch(
      template.sourceFileUrl,
      {
        cache:
          'no-store',
      }
    );


  if (!source.ok) {

    return NextResponse.json(
      {
        message:
          'Não foi possível carregar o PDF.',
      },
      {
        status: 502,
      }
    );
  }


  const pdf =
    await source.arrayBuffer();


  return new NextResponse(
    pdf,
    {
      status: 200,

      headers: {

        'Content-Type':
          'application/pdf',

        'Cache-Control':
          'private, no-store, max-age=0',
      },
    }
  );
}
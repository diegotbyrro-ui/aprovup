import {
  prisma,
} from '@/lib/prisma';

import {
  requireCurrentUser,
  isDirector,
  isSocialMedia,
} from '@/lib/auth';

import {
  redirect,
} from 'next/navigation';

import {
  NextRequest,
} from 'next/server';


export async function GET(
  request:
    NextRequest
) {

  const currentUser =
    await requireCurrentUser();


  if (
    !isDirector(
      currentUser.role
    ) &&
    !isSocialMedia(
      currentUser.role
    )
  ) {
    redirect(
      '/clientes'
    );
  }


  const searchParams =
    request.nextUrl
      .searchParams;


  const clientId =
    String(
      searchParams.get(
        'cliente'
      ) ||
      ''
    ).trim();


  const date =
    String(
      searchParams.get(
        'data'
      ) ||
      ''
    ).trim();


  if (
    !clientId
  ) {
    redirect(
      '/clientes'
    );
  }


  const client =
    await prisma.client.findUnique({

      where: {
        id:
          clientId,
      },

      select: {
        id:
          true,
      },

    });


  if (
    !client
  ) {
    redirect(
      '/clientes'
    );
  }


  const url =
    date
      ? `/clientes/${clientId}/conteudos/novo?date=${encodeURIComponent(
          date
        )}`
      : `/clientes/${clientId}/conteudos/novo`;


  redirect(
    url
  );
}

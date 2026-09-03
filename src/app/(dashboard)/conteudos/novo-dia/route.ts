import {
  prisma,
} from '@/lib/prisma';

import {
  isDirector,
  isSocialMedia,
} from '@/lib/auth';

import {
  requireAgencyContext,
} from '@/lib/tenant';

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

  const {
    user:
      currentUser,
    agencyId,
  } =
    await requireAgencyContext();


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
    await prisma.client.findFirst({

      where: {
        id:
          clientId,

        agencyId,
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

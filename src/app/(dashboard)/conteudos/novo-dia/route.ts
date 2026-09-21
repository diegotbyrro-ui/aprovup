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


  const retorno =
    String(
      searchParams.get(
        'retorno'
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


  const params =
    new URLSearchParams();


  if (date) {
    params.set(
      'date',
      date
    );
  }


  if (retorno) {
    params.set(
      'retorno',
      retorno
    );
  }


  const query =
    params.toString();


  const url =
    `/clientes/${clientId}/conteudos/novo` +
    (
      query
        ? '?' +
          query
        : ''
    );


  redirect(
    url
  );
}

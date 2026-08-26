import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  captureAllInstagramSnapshots,
} from '@/lib/instagramSnapshots';


export const dynamic =
  'force-dynamic';


export async function GET(
  request:
    NextRequest
) {

  const configuredSecret =
    process.env
      .INSTAGRAM_CRON_SECRET;


  if (
    !configuredSecret
  ) {

    return NextResponse.json(
      {
        ok:
          false,

        error:
          'Cron nao configurado.',
      },
      {
        status:
          503,
      }
    );

  }


  const authorization =
    request.headers.get(
      'authorization'
    );


  if (
    authorization !==
    `Bearer ${configuredSecret}`
  ) {

    return NextResponse.json(
      {
        ok:
          false,

        error:
          'Nao autorizado.',
      },
      {
        status:
          401,
      }
    );

  }


  try {

    const result =
      await captureAllInstagramSnapshots();


    return NextResponse.json(
      {
        ok:
          true,

        capturedAt:
          new Date()
            .toISOString(),

        ...result,
      }
    );

  }
  catch (
    error
  ) {

    console.error(
      'INSTAGRAM SNAPSHOT CRON ERROR',
      error
    );


    return NextResponse.json(
      {
        ok:
          false,

        error:
          'Falha ao capturar snapshots.',
      },
      {
        status:
          500,
      }
    );

  }
}

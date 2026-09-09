import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  runSecretaryAutomation,
} from '@/lib/secretaryAutomation';


export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';

export const maxDuration =
  300;


function authorized(
  request:
    NextRequest
) {
  const secret =
    String(
      process.env
        .SECRETARY_CRON_SECRET ||
      process.env
        .INSTAGRAM_CRON_SECRET ||
      ''
    ).trim();


  if (!secret) {
    return false;
  }


  return request.headers
    .get(
      'authorization'
    ) ===
    'Bearer ' +
    secret;
}


export async function GET(
  request:
    NextRequest
) {
  if (
    !authorized(
      request
    )
  ) {
    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Não autorizado.',
      },
      {
        status:
          401,
      }
    );
  }


  const result =
    await runSecretaryAutomation();


  return NextResponse.json({
    ok:
      true,

    checkedAt:
      new Date()
        .toISOString(),

    ...result,
  });
}

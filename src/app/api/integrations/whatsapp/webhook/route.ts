import {
  createHmac,
  timingSafeEqual,
} from 'node:crypto';

import {
  after,
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  prisma,
} from '@/lib/prisma';

import {
  decryptMetaSecret,
} from '@/lib/metaCrypto';

import {
  ingestWhatsappWebhook,
  processWhatsappEvent,
} from '@/lib/secretaryWhatsApp';


export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';

export const maxDuration =
  120;


function safeEqual(
  left:
    string,
  right:
    string
) {
  const a =
    Buffer.from(
      left
    );

  const b =
    Buffer.from(
      right
    );


  if (
    a.length !==
    b.length
  ) {
    return false;
  }


  return timingSafeEqual(
    a,
    b
  );
}


async function verifyWebhookToken(
  token:
    string
) {
  const connections =
    await prisma
      .secretaryWhatsappConnection
      .findMany({
        where: {
          encryptedVerifyToken: {
            not:
              null,
          },
        },

        select: {
          encryptedVerifyToken:
            true,
        },
      });


  for (
    const connection
    of connections
  ) {
    if (
      !connection
        .encryptedVerifyToken
    ) {
      continue;
    }


    try {
      const expected =
        decryptMetaSecret(
          connection
            .encryptedVerifyToken
        );


      if (
        safeEqual(
          expected,
          token
        )
      ) {
        return true;
      }
    }
    catch {
    }
  }


  return false;
}


function validSignature(
  rawBody:
    string,
  signature:
    string |
    null
) {
  const appSecret =
    String(
      process.env
        .META_APP_SECRET ||
      ''
    ).trim();


  if (
    !appSecret ||
    !signature?.startsWith(
      'sha256='
    )
  ) {
    return false;
  }


  const expected =
    'sha256=' +
    createHmac(
      'sha256',
      appSecret
    )
      .update(
        rawBody,
        'utf8'
      )
      .digest(
        'hex'
      );


  return safeEqual(
    expected,
    signature
  );
}


export async function GET(
  request:
    NextRequest
) {
  const mode =
    request
      .nextUrl
      .searchParams
      .get(
        'hub.mode'
      );

  const challenge =
    request
      .nextUrl
      .searchParams
      .get(
        'hub.challenge'
      );

  const token =
    request
      .nextUrl
      .searchParams
      .get(
        'hub.verify_token'
      );


  if (
    mode ===
      'subscribe' &&
    challenge &&
    token &&
    await verifyWebhookToken(
      token
    )
  ) {
    return new NextResponse(
      challenge,
      {
        status:
          200,

        headers: {
          'Content-Type':
            'text/plain',
        },
      }
    );
  }


  return NextResponse.json(
    {
      ok:
        false,
    },
    {
      status:
        403,
    }
  );
}


export async function POST(
  request:
    NextRequest
) {
  const rawBody =
    await request
      .text();


  if (
    !validSignature(
      rawBody,
      request.headers
        .get(
          'x-hub-signature-256'
        )
    )
  ) {
    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Assinatura inválida.',
      },
      {
        status:
          401,
      }
    );
  }


  let payload:
    unknown;


  try {
    payload =
      JSON.parse(
        rawBody
      );
  }
  catch {
    return NextResponse.json(
      {
        ok:
          false,

        message:
          'JSON inválido.',
      },
      {
        status:
          400,
      }
    );
  }


  const eventIds =
    await ingestWhatsappWebhook(
      payload
    );


  for (
    const eventId
    of eventIds
  ) {
    after(
      async () => {
        await processWhatsappEvent(
          eventId
        );
      }
    );
  }


  return NextResponse.json({
    ok:
      true,

    received:
      eventIds.length,
  });
}

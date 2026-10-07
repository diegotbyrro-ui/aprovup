import { createHmac, timingSafeEqual } from 'node:crypto';

import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  prisma,
} from '@/lib/prisma';

import {
  tiktokOauthConfig,
} from '@/lib/socialOAuth';


export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';


const MAX_SIGNATURE_AGE_SECONDS =
  5 * 60;


type TikTokWebhookBody = {
  client_key?: string;
  event?: string;
  create_time?: number;
  user_openid?: string;
  content?: string;
};


type TikTokEventContent = {
  publish_id?: string;
  post_id?: string | number;
  publish_type?: string;
  reason?: string;
  fail_reason?: string;
  share_id?: string;
  [key: string]: unknown;
};


function parseSignature(
  header: string
) {
  const parts =
    header
      .split(',')
      .map(
        (part) =>
          part.trim()
      );

  let timestamp = '';
  let signature = '';

  for (
    const part of parts
  ) {
    const separator =
      part.indexOf('=');

    if (
      separator <= 0
    ) {
      continue;
    }

    const key =
      part.slice(
        0,
        separator
      );

    const value =
      part.slice(
        separator + 1
      );

    if (
      key === 't'
    ) {
      timestamp = value;
    }

    if (
      key === 's'
    ) {
      signature = value;
    }
  }

  return {
    timestamp,
    signature,
  };
}


function signaturesMatch(
  expected: string,
  received: string
) {
  const expectedBuffer =
    Buffer.from(
      expected,
      'utf8'
    );

  const receivedBuffer =
    Buffer.from(
      received,
      'utf8'
    );

  if (
    expectedBuffer.length !==
    receivedBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    expectedBuffer,
    receivedBuffer
  );
}


function verifyTikTokSignature(
  rawBody: string,
  signatureHeader: string,
  clientSecret: string
) {
  const {
    timestamp,
    signature,
  } =
    parseSignature(
      signatureHeader
    );

  if (
    !timestamp ||
    !signature
  ) {
    return false;
  }

  const timestampNumber =
    Number(
      timestamp
    );

  if (
    !Number.isFinite(
      timestampNumber
    )
  ) {
    return false;
  }

  const age =
    Math.abs(
      Math.floor(
        Date.now() / 1000
      ) -
      timestampNumber
    );

  if (
    age >
    MAX_SIGNATURE_AGE_SECONDS
  ) {
    return false;
  }

  const signedPayload =
    timestamp +
    '.' +
    rawBody;

  const expected =
    createHmac(
      'sha256',
      clientSecret
    )
      .update(
        signedPayload
      )
      .digest(
        'hex'
      );

  return signaturesMatch(
    expected,
    signature
  );
}


function parseEventContent(
  content:
    string |
    undefined
) {
  if (
    !content
  ) {
    return {};
  }

  try {
    return JSON.parse(
      content
    ) as TikTokEventContent;
  }
  catch {
    return {};
  }
}


async function processTikTokEvent(
  body:
    TikTokWebhookBody,
  eventContent:
    TikTokEventContent
) {
  const event =
    String(
      body.event ||
      ''
    ).trim();

  const userOpenId =
    String(
      body.user_openid ||
      ''
    ).trim();

  const publishId =
    String(
      eventContent.publish_id ||
      ''
    ).trim();

  if (
    event ===
    'authorization.removed' &&
    userOpenId
  ) {
    await prisma.socialConnection.updateMany({
      where: {
        platform:
          'TIKTOK',

        accountId:
          userOpenId,
      },

      data: {
        status:
          'EXPIRADO',

        encryptedAccessToken:
          null,

        encryptedRefreshToken:
          null,

        lastSyncAt:
          new Date(),
      },
    });

    return;
  }

  if (
    !publishId
  ) {
    return;
  }

  if (
    event ===
    'post.publish.failed'
  ) {
    const reason =
      String(
        eventContent.reason ||
        eventContent.fail_reason ||
        'Falha informada pelo TikTok.'
      );

    await prisma.socialPublication.updateMany({
      where: {
        platform:
          'TIKTOK',

        externalId:
          publishId,
      },

      data: {
        status:
          'ERRO',

        lastError:
          reason,

        lastAttemptAt:
          new Date(),
      },
    });

    return;
  }

  if (
    event ===
      'post.publish.complete' ||
    event ===
      'post.publish.publicly_available'
  ) {
    await prisma.socialPublication.updateMany({
      where: {
        platform:
          'TIKTOK',

        externalId:
          publishId,
      },

      data: {
        status:
          'PUBLICADO',

        publishedAt:
          new Date(),

        lastError:
          null,

        lastAttemptAt:
          new Date(),

        metadata: {
          tiktokPostId:
            eventContent.post_id ||
            null,

          publishType:
            eventContent.publish_type ||
            null,

          lastWebhookEvent:
            event,

          webhookReceivedAt:
            new Date().toISOString(),
        },
      },
    });

    return;
  }

  if (
    event ===
    'post.publish.inbox_delivered'
  ) {
    await prisma.socialPublication.updateMany({
      where: {
        platform:
          'TIKTOK',

        externalId:
          publishId,
      },

      data: {
        status:
          'PROCESSANDO',

        lastAttemptAt:
          new Date(),

        lastError:
          null,
      },
    });
  }
}


export async function GET() {
  return NextResponse.json(
    {
      ok:
        true,

      service:
        'tiktok-webhook',

      message:
        'AprovUP TikTok webhook ativo.',
    },
    {
      status:
        200,
    }
  );
}


export async function POST(
  request:
    NextRequest
) {
  const rawBody =
    await request.text();

  const signatureHeader =
    request.headers.get(
      'TikTok-Signature'
    );

  const config =
    tiktokOauthConfig();

  /*
   * TikTok recommends HMAC-SHA256 verification using:
   * timestamp + "." + raw request body
   * with TIKTOK_CLIENT_SECRET as the key.
   *
   * The Developer Portal test may be sent without the signature
   * header. When TikTok sends a signature, it is verified.
   */
  if (
    signatureHeader &&
    config.clientSecret
  ) {
    const valid =
      verifyTikTokSignature(
        rawBody,
        signatureHeader,
        config.clientSecret
      );

    if (
      !valid
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          error:
            'invalid_signature',
        },
        {
          status:
            401,
        }
      );
    }
  }

  let body:
    TikTokWebhookBody;

  try {
    body =
      JSON.parse(
        rawBody
      ) as TikTokWebhookBody;
  }
  catch {
    return NextResponse.json(
      {
        ok:
          true,

        received:
          true,
      },
      {
        status:
          200,
      }
    );
  }

  const eventContent =
    parseEventContent(
      body.content
    );

  try {
    await processTikTokEvent(
      body,
      eventContent
    );
  }
  catch (error) {
    console.error(
      'TIKTOK WEBHOOK PROCESSING ERROR',
      error
    );

    /*
     * Acknowledge the webhook even when the internal synchronization
     * fails. TikTok retries non-2xx responses for webhook delivery.
     */
  }

  return NextResponse.json(
    {
      ok:
        true,

      received:
        true,

      event:
        body.event ||
        null,
    },
    {
      status:
        200,
    }
  );
}
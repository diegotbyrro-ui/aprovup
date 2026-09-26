import {
  createHmac,
  timingSafeEqual,
} from 'node:crypto';


const TOKEN_CONTEXT =
  'aprovup-meet-addon-v1';


const TOKEN_TTL_MS =
  12 *
  60 *
  60 *
  1000;


export type MeetAddonClaims = {
  userId:
    string;

  agencyId:
    string;

  expiresAt:
    number;
};


function getSecret() {

  const secret =
    String(
      process.env
        .APROVUP_SESSION_SECRET ||
      process.env
        .APROVUP_ACCESS_SECRET ||
      ''
    ).trim();


  if (
    !secret
  ) {

    throw new Error(
      'APROVUP_SESSION_SECRET não configurado.'
    );
  }


  return secret;
}


function sign(
  payload:
    string
) {

  return createHmac(
    'sha256',
    getSecret()
  )
    .update(
      TOKEN_CONTEXT +
      '|' +
      payload
    )
    .digest(
      'base64url'
    );
}


function safeCompare(
  first:
    string,
  second:
    string
) {

  const firstBuffer =
    Buffer.from(
      first
    );


  const secondBuffer =
    Buffer.from(
      second
    );


  if (
    firstBuffer.length !==
    secondBuffer.length
  ) {

    return false;
  }


  return timingSafeEqual(
    firstBuffer,
    secondBuffer
  );
}


export function createMeetAddonToken({
  userId,
  agencyId,
}: {
  userId:
    string;

  agencyId:
    string;
}) {

  const claims:
    MeetAddonClaims = {
      userId,

      agencyId,

      expiresAt:
        Date.now() +
        TOKEN_TTL_MS,
  };


  const payload =
    Buffer
      .from(
        JSON.stringify(
          claims
        ),
        'utf8'
      )
      .toString(
        'base64url'
      );


  return (
    payload +
    '.' +
    sign(
      payload
    )
  );
}


export function verifyMeetAddonToken(
  token:
    string
) {

  const [
    payload,
    providedSignature,
  ] =
    String(
      token ||
      ''
    )
      .trim()
      .split(
        '.'
      );


  if (
    !payload ||
    !providedSignature
  ) {

    return null;
  }


  const expectedSignature =
    sign(
      payload
    );


  if (
    !safeCompare(
      expectedSignature,
      providedSignature
    )
  ) {

    return null;
  }


  try {

    const claims =
      JSON.parse(
        Buffer
          .from(
            payload,
            'base64url'
          )
          .toString(
            'utf8'
          )
      ) as
        MeetAddonClaims;


    if (
      !claims.userId ||
      !claims.agencyId ||
      !Number.isFinite(
        claims.expiresAt
      ) ||
      claims.expiresAt <=
        Date.now()
    ) {

      return null;
    }


    return claims;

  }
  catch {

    return null;
  }
}


export function readMeetAddonBearerToken(
  request:
    Request
) {

  const header =
    String(
      request.headers.get(
        'authorization'
      ) ||
      ''
    );


  if (
    !header.startsWith(
      'Bearer '
    )
  ) {

    return '';
  }


  return header
    .slice(
      7
    )
    .trim();
}

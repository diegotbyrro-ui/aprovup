import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';


export type SocialOauthPlatform =
  | 'YOUTUBE'
  | 'TIKTOK';


export type SocialOauthCookiePayload = {
  platform:
    SocialOauthPlatform;

  clientId:
    string;

  userId:
    string;

  state:
    string;

  expiresAt:
    number;
};


function integrationEncryptionKey() {

  const secret =
    String(
      process.env
        .APROVUP_INTEGRATION_ENCRYPTION_KEY ||
      ''
    ).trim();


  if (!secret) {

    throw new Error(
      'APROVUP_INTEGRATION_ENCRYPTION_KEY não configurada.'
    );
  }


  return createHash(
    'sha256'
  )
    .update(
      secret
    )
    .digest();
}


export function encryptSocialSecret(
  value:
    string
) {

  const iv =
    randomBytes(
      12
    );


  const cipher =
    createCipheriv(
      'aes-256-gcm',
      integrationEncryptionKey(),
      iv
    );


  const encrypted =
    Buffer.concat([
      cipher.update(
        value,
        'utf8'
      ),

      cipher.final(),
    ]);


  const authTag =
    cipher.getAuthTag();


  return [
    'v1',
    iv.toString(
      'base64url'
    ),
    authTag.toString(
      'base64url'
    ),
    encrypted.toString(
      'base64url'
    ),
  ].join(
    '.'
  );
}


export function decryptSocialSecret(
  value:
    string
) {

  const [
    version,
    ivValue,
    tagValue,
    encryptedValue,
  ] =
    String(
      value ||
      ''
    ).split(
      '.'
    );


  if (
    version !==
      'v1' ||
    !ivValue ||
    !tagValue ||
    !encryptedValue
  ) {

    throw new Error(
      'Credencial social criptografada inválida.'
    );
  }


  const decipher =
    createDecipheriv(
      'aes-256-gcm',
      integrationEncryptionKey(),
      Buffer.from(
        ivValue,
        'base64url'
      )
    );


  decipher.setAuthTag(
    Buffer.from(
      tagValue,
      'base64url'
    )
  );


  const decrypted =
    Buffer.concat([
      decipher.update(
        Buffer.from(
          encryptedValue,
          'base64url'
        )
      ),

      decipher.final(),
    ]);


  return decrypted.toString(
    'utf8'
  );
}


export function socialAppOrigin() {

  return String(
    process.env.APP_ORIGIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://aprovup.com.br'
  )
    .trim()
    .replace(
      /\/+$/,
      ''
    );
}


export function youtubeOauthConfig() {

  const clientId =
    String(
      process.env
        .YOUTUBE_CLIENT_ID ||
      ''
    ).trim();


  const clientSecret =
    String(
      process.env
        .YOUTUBE_CLIENT_SECRET ||
      ''
    ).trim();


  const origin =
    socialAppOrigin();


  return {
    clientId,
    clientSecret,
    origin,

    redirectUri:
      origin +
      '/api/integrations/youtube/callback',

    ready:
      Boolean(
        clientId &&
        clientSecret
      ),
  };
}


export function tiktokOauthConfig() {

  const clientKey =
    String(
      process.env
        .TIKTOK_CLIENT_KEY ||
      ''
    ).trim();


  const clientSecret =
    String(
      process.env
        .TIKTOK_CLIENT_SECRET ||
      ''
    ).trim();


  const origin =
    socialAppOrigin();


  return {
    clientKey,
    clientSecret,
    origin,

    redirectUri:
      origin +
      '/api/integrations/tiktok/callback',

    ready:
      Boolean(
        clientKey &&
        clientSecret
      ),
  };
}


export function createSocialOauthState() {

  return randomBytes(
    32
  ).toString(
    'base64url'
  );
}


export function createSocialOauthCookie(
  payload:
    SocialOauthCookiePayload
) {

  return encryptSocialSecret(
    JSON.stringify(
      payload
    )
  );
}


export function readSocialOauthCookie(
  value:
    string
) {

  const parsed =
    JSON.parse(
      decryptSocialSecret(
        value
      )
    ) as
      Partial<
        SocialOauthCookiePayload
      >;


  if (
    (
      parsed.platform !==
        'YOUTUBE' &&
      parsed.platform !==
        'TIKTOK'
    ) ||
    !parsed.clientId ||
    !parsed.userId ||
    !parsed.state ||
    !parsed.expiresAt
  ) {

    throw new Error(
      'Sessão OAuth social inválida.'
    );
  }


  return parsed as
    SocialOauthCookiePayload;
}


export const YOUTUBE_OAUTH_COOKIE =
  'aprovup_youtube_oauth';


export const TIKTOK_OAUTH_COOKIE =
  'aprovup_tiktok_oauth';
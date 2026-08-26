import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';


function getEncryptionKey() {
  const secret =
    process.env
      .META_TOKEN_ENCRYPTION_KEY;

  if (!secret) {
    throw new Error(
      'META_TOKEN_ENCRYPTION_KEY nao configurada.'
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


export function encryptMetaSecret(
  value: string
) {
  const iv =
    randomBytes(
      12
    );

  const cipher =
    createCipheriv(
      'aes-256-gcm',
      getEncryptionKey(),
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
  ].join('.');
}


export function decryptMetaSecret(
  value: string
) {
  const [
    version,
    ivValue,
    tagValue,
    encryptedValue,
  ] = value.split('.');

  if (
    version !== 'v1' ||
    !ivValue ||
    !tagValue ||
    !encryptedValue
  ) {
    throw new Error(
      'Credencial Meta criptografada invalida.'
    );
  }

  const decipher =
    createDecipheriv(
      'aes-256-gcm',
      getEncryptionKey(),
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

import 'server-only';
import { request as httpsRequest } from 'node:https';

/** Upload dedicado: evita ambiguidade de fetch/streaming em hospedagens Node. */
export class TikTokUploadFailure extends Error {
  constructor(public readonly diagnosticCode: string) {
    super('Nao foi possivel transferir o arquivo ao servidor de upload do TikTok.');
    this.name = 'TikTokUploadFailure';
  }
}

type UploadReceipt = { httpStatus: number };

/** Nunca expoe upload_url, upload_token, cabecalhos ou resposta de TikTok no erro. */
export async function sendTikTokUpload(url: URL, bytes: Buffer): Promise<UploadReceipt> {
  const size = bytes.byteLength;
  if (size < 100 || size > 50 * 1024 * 1024) throw new TikTokUploadFailure('FILE_SIZE_INVALID');
  if (url.protocol !== 'https:' || url.username || url.password ||
      !(url.hostname === 'open-upload.tiktokapis.com' || /^upload\.[a-z0-9-]+\.tiktokapis\.com$/.test(url.hostname))) {
    throw new TikTokUploadFailure('UPLOAD_DESTINATION_INVALID');
  }
  return await new Promise<UploadReceipt>((resolve, reject) => {
    let finished = false;
    const fail = (code: string) => {
      if (finished) return;
      finished = true;
      reject(new TikTokUploadFailure(code));
    };
    const complete = (result: UploadReceipt) => {
      if (finished) return;
      finished = true;
      resolve(result);
    };
    const req = httpsRequest(url, {
      method: 'PUT',
      timeout: 120000,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': String(size),
        'Content-Range': `bytes 0-${size - 1}/${size}`,
      },
    }, res => {
      // Qualquer status HTTP e retornado ao chamador. Nao seguir redirects.
      const httpStatus = res.statusCode || 0;
      res.on('error', () => fail('RESPONSE_STREAM_ERROR'));
      res.on('end', () => complete({ httpStatus }));
      res.resume();
    });
    req.on('timeout', () => req.destroy(new TikTokUploadFailure('UPLOAD_TIMEOUT')));
    req.on('error', (error: NodeJS.ErrnoException) => {
      if (error instanceof TikTokUploadFailure) { fail(error.diagnosticCode); return; }
      const known = new Set(['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND',
        'EAI_AGAIN', 'EHOSTUNREACH', 'ENETUNREACH', 'EPIPE', 'ERR_TLS_CERT_ALTNAME_INVALID']);
      const code = error.code && known.has(error.code) ? error.code : 'UPLOAD_NETWORK_ERROR';
      fail(code);
    });
    req.end(bytes);
  });
}

import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  getCurrentUser,
} from '@/lib/auth';

import {
  prisma,
} from '@/lib/prisma';

import {
  hasPermission,
} from '@/lib/userAccess';


export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';

export const maxDuration =
  120;


type ZipEntry = {
  name:
    string;

  bytes:
    Uint8Array;

  modifiedAt:
    Date;
};


function slugify(
  value:
    string
) {
  const clean =
    String(
      value ||
      ''
    )
      .normalize(
        'NFD'
      )
      .replace(
        /[\u0300-\u036f]/g,
        ''
      )
      .replace(
        /[^a-zA-Z0-9]+/g,
        '-'
      )
      .replace(
        /^-+|-+$/g,
        ''
      )
      .toLowerCase();

  return (
    clean ||
    'conteudo'
  )
    .slice(
      0,
      80
    );
}


function extensionFromMime(
  mimeType:
    string | null | undefined
) {
  const mime =
    String(
      mimeType ||
      ''
    )
      .split(
        ';'
      )[0]
      .trim()
      .toLowerCase();

  const map:
    Record<
      string,
      string
    > = {
      'image/jpeg':
        'jpg',

      'image/jpg':
        'jpg',

      'image/png':
        'png',

      'image/webp':
        'webp',

      'image/gif':
        'gif',

      'image/heic':
        'heic',

      'image/heif':
        'heif',

      'video/mp4':
        'mp4',

      'video/quicktime':
        'mov',

      'video/webm':
        'webm',

      'application/pdf':
        'pdf',
    };

  return (
    map[mime] ||
    ''
  );
}


function extensionFromUrl(
  value:
    string
) {
  try {
    const pathname =
      new URL(
        value
      ).pathname;

    const match =
      pathname.match(
        /\.([a-zA-Z0-9]{2,5})$/
      );

    return match?.[1]
      ?.toLowerCase() ||
      '';
  }
  catch {
    return '';
  }
}


function resolveExtension({
  mimeType,
  url,
}: {
  mimeType:
    string | null | undefined;

  url:
    string;
}) {
  return (
    extensionFromMime(
      mimeType
    ) ||
    extensionFromUrl(
      url
    ) ||
    'bin'
  );
}


const crcTable =
  (() => {
    const table =
      new Uint32Array(
        256
      );

    for (
      let index = 0;
      index <
      256;
      index++
    ) {
      let value =
        index;

      for (
        let bit = 0;
        bit <
        8;
        bit++
      ) {
        value =
          value &
          1
            ? 0xedb88320 ^
              (
                value >>>
                1
              )
            : value >>>
              1;
      }

      table[index] =
        value >>> 0;
    }

    return table;
  })();


function crc32(
  bytes:
    Uint8Array
) {
  let crc =
    0xffffffff;

  for (
    const byte
    of bytes
  ) {
    crc =
      crcTable[
        (
          crc ^
          byte
        ) &
        0xff
      ] ^
      (
        crc >>>
        8
      );
  }

  return (
    crc ^
    0xffffffff
  ) >>> 0;
}


function dosDateTime(
  value:
    Date
) {
  const year =
    Math.max(
      1980,
      value.getFullYear()
    );

  const dosTime =
    (
      value.getHours() <<
      11
    ) |
    (
      value.getMinutes() <<
      5
    ) |
    Math.floor(
      value.getSeconds() /
      2
    );

  const dosDate =
    (
      (
        year -
        1980
      ) <<
      9
    ) |
    (
      (
        value.getMonth() +
        1
      ) <<
      5
    ) |
    value.getDate();

  return {
    dosTime,
    dosDate,
  };
}


function concatBytes(
  chunks:
    Uint8Array[]
) {
  const total =
    chunks.reduce(
      (
        sum,
        chunk
      ) =>
        sum +
        chunk.byteLength,
      0
    );

  const result =
    new Uint8Array(
      total
    );

  let offset =
    0;

  for (
    const chunk
    of chunks
  ) {
    result.set(
      chunk,
      offset
    );

    offset +=
      chunk.byteLength;
  }

  return result;
}


function makeZip(
  entries:
    ZipEntry[]
) {
  const encoder =
    new TextEncoder();

  const localParts:
    Uint8Array[] =
    [];

  const centralParts:
    Uint8Array[] =
    [];

  let localOffset =
    0;

  for (
    const entry
    of entries
  ) {
    const nameBytes =
      encoder.encode(
        entry.name
      );

    const bytes =
      entry.bytes;

    const crc =
      crc32(
        bytes
      );

    const {
      dosTime,
      dosDate,
    } =
      dosDateTime(
        entry.modifiedAt
      );

    const localHeader =
      new Uint8Array(
        30
      );

    const localView =
      new DataView(
        localHeader.buffer
      );

    localView.setUint32(
      0,
      0x04034b50,
      true
    );

    localView.setUint16(
      4,
      20,
      true
    );

    localView.setUint16(
      6,
      0x0800,
      true
    );

    localView.setUint16(
      8,
      0,
      true
    );

    localView.setUint16(
      10,
      dosTime,
      true
    );

    localView.setUint16(
      12,
      dosDate,
      true
    );

    localView.setUint32(
      14,
      crc,
      true
    );

    localView.setUint32(
      18,
      bytes.byteLength,
      true
    );

    localView.setUint32(
      22,
      bytes.byteLength,
      true
    );

    localView.setUint16(
      26,
      nameBytes.byteLength,
      true
    );

    localView.setUint16(
      28,
      0,
      true
    );

    localParts.push(
      localHeader,
      nameBytes,
      bytes
    );

    const centralHeader =
      new Uint8Array(
        46
      );

    const centralView =
      new DataView(
        centralHeader.buffer
      );

    centralView.setUint32(
      0,
      0x02014b50,
      true
    );

    centralView.setUint16(
      4,
      20,
      true
    );

    centralView.setUint16(
      6,
      20,
      true
    );

    centralView.setUint16(
      8,
      0x0800,
      true
    );

    centralView.setUint16(
      10,
      0,
      true
    );

    centralView.setUint16(
      12,
      dosTime,
      true
    );

    centralView.setUint16(
      14,
      dosDate,
      true
    );

    centralView.setUint32(
      16,
      crc,
      true
    );

    centralView.setUint32(
      20,
      bytes.byteLength,
      true
    );

    centralView.setUint32(
      24,
      bytes.byteLength,
      true
    );

    centralView.setUint16(
      28,
      nameBytes.byteLength,
      true
    );

    centralView.setUint16(
      30,
      0,
      true
    );

    centralView.setUint16(
      32,
      0,
      true
    );

    centralView.setUint16(
      34,
      0,
      true
    );

    centralView.setUint16(
      36,
      0,
      true
    );

    centralView.setUint32(
      38,
      0,
      true
    );

    centralView.setUint32(
      42,
      localOffset,
      true
    );

    centralParts.push(
      centralHeader,
      nameBytes
    );

    localOffset +=
      localHeader.byteLength +
      nameBytes.byteLength +
      bytes.byteLength;
  }

  const centralDirectory =
    concatBytes(
      centralParts
    );

  const end =
    new Uint8Array(
      22
    );

  const endView =
    new DataView(
      end.buffer
    );

  endView.setUint32(
    0,
    0x06054b50,
    true
  );

  endView.setUint16(
    4,
    0,
    true
  );

  endView.setUint16(
    6,
    0,
    true
  );

  endView.setUint16(
    8,
    entries.length,
    true
  );

  endView.setUint16(
    10,
    entries.length,
    true
  );

  endView.setUint32(
    12,
    centralDirectory.byteLength,
    true
  );

  endView.setUint32(
    16,
    localOffset,
    true
  );

  endView.setUint16(
    20,
    0,
    true
  );

  return concatBytes([
    ...localParts,
    centralDirectory,
    end,
  ]);
}


async function fetchStoredMedia(
  url:
    string
) {
  const response =
    await fetch(
      url,
      {
        cache:
          'no-store',
      }
    );

  if (
    !response.ok
  ) {
    throw new Error(
      `Não foi possível baixar o arquivo armazenado (${response.status}).`
    );
  }

  return response;
}


function arrayBufferFromBytes(
  bytes:
    Uint8Array
) {
  const start =
    bytes.byteOffset;

  const end =
    bytes.byteOffset +
    bytes.byteLength;

  return bytes.buffer.slice(
    start,
    end
  ) as ArrayBuffer;
}


export async function GET(
  _request:
    NextRequest,
  context: {
    params:
      Promise<{
        id:
          string;
      }>;
  }
) {
  try {
    const user =
      await getCurrentUser();

    if (
      !user
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            'Sessão expirada.',
        },
        {
          status:
            401,
        }
      );
    }

    if (
      user.status !==
        'APROVADO' ||
      !user.agencyId ||
      !(
        hasPermission(
          user,
          'social.view'
        ) ||
        hasPermission(
          user,
          'social.manage'
        )
      )
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            'Você não tem permissão para baixar este conteúdo.',
        },
        {
          status:
            403,
        }
      );
    }

    const {
      id,
    } =
      await context.params;

    const content =
      await prisma.content.findFirst({
        where: {
          id,

          client: {
            agencyId:
              user.agencyId,
          },
        },

        include: {
          instagramMediaAssets: {
            orderBy: {
              position:
                'asc',
            },
          },
        },
      });

    if (
      !content
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            'Conteúdo não encontrado.',
        },
        {
          status:
            404,
        }
      );
    }

    const normalizedFormat =
      String(
        content.format ||
        ''
      )
        .trim()
        .toUpperCase();

    const isCarousel =
      normalizedFormat.includes(
        'CARROSSEL'
      ) ||
      normalizedFormat.includes(
        'CAROUSEL'
      ) ||
      normalizedFormat.includes(
        'ALBUM'
      );

    const baseName =
      slugify(
        content.title ||
        'conteudo'
      );

    if (
      isCarousel
    ) {
      const assets =
        content
          .instagramMediaAssets;

      if (
        assets.length <
        2
      ) {
        return NextResponse.json(
          {
            ok:
              false,

            message:
              'Este carrossel ainda não possui páginas suficientes para download.',
          },
          {
            status:
              422,
          }
        );
      }

      const entries:
        ZipEntry[] =
        [];

      let totalBytes =
        0;

      for (
        let index = 0;
        index <
        assets.length;
        index++
      ) {
        const asset =
          assets[index];

        const response =
          await fetchStoredMedia(
            asset.url
          );

        const bytes =
          new Uint8Array(
            await response
              .arrayBuffer()
          );

        totalBytes +=
          bytes.byteLength;

        if (
          totalBytes >
          120 *
          1024 *
          1024
        ) {
          return NextResponse.json(
            {
              ok:
                false,

              message:
                'O carrossel é muito grande para gerar um ZIP pelo navegador.',
            },
            {
              status:
                413,
            }
          );
        }

        const extension =
          resolveExtension({
            mimeType:
              asset.mimeType ||
              response.headers
                .get(
                  'content-type'
                ),

            url:
              asset.url,
          });

        const pageNumber =
          String(
            index +
            1
          ).padStart(
            2,
            '0'
          );

        entries.push({
          name:
            `${pageNumber}-${baseName}.${extension}`,

          bytes,

          modifiedAt:
            content.updatedAt,
        });
      }

      const zip =
        makeZip(
          entries
        );

      return new Response(
        arrayBufferFromBytes(
          zip
        ),
        {
          status:
            200,

          headers: {
            'Content-Type':
              'application/zip',

            'Content-Disposition':
              `attachment; filename="${baseName}-carrossel.zip"`,

            'Content-Length':
              String(
                zip.byteLength
              ),

            'Cache-Control':
              'private, no-store',
          },
        }
      );
    }

    const mediaUrl =
      content.finalMediaUrl ||
      content.finalCoverUrl ||
      '';

    if (
      !mediaUrl
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            content.finalExternalUrl
              ? 'Este conteúdo foi entregue por link externo. Abra o link para baixar o arquivo original.'
              : 'Este conteúdo ainda não possui arquivo final para download.',
        },
        {
          status:
            422,
        }
      );
    }

    const remote =
      await fetchStoredMedia(
        mediaUrl
      );

    const contentType =
      content.finalMediaType ||
      remote.headers.get(
        'content-type'
      ) ||
      'application/octet-stream';

    const extension =
      resolveExtension({
        mimeType:
          contentType,

        url:
          mediaUrl,
      });

    const headers =
      new Headers();

    headers.set(
      'Content-Type',
      contentType
    );

    headers.set(
      'Content-Disposition',
      `attachment; filename="${baseName}.${extension}"`
    );

    headers.set(
      'Cache-Control',
      'private, no-store'
    );

    const length =
      remote.headers.get(
        'content-length'
      );

    if (
      length
    ) {
      headers.set(
        'Content-Length',
        length
      );
    }

    return new Response(
      remote.body,
      {
        status:
          200,

        headers,
      }
    );
  }
  catch (
    error
  ) {
    console.error(
      'APROVUP CONTENT DOWNLOAD ERROR',
      error
    );

    return NextResponse.json(
      {
        ok:
          false,

        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível baixar o conteúdo.',
      },
      {
        status:
          500,
      }
    );
  }
}

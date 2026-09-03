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
  decryptMetaSecret,
} from '@/lib/metaCrypto';

import {
  publishInstagramCarousel,
  publishInstagramImage,
  publishInstagramReel,
} from '@/lib/metaInstagram';

import {
  hasPermission,
} from '@/lib/userAccess';


export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';


function normalizedFormat(
  value:
    string | null
) {

  return String(
    value ||
    ''
  )
    .trim()
    .toUpperCase();
}


function isCarouselFormat(
  value:
    string | null
) {

  const format =
    normalizedFormat(
      value
    );


  return (
    format.includes(
      'CARROSSEL'
    ) ||
    format.includes(
      'CAROUSEL'
    ) ||
    format.includes(
      'ALBUM'
    )
  );
}


function isReelFormat(
  value:
    string | null
) {

  const format =
    normalizedFormat(
      value
    );


  return (
    format.includes(
      'REEL'
    ) ||
    format ===
      'VIDEO' ||
    format ===
      'VÍDEO'
  );
}


function isStoryFormat(
  value:
    string | null
) {

  return normalizedFormat(
    value
  ).includes(
    'STORY'
  );
}


export async function POST(
  _request:
    NextRequest,

  context: {
    params:
      Promise<{
        contentId:
          string;
      }>;
  }
) {

  const currentUser =
    await getCurrentUser();


  if (
    !currentUser
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
    currentUser.status !==
      'APROVADO' ||
    !currentUser.agencyId ||
    !hasPermission(
      currentUser,
      'social.manage'
    )
  ) {
    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Você não tem permissão para publicar.',
      },
      {
        status:
          403,
      }
    );
  }


  const {
    contentId,
  } =
    await context.params;


  const content =
    await prisma.content.findFirst({

      where: {
        id:
          contentId,

        client: {
          agencyId:
            currentUser.agencyId,
        },
      },

      include: {

        client: {

          include: {
            instagramConnection:
              true,
          },

        },

        instagramPublication:
          true,

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


  if (
    content.status !==
    'PRONTO_PARA_POSTAR'
  ) {
    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Este conteúdo não está pronto para postar.',
      },
      {
        status:
          409,
      }
    );
  }


  const connection =
    content.client
      .instagramConnection;


  if (
    !connection
  ) {
    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Este cliente ainda não possui Instagram conectado.',
      },
      {
        status:
          400,
      }
    );
  }


  const carousel =
    isCarouselFormat(
      content.format
    );


  const reel =
    isReelFormat(
      content.format
    );


  const story =
    isStoryFormat(
      content.format
    );


  if (
    story
  ) {
    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Story ainda não está disponível nesta versão.',
      },
      {
        status:
          400,
      }
    );
  }


  if (
    carousel &&
    content
      .instagramMediaAssets
      .length <
      2
  ) {
    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Envie pelo menos 2 imagens para o carrossel.',
      },
      {
        status:
          400,
      }
    );
  }


  if (
    !carousel &&
    !content.finalMediaUrl
  ) {
    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Material final não encontrado.',
      },
      {
        status:
          400,
      }
    );
  }


  if (
    reel &&
    !String(
      content.finalMediaType ||
      ''
    ).startsWith(
      'video/'
    )
  ) {
    return NextResponse.json(
      {
        ok:
          false,

        message:
          'O Reel precisa possuir um arquivo final de vídeo.',
      },
      {
        status:
          400,
      }
    );
  }


  if (
    !carousel &&
    !reel &&
    !String(
      content.finalMediaType ||
      ''
    ).startsWith(
      'image/'
    )
  ) {
    return NextResponse.json(
      {
        ok:
          false,

        message:
          'O formato deste material ainda não é suportado.',
      },
      {
        status:
          400,
      }
    );
  }


  if (
    content
      .instagramPublication
      ?.status ===
    'PUBLICADO'
  ) {
    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Este conteúdo já foi publicado no Instagram.',
      },
      {
        status:
          409,
      }
    );
  }


  if (
    content
      .instagramPublication
      ?.status ===
      'PUBLICANDO' &&
    content
      .instagramPublication
      .lastAttemptAt &&
    Date.now() -
      new Date(
        content
          .instagramPublication
          .lastAttemptAt
      ).getTime() <
      5 * 60 * 1000
  ) {
    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Uma publicação deste conteúdo já está em andamento.',
      },
      {
        status:
          409,
      }
    );
  }


  const caption =
    content.caption
      ?.trim() ||
    null;


  const snapshotMediaUrl =
    carousel
      ? content
          .instagramMediaAssets[0]
          ?.url ||
        null
      : content.finalMediaUrl;


  const snapshotMediaType =
    carousel
      ? 'carousel/image'
      : content.finalMediaType;


  await prisma
    .instagramPublication
    .upsert({

      where: {
        contentId:
          content.id,
      },

      create: {

        contentId:
          content.id,

        instagramUserId:
          connection
            .instagramUserId,

        instagramUsername:
          connection.username,

        caption,

        mediaUrl:
          snapshotMediaUrl,

        coverUrl:
          content.finalCoverUrl,

        mediaType:
          snapshotMediaType,

        status:
          'PUBLICANDO',

        attemptCount:
          1,

        lastAttemptAt:
          new Date(),

        lastError:
          null,

      },

      update: {

        instagramUserId:
          connection
            .instagramUserId,

        instagramUsername:
          connection.username,

        caption,

        mediaUrl:
          snapshotMediaUrl,

        coverUrl:
          content.finalCoverUrl,

        mediaType:
          snapshotMediaType,

        status:
          'PUBLICANDO',

        attemptCount: {
          increment:
            1,
        },

        lastAttemptAt:
          new Date(),

        lastError:
          null,

      },

    });


  try {

    const accessToken =
      decryptMetaSecret(
        connection
          .pageAccessTokenEncrypted
      );


    const result =
      carousel
        ? await publishInstagramCarousel({

            instagramUserId:
              connection
                .instagramUserId,

            accessToken,

            imageUrls:
              content
                .instagramMediaAssets
                .map(
                  (
                    asset
                  ) =>
                    asset.url
                ),

            caption,

          })
        : reel
          ? await publishInstagramReel({

              instagramUserId:
                connection
                  .instagramUserId,

              accessToken,

              videoUrl:
                content
                  .finalMediaUrl!,

              caption,

            })
          : await publishInstagramImage({

              instagramUserId:
                connection
                  .instagramUserId,

              accessToken,

              imageUrl:
                content
                  .finalMediaUrl!,

              caption,

            });


    await prisma.$transaction([

      prisma
        .instagramPublication
        .update({

          where: {
            contentId:
              content.id,
          },

          data: {

            status:
              'PUBLICADO',

            metaContainerId:
              result.containerId,

            metaMediaId:
              result.mediaId,

            permalink:
              result.permalink,

            publishedAt:
              new Date(),

            lastError:
              null,

          },

        }),


      prisma.content.update({

        where: {
          id:
            content.id,
        },

        data: {
          status:
            'PUBLICADO',
        },

      }),


      prisma.historyLog.create({

        data: {

          entityType:
            'CONTENT',

          entityId:
            content.id,

          action:
            'INSTAGRAM_PUBLISHED',

          description:
            `Conteúdo "${content.title}" publicado automaticamente no Instagram${
              connection.username
                ? ` @${connection.username}`
                : ''
            }. Formato: ${
              carousel
                ? 'Carrossel'
                : reel
                  ? 'Reel'
                  : 'Imagem'
            }.`,

          authorName:
            currentUser.name ||
            currentUser.email ||
            'Equipe Level UP',

        },

      }),

    ]);


    return NextResponse.json({

      ok:
        true,

      message:
        'Publicado no Instagram com sucesso.',

      mediaId:
        result.mediaId,

      permalink:
        result.permalink,

    });

  }
  catch (
    error
  ) {

    const message =
      error instanceof Error
        ? error.message
        : 'Falha desconhecida ao publicar no Instagram.';


    await prisma
      .instagramPublication
      .update({

        where: {
          contentId:
            content.id,
        },

        data: {

          status:
            'ERRO',

          lastError:
            message.slice(
              0,
              2000
            ),

        },

      })
      .catch(
        () =>
          null
      );


    console.error(
      'INSTAGRAM PUBLISH ERROR',
      content.id,
      error
    );


    return NextResponse.json(
      {
        ok:
          false,

        message,
      },
      {
        status:
          500,
      }
    );

  }
}

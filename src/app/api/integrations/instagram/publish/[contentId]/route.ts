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
  publishInstagramImage,
} from '@/lib/metaInstagram';

import {
  hasPermission,
} from '@/lib/userAccess';


export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';


function isCarouselFormat(
  format:
    string | null
) {

  const normalized =
    String(
      format ||
      ''
    )
      .trim()
      .toUpperCase();


  return (
    normalized.includes(
      'CARROSSEL'
    ) ||
    normalized.includes(
      'CAROUSEL'
    ) ||
    normalized.includes(
      'ALBUM'
    )
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
    await prisma.content.findUnique({

      where: {
        id:
          contentId,
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


  if (
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
          'Nesta primeira etapa somente imagem única pode ser publicada.',
      },
      {
        status:
          400,
      }
    );

  }


  if (
    isCarouselFormat(
      content.format
    )
  ) {

    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Carrossel será liberado na próxima etapa.',
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
          content.finalMediaUrl,

        coverUrl:
          content.finalCoverUrl,

        mediaType:
          content.finalMediaType,

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
          content.finalMediaUrl,

        coverUrl:
          content.finalCoverUrl,

        mediaType:
          content.finalMediaType,

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
      await publishInstagramImage({

        instagramUserId:
          connection
            .instagramUserId,

        accessToken,

        imageUrl:
          content.finalMediaUrl,

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
        () => null
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

import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  getCurrentUser,
} from '@/lib/auth';

import {
  canUseMetaIntegration,
} from '@/lib/metaAccess';

import {
  decryptMetaSecret,
} from '@/lib/metaCrypto';

import {
  publishInstagramStory,
} from '@/lib/metaInstagram';

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


function isStoryOnly(format: string | null) {
  return String(format || '')
    .trim()
    .toUpperCase()
    .includes('STORY');
}


function resolveMedia(content: {
  format: string | null;
  finalMediaUrl: string | null;
  finalMediaType: string | null;
  finalCoverUrl: string | null;
  storyMediaUrl: string | null;
  storyMediaType: string | null;
  storyCoverUrl: string | null;
  instagramStoryPublication: {
    mediaUrl: string | null;
    mediaType: string | null;
    coverUrl: string | null;
  } | null;
}) {
  const saved =
    content.instagramStoryPublication;

  const dedicated =
    content.storyMediaUrl?.trim() || '';

  const savedUrl =
    saved?.mediaUrl?.trim() || '';

  const fallback =
    isStoryOnly(content.format)
      ? content.finalMediaUrl?.trim() || ''
      : '';

  const mediaUrl =
    dedicated ||
    savedUrl ||
    fallback;

  const mediaType =
    dedicated
      ? content.storyMediaType || ''
      : savedUrl
        ? saved?.mediaType || ''
        : content.finalMediaType || '';

  const coverUrl =
    dedicated
      ? content.storyCoverUrl || dedicated
      : savedUrl
        ? saved?.coverUrl || savedUrl
        : content.finalCoverUrl || fallback;

  return {
    mediaUrl,
    mediaType,
    coverUrl,
  };
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
  const user =
    await getCurrentUser();

  if (
    !user ||
    user.status !== 'APROVADO' ||
    !user.agencyId ||
    !hasPermission(user, 'social.manage')
  ) {
    return NextResponse.json(
      {
        ok: false,
        message:
          'Voce nao tem permissao para publicar Stories.',
      },
      {
        status: 403,
      }
    );
  }

  if (!canUseMetaIntegration(user)) {
    return NextResponse.json(
      {
        ok: false,
        message:
          'A integracao com a Meta ainda esta em liberacao controlada.',
      },
      {
        status: 403,
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
            user.agencyId,
        },

        status: {
          in: [
            'PRONTO_PARA_POSTAR',
            'PUBLICADO',
            'PUBLICADO_MANUALMENTE',
          ],
        },
      },

      include: {
        client: {
          include: {
            instagramConnection:
              true,
          },
        },

        instagramStoryPublication:
          true,
      },
    });

  if (!content) {
    return NextResponse.json(
      {
        ok: false,
        message:
          'Conteudo nao encontrado ou ainda nao esta liberado.',
      },
      {
        status: 404,
      }
    );
  }

  const connection =
    content.client.instagramConnection;

  if (!connection) {
    return NextResponse.json(
      {
        ok: false,
        message:
          'Instagram do cliente nao conectado.',
      },
      {
        status: 400,
      }
    );
  }

  if (
    content.instagramStoryPublication?.status ===
    'PUBLICADO'
  ) {
    return NextResponse.json(
      {
        ok: false,
        message:
          'Este Story ja foi publicado.',
      },
      {
        status: 409,
      }
    );
  }

  const source =
    resolveMedia(content);

  if (
    !source.mediaUrl ||
    !(
      source.mediaType.startsWith('image/') ||
      source.mediaType.startsWith('video/')
    )
  ) {
    return NextResponse.json(
      {
        ok: false,
        message:
          'O Story precisa possuir imagem ou video final.',
      },
      {
        status: 400,
      }
    );
  }

  await prisma.instagramStoryPublication.upsert({
    where: {
      contentId:
        content.id,
    },

    create: {
      contentId:
        content.id,

      instagramUserId:
        connection.instagramUserId,

      instagramUsername:
        connection.username,

      mediaUrl:
        source.mediaUrl,

      coverUrl:
        source.coverUrl || null,

      mediaType:
        source.mediaType,

      status:
        'PUBLICANDO',

      attemptCount:
        1,

      lastAttemptAt:
        new Date(),
    },

    update: {
      instagramUserId:
        connection.instagramUserId,

      instagramUsername:
        connection.username,

      mediaUrl:
        source.mediaUrl,

      coverUrl:
        source.coverUrl || null,

      mediaType:
        source.mediaType,

      status:
        'PUBLICANDO',

      scheduledFor:
        null,

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
    const token =
      decryptMetaSecret(
        connection.pageAccessTokenEncrypted
      );

    const result =
      await publishInstagramStory({
        instagramUserId:
          connection.instagramUserId,

        accessToken:
          token,

        mediaUrl:
          source.mediaUrl,

        mediaMimeType:
          source.mediaType,
      });

    await prisma.$transaction(
      async (tx) => {
        await tx.instagramStoryPublication.update({
          where: {
            contentId:
              content.id,
          },

          data: {
            status:
              'PUBLICADO',

            publishedAt:
              new Date(),

            metaContainerId:
              result.containerId,

            metaMediaId:
              result.mediaId,

            permalink:
              result.permalink,

            lastError:
              null,
          },
        });

        if (
          isStoryOnly(content.format) &&
          content.status ===
            'PRONTO_PARA_POSTAR'
        ) {
          await tx.content.update({
            where: {
              id:
                content.id,
            },

            data: {
              status:
                'PUBLICADO',
            },
          });
        }

        await tx.historyLog.create({
          data: {
            entityType:
              'CONTENT',

            entityId:
              content.id,

            action:
              'INSTAGRAM_STORY_PUBLISHED',

            description:
              `Story do conteudo "${content.title}" publicado automaticamente.`,

            authorName:
              user.name ||
              user.email ||
              'Equipe Level UP',
          },
        });
      }
    );

    return NextResponse.json({
      ok: true,
      message:
        'Story publicado com sucesso.',
      mediaId:
        result.mediaId,
      permalink:
        result.permalink,
    });
  }
  catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Falha desconhecida ao publicar Story.';

    await prisma.instagramStoryPublication.update({
      where: {
        contentId:
          content.id,
      },

      data: {
        status:
          'ERRO',

        lastError:
          message.slice(0, 2000),
      },
    }).catch(() => null);

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      {
        status: 500,
      }
    );
  }
}

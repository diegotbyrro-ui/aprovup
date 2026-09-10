import {
  prisma,
} from '@/lib/prisma';

import {
  decryptMetaSecret,
} from '@/lib/metaCrypto';

import {
  publishInstagramStory,
} from '@/lib/metaInstagram';


function isStoryOnly(format: string | null) {
  return String(format || '')
    .toUpperCase()
    .includes('STORY');
}


export async function processScheduledInstagramStories(
  limit =
    10
) {
  const now =
    new Date();

  const due =
    await prisma.instagramStoryPublication.findMany({
      where: {
        status:
          'AGENDADO',

        scheduledFor: {
          lte:
            now,
        },
      },

      include: {
        content: {
          include: {
            client: {
              include: {
                instagramConnection:
                  true,
              },
            },
          },
        },
      },

      orderBy: {
        scheduledFor:
          'asc',
      },

      take:
        limit,
    });

  const results: Array<{
    contentId: string;
    ok: boolean;
    message: string;
  }> = [];

  for (
    const publication
    of due
  ) {
    const claimed =
      await prisma.instagramStoryPublication.updateMany({
        where: {
          id:
            publication.id,

          status:
            'AGENDADO',
        },

        data: {
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

    if (
      claimed.count !== 1
    ) {
      continue;
    }

    const content =
      publication.content;

    try {
      const connection =
        content.client.instagramConnection;

      if (!connection) {
        throw new Error(
          'Instagram do cliente nao conectado.'
        );
      }

      if (
        ![
          'PRONTO_PARA_POSTAR',
          'PUBLICADO',
          'PUBLICADO_MANUALMENTE',
        ].includes(content.status)
      ) {
        throw new Error(
          `Conteudo nao liberado para Story. Status: ${content.status}.`
        );
      }

      const mediaUrl =
        publication.mediaUrl ||
        content.storyMediaUrl ||
        (
          isStoryOnly(content.format)
            ? content.finalMediaUrl
            : null
        );

      const mediaType =
        publication.mediaType ||
        content.storyMediaType ||
        (
          isStoryOnly(content.format)
            ? content.finalMediaType
            : null
        ) ||
        '';

      if (
        !mediaUrl ||
        !(
          mediaType.startsWith('image/') ||
          mediaType.startsWith('video/')
        )
      ) {
        throw new Error(
          'Material do Story nao encontrado.'
        );
      }

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

          mediaUrl,

          mediaMimeType:
            mediaType,
        });

      await prisma.$transaction(
        async (tx) => {
          await tx.instagramStoryPublication.update({
            where: {
              id:
                publication.id,
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
                'INSTAGRAM_STORY_SCHEDULED_PUBLISHED',

              description:
                `Story do conteudo "${content.title}" publicado automaticamente no horario agendado.`,

              authorName:
                'AprovUp Automacao',
            },
          });
        }
      );

      results.push({
        contentId:
          content.id,

        ok:
          true,

        message:
          'Story publicado.',
      });
    }
    catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Falha desconhecida.';

      await prisma.instagramStoryPublication.update({
        where: {
          id:
            publication.id,
        },

        data: {
          status:
            'ERRO',

          lastError:
            message.slice(0, 2000),
        },
      });

      await prisma.historyLog.create({
        data: {
          entityType:
            'CONTENT',

          entityId:
            content.id,

          action:
            'INSTAGRAM_STORY_SCHEDULED_ERROR',

          description:
            `Falha na publicacao automatica do Story: ${message.slice(0, 500)}`,

          authorName:
            'AprovUp Automacao',
        },
      }).catch(() => null);

      results.push({
        contentId:
          content.id,

        ok:
          false,

        message,
      });
    }
  }

  return {
    due:
      due.length,

    processed:
      results.length,

    success:
      results.filter(
        (item) => item.ok
      ).length,

    failed:
      results.filter(
        (item) => !item.ok
      ).length,

    results,
  };
}

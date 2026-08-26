import {
  NextRequest,
  NextResponse,
} from 'next/server';

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


export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';

export const maxDuration =
  300;


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


function authorized(
  request:
    NextRequest
) {

  const secret =
    process.env
      .INSTAGRAM_CRON_SECRET;


  if (
    !secret
  ) {

    console.error(
      'INSTAGRAM_CRON_SECRET não configurado.'
    );

    return false;

  }


  const authorization =
    request.headers
      .get(
        'authorization'
      );


  return (
    authorization ===
    `Bearer ${secret}`
  );

}


export async function GET(
  request:
    NextRequest
) {

  if (
    !authorized(
      request
    )
  ) {

    return NextResponse.json(
      {
        ok:
          false,

        message:
          'Não autorizado.',
      },
      {
        status:
          401,
      }
    );

  }


  const now =
    new Date();


  const duePublications =
    await prisma
      .instagramPublication
      .findMany({

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

              instagramMediaAssets: {

                orderBy: {
                  position:
                    'asc',
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
          10,

      });


  const results:
    Array<{
      contentId:
        string;

      ok:
        boolean;

      message:
        string;
    }> =
    [];


  for (
    const publication
    of duePublications
  ) {

    const content =
      publication.content;


    /*
      Lock simples para impedir dois cron jobs
      de publicarem o mesmo conteúdo.
    */

    const claimed =
      await prisma
        .instagramPublication
        .updateMany({

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
      claimed.count !==
      1
    ) {

      continue;

    }


    try {

      const connection =
        content.client
          .instagramConnection;


      if (
        !connection
      ) {

        throw new Error(
          'Instagram do cliente não está conectado.'
        );

      }


      if (
        content.status !==
        'PRONTO_PARA_POSTAR'
      ) {

        throw new Error(
          `Conteúdo não está pronto para postar. Status atual: ${content.status}.`
        );

      }


      const accessToken =
        decryptMetaSecret(
          connection
            .pageAccessTokenEncrypted
        );


      const caption =
        content.caption
          ?.trim() ||
        null;


      const carousel =
        isCarouselFormat(
          content.format
        );


      const reel =
        isReelFormat(
          content.format
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
              'INSTAGRAM_SCHEDULED_PUBLISHED',

            description:
              `Conteúdo "${content.title}" publicado automaticamente no horário agendado${
                connection.username
                  ? ` no Instagram @${connection.username}`
                  : ''
              }.`,

            authorName:
              'AprovUp Automação',

          },

        }),

      ]);


      results.push({

        contentId:
          content.id,

        ok:
          true,

        message:
          'Publicado.',

      });

    }
    catch (
      error
    ) {

      const message =
        error instanceof Error
          ? error.message
          : 'Falha desconhecida.';


      await prisma
        .instagramPublication
        .update({

          where: {
            id:
              publication.id,
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

        });


      await prisma.historyLog
        .create({

          data: {

            entityType:
              'CONTENT',

            entityId:
              content.id,

            action:
              'INSTAGRAM_SCHEDULED_ERROR',

            description:
              `Falha na publicação automática agendada: ${message.slice(
                0,
                500
              )}`,

            authorName:
              'AprovUp Automação',

          },

        })
        .catch(
          () =>
            null
        );


      results.push({

        contentId:
          content.id,

        ok:
          false,

        message,

      });


      console.error(
        'INSTAGRAM SCHEDULE PUBLISH ERROR',
        content.id,
        error
      );

    }

  }


  return NextResponse.json({

    ok:
      true,

    checkedAt:
      now.toISOString(),

    due:
      duePublications.length,

    processed:
      results.length,

    success:
      results.filter(
        (
          result
        ) =>
          result.ok
      ).length,

    failed:
      results.filter(
        (
          result
        ) =>
          !result.ok
      ).length,

    results,

  });

}

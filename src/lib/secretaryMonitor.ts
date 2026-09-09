import {
  prisma,
} from '@/lib/prisma';


export async function syncSecretaryPublicationAlerts() {
  const now =
    new Date();

  const overdueLimit =
    new Date(
      now.getTime() -
      15 *
        60 *
        1000
    );


  const problems =
    await prisma
      .instagramPublication
      .findMany({
        where: {
          OR: [
            {
              status:
                'ERRO',
            },

            {
              status:
                'AGENDADO',

              scheduledFor: {
                lte:
                  overdueLimit,
              },
            },
          ],
        },

        include: {
          content: {
            include: {
              client: {
                select: {
                  id:
                    true,

                  name:
                    true,

                  agencyId:
                    true,
                },
              },
            },
          },
        },

        orderBy: {
          updatedAt:
            'desc',
        },

        take:
          200,
      });


  for (
    const publication
    of problems
  ) {
    const agencyId =
      publication
        .content
        .client
        .agencyId;


    if (!agencyId) {
      continue;
    }


    const isError =
      publication.status ===
      'ERRO';


    const dedupKey =
      [
        isError
          ? 'instagram-error'
          : 'instagram-overdue',

        publication.id,

        isError
          ? String(
              publication
                .attemptCount
            )
          : publication
              .scheduledFor
              ?.toISOString() ||
            'sem-data',
      ].join(':');


    const title =
      isError
        ? 'Falha em publicaÃ§Ã£o do Instagram'
        : 'PublicaÃ§Ã£o ainda nÃ£o confirmada';


    const message =
      isError
        ? (
            publication
              .content
              .client
              .name +
            ': "' +
            publication
              .content
              .title +
            '" apresentou erro.' +
            (
              publication
                .lastError
                ? ' Motivo: ' +
                  publication
                    .lastError
                : ''
            )
          )
        : (
            publication
              .content
              .client
              .name +
            ': "' +
            publication
              .content
              .title +
            '" jÃ¡ passou do horÃ¡rio programado e ainda permanece como AGENDADO.'
          );


    await prisma
      .secretaryAlert
      .upsert({
        where: {
          agencyId_dedupKey: {
            agencyId,
            dedupKey,
          },
        },

        create: {
          agencyId,
          dedupKey,

          type:
            isError
              ? 'INSTAGRAM_PUBLICATION_ERROR'
              : 'INSTAGRAM_PUBLICATION_OVERDUE',

          severity:
            'HIGH',

          status:
            'OPEN',

          title,
          message,

          clientId:
            publication
              .content
              .client
              .id,

          contentId:
            publication
              .content
              .id,

          publicationId:
            publication.id,

          metadata: {
            publicationStatus:
              publication.status,

            scheduledFor:
              publication
                .scheduledFor
                ?.toISOString() ||
              null,

            publishedAt:
              publication
                .publishedAt
                ?.toISOString() ||
              null,

            attemptCount:
              publication
                .attemptCount,

            lastError:
              publication
                .lastError ||
              null,
          },
        },

        update: {
          status:
            'OPEN',

          title,
          message,

          metadata: {
            publicationStatus:
              publication.status,

            scheduledFor:
              publication
                .scheduledFor
                ?.toISOString() ||
              null,

            publishedAt:
              publication
                .publishedAt
                ?.toISOString() ||
              null,

            attemptCount:
              publication
                .attemptCount,

            lastError:
              publication
                .lastError ||
              null,
          },
        },
      });
  }


  const openAlerts =
    await prisma
      .secretaryAlert
      .findMany({
        where: {
          status:
            'OPEN',

          publicationId: {
            not:
              null,
          },
        },

        select: {
          id:
            true,

          publicationId:
            true,
        },

        take:
          500,
      });


  const publicationIds =
    Array.from(
      new Set(
        openAlerts
          .map(
            (
              alert
            ) =>
              alert.publicationId
          )
          .filter(
            (
              value
            ): value is string =>
              Boolean(
                value
              )
          )
      )
    );


  if (
    publicationIds.length ===
    0
  ) {
    return {
      checkedAt:
        now.toISOString(),

      problems:
        problems.length,
    };
  }


  const current =
    await prisma
      .instagramPublication
      .findMany({
        where: {
          id: {
            in:
              publicationIds,
          },
        },

        select: {
          id:
            true,

          status:
            true,

          scheduledFor:
            true,
        },
      });


  const currentMap =
    new Map(
      current.map(
        (
          publication
        ) => [
          publication.id,
          publication,
        ] as const
      )
    );


  for (
    const alert
    of openAlerts
  ) {
    if (!alert.publicationId) {
      continue;
    }


    const publication =
      currentMap.get(
        alert.publicationId
      );


    if (!publication) {
      continue;
    }


    const stillProblem =
      publication.status ===
        'ERRO' ||
      (
        publication.status ===
          'AGENDADO' &&
        Boolean(
          publication
            .scheduledFor &&
          publication
            .scheduledFor <=
            overdueLimit
        )
      );


    if (!stillProblem) {
      await prisma
        .secretaryAlert
        .update({
          where: {
            id:
              alert.id,
          },

          data: {
            status:
              'RESOLVED',
          },
        });
    }
  }


  return {
    checkedAt:
      now.toISOString(),

    problems:
      problems.length,
  };
}
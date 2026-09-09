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
        ? 'Falha em publicação do Instagram'
        : 'Publicação ainda não confirmada';


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
            '" já passou do horário programado e ainda permanece como AGENDADO.'
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
    publicationIds.length >
    0
  ) {
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
  }


  return {
    checkedAt:
      now.toISOString(),

    problems:
      problems.length,
  };
}


export async function syncSecretaryApprovalAlerts() {
  const now =
    new Date();

  const waitingLimit =
    new Date(
      now.getTime() -
      48 *
        60 *
        60 *
        1000
    );


  const [
    contentApprovals,
    monthlyApprovals,
  ] =
    await Promise.all([
      prisma.approval
        .findMany({
          where: {
            status:
              'PENDENTE',

            createdAt: {
              lte:
                waitingLimit,
            },

            content: {
              client: {
                agencyId: {
                  not:
                    null,
                },
              },
            },
          },

          include: {
            content: {
              include: {
                client:
                  true,
              },
            },
          },

          take:
            300,
        }),

      prisma.monthlyApproval
        .findMany({
          where: {
            status:
              'PENDENTE',

            createdAt: {
              lte:
                waitingLimit,
            },

            client: {
              agencyId: {
                not:
                  null,
              },
            },
          },

          include: {
            client:
              true,
          },

          take:
            200,
        }),
    ]);


  for (
    const approval
    of contentApprovals
  ) {
    const agencyId =
      approval
        .content
        .client
        .agencyId;


    if (!agencyId) {
      continue;
    }


    await prisma
      .secretaryAlert
      .upsert({
        where: {
          agencyId_dedupKey: {
            agencyId,

            dedupKey:
              'approval-waiting:' +
              approval.id,
          },
        },

        create: {
          agencyId,

          dedupKey:
            'approval-waiting:' +
            approval.id,

          type:
            'APPROVAL_WAITING',

          severity:
            'MEDIUM',

          status:
            'OPEN',

          title:
            'Aprovação aguardando há mais de 48h',

          message:
            approval
              .content
              .client
              .name +
            ': "' +
            approval
              .content
              .title +
            '" ainda aguarda aprovação.',

          clientId:
            approval
              .content
              .client
              .id,

          contentId:
            approval
              .content
              .id,

          metadata: {
            sourceType:
              'APPROVAL',

            sourceId:
              approval.id,
          },
        },

        update: {
          status:
            'OPEN',
        },
      });
  }


  for (
    const approval
    of monthlyApprovals
  ) {
    const agencyId =
      approval
        .client
        .agencyId;


    if (!agencyId) {
      continue;
    }


    await prisma
      .secretaryAlert
      .upsert({
        where: {
          agencyId_dedupKey: {
            agencyId,

            dedupKey:
              'monthly-approval-waiting:' +
              approval.id,
          },
        },

        create: {
          agencyId,

          dedupKey:
            'monthly-approval-waiting:' +
            approval.id,

          type:
            'MONTHLY_APPROVAL_WAITING',

          severity:
            'MEDIUM',

          status:
            'OPEN',

          title:
            'Aprovação mensal aguardando há mais de 48h',

          message:
            approval
              .client
              .name +
            ': calendário de ' +
            String(
              approval.month
            ) +
            '/' +
            String(
              approval.year
            ) +
            ' ainda aguarda aprovação.',

          clientId:
            approval
              .client
              .id,

          metadata: {
            sourceType:
              'MONTHLY_APPROVAL',

            sourceId:
              approval.id,
          },
        },

        update: {
          status:
            'OPEN',
        },
      });
  }


  const open =
    await prisma
      .secretaryAlert
      .findMany({
        where: {
          status:
            'OPEN',

          type: {
            in: [
              'APPROVAL_WAITING',
              'MONTHLY_APPROVAL_WAITING',
            ],
          },
        },

        take:
          500,
      });


  for (
    const alert
    of open
  ) {
    const metadata =
      alert.metadata as
        unknown as
        Record<
          string,
          unknown
        > |
        null;


    const sourceId =
      typeof metadata
        ?.sourceId ===
        'string'
        ? metadata.sourceId
        : '';


    const sourceType =
      typeof metadata
        ?.sourceType ===
        'string'
        ? metadata.sourceType
        : '';


    if (!sourceId) {
      continue;
    }


    const stillPending =
      sourceType ===
        'APPROVAL'
        ? Boolean(
            await prisma.approval
              .findFirst({
                where: {
                  id:
                    sourceId,

                  status:
                    'PENDENTE',
                },

                select: {
                  id:
                    true,
                },
              })
          )
        : sourceType ===
            'MONTHLY_APPROVAL'
          ? Boolean(
              await prisma.monthlyApproval
                .findFirst({
                  where: {
                    id:
                      sourceId,

                    status:
                      'PENDENTE',
                  },

                  select: {
                    id:
                      true,
                  },
                })
            )
          : true;


    if (!stillPending) {
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
    contentApprovals:
      contentApprovals.length,

    monthlyApprovals:
      monthlyApprovals.length,
  };
}

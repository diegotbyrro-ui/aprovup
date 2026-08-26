import {
  prisma,
} from '@/lib/prisma';

import {
  decryptMetaSecret,
} from '@/lib/metaCrypto';

import {
  getInstagramDashboardMetrics,
  type InstagramDashboardMetrics,
} from '@/lib/metaInstagram';


function getDateKey(
  date:
    Date = new Date()
) {

  const formatter =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone:
          'America/Maceio',

        year:
          'numeric',

        month:
          '2-digit',

        day:
          '2-digit',
      }
    );


  const parts =
    formatter.formatToParts(
      date
    );


  const year =
    parts.find(
      (part) =>
        part.type ===
        'year'
    )?.value;


  const month =
    parts.find(
      (part) =>
        part.type ===
        'month'
    )?.value;


  const day =
    parts.find(
      (part) =>
        part.type ===
        'day'
    )?.value;


  return `${year}-${month}-${day}`;
}


export async function saveInstagramSnapshot({
  clientId,
  instagramUserId,
  metrics,
}: {
  clientId:
    string;

  instagramUserId:
    string;

  metrics:
    InstagramDashboardMetrics;
}) {

  const dateKey =
    getDateKey();


  return prisma
    .instagramMetricSnapshot
    .upsert({

      where: {

        clientId_dateKey: {
          clientId,
          dateKey,
        },

      },


      create: {

        clientId,

        instagramUserId,

        dateKey,

        followersCount:
          metrics.followersCount,

        reach:
          metrics.current.reach,

        views:
          metrics.current.views,

        interactions:
          metrics.current.interactions,

        capturedAt:
          new Date(),

      },


      update: {

        instagramUserId,

        followersCount:
          metrics.followersCount,

        reach:
          metrics.current.reach,

        views:
          metrics.current.views,

        interactions:
          metrics.current.interactions,

        capturedAt:
          new Date(),

      },

    });
}


export async function captureInstagramSnapshot({
  clientId,
  instagramUserId,
  encryptedToken,
}: {
  clientId:
    string;

  instagramUserId:
    string;

  encryptedToken:
    string;
}) {

  const accessToken =
    decryptMetaSecret(
      encryptedToken
    );


  const metrics =
    await getInstagramDashboardMetrics({

      instagramUserId,

      accessToken,

    });


  await saveInstagramSnapshot({

    clientId,

    instagramUserId,

    metrics,

  });


  return metrics;
}


export async function captureAllInstagramSnapshots() {

  const connections =
    await prisma
      .instagramConnection
      .findMany({

        where: {

          status:
            'ATIVO',

          userAccessTokenEncrypted: {
            not:
              null,
          },

        },


        select: {

          clientId:
            true,

          instagramUserId:
            true,

          userAccessTokenEncrypted:
            true,

        },

      });


  let success =
    0;

  let failed =
    0;


  const failures:
    Array<{
      clientId:
        string;

      message:
        string;
    }> =
    [];


  for (
    const connection
    of connections
  ) {

    if (
      !connection
        .userAccessTokenEncrypted
    ) {
      continue;
    }


    try {

      await captureInstagramSnapshot({

        clientId:
          connection.clientId,

        instagramUserId:
          connection.instagramUserId,

        encryptedToken:
          connection
            .userAccessTokenEncrypted,

      });


      await prisma
        .instagramConnection
        .update({

          where: {
            clientId:
              connection.clientId,
          },

          data: {
            lastSyncAt:
              new Date(),
          },

        });


      success++;

    }
    catch (
      error
    ) {

      failed++;


      const message =
        error instanceof Error
          ? error.message
          : 'Erro desconhecido';


      failures.push({

        clientId:
          connection.clientId,

        message,

      });


      console.error(
        'INSTAGRAM SNAPSHOT ERROR',
        connection.clientId,
        error
      );

    }

  }


  return {

    total:
      connections.length,

    success,

    failed,

    failures,

  };
}

import {
  prisma,
} from '@/lib/prisma';


export type InstagramHistoryPoint = {
  dateKey:
    string;

  followersCount:
    number | null;

  reach:
    number | null;

  views:
    number | null;

  interactions:
    number | null;

  capturedAt:
    Date;
};


export type InstagramHistorySummary = {
  points:
    InstagramHistoryPoint[];

  first:
    InstagramHistoryPoint | null;

  latest:
    InstagramHistoryPoint | null;

  followersDelta:
    number | null;

  followersPercent:
    number | null;

  daysWithData:
    number;
};


function getDateKey(
  date:
    Date
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
      (
        part
      ) =>
        part.type ===
        'year'
    )?.value;


  const month =
    parts.find(
      (
        part
      ) =>
        part.type ===
        'month'
    )?.value;


  const day =
    parts.find(
      (
        part
      ) =>
        part.type ===
        'day'
    )?.value;


  return `${year}-${month}-${day}`;
}


function startDateKey(
  days:
    number
) {

  const date =
    new Date();

  date.setUTCDate(
    date.getUTCDate() -
    Math.max(
      days - 1,
      0
    )
  );


  return getDateKey(
    date
  );
}


export async function getInstagramHistorySummary({
  clientId,
  days = 30,
}: {
  clientId:
    string;

  days?:
    number;
}): Promise<
  InstagramHistorySummary
> {

  const snapshots =
    await prisma
      .instagramMetricSnapshot
      .findMany({

        where: {

          clientId,

          dateKey: {
            gte:
              startDateKey(
                days
              ),
          },

        },


        orderBy: {
          dateKey:
            'asc',
        },


        select: {

          dateKey:
            true,

          followersCount:
            true,

          reach:
            true,

          views:
            true,

          interactions:
            true,

          capturedAt:
            true,

        },

      });


  const points:
    InstagramHistoryPoint[] =
    snapshots;


  const first =
    points[0] ||
    null;


  const latest =
    points[
      points.length - 1
    ] ||
    null;


  let followersDelta:
    number | null =
    null;


  let followersPercent:
    number | null =
    null;


  if (
    points.length >= 2 &&
    first
      ?.followersCount !==
      null &&
    first
      ?.followersCount !==
      undefined &&
    latest
      ?.followersCount !==
      null &&
    latest
      ?.followersCount !==
      undefined
  ) {

    followersDelta =
      latest.followersCount -
      first.followersCount;


    if (
      first.followersCount !==
      0
    ) {

      followersPercent =
        (
          followersDelta /
          first.followersCount
        ) *
        100;

    }

  }


  return {

    points,

    first,

    latest,

    followersDelta,

    followersPercent,

    daysWithData:
      points.length,

  };
}

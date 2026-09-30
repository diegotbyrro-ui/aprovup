import {
  prisma,
} from '@/lib/prisma';

import {
  decryptSocialSecret,
  encryptSocialSecret,
  youtubeOauthConfig,
} from '@/lib/socialOAuth';


type AnalyticsRow =
  Record<
    string,
    string |
    number
  >;


type AnalyticsResponse = {

  columnHeaders?:
    Array<{
      name?:
        string;
    }>;

  rows?:
    Array<
      Array<
        string |
        number
      >
    >;

  error?: {
    message?:
      string;
  };
};


type YoutubeChannelResponse = {

  items?:
    Array<{

      id?:
        string;

      snippet?: {

        title?:
          string;

        customUrl?:
          string;

        thumbnails?: {

          high?: {
            url?:
              string;
          };

          medium?: {
            url?:
              string;
          };

          default?: {
            url?:
              string;
          };
        };
      };

      statistics?: {

        viewCount?:
          string;

        subscriberCount?:
          string;

        videoCount?:
          string;
      };
    }>;
};


type YoutubeVideosResponse = {

  items?:
    Array<{

      id?:
        string;

      snippet?: {

        title?:
          string;

        publishedAt?:
          string;

        thumbnails?: {

          medium?: {
            url?:
              string;
          };

          default?: {
            url?:
              string;
          };
        };
      };

      statistics?: {

        viewCount?:
          string;

        likeCount?:
          string;

        commentCount?:
          string;
      };
    }>;
};


type YoutubeConnection = {

  id:
    string;

  encryptedAccessToken:
    string | null;

  encryptedRefreshToken:
    string | null;

  tokenExpiresAt:
    Date | null;

  status:
    string;
};


function numberValue(
  value:
    unknown
) {

  const result =
    Number(
      value ||
      0
    );


  return Number.isFinite(
    result
  )
    ? result
    : 0;
}


function dateValue(
  date:
    Date
) {

  return date
    .toISOString()
    .slice(
      0,
      10
    );
}


function subtractDays(
  date:
    Date,

  days:
    number
) {

  const result =
    new Date(
      date.getTime()
    );


  result.setUTCDate(
    result.getUTCDate() -
    days
  );


  return result;
}


export function getYoutubeAnalyticsRange(
  requestedDays:
    number
) {

  const days =
    [
      7,
      28,
      90,
    ].includes(
      requestedDays
    )
      ? requestedDays
      : 28;


  /*
   * O YouTube Analytics pode ter atraso
   * no processamento dos dados recentes.
   *
   * Usamos os tres ultimos dias como margem.
   */
  const end =
    subtractDays(
      new Date(),
      3
    );


  const start =
    subtractDays(
      end,
      days - 1
    );


  return {

    days,

    startDate:
      dateValue(
        start
      ),

    endDate:
      dateValue(
        end
      ),
  };
}


function parseRows(
  response:
    AnalyticsResponse
) {

  const headers =
    (
      response
        .columnHeaders ||
      []
    ).map(
      (
        header
      ) =>
        String(
          header.name ||
          ''
        )
    );


  return (
    response.rows ||
    []
  ).map(
    (
      row
    ) => {

      const result:
        AnalyticsRow =
        {};


      headers.forEach(
        (
          header,
          index
        ) => {

          result[
            header
          ] =
            row[
              index
            ];
        }
      );


      return result;
    }
  );
}


function errorMessage(
  payload:
    unknown
) {

  const data =
    payload as
      {
        error?:
          {
            message?:
              string;
          };
      };


  return (
    data
      ?.error
      ?.message ||
    'Erro desconhecido na API do YouTube.'
  );
}


async function youtubeJson(
  url:
    string,

  accessToken:
    string
) {

  const response =
    await fetch(
      url,
      {
        method:
          'GET',

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          Accept:
            'application/json',
        },

        cache:
          'no-store',
      }
    );


  const payload =
    await response
      .json()
      .catch(
        () => null
      );


  if (
    !response.ok
  ) {

    const error =
      new Error(
        errorMessage(
          payload
        )
      );


    (
      error as
      Error & {
        status?:
          number;
      }
    ).status =
      response.status;


    throw error;
  }


  return payload;
}


async function getYoutubeConnection(
  clientId:
    string
) {

  return prisma
    .socialConnection
    .findUnique({
      where: {

        clientId_platform: {

          clientId,

          platform:
            'YOUTUBE',
        },
      },

      select: {

        id:
          true,

        encryptedAccessToken:
          true,

        encryptedRefreshToken:
          true,

        tokenExpiresAt:
          true,

        status:
          true,
      },
    });
}


async function refreshAccessToken(
  connection:
    YoutubeConnection
) {

  const config =
    youtubeOauthConfig();


  if (
    !config.ready
  ) {

    throw new Error(
      'YOUTUBE_CLIENT_ID ou YOUTUBE_CLIENT_SECRET nao configurado.'
    );
  }


  if (
    !connection
      .encryptedRefreshToken
  ) {

    throw new Error(
      'Refresh token do YouTube nao encontrado. Reconecte o YouTube.'
    );
  }


  const refreshToken =
    decryptSocialSecret(
      connection
        .encryptedRefreshToken
    );


  const body =
    new URLSearchParams({

      client_id:
        config.clientId,

      client_secret:
        config.clientSecret,

      refresh_token:
        refreshToken,

      grant_type:
        'refresh_token',
    });


  const response =
    await fetch(
      'https://oauth2.googleapis.com/token',
      {
        method:
          'POST',

        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded',
        },

        body:
          body.toString(),

        cache:
          'no-store',
      }
    );


  const payload =
    await response
      .json() as
        {
          access_token?:
            string;

          expires_in?:
            number;

          error?:
            string;

          error_description?:
            string;
        };


  if (
    !response.ok ||
    !payload.access_token
  ) {

    throw new Error(
      payload.error_description ||
      payload.error ||
      'Nao foi possivel renovar o token do YouTube.'
    );
  }


  const expiresAt =
    new Date(
      Date.now() +
      Number(
        payload.expires_in ||
        3600
      ) *
        1000
    );


  await prisma
    .socialConnection
    .update({
      where: {

        id:
          connection.id,
      },

      data: {

        encryptedAccessToken:
          encryptSocialSecret(
            payload.access_token
          ),

        tokenExpiresAt:
          expiresAt,

        status:
          'ATIVO',

        lastSyncAt:
          new Date(),
      },
    });


  return payload.access_token;
}


async function getAccessToken(
  connection:
    YoutubeConnection
) {

  if (
    !connection
      .encryptedAccessToken
  ) {

    throw new Error(
      'Access token do YouTube nao encontrado. Reconecte o YouTube.'
    );
  }


  const accessToken =
    decryptSocialSecret(
      connection
        .encryptedAccessToken
    );


  const expiresAt =
    connection
      .tokenExpiresAt
      ?.getTime();


  /*
   * Renova cinco minutos antes do vencimento.
   */
  if (
    expiresAt &&
    expiresAt >
      Date.now() +
      5 *
        60 *
        1000
  ) {

    return accessToken;
  }


  return refreshAccessToken(
    connection
  );
}


async function youtubeRequest(
  connection:
    YoutubeConnection,

  url:
    string
) {

  let accessToken =
    await getAccessToken(
      connection
    );


  try {

    return await youtubeJson(
      url,
      accessToken
    );

  }
  catch (
    error
  ) {

    const status =
      (
        error as
        Error & {
          status?:
            number;
        }
      ).status;


    if (
      status !==
      401
    ) {

      throw error;
    }


    /*
     * Se o token expirou antes do horario
     * previsto, tenta uma renovacao uma vez.
     */
    accessToken =
      await refreshAccessToken(
        connection
      );


    return youtubeJson(
      url,
      accessToken
    );
  }
}


function analyticsUrl(
  params:
    Record<
      string,
      string
    >
) {

  const url =
    new URL(
      'https://youtubeanalytics.googleapis.com/v2/reports'
    );


  Object.entries(
    params
  ).forEach(
    (
      [
        key,
        value,
      ]
    ) => {

      url.searchParams.set(
        key,
        value
      );
    }
  );


  return url.toString();
}


export async function getYoutubeDashboard(
  clientId:
    string,

  requestedDays:
    number = 28
) {

  const connection =
    await getYoutubeConnection(
      clientId
    );


  if (
    !connection
  ) {

    throw new Error(
      'Nenhuma conexao do YouTube encontrada para este cliente.'
    );
  }


  if (
    connection.status !==
      'ATIVO'
  ) {

    throw new Error(
      'A conexao do YouTube nao esta ativa.'
    );
  }


  const range =
    getYoutubeAnalyticsRange(
      requestedDays
    );


  /*
   * =========================================================
   * CANAL - DATA API
   * =========================================================
   */

  const channelUrl =
    new URL(
      'https://www.googleapis.com/youtube/v3/channels'
    );


  channelUrl.searchParams.set(
    'part',
    'id,snippet,statistics'
  );


  channelUrl.searchParams.set(
    'mine',
    'true'
  );


  const channelPayload =
    await youtubeRequest(
      connection,
      channelUrl.toString()
    ) as
      YoutubeChannelResponse;


  const channel =
    channelPayload
      .items?.[0];


  if (
    !channel?.id
  ) {

    throw new Error(
      'Nao foi possivel localizar o canal do YouTube autorizado.'
    );
  }


  /*
   * =========================================================
   * ANALYTICS - TOTAIS
   * =========================================================
   */

  const baseParams = {

    ids:
      'channel==MINE',

    startDate:
      range.startDate,

    endDate:
      range.endDate,
  };


  const activityMetrics =
    [
      'views',

      'likes',

      'comments',

      'shares',

      'estimatedMinutesWatched',

      'subscribersGained',

      'subscribersLost',
    ].join(
      ','
    );


  const totalsPayload =
    await youtubeRequest(
      connection,

      analyticsUrl({

        ...baseParams,

        metrics:
          activityMetrics,
      })
    ) as
      AnalyticsResponse;


  const totalsRows =
    parseRows(
      totalsPayload
    );


  const totals =
    totalsRows[0] ||
    {};


  /*
   * =========================================================
   * ANALYTICS - EVOLUCAO DIARIA
   * =========================================================
   */

  const dailyPayload =
    await youtubeRequest(
      connection,

      analyticsUrl({

        ...baseParams,

        metrics:
          activityMetrics,

        dimensions:
          'day',

        sort:
          'day',
      })
    ) as
      AnalyticsResponse;


  const daily =
    parseRows(
      dailyPayload
    );


  /*
   * =========================================================
   * ANALYTICS - TOP VIDEOS
   * =========================================================
   */

  const videoPayload =
    await youtubeRequest(
      connection,

      analyticsUrl({

        ...baseParams,

        metrics:
          activityMetrics,

        dimensions:
          'video',

        sort:
          '-views',

        maxResults:
          '20',
      })
    ) as
      AnalyticsResponse;


  const videoRows =
    parseRows(
      videoPayload
    );


  /*
   * =========================================================
   * ANALYTICS - PAISES
   * =========================================================
   */

  const countryPayload =
    await youtubeRequest(
      connection,

      analyticsUrl({

        ...baseParams,

        metrics:
          'views,estimatedMinutesWatched',

        dimensions:
          'country',

        sort:
          '-views',

        maxResults:
          '10',
      })
    ) as
      AnalyticsResponse;


  const countries =
    parseRows(
      countryPayload
    );


  /*
   * =========================================================
   * ANALYTICS - ORIGEM DO TRAFEGO
   * =========================================================
   */

  const trafficPayload =
    await youtubeRequest(
      connection,

      analyticsUrl({

        ...baseParams,

        metrics:
          'views,estimatedMinutesWatched',

        dimensions:
          'insightTrafficSourceType',

        sort:
          '-views',

        maxResults:
          '10',
      })
    ) as
      AnalyticsResponse;


  const trafficSources =
    parseRows(
      trafficPayload
    );


  /*
   * =========================================================
   * VIDEOS - DATA API
   * =========================================================
   */

  const videoIds =
    videoRows
      .map(
        (
          row
        ) =>
          String(
            row.video ||
            ''
          )
      )
      .filter(
        (
          id
        ) =>
          Boolean(
            id
          )
      )
      .slice(
        0,
        50
      );


  let videoDetails:
    YoutubeVideosResponse =
    {};


  if (
    videoIds.length
  ) {

    const videosUrl =
      new URL(
        'https://www.googleapis.com/youtube/v3/videos'
      );


    videosUrl.searchParams.set(
      'part',
      'snippet,statistics'
    );


    videosUrl.searchParams.set(
      'id',
      videoIds.join(
        ','
      )
    );


    videoDetails =
      await youtubeRequest(
        connection,
        videosUrl.toString()
      ) as
        YoutubeVideosResponse;
  }


  const videoMap =
    new Map<
      string,
      {
        title:
          string;

        thumbnail:
          string |
          null;

        publishedAt:
          string |
          null;

        currentViews:
          number;

        currentLikes:
          number;

        currentComments:
          number;
      }
    >();


  for (
    const item
    of (
      videoDetails
        .items ||
      []
    )
  ) {

    if (
      !item.id
    ) {

      continue;
    }


    videoMap.set(
      item.id,
      {

        title:
          item
            .snippet
            ?.title ||
          'Video do YouTube',

        thumbnail:
          item
            .snippet
            ?.thumbnails
            ?.medium
            ?.url ||
          item
            .snippet
            ?.thumbnails
            ?.default
            ?.url ||
          null,

        publishedAt:
          item
            .snippet
            ?.publishedAt ||
          null,

        currentViews:
          numberValue(
            item
              .statistics
              ?.viewCount
          ),

        currentLikes:
          numberValue(
            item
              .statistics
              ?.likeCount
          ),

        currentComments:
          numberValue(
            item
              .statistics
              ?.commentCount
          ),
      }
    );
  }


  const topVideos =
    videoRows.map(
      (
        row
      ) => {

        const id =
          String(
            row.video ||
            ''
          );


        const detail =
          videoMap.get(
            id
          );


        return {

          id,

          title:
            detail
              ?.title ||
            'Video do YouTube',

          thumbnail:
            detail
              ?.thumbnail ||
            null,

          publishedAt:
            detail
              ?.publishedAt ||
            null,

          views:
            numberValue(
              row.views
            ),

          likes:
            numberValue(
              row.likes
            ),

          comments:
            numberValue(
              row.comments
            ),

          shares:
            numberValue(
              row.shares
            ),

          estimatedMinutesWatched:
            numberValue(
              row
                .estimatedMinutesWatched
            ),

          subscribersGained:
            numberValue(
              row
                .subscribersGained
            ),

          subscribersLost:
            numberValue(
              row
                .subscribersLost
            ),

          currentViews:
            detail
              ?.currentViews ||
            0,

          currentLikes:
            detail
              ?.currentLikes ||
            0,

          currentComments:
            detail
              ?.currentComments ||
            0,

          url:
            `https://www.youtube.com/watch?v=${id}`,
        };
      }
    );


  return {

    channel: {

      id:
        channel.id,

      title:
        channel
          .snippet
          ?.title ||
        'YouTube',

      customUrl:
        channel
          .snippet
          ?.customUrl ||
        null,

      thumbnail:
        channel
          .snippet
          ?.thumbnails
          ?.high
          ?.url ||
        channel
          .snippet
          ?.thumbnails
          ?.medium
          ?.url ||
        channel
          .snippet
          ?.thumbnails
          ?.default
          ?.url ||
        null,

      viewCount:
        numberValue(
          channel
            .statistics
            ?.viewCount
        ),

      subscriberCount:
        numberValue(
          channel
            .statistics
            ?.subscriberCount
        ),

      videoCount:
        numberValue(
          channel
            .statistics
            ?.videoCount
        ),
    },


    range,


    totals: {

      views:
        numberValue(
          totals.views
        ),

      likes:
        numberValue(
          totals.likes
        ),

      comments:
        numberValue(
          totals.comments
        ),

      shares:
        numberValue(
          totals.shares
        ),

      estimatedMinutesWatched:
        numberValue(
          totals
            .estimatedMinutesWatched
        ),

      subscribersGained:
        numberValue(
          totals
            .subscribersGained
        ),

      subscribersLost:
        numberValue(
          totals
            .subscribersLost
        ),

      subscribersNet:
        numberValue(
          totals
            .subscribersGained
        ) -
        numberValue(
          totals
            .subscribersLost
        ),
    },


    daily,


    topVideos,


    countries:
      countries.map(
        (
          row
        ) => ({

          country:
            String(
              row.country ||
              'ZZ'
            ),

          views:
            numberValue(
              row.views
            ),

          estimatedMinutesWatched:
            numberValue(
              row
                .estimatedMinutesWatched
            ),
        })
      ),


    trafficSources:
      trafficSources.map(
        (
          row
        ) => ({

          source:
            String(
              row
                .insightTrafficSourceType ||
              'UNKNOWN'
            ),

          views:
            numberValue(
              row.views
            ),

          estimatedMinutesWatched:
            numberValue(
              row
                .estimatedMinutesWatched
            ),
        })
      ),
  };
}
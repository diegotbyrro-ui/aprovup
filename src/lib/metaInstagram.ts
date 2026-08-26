export const META_INSTAGRAM_SCOPES = [
  'pages_show_list',
  'business_management',
  'instagram_basic',
  'instagram_manage_comments',
  'instagram_manage_insights',
  'instagram_content_publish',
  'instagram_manage_messages',
  'pages_read_engagement',
] as const;


export type ManagedInstagramAccount = {
  facebookPageId:
    string;

  facebookPageName:
    string;

  pageAccessToken:
    string;

  tasks:
    string[];

  instagramUserId:
    string;

  username:
    string | null;

  displayName:
    string | null;

  followersCount:
    number | null;

  mediaCount:
    number | null;
};


function graphVersion() {
  return (
    process.env
      .META_GRAPH_VERSION ||
    'v26.0'
  );
}


function requiredConfig() {
  const appId =
    process.env
      .META_APP_ID;

  const appSecret =
    process.env
      .META_APP_SECRET;

  if (
    !appId ||
    !appSecret
  ) {
    throw new Error(
      'Credenciais Meta nao configuradas.'
    );
  }

  return {
    appId,
    appSecret,
  };
}


export function isMetaConfigured() {
  return Boolean(
    process.env.META_APP_ID &&
    process.env.META_APP_SECRET &&
    process.env
      .META_TOKEN_ENCRYPTION_KEY
  );
}


export function getMetaRedirectUri(
  origin?: string
) {
  if (
    process.env
      .META_INSTAGRAM_REDIRECT_URI
  ) {
    return process.env
      .META_INSTAGRAM_REDIRECT_URI;
  }

  const baseUrl =
    process.env
      .NEXT_PUBLIC_SITE_URL ||
    origin;

  if (!baseUrl) {
    throw new Error(
      'URL publica do AprovUp nao configurada.'
    );
  }

  return new URL(
    '/api/integrations/instagram/callback',
    baseUrl
  ).toString();
}


export function buildMetaLoginUrl({
  state,
  redirectUri,
}: {
  state: string;
  redirectUri: string;
}) {
  const {
    appId,
  } = requiredConfig();

  const url =
    new URL(
      `https://www.facebook.com/${graphVersion()}/dialog/oauth`
    );

  url.searchParams.set(
    'client_id',
    appId
  );

  url.searchParams.set(
    'redirect_uri',
    redirectUri
  );

  url.searchParams.set(
    'state',
    state
  );

  url.searchParams.set(
    'response_type',
    'code'
  );

  url.searchParams.set(
    'scope',
    META_INSTAGRAM_SCOPES.join(
      ','
    )
  );

  const configId =
    process.env
      .META_FACEBOOK_LOGIN_CONFIG_ID;

  if (configId) {
    url.searchParams.set(
      'config_id',
      configId
    );
  }

  return url.toString();
}


async function parseMeta<T>(
  response: Response
): Promise<T> {
  const payload =
    await response.json();

  if (!response.ok) {
    throw new Error(
      payload?.error?.message ||
      'Erro na Meta Graph API.'
    );
  }

  return payload as T;
}


export async function exchangeMetaCode({
  code,
  redirectUri,
}: {
  code: string;
  redirectUri: string;
}) {
  const {
    appId,
    appSecret,
  } = requiredConfig();

  const tokenUrl =
    new URL(
      `https://graph.facebook.com/${graphVersion()}/oauth/access_token`
    );

  tokenUrl.searchParams.set(
    'client_id',
    appId
  );

  tokenUrl.searchParams.set(
    'client_secret',
    appSecret
  );

  tokenUrl.searchParams.set(
    'redirect_uri',
    redirectUri
  );

  tokenUrl.searchParams.set(
    'code',
    code
  );

  const shortResponse =
    await fetch(
      tokenUrl,
      {
        cache:
          'no-store',
      }
    );

  const short =
    await parseMeta<{
      access_token:
        string;
      expires_in?:
        number;
    }>(
      shortResponse
    );

  const longUrl =
    new URL(
      `https://graph.facebook.com/${graphVersion()}/oauth/access_token`
    );

  longUrl.searchParams.set(
    'grant_type',
    'fb_exchange_token'
  );

  longUrl.searchParams.set(
    'client_id',
    appId
  );

  longUrl.searchParams.set(
    'client_secret',
    appSecret
  );

  longUrl.searchParams.set(
    'fb_exchange_token',
    short.access_token
  );

  const longResponse =
    await fetch(
      longUrl,
      {
        cache:
          'no-store',
      }
    );

  const long =
    await parseMeta<{
      access_token:
        string;
      expires_in?:
        number;
    }>(
      longResponse
    );

  return {
    accessToken:
      long.access_token,

    expiresIn:
      long.expires_in ??
      null,
  };
}


export async function getManagedInstagramAccounts(
  userAccessToken: string
) {
  const pagesUrl =
    new URL(
      `https://graph.facebook.com/${graphVersion()}/me/accounts`
    );

  pagesUrl.searchParams.set(
    'fields',
    [
      'id',
      'name',
      'access_token',
      'tasks',
      'instagram_business_account',
    ].join(',')
  );

  pagesUrl.searchParams.set(
    'limit',
    '100'
  );

  pagesUrl.searchParams.set(
    'access_token',
    userAccessToken
  );

  const pagesResponse =
    await fetch(
      pagesUrl,
      {
        cache:
          'no-store',
      }
    );

  const pages =
    await parseMeta<{
      data: Array<{
        id:
          string;

        name:
          string;

        access_token?:
          string;

        tasks?:
          string[];

        instagram_business_account?: {
          id:
            string;
        };
      }>;
    }>(
      pagesResponse
    );

  const eligiblePages =
    pages.data.filter(
      (
        page
      ) =>
        Boolean(
          page.access_token &&
          page
            .instagram_business_account
            ?.id
        )
    );

  const accounts:
    ManagedInstagramAccount[] =
    [];

  for (
    const page
    of eligiblePages
  ) {
    const instagramUserId =
      page
        .instagram_business_account!
        .id;

    const pageAccessToken =
      page.access_token!;

    const profileUrl =
      new URL(
        `https://graph.facebook.com/${graphVersion()}/${instagramUserId}`
      );

    profileUrl.searchParams.set(
      'fields',
      [
        'id',
        'username',
        'name',
        'followers_count',
        'media_count',
      ].join(',')
    );

    profileUrl.searchParams.set(
      'access_token',
      pageAccessToken
    );

    try {
      const profileResponse =
        await fetch(
          profileUrl,
          {
            cache:
              'no-store',
          }
        );

      const profile =
        await parseMeta<{
          id:
            string;

          username?:
            string;

          name?:
            string;

          followers_count?:
            number;

          media_count?:
            number;
        }>(
          profileResponse
        );

      accounts.push({
        facebookPageId:
          page.id,

        facebookPageName:
          page.name,

        pageAccessToken,

        tasks:
          page.tasks ||
          [],

        instagramUserId:
          profile.id,

        username:
          profile.username ||
          null,

        displayName:
          profile.name ||
          null,

        followersCount:
          profile
            .followers_count ??
          null,

        mediaCount:
          profile
            .media_count ??
          null,
      });
    }
    catch (
      error
    ) {
      console.error(
        'Instagram profile read error',
        error
      );
    }
  }

  return accounts;
}



export type InstagramDashboardMetrics = {
  followersCount:
    number | null;

  current: {
    reach:
      number | null;

    views:
      number | null;

    interactions:
      number | null;
  };

  previous: {
    reach:
      number | null;

    views:
      number | null;

    interactions:
      number | null;
  };

  change: {
    reach:
      number | null;

    views:
      number | null;

    interactions:
      number | null;
  };

  period: {
    currentStart:
      Date;

    currentEnd:
      Date;

    previousStart:
      Date;

    previousEnd:
      Date;
  };
};


function unixSeconds(
  date: Date
) {
  return Math.floor(
    date.getTime() /
    1000
  );
}


function getComparableMonthRanges() {
  const now =
    new Date();

  const year =
    now.getUTCFullYear();

  const month =
    now.getUTCMonth();

  const currentStart =
    new Date(
      Date.UTC(
        year,
        month,
        1,
        0,
        0,
        0
      )
    );

  const currentEnd =
    now;

  const previousMonthReference =
    new Date(
      Date.UTC(
        year,
        month - 1,
        1
      )
    );

  const previousYear =
    previousMonthReference
      .getUTCFullYear();

  const previousMonth =
    previousMonthReference
      .getUTCMonth();

  const lastDayPreviousMonth =
    new Date(
      Date.UTC(
        previousYear,
        previousMonth + 1,
        0
      )
    ).getUTCDate();

  const comparableDay =
    Math.min(
      now.getUTCDate(),
      lastDayPreviousMonth
    );

  const previousStart =
    new Date(
      Date.UTC(
        previousYear,
        previousMonth,
        1,
        0,
        0,
        0
      )
    );

  const previousEnd =
    new Date(
      Date.UTC(
        previousYear,
        previousMonth,
        comparableDay,
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds()
      )
    );

  return {
    currentStart,
    currentEnd,
    previousStart,
    previousEnd,
  };
}


function calculateChange(
  current:
    number | null,
  previous:
    number | null
) {
  if (
    current === null ||
    previous === null
  ) {
    return null;
  }

  if (
    previous === 0
  ) {
    return current === 0
      ? 0
      : null;
  }

  return (
    (
      current -
      previous
    ) /
    previous
  ) * 100;
}


async function readMetricTotal({
  instagramUserId,
  accessToken,
  metric,
  since,
  until,
}: {
  instagramUserId:
    string;

  accessToken:
    string;

  metric:
    string;

  since:
    Date;

  until:
    Date;
}): Promise<number | null> {

  const attempts = [
    {
      period:
        'day',

      metricType:
        'total_value',
    },

    {
      period:
        'total_over_range',

      metricType:
        'total_value',
    },
  ];


  for (
    const attempt
    of attempts
  ) {

    const url =
      new URL(
        `https://graph.facebook.com/${graphVersion()}/${instagramUserId}/insights`
      );

    url.searchParams.set(
      'metric',
      metric
    );

    url.searchParams.set(
      'period',
      attempt.period
    );

    url.searchParams.set(
      'metric_type',
      attempt.metricType
    );

    url.searchParams.set(
      'since',
      String(
        unixSeconds(
          since
        )
      )
    );

    url.searchParams.set(
      'until',
      String(
        unixSeconds(
          until
        )
      )
    );

    url.searchParams.set(
      'access_token',
      accessToken
    );


    const response =
      await fetch(
        url,
        {
          cache:
            'no-store',
        }
      );


    const payload =
      await response.json();


    if (
      !response.ok
    ) {
      continue;
    }


    const item =
      payload?.data?.[0];


    const totalValue =
      item
        ?.total_value
        ?.value;


    if (
      typeof totalValue ===
      'number'
    ) {
      return totalValue;
    }


    const values =
      item?.values;


    if (
      Array.isArray(
        values
      ) &&
      values.length === 1 &&
      typeof values[0]?.value ===
        'number'
    ) {
      return values[0].value;
    }
  }


  console.warn(
    `Instagram metric unavailable: ${metric}`
  );

  return null;
}


async function getInstagramProfileMetrics({
  instagramUserId,
  accessToken,
}: {
  instagramUserId:
    string;

  accessToken:
    string;
}) {

  const url =
    new URL(
      `https://graph.facebook.com/${graphVersion()}/${instagramUserId}`
    );

  url.searchParams.set(
    'fields',
    [
      'id',
      'username',
      'name',
      'followers_count',
      'media_count',
    ].join(',')
  );

  url.searchParams.set(
    'access_token',
    accessToken
  );


  const response =
    await fetch(
      url,
      {
        cache:
          'no-store',
      }
    );


  const payload =
    await response.json();


  if (
    !response.ok
  ) {
    throw new Error(
      payload?.error?.message ||
      'Nao foi possivel consultar o perfil do Instagram.'
    );
  }


  return {
    followersCount:
      typeof payload.followers_count ===
        'number'
        ? payload.followers_count
        : null,
  };
}


export async function getInstagramDashboardMetrics({
  instagramUserId,
  accessToken,
}: {
  instagramUserId:
    string;

  accessToken:
    string;
}): Promise<InstagramDashboardMetrics> {

  const period =
    getComparableMonthRanges();


  const profile =
    await getInstagramProfileMetrics({
      instagramUserId,
      accessToken,
    });


  const [
    currentReach,
    currentViews,
    currentInteractions,

    previousReach,
    previousViews,
    previousInteractions,
  ] =
    await Promise.all([

      readMetricTotal({
        instagramUserId,
        accessToken,
        metric:
          'reach',
        since:
          period.currentStart,
        until:
          period.currentEnd,
      }),

      readMetricTotal({
        instagramUserId,
        accessToken,
        metric:
          'views',
        since:
          period.currentStart,
        until:
          period.currentEnd,
      }),

      readMetricTotal({
        instagramUserId,
        accessToken,
        metric:
          'total_interactions',
        since:
          period.currentStart,
        until:
          period.currentEnd,
      }),


      readMetricTotal({
        instagramUserId,
        accessToken,
        metric:
          'reach',
        since:
          period.previousStart,
        until:
          period.previousEnd,
      }),

      readMetricTotal({
        instagramUserId,
        accessToken,
        metric:
          'views',
        since:
          period.previousStart,
        until:
          period.previousEnd,
      }),

      readMetricTotal({
        instagramUserId,
        accessToken,
        metric:
          'total_interactions',
        since:
          period.previousStart,
        until:
          period.previousEnd,
      }),
    ]);


  return {
    followersCount:
      profile.followersCount,

    current: {
      reach:
        currentReach,

      views:
        currentViews,

      interactions:
        currentInteractions,
    },

    previous: {
      reach:
        previousReach,

      views:
        previousViews,

      interactions:
        previousInteractions,
    },

    change: {
      reach:
        calculateChange(
          currentReach,
          previousReach
        ),

      views:
        calculateChange(
          currentViews,
          previousViews
        ),

      interactions:
        calculateChange(
          currentInteractions,
          previousInteractions
        ),
    },

    period,
  };
}



export type InstagramDailyReachPoint = {
  date: string;
  value: number;
};


export type InstagramTopMediaItem = {
  id: string;

  caption:
    string | null;

  mediaType:
    string;

  mediaProductType:
    string | null;

  permalink:
    string | null;

  timestamp:
    string;

  imageUrl:
    string | null;

  likes:
    number;

  comments:
    number;

  reach:
    number | null;

  views:
    number | null;

  interactions:
    number | null;

  saved:
    number | null;

  shares:
    number | null;
};


function getInsightMetricValue(
  item:
    any
): number | null {

  const lifetimeValue =
    item
      ?.values
      ?.[0]
      ?.value;

  if (
    typeof lifetimeValue ===
    'number'
  ) {
    return lifetimeValue;
  }


  const totalValue =
    item
      ?.total_value
      ?.value;

  if (
    typeof totalValue ===
    'number'
  ) {
    return totalValue;
  }


  return null;
}


async function readMediaInsights({
  mediaId,
  accessToken,
}: {
  mediaId:
    string;

  accessToken:
    string;
}) {

  const attempts = [

    [
      'reach',
      'total_interactions',
      'views',
      'saved',
      'shares',
    ],

    [
      'reach',
      'total_interactions',
      'saved',
      'shares',
    ],

    [
      'reach',
    ],
  ];


  for (
    const metrics
    of attempts
  ) {

    const url =
      new URL(
        `https://graph.facebook.com/${graphVersion()}/${mediaId}/insights`
      );

    url.searchParams.set(
      'metric',
      metrics.join(',')
    );

    url.searchParams.set(
      'access_token',
      accessToken
    );


    const response =
      await fetch(
        url,
        {
          cache:
            'no-store',
        }
      );


    const payload =
      await response.json();


    if (
      !response.ok
    ) {
      continue;
    }


    const result = {
      reach:
        null as number | null,

      views:
        null as number | null,

      interactions:
        null as number | null,

      saved:
        null as number | null,

      shares:
        null as number | null,
    };


    for (
      const item
      of payload?.data || []
    ) {

      const value =
        getInsightMetricValue(
          item
        );


      if (
        item.name ===
        'reach'
      ) {
        result.reach =
          value;
      }


      if (
        item.name ===
        'views'
      ) {
        result.views =
          value;
      }


      if (
        item.name ===
        'total_interactions'
      ) {
        result.interactions =
          value;
      }


      if (
        item.name ===
        'saved'
      ) {
        result.saved =
          value;
      }


      if (
        item.name ===
        'shares'
      ) {
        result.shares =
          value;
      }

    }


    return result;
  }


  return {
    reach:
      null,

    views:
      null,

    interactions:
      null,

    saved:
      null,

    shares:
      null,
  };
}


export async function getInstagramDailyReach({
  instagramUserId,
  accessToken,
}: {
  instagramUserId:
    string;

  accessToken:
    string;
}): Promise<
  InstagramDailyReachPoint[]
> {

  const period =
    getComparableMonthRanges();


  const url =
    new URL(
      `https://graph.facebook.com/${graphVersion()}/${instagramUserId}/insights`
    );


  url.searchParams.set(
    'metric',
    'reach'
  );

  url.searchParams.set(
    'period',
    'day'
  );

  url.searchParams.set(
    'since',
    String(
      unixSeconds(
        period.currentStart
      )
    )
  );

  url.searchParams.set(
    'until',
    String(
      unixSeconds(
        period.currentEnd
      )
    )
  );

  url.searchParams.set(
    'access_token',
    accessToken
  );


  const response =
    await fetch(
      url,
      {
        cache:
          'no-store',
      }
    );


  const payload =
    await response.json();


  if (
    !response.ok
  ) {

    console.error(
      'INSTAGRAM DAILY REACH ERROR',
      payload
    );

    return [];
  }


  const values =
    payload
      ?.data
      ?.[0]
      ?.values;


  if (
    !Array.isArray(
      values
    )
  ) {
    return [];
  }


  return values
    .filter(
      (
        item:
          any
      ) =>
        typeof item?.value ===
          'number' &&
        typeof item?.end_time ===
          'string'
    )
    .map(
      (
        item:
          any
      ) => ({
        date:
          item.end_time,

        value:
          item.value,
      })
    );
}


export async function getInstagramTopMedia({
  instagramUserId,
  accessToken,
  limit = 3,
}: {
  instagramUserId:
    string;

  accessToken:
    string;

  limit?:
    number;
}): Promise<
  InstagramTopMediaItem[]
> {

  const period =
    getComparableMonthRanges();


  const url =
    new URL(
      `https://graph.facebook.com/${graphVersion()}/${instagramUserId}/media`
    );


  url.searchParams.set(
    'fields',
    [
      'id',
      'caption',
      'media_type',
      'media_product_type',
      'permalink',
      'timestamp',
      'thumbnail_url',
      'media_url',
      'like_count',
      'comments_count',
    ].join(',')
  );

  url.searchParams.set(
    'limit',
    '50'
  );

  url.searchParams.set(
    'access_token',
    accessToken
  );


  const response =
    await fetch(
      url,
      {
        cache:
          'no-store',
      }
    );


  const payload =
    await response.json();


  if (
    !response.ok
  ) {

    console.error(
      'INSTAGRAM MEDIA LIST ERROR',
      payload
    );

    return [];
  }


  const mediaThisMonth =
    (
      payload?.data ||
      []
    )
      .filter(
        (
          media:
            any
        ) => {

          if (
            !media.timestamp
          ) {
            return false;
          }

          const timestamp =
            new Date(
              media.timestamp
            );

          return (
            timestamp >=
              period.currentStart &&
            timestamp <=
              period.currentEnd
          );

        }
      )
      .slice(
        0,
        24
      );


  const enriched =
    await Promise.all(

      mediaThisMonth.map(
        async (
          media:
            any
        ): Promise<
          InstagramTopMediaItem
        > => {

          const insights =
            await readMediaInsights({
              mediaId:
                media.id,

              accessToken,
            });


          return {
            id:
              media.id,

            caption:
              media.caption ||
              null,

            mediaType:
              media.media_type ||
              'IMAGE',

            mediaProductType:
              media.media_product_type ||
              null,

            permalink:
              media.permalink ||
              null,

            timestamp:
              media.timestamp,

            imageUrl:
              media.thumbnail_url ||
              media.media_url ||
              null,

            likes:
              typeof media.like_count ===
                'number'
                ? media.like_count
                : 0,

            comments:
              typeof media.comments_count ===
                'number'
                ? media.comments_count
                : 0,

            reach:
              insights.reach,

            views:
              insights.views,

            interactions:
              insights.interactions,

            saved:
              insights.saved,

            shares:
              insights.shares,
          };

        }
      )
    );


  enriched.sort(
    (
      a,
      b
    ) => {

      const reachDifference =
        (
          b.reach ||
          0
        ) -
        (
          a.reach ||
          0
        );


      if (
        reachDifference !==
        0
      ) {
        return reachDifference;
      }


      const interactionDifference =
        (
          b.interactions ||
          0
        ) -
        (
          a.interactions ||
          0
        );


      if (
        interactionDifference !==
        0
      ) {
        return interactionDifference;
      }


      return (
        (
          b.views ||
          0
        ) -
        (
          a.views ||
          0
        )
      );

    }
  );


  return enriched.slice(
    0,
    limit
  );
}

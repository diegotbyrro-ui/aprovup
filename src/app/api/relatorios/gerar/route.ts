import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  PDFDocument,
  PDFPage,
  PDFFont,
  StandardFonts,
  rgb,
} from "pdf-lib";

import {
  getCurrentUser,
} from "@/lib/auth";

import {
  canAccessClient,
} from "@/lib/clientAccess";

import {
  getInstagramHistorySummary,
} from "@/lib/instagramHistory";

import {
  decryptMetaSecret,
} from "@/lib/metaCrypto";

import {
  getInstagramDashboardMetrics,
  isMetaConfigured,
  type InstagramDashboardMetrics,
} from "@/lib/metaInstagram";

import {
  saveInstagramSnapshot,
} from "@/lib/instagramSnapshots";

import {
  prisma,
} from "@/lib/prisma";

import {
  canUseFeature,
  getCurrentUserSaasAccess,
} from "@/lib/saasAccess";


export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


const NAVY =
  rgb(
    0.02,
    0.055,
    0.12
  );

const BLUE =
  rgb(
    0.055,
    0.36,
    0.95
  );

const BLUE_LIGHT =
  rgb(
    0.92,
    0.95,
    1
  );

const PAGE_BG =
  rgb(
    0.965,
    0.975,
    0.99
  );

const WHITE =
  rgb(
    1,
    1,
    1
  );

const TEXT =
  rgb(
    0.04,
    0.07,
    0.12
  );

const MUTED =
  rgb(
    0.38,
    0.45,
    0.56
  );

const BORDER =
  rgb(
    0.86,
    0.89,
    0.94
  );

const GREEN =
  rgb(
    0.02,
    0.58,
    0.35
  );


function clamp(
  value:
    number,
  minimum:
    number,
  maximum:
    number
) {
  return Math.min(
    maximum,
    Math.max(
      minimum,
      value
    )
  );
}


function formatNumber(
  value:
    number |
    null
) {
  if (
    value ===
    null ||
    !Number.isFinite(
      value
    )
  ) {
    return "-";
  }


  return new Intl
    .NumberFormat(
      "pt-BR",
      {
        maximumFractionDigits:
          0,
      }
    )
    .format(
      Math.round(
        value
      )
    );
}


function formatSignedNumber(
  value:
    number |
    null
) {
  if (
    value ===
    null ||
    !Number.isFinite(
      value
    )
  ) {
    return "-";
  }


  const rounded =
    Math.round(
      value
    );


  if (
    rounded >
    0
  ) {
    return `+${formatNumber(
      rounded
    )}`;
  }


  return formatNumber(
    rounded
  );
}


function formatPercent(
  value:
    number |
    null,
  signed =
    true
) {
  if (
    value ===
    null ||
    !Number.isFinite(
      value
    )
  ) {
    return "-";
  }


  const absolute =
    Math.abs(
      value
    )
      .toFixed(
        2
      )
      .replace(
        ".",
        ","
      );


  if (
    signed &&
    value >
    0
  ) {
    return `+${absolute}%`;
  }


  if (
    value <
    0
  ) {
    return `-${absolute}%`;
  }


  return `${absolute}%`;
}


function formatDateKey(
  value:
    string |
    undefined |
    null
) {
  if (
    !value
  ) {
    return "-";
  }


  const [
    year,
    month,
    day,
  ] =
    value.split(
      "-"
    );


  if (
    !year ||
    !month ||
    !day
  ) {
    return value;
  }


  return `${day}/${month}/${year}`;
}


function todayDateKey() {
  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "America/Maceio",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      }
    );


  const parts =
    formatter.formatToParts(
      new Date()
    );


  const part = (
    type:
      string
  ) =>
    parts.find(
      (
        item
      ) =>
        item.type ===
        type
    )?.value ||
    "";


  return `${part(
    "year"
  )}-${part(
    "month"
  )}-${part(
    "day"
  )}`;
}


function safeFilename(
  value:
    string
) {
  const clean =
    value
      .normalize(
        "NFD"
      )
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      )
      .slice(
        0,
        70
      );


  return clean ||
    "cliente";
}


function safeText(
  value:
    string
) {
  return String(
    value ||
    ""
  )
    .replace(
      /[\u2013\u2014]/g,
      "-"
    )
    .replace(
      /[\u2018\u2019]/g,
      "'"
    )
    .replace(
      /[\u201c\u201d]/g,
      '"'
    )
    .replace(
      /\u00a0/g,
      " "
    )
    .replace(
      /[^\u0020-\u00ff]/g,
      ""
    );
}


function fitTextSize({
  text,
  font,
  size,
  maxWidth,
  minimum =
    5,
}: {
  text:
    string;

  font:
    PDFFont;

  size:
    number;

  maxWidth:
    number;

  minimum?:
    number;
}) {
  let result =
    size;


  while (
    result >
      minimum &&
    font.widthOfTextAtSize(
      text,
      result
    ) >
      maxWidth
  ) {
    result -=
      0.25;
  }


  return Math.max(
    minimum,
    result
  );
}


function drawText({
  page,
  text,
  x,
  y,
  size,
  font,
  color =
    TEXT,
  maxWidth,
}: {
  page:
    PDFPage;

  text:
    string;

  x:
    number;

  y:
    number;

  size:
    number;

  font:
    PDFFont;

  color?:
    ReturnType<
      typeof rgb
    >;

  maxWidth?:
    number;
}) {
  const clean =
    safeText(
      text
    );


  const finalSize =
    maxWidth
      ? fitTextSize({
          text:
            clean,

          font,

          size,

          maxWidth,
        })
      : size;


  page.drawText(
    clean,
    {
      x,

      y,

      size:
        finalSize,

      font,

      color,

      maxWidth,
    }
  );
}


function drawCard({
  page,
  x,
  y,
  width,
  height,
}: {
  page:
    PDFPage;

  x:
    number;

  y:
    number;

  width:
    number;

  height:
    number;
}) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color:
      WHITE,
    borderColor:
      BORDER,
    borderWidth:
      0.45,
  });
}


function drawMetricCard({
  page,
  x,
  y,
  width,
  height,
  label,
  value,
  helper,
  bold,
  regular,
}: {
  page:
    PDFPage;

  x:
    number;

  y:
    number;

  width:
    number;

  height:
    number;

  label:
    string;

  value:
    string;

  helper:
    string;

  bold:
    PDFFont;

  regular:
    PDFFont;
}) {
  drawCard({
    page,
    x,
    y,
    width,
    height,
  });


  page.drawRectangle({
    x:
      x +
      7,

    y:
      y +
      height -
      15,

    width:
      3,

    height:
      8,

    color:
      BLUE,
  });


  drawText({
    page,
    text:
      label.toUpperCase(),
    x:
      x +
      14,
    y:
      y +
      height -
      15,
    size:
      5.5,
    font:
      bold,
    color:
      MUTED,
    maxWidth:
      width -
      20,
  });


  drawText({
    page,
    text:
      value,
    x:
      x +
      9,
    y:
      y +
      22,
    size:
      15,
    font:
      bold,
    color:
      TEXT,
    maxWidth:
      width -
      18,
  });


  drawText({
    page,
    text:
      helper,
    x:
      x +
      9,
    y:
      y +
      8,
    size:
      4.8,
    font:
      regular,
    color:
      MUTED,
    maxWidth:
      width -
      18,
  });
}


function drawFollowersChart({
  page,
  x,
  y,
  width,
  height,
  points,
  bold,
  regular,
}: {
  page:
    PDFPage;

  x:
    number;

  y:
    number;

  width:
    number;

  height:
    number;

  points:
    Array<{
      dateKey:
        string;

      followersCount:
        number |
        null;
    }>;

  bold:
    PDFFont;

  regular:
    PDFFont;
}) {
  drawCard({
    page,
    x,
    y,
    width,
    height,
  });


  drawText({
    page,
    text:
      "EVOLUCAO DE SEGUIDORES",
    x:
      x +
      12,
    y:
      y +
      height -
      18,
    size:
      7,
    font:
      bold,
    color:
      TEXT,
    maxWidth:
      width -
      24,
  });


  drawText({
    page,
    text:
      "Historico proprio do AprovUp",
    x:
      x +
      12,
    y:
      y +
      height -
      29,
    size:
      4.8,
    font:
      regular,
    color:
      MUTED,
  });


  const valid =
    points.filter(
      (
        point
      ) =>
        point.followersCount !==
        null
    );


  if (
    valid.length ===
    0
  ) {
    drawText({
      page,
      text:
        "Historico ainda nao iniciado.",
      x:
        x +
        12,
      y:
        y +
        height /
          2,
      size:
        6,
      font:
        bold,
      color:
        MUTED,
    });

    return;
  }


  if (
    valid.length ===
    1
  ) {
    drawText({
      page,
      text:
        formatNumber(
          valid[0]
            .followersCount
        ),
      x:
        x +
        12,
      y:
        y +
        height /
          2 +
        5,
      size:
        18,
      font:
        bold,
      color:
        BLUE,
    });


    drawText({
      page,
      text:
        `Primeira coleta: ${formatDateKey(
          valid[0]
            .dateKey
        )}`,
      x:
        x +
        12,
      y:
        y +
        height /
          2 -
        8,
      size:
        5,
      font:
        regular,
      color:
        MUTED,
    });

    return;
  }


  const values =
    valid.map(
      (
        point
      ) =>
        point.followersCount ||
        0
    );


  const minimum =
    Math.min(
      ...values
    );


  const maximum =
    Math.max(
      ...values
    );


  const rawRange =
    maximum -
    minimum;


  const range =
    Math.max(
      rawRange,
      10
    );


  const chartX =
    x +
    13;


  const chartY =
    y +
    24;


  const chartWidth =
    width -
    26;


  const chartHeight =
    height -
    63;


  for (
    const fraction
    of [
      0,
      0.33,
      0.66,
      1,
    ]
  ) {
    const lineY =
      chartY +
      chartHeight *
        fraction;


    page.drawLine({
      start: {
        x:
          chartX,

        y:
          lineY,
      },

      end: {
        x:
          chartX +
          chartWidth,

        y:
          lineY,
      },

      thickness:
        0.35,

      color:
        BORDER,
    });
  }


  const coordinates =
    valid.map(
      (
        point,
        index
      ) => {
        const value =
          point.followersCount ||
          0;


        return {
          x:
            chartX +
            (
              index /
              Math.max(
                valid.length -
                1,
                1
              )
            ) *
              chartWidth,

          y:
            chartY +
            (
              (
                value -
                minimum
              ) /
              range
            ) *
              chartHeight,

          value,

          dateKey:
            point.dateKey,
        };
      }
    );


  for (
    let index =
      1;
    index <
      coordinates.length;
    index++
  ) {
    page.drawLine({
      start: {
        x:
          coordinates[
            index -
            1
          ].x,

        y:
          coordinates[
            index -
            1
          ].y,
      },

      end: {
        x:
          coordinates[
            index
          ].x,

        y:
          coordinates[
            index
          ].y,
      },

      thickness:
        1.5,

      color:
        BLUE,
    });
  }


  for (
    const point
    of coordinates
  ) {
    page.drawCircle({
      x:
        point.x,

      y:
        point.y,

      size:
        2.1,

      color:
        BLUE,
    });
  }


  const first =
    coordinates[0];


  const last =
    coordinates[
      coordinates.length -
      1
    ];


  drawText({
    page,
    text:
      formatDateKey(
        first.dateKey
      ),
    x:
      chartX,
    y:
      y +
      8,
    size:
      4.5,
    font:
      regular,
    color:
      MUTED,
  });


  const lastLabel =
    formatDateKey(
      last.dateKey
    );


  const lastLabelWidth =
    regular.widthOfTextAtSize(
      lastLabel,
      4.5
    );


  drawText({
    page,
    text:
      lastLabel,
    x:
      chartX +
      chartWidth -
      lastLabelWidth,
    y:
      y +
      8,
    size:
      4.5,
    font:
      regular,
    color:
      MUTED,
  });
}


function drawSummary({
  page,
  x,
  y,
  width,
  height,
  firstDate,
  lastDate,
  daysWithData,
  followersDelta,
  followersPercent,
  engagementRate,
  bold,
  regular,
}: {
  page:
    PDFPage;

  x:
    number;

  y:
    number;

  width:
    number;

  height:
    number;

  firstDate:
    string |
    undefined;

  lastDate:
    string |
    undefined;

  daysWithData:
    number;

  followersDelta:
    number |
    null;

  followersPercent:
    number |
    null;

  engagementRate:
    number |
    null;

  bold:
    PDFFont;

  regular:
    PDFFont;
}) {
  drawCard({
    page,
    x,
    y,
    width,
    height,
  });


  drawText({
    page,
    text:
      "BASE HISTORICA",
    x:
      x +
      11,
    y:
      y +
      height -
      18,
    size:
      7,
    font:
      bold,
  });


  const rows = [
    [
      "Primeira coleta",
      formatDateKey(
        firstDate
      ),
    ],

    [
      "Ultima coleta",
      formatDateKey(
        lastDate
      ),
    ],

    [
      "Dias com dados",
      String(
        daysWithData
      ),
    ],
  ];


  let rowY =
    y +
    height -
    38;


  for (
    const [
      label,
      value
    ]
    of rows
  ) {
    page.drawRectangle({
      x:
        x +
        10,

      y:
        rowY -
        15,

      width:
        width -
        20,

      height:
        22,

      color:
        PAGE_BG,
    });


    drawText({
      page,
      text:
        label,
      x:
        x +
        16,
      y:
        rowY,
      size:
        4.7,
      font:
        regular,
      color:
        MUTED,
    });


    drawText({
      page,
      text:
        value,
      x:
        x +
        16,
      y:
        rowY -
        9,
      size:
        6.2,
      font:
        bold,
      color:
        TEXT,
      maxWidth:
        width -
        32,
    });


    rowY -=
      29;
  }


  page.drawRectangle({
    x:
      x +
      10,

    y:
      y +
      11,

    width:
      width -
      20,

    height:
      43,

    color:
      BLUE_LIGHT,
  });


  drawText({
    page,
    text:
      "CRESCIMENTO",
    x:
      x +
      16,
    y:
      y +
      41,
    size:
      4.6,
    font:
      bold,
    color:
      BLUE,
  });


  drawText({
    page,
    text:
      `${formatSignedNumber(
        followersDelta
      )} seguidores`,
    x:
      x +
      16,
    y:
      y +
      26,
    size:
      9,
    font:
      bold,
    color:
      BLUE,
    maxWidth:
      width -
      32,
  });


  drawText({
    page,
    text:
      `${formatPercent(
        followersPercent
      )} | Engajamento ${formatPercent(
        engagementRate,
        false
      )}`,
    x:
      x +
      16,
    y:
      y +
      15,
    size:
      4.4,
    font:
      regular,
    color:
      MUTED,
    maxWidth:
      width -
      32,
  });
}


export async function GET(
  request:
    NextRequest
) {
  try {

    const currentUser =
      await getCurrentUser();


    if (
      !currentUser ||
      currentUser.status !==
        "APROVADO" ||
      !currentUser.agencyId
    ) {
      return NextResponse.json(
        {
          message:
            "Acesso nao autorizado.",
        },
        {
          status:
            401,
        }
      );
    }


    const saasAccess =
      await getCurrentUserSaasAccess();


    if (
      !canUseFeature(
        saasAccess,
        "reports"
      )
    ) {
      return NextResponse.json(
        {
          message:
            "Seu plano nao possui acesso aos relatorios.",
        },
        {
          status:
            403,
        }
      );
    }


    const clientId =
      String(
        request.nextUrl
          .searchParams
          .get(
            "cliente"
          ) ||
        ""
      ).trim();


    const templateId =
      String(
        request.nextUrl
          .searchParams
          .get(
            "modelo"
          ) ||
        ""
      ).trim();


    const requestedPeriod =
      Number(
        request.nextUrl
          .searchParams
          .get(
            "periodo"
          ) ||
        30
      );


    const period =
      [
        7,
        30,
        90,
      ].includes(
        requestedPeriod
      )
        ? requestedPeriod
        : 30;


    if (
      !clientId ||
      !templateId
    ) {
      return NextResponse.json(
        {
          message:
            "Selecione o cliente e o modelo do relatorio.",
        },
        {
          status:
            400,
        }
      );
    }


    const [
      client,
      template,
    ] =
      await Promise.all([
        prisma.client.findFirst({
          where: {
            id:
              clientId,

            agencyId:
              currentUser.agencyId,
          },

          select: {
            id:
              true,

            name:
              true,

            agencyId:
              true,

            internalResponsible:
              true,

            instagramConnection: {
              select: {
                instagramUserId:
                  true,

                username:
                  true,

                userAccessTokenEncrypted:
                  true,

                status:
                  true,
              },
            },
          },
        }),

        prisma.reportTemplate.findFirst({
          where: {
            id:
              templateId,

            agencyId:
              currentUser.agencyId,

            status:
              "ATIVO",
          },

          select: {
            id:
              true,

            name:
              true,

            sourceFileUrl:
              true,
          },
        }),
      ]);


    if (
      !client
    ) {
      return NextResponse.json(
        {
          message:
            "Cliente nao encontrado.",
        },
        {
          status:
            404,
        }
      );
    }


    if (
      !canAccessClient(
        currentUser,
        client
      )
    ) {
      return NextResponse.json(
        {
          message:
            "Voce nao possui acesso a este cliente.",
        },
        {
          status:
            403,
        }
      );
    }


    if (
      !template
    ) {
      return NextResponse.json(
        {
          message:
            "Modelo de relatorio nao encontrado.",
        },
        {
          status:
            404,
        }
      );
    }


    let dashboardMetrics:
      InstagramDashboardMetrics |
      null =
      null;


    const connection =
      client.instagramConnection;


    if (
      connection &&
      connection.status ===
        "ATIVO" &&
      connection
        .userAccessTokenEncrypted &&
      isMetaConfigured()
    ) {
      try {

        dashboardMetrics =
          await getInstagramDashboardMetrics({
            instagramUserId:
              connection
                .instagramUserId,

            accessToken:
              decryptMetaSecret(
                connection
                  .userAccessTokenEncrypted
              ),
          });


        try {

          await saveInstagramSnapshot({
            clientId:
              client.id,

            instagramUserId:
              connection
                .instagramUserId,

            metrics:
              dashboardMetrics,
          });

        }
        catch (
          snapshotError
        ) {

          console.error(
            "REPORT SNAPSHOT ERROR",
            snapshotError
          );
        }

      }
      catch (
        metricsError
      ) {

        console.error(
          "REPORT METRICS ERROR",
          metricsError
        );
      }
    }


    const history =
      await getInstagramHistorySummary({
        clientId:
          client.id,

        days:
          period,
      });


    const currentFollowers =
      dashboardMetrics
        ?.followersCount ??
      history.latest
        ?.followersCount ??
      null;


    const currentReach =
      dashboardMetrics
        ?.current
        .reach ??
      history.latest
        ?.reach ??
      null;


    const currentViews =
      dashboardMetrics
        ?.current
        .views ??
      history.latest
        ?.views ??
      null;


    const currentInteractions =
      dashboardMetrics
        ?.current
        .interactions ??
      history.latest
        ?.interactions ??
      null;


    const engagementRate =
      currentReach !==
        null &&
      currentReach >
        0 &&
      currentInteractions !==
        null
        ? (
            currentInteractions /
            currentReach
          ) *
          100
        : null;


    const templateResponse =
      await fetch(
        template.sourceFileUrl,
        {
          cache:
            "no-store",
        }
      );


    if (
      !templateResponse.ok
    ) {
      return NextResponse.json(
        {
          message:
            "Nao foi possivel carregar o PDF base.",
        },
        {
          status:
            502,
        }
      );
    }


    const sourcePdf =
      await templateResponse
        .arrayBuffer();


    const sourceDocument =
      await PDFDocument.load(
        sourcePdf
      );


    const sourcePage =
      sourceDocument
        .getPages()[0];


    if (
      !sourcePage
    ) {
      return NextResponse.json(
        {
          message:
            "O modelo PDF nao possui paginas.",
        },
        {
          status:
            422,
        }
      );
    }


    const {
      width,
      height,
    } =
      sourcePage.getSize();


    const outputDocument =
      await PDFDocument.create();


    const [
      backgroundPage,
    ] =
      await outputDocument
        .embedPdf(
          sourcePdf,
          [
            0,
          ]
        );


    const page =
      outputDocument.addPage([
        width,
        height,
      ]);


    page.drawPage(
      backgroundPage,
      {
        x:
          0,

        y:
          0,

        width,

        height,
      }
    );


    /*
     * O PDF enviado como modelo contem metricas
     * demonstrativas impressas na propria arte.
     *
     * Por isso apagamos toda a area central do
     * mockup e reconstruimos o relatorio com dados
     * reais. Cabecalho e rodape da identidade visual
     * continuam preservados.
     */
    const footerHeight =
      height *
      0.09;


    const headerHeight =
      height *
      0.105;


    const bodyBottom =
      footerHeight;


    const bodyTop =
      height -
      headerHeight;


    page.drawRectangle({
      x:
        0,

      y:
        bodyBottom,

      width,

      height:
        bodyTop -
        bodyBottom,

      color:
        PAGE_BG,
    });


    const regular =
      await outputDocument
        .embedFont(
          StandardFonts
            .Helvetica
        );


    const bold =
      await outputDocument
        .embedFont(
          StandardFonts
            .HelveticaBold
        );


    /*
     * Substitui tambem a caixa de periodo
     * antiga no cabecalho.
     */
    const periodBoxWidth =
      width *
      0.235;


    const periodBoxHeight =
      height *
      0.055;


    const periodBoxX =
      width -
      periodBoxWidth -
      width *
        0.105;


    const periodBoxY =
      height -
      periodBoxHeight -
      height *
        0.022;


    page.drawRectangle({
      x:
        periodBoxX,

      y:
        periodBoxY,

      width:
        periodBoxWidth,

      height:
        periodBoxHeight,

      color:
        NAVY,

      borderColor:
        rgb(
          0.25,
          0.33,
          0.45
        ),

      borderWidth:
        0.5,
    });


    drawText({
      page,

      text:
        "PERIODO ANALISADO",

      x:
        periodBoxX +
        8,

      y:
        periodBoxY +
        periodBoxHeight -
        12,

      size:
        4.5,

      font:
        regular,

      color:
        rgb(
          0.72,
          0.78,
          0.88
        ),
    });


    drawText({
      page,

      text:
        `Ultimos ${period} dias`,

      x:
        periodBoxX +
        8,

      y:
        periodBoxY +
        8,

      size:
        7,

      font:
        bold,

      color:
        WHITE,

      maxWidth:
        periodBoxWidth -
        16,
    });


    const margin =
      width *
      0.035;


    const bodyWidth =
      width -
      margin *
        2;


    const titleY =
      bodyTop -
      22;


    drawText({
      page,

      text:
        "VISAO GERAL",

      x:
        margin,

      y:
        titleY,

      size:
        9,

      font:
        bold,

      color:
        TEXT,
    });


    drawText({
      page,

      text:
        `${safeText(
          client.name
        )}${connection?.username ? ` | @${connection.username}` : ""}`,

      x:
        margin,

      y:
        titleY -
        11,

      size:
        5.3,

      font:
        regular,

      color:
        MUTED,

      maxWidth:
        bodyWidth,
    });


    const gap =
      width *
      0.012;


    const metricY =
      titleY -
      76;


    const metricHeight =
      58;


    const metricWidth =
      (
        bodyWidth -
        gap *
          4
      ) /
      5;


    const metricItems = [
      {
        label:
          "Seguidores",

        value:
          formatNumber(
            currentFollowers
          ),

        helper:
          `${formatSignedNumber(
            history.followersDelta
          )} no periodo`,
      },

      {
        label:
          "Crescimento",

        value:
          formatSignedNumber(
            history.followersDelta
          ),

        helper:
          `${formatPercent(
            history.followersPercent
          )} no periodo`,
      },

      {
        label:
          "Alcance",

        value:
          formatNumber(
            currentReach
          ),

        helper:
          "Contas alcancadas",
      },

      {
        label:
          "Visualizacoes",

        value:
          formatNumber(
            currentViews
          ),

        helper:
          "Visualizacoes na Meta",
      },

      {
        label:
          "Interacoes",

        value:
          formatNumber(
            currentInteractions
          ),

        helper:
          "Interacoes na Meta",
      },
    ];


    metricItems.forEach(
      (
        item,
        index
      ) => {

        drawMetricCard({
          page,

          x:
            margin +
            index *
              (
                metricWidth +
                gap
              ),

          y:
            metricY,

          width:
            metricWidth,

          height:
            metricHeight,

          label:
            item.label,

          value:
            item.value,

          helper:
            item.helper,

          bold,

          regular,
        });

      }
    );


    const lowerTop =
      metricY -
      12;


    const summaryWidth =
      bodyWidth *
      0.32;


    const chartWidth =
      bodyWidth -
      summaryWidth -
      gap;


    const middleHeight =
      151;


    const middleY =
      lowerTop -
      middleHeight;


    drawFollowersChart({
      page,

      x:
        margin,

      y:
        middleY,

      width:
        chartWidth,

      height:
        middleHeight,

      points:
        history.points,

      bold,

      regular,
    });


    drawSummary({
      page,

      x:
        margin +
        chartWidth +
        gap,

      y:
        middleY,

      width:
        summaryWidth,

      height:
        middleHeight,

      firstDate:
        history.first
          ?.dateKey,

      lastDate:
        history.latest
          ?.dateKey,

      daysWithData:
        history.daysWithData,

      followersDelta:
        history.followersDelta,

      followersPercent:
        history.followersPercent,

      engagementRate,

      bold,

      regular,
    });


    const insightY =
      bodyBottom +
      14;


    const insightHeight =
      middleY -
      insightY -
      12;


    drawCard({
      page,

      x:
        margin,

      y:
        insightY,

      width:
        bodyWidth,

      height:
        insightHeight,
    });


    drawText({
      page,

      text:
        "LEITURA DO PERIODO",

      x:
        margin +
        12,

      y:
        insightY +
        insightHeight -
        18,

      size:
        7,

      font:
        bold,
    });


    const insightColumnWidth =
      (
        bodyWidth -
        48
      ) /
      3;


    const insightItems = [
      {
        title:
          "Alcance",

        value:
          formatNumber(
            currentReach
          ),

        helper:
          dashboardMetrics
            ?.change
            .reach !==
            null &&
          dashboardMetrics
            ?.change
            .reach !==
            undefined
            ? `${formatPercent(
                dashboardMetrics
                  .change
                  .reach
              )} vs periodo comparavel`
            : "Periodo atual disponivel na Meta",
      },

      {
        title:
          "Visualizacoes",

        value:
          formatNumber(
            currentViews
          ),

        helper:
          dashboardMetrics
            ?.change
            .views !==
            null &&
          dashboardMetrics
            ?.change
            .views !==
            undefined
            ? `${formatPercent(
                dashboardMetrics
                  .change
                  .views
              )} vs periodo comparavel`
            : "Periodo atual disponivel na Meta",
      },

      {
        title:
          "Interacoes",

        value:
          formatNumber(
            currentInteractions
          ),

        helper:
          `Taxa sobre alcance: ${formatPercent(
            engagementRate,
            false
          )}`,
      },
    ];


    insightItems.forEach(
      (
        item,
        index
      ) => {

        const x =
          margin +
          12 +
          index *
            (
              insightColumnWidth +
              12
            );


        page.drawRectangle({
          x,

          y:
            insightY +
            14,

          width:
            insightColumnWidth,

          height:
            Math.max(
              42,
              insightHeight -
                44
            ),

          color:
            index ===
              0
              ? BLUE_LIGHT
              : PAGE_BG,
        });


        drawText({
          page,

          text:
            item.title.toUpperCase(),

          x:
            x +
            9,

          y:
            insightY +
            insightHeight -
            38,

          size:
            4.7,

          font:
            bold,

          color:
            MUTED,

          maxWidth:
            insightColumnWidth -
            18,
        });


        drawText({
          page,

          text:
            item.value,

          x:
            x +
            9,

          y:
            insightY +
            31,

          size:
            12,

          font:
            bold,

          color:
            index ===
              0
              ? BLUE
              : TEXT,

          maxWidth:
            insightColumnWidth -
            18,
        });


        drawText({
          page,

          text:
            item.helper,

          x:
            x +
            9,

          y:
            insightY +
            18,

          size:
            4.2,

          font:
            regular,

          color:
            MUTED,

          maxWidth:
            insightColumnWidth -
            18,
        });

      }
    );


    drawText({
      page,

      text:
        `Dados atualizados em ${formatDateKey(
          todayDateKey()
        )}. Metricas obtidas pela integracao Meta e pelo historico proprio do AprovUp.`,

      x:
        margin,

      y:
        bodyBottom +
        3,

      size:
        3.7,

      font:
        regular,

      color:
        MUTED,

      maxWidth:
        bodyWidth,
    });


    outputDocument.setTitle(
      `Relatorio Instagram - ${safeText(
        client.name
      )}`
    );


    outputDocument.setAuthor(
      "AprovUp"
    );


    outputDocument.setSubject(
      `Metricas reais do Instagram - ultimos ${period} dias`
    );


    const output =
      await outputDocument
        .save();


    const responseBody =
      Uint8Array.from(
        output
      ).buffer;


    const filename =
      `relatorio-${safeFilename(
        client.name
      )}-${todayDateKey().slice(
        0,
        7
      )}.pdf`;


    return new NextResponse(
      responseBody,
      {
        status:
          200,

        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `attachment; filename="${filename}"`,

          "Cache-Control":
            "private, no-store, max-age=0",

          "X-AprovUp-Report-Period":
            String(
              period
            ),

          "X-AprovUp-Report-Followers":
            String(
              currentFollowers ??
              ""
            ),

          "X-AprovUp-Report-Reach":
            String(
              currentReach ??
              ""
            ),

          "X-AprovUp-Report-Views":
            String(
              currentViews ??
              ""
            ),

          "X-AprovUp-Report-Interactions":
            String(
              currentInteractions ??
              ""
            ),
        },
      }
    );

  }
  catch (
    error
  ) {

    console.error(
      "APROVUP LIVE REPORT ERROR",
      error
    );


    return NextResponse.json(
      {
        message:
          error instanceof
            Error
            ? `Nao foi possivel gerar o relatorio: ${error.message}`
            : "Nao foi possivel gerar o relatorio.",
      },
      {
        status:
          500,
      }
    );
  }
}

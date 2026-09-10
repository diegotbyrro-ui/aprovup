import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  PDFDocument,
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
  canUseMetaIntegration,
} from "@/lib/metaAccess";

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


export const runtime = "nodejs";
export const dynamic = "force-dynamic";


type TextAlign =
  | "left"
  | "center"
  | "right";


type ReportElement = {
  metricKey: string;
  page: number;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  fontWeight: number;
  textAlign: TextAlign;
  color: string;
};


type SnapshotMetric = {
  dateKey: string;
  followersCount: number | null;
  reach: number | null;
  views: number | null;
  interactions: number | null;
};


function clamp(
  value: number,
  minimum: number,
  maximum: number
) {
  return Math.min(
    maximum,
    Math.max(
      minimum,
      value
    )
  );
}


function normalizeElements(
  value: unknown
): ReportElement[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  return value
    .map(
      (raw) => {
        if (
          !raw ||
          typeof raw !==
            "object"
        ) {
          return null;
        }

        const item =
          raw as Record<
            string,
            unknown
          >;

        const align =
          String(
            item.textAlign ||
            "left"
          );

        const textAlign:
          TextAlign =
          align ===
            "center" ||
          align ===
            "right"
            ? align
            : "left";

        const rawColor =
          String(
            item.color ||
            "#0f172a"
          );

        const color =
          /^#[0-9a-fA-F]{6}$/.test(
            rawColor
          )
            ? rawColor
            : "#0f172a";

        return {
          metricKey:
            String(
              item.metricKey ||
              ""
            ),
          page:
            clamp(
              Math.round(
                Number(
                  item.page ||
                  1
                )
              ),
              1,
              100
            ),
          x:
            clamp(
              Number(
                item.x ||
                0
              ),
              0,
              0.98
            ),
          y:
            clamp(
              Number(
                item.y ||
                0
              ),
              0,
              0.98
            ),
          width:
            clamp(
              Number(
                item.width ||
                0.3
              ),
              0.04,
              0.98
            ),
          fontSize:
            clamp(
              Number(
                item.fontSize ||
                28
              ),
              6,
              120
            ),
          fontWeight:
            Number(
              item.fontWeight ||
              700
            ),
          textAlign,
          color,
        };
      }
    )
    .filter(
      (
        item
      ): item is ReportElement =>
        Boolean(
          item &&
          item.metricKey
        )
    );
}


function percentageChange(
  current: number | null,
  previous: number | null
) {
  if (
    current ===
      null ||
    previous ===
      null ||
    previous ===
      0
  ) {
    return null;
  }

  return (
    (
      current -
      previous
    ) /
    Math.abs(
      previous
    )
  ) *
    100;
}


function numberText(
  value: number | null
) {
  if (
    value ===
      null ||
    !Number.isFinite(
      value
    )
  ) {
    return "—";
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


function signedNumberText(
  value: number | null
) {
  if (
    value ===
      null ||
    !Number.isFinite(
      value
    )
  ) {
    return "—";
  }

  const rounded =
    Math.round(
      value
    );

  const formatted =
    new Intl
      .NumberFormat(
        "pt-BR",
        {
          maximumFractionDigits:
            0,
        }
      )
      .format(
        Math.abs(
          rounded
        )
      );

  if (
    rounded >
    0
  ) {
    return `+${formatted}`;
  }

  if (
    rounded <
    0
  ) {
    return `-${formatted}`;
  }

  return "0";
}


function percentageText(
  value: number | null,
  signed = true
) {
  if (
    value ===
      null ||
    !Number.isFinite(
      value
    )
  ) {
    return "—";
  }

  const formatted =
    Math.abs(
      value
    )
      .toFixed(
        1
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
    return `+${formatted}%`;
  }

  if (
    value <
    0
  ) {
    return `-${formatted}%`;
  }

  return `${formatted}%`;
}


function toDateKey(
  date: Date
) {
  return [
    date.getUTCFullYear(),
    String(
      date.getUTCMonth() +
      1
    ).padStart(
      2,
      "0"
    ),
    String(
      date.getUTCDate()
    ).padStart(
      2,
      "0"
    ),
  ].join(
    "-"
  );
}


function fallbackPeriod() {
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
        1
      )
    );

  const previousStart =
    new Date(
      Date.UTC(
        year,
        month - 1,
        1
      )
    );

  const previousLastDay =
    new Date(
      Date.UTC(
        year,
        month,
        0
      )
    ).getUTCDate();

  const comparableDay =
    Math.min(
      now.getUTCDate(),
      previousLastDay
    );

  const previousEnd =
    new Date(
      Date.UTC(
        previousStart
          .getUTCFullYear(),
        previousStart
          .getUTCMonth(),
        comparableDay,
        23,
        59,
        59
      )
    );

  return {
    currentStart,
    currentEnd:
      now,
    previousStart,
    previousEnd,
  };
}


function periodLabel(
  start: Date
) {
  const months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  return `${
    months[
      start.getUTCMonth()
    ]
  }/${start.getUTCFullYear()}`;
}


function safePdfText(
  value: string
) {
  return value
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
    )
    .trim();
}


function hexColor(
  value: string
) {
  const clean =
    /^#[0-9a-fA-F]{6}$/.test(
      value
    )
      ? value.slice(
          1
        )
      : "0f172a";

  return rgb(
    parseInt(
      clean.slice(
        0,
        2
      ),
      16
    ) / 255,
    parseInt(
      clean.slice(
        2,
        4
      ),
      16
    ) / 255,
    parseInt(
      clean.slice(
        4,
        6
      ),
      16
    ) / 255
  );
}


function fittedFontSize({
  text,
  font,
  requestedSize,
  maxWidth,
}: {
  text: string;
  font: PDFFont;
  requestedSize: number;
  maxWidth: number;
}) {
  let size =
    requestedSize;

  while (
    size >
      5 &&
    font.widthOfTextAtSize(
      text,
      size
    ) >
      maxWidth
  ) {
    size -=
      0.5;
  }

  return Math.max(
    5,
    size
  );
}


function pickSnapshots(
  snapshots: SnapshotMetric[],
  period: {
    currentStart: Date;
    currentEnd: Date;
    previousStart: Date;
    previousEnd: Date;
  }
) {
  const currentStartKey =
    toDateKey(
      period.currentStart
    );

  const currentEndKey =
    toDateKey(
      period.currentEnd
    );

  const previousStartKey =
    toDateKey(
      period.previousStart
    );

  const previousEndKey =
    toDateKey(
      period.previousEnd
    );

  const current =
    snapshots.filter(
      (snapshot) =>
        snapshot.dateKey >=
          currentStartKey &&
        snapshot.dateKey <=
          currentEndKey
    );

  const previous =
    snapshots.filter(
      (snapshot) =>
        snapshot.dateKey >=
          previousStartKey &&
        snapshot.dateKey <=
          previousEndKey
    );

  return {
    firstCurrent:
      current[0] ||
      null,
    latestCurrent:
      current[
        current.length -
        1
      ] ||
      null,
    latestPrevious:
      previous[
        previous.length -
        1
      ] ||
      null,
  };
}


function metricsFromSnapshots({
  followersCount,
  current,
  previous,
  period,
}: {
  followersCount: number | null;
  current: SnapshotMetric;
  previous: SnapshotMetric | null;
  period: {
    currentStart: Date;
    currentEnd: Date;
    previousStart: Date;
    previousEnd: Date;
  };
}): InstagramDashboardMetrics {
  return {
    followersCount,
    current: {
      reach:
        current.reach,
      views:
        current.views,
      interactions:
        current.interactions,
    },
    previous: {
      reach:
        previous?.reach ??
        null,
      views:
        previous?.views ??
        null,
      interactions:
        previous?.interactions ??
        null,
    },
    change: {
      reach:
        percentageChange(
          current.reach,
          previous?.reach ??
          null
        ),
      views:
        percentageChange(
          current.views,
          previous?.views ??
          null
        ),
      interactions:
        percentageChange(
          current.interactions,
          previous?.interactions ??
          null
        ),
    },
    period,
  };
}


function safeFilename(
  value: string
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


export async function GET(
  request: NextRequest
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
            "Acesso não autorizado.",
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
            "Seu plano não possui acesso aos relatórios.",
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

    if (
      !clientId ||
      !templateId
    ) {
      return NextResponse.json(
        {
          message:
            "Selecione o cliente e o modelo do relatório.",
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
    ] = await Promise.all([
      prisma.client.findFirst({
        where: {
          id:
            clientId,
          agencyId:
            currentUser.agencyId,
        },
        select: {
          id: true,
          name: true,
          agencyId: true,
          internalResponsible: true,
          instagramConnection: {
            select: {
              instagramUserId: true,
              userAccessTokenEncrypted: true,
              status: true,
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
          id: true,
          name: true,
          sourceFileUrl: true,
          pageCount: true,
          elements: true,
        },
      }),
    ]);

    if (
      !client
    ) {
      return NextResponse.json(
        {
          message:
            "Cliente não encontrado.",
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
            "Você não possui acesso a este cliente.",
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
            "Modelo de relatório não encontrado.",
        },
        {
          status:
            404,
        }
      );
    }

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
            "Não foi possível carregar o PDF base do relatório.",
        },
        {
          status:
            502,
        }
      );
    }

    const sourcePdf =
      await templateResponse.arrayBuffer();

    const pdfDocument =
      await PDFDocument.load(
        sourcePdf
      );

    const regularFont =
      await pdfDocument.embedFont(
        StandardFonts.Helvetica
      );

    const boldFont =
      await pdfDocument.embedFont(
        StandardFonts.HelveticaBold
      );

    let metrics:
      InstagramDashboardMetrics |
      null =
      null;

    let metricsSource =
      "sem-metricas";

    const connection =
      client.instagramConnection;

    if (
      connection &&
      connection.status ===
        "ATIVO" &&
      connection.userAccessTokenEncrypted &&
      isMetaConfigured() &&
      canUseMetaIntegration(
        currentUser
      )
    ) {
      try {
        metrics =
          await getInstagramDashboardMetrics({
            instagramUserId:
              connection.instagramUserId,
            accessToken:
              decryptMetaSecret(
                connection.userAccessTokenEncrypted
              ),
          });

        metricsSource =
          "meta";

        try {
          await saveInstagramSnapshot({
            clientId:
              client.id,
            instagramUserId:
              connection.instagramUserId,
            metrics,
          });
        }
        catch (
          snapshotError
        ) {
          console.error(
            "REPORT SNAPSHOT SAVE ERROR",
            snapshotError
          );
        }
      }
      catch (
        metaError
      ) {
        console.error(
          "REPORT META METRICS ERROR",
          metaError
        );
      }
    }

    const period =
      metrics?.period ||
      fallbackPeriod();

    const snapshots =
      await prisma.instagramMetricSnapshot.findMany({
        where: {
          clientId:
            client.id,
          dateKey: {
            gte:
              toDateKey(
                period.previousStart
              ),
            lte:
              toDateKey(
                period.currentEnd
              ),
          },
        },
        select: {
          dateKey: true,
          followersCount: true,
          reach: true,
          views: true,
          interactions: true,
        },
        orderBy: {
          dateKey:
            "asc",
        },
      });

    const selectedSnapshots =
      pickSnapshots(
        snapshots,
        period
      );

    if (
      !metrics &&
      selectedSnapshots.latestCurrent
    ) {
      metrics =
        metricsFromSnapshots({
          followersCount:
            selectedSnapshots.latestCurrent.followersCount,
          current:
            selectedSnapshots.latestCurrent,
          previous:
            selectedSnapshots.latestPrevious,
          period,
        });

      metricsSource =
        "snapshot";
    }

    const currentFollowers =
      metrics?.followersCount ??
      selectedSnapshots.latestCurrent?.followersCount ??
      null;

    const followerBaseline =
      selectedSnapshots.latestPrevious?.followersCount ??
      selectedSnapshots.firstCurrent?.followersCount ??
      null;

    const followersGained =
      currentFollowers !==
        null &&
      followerBaseline !==
        null
        ? currentFollowers -
          followerBaseline
        : null;

    const currentReach =
      metrics?.current.reach ??
      null;

    const currentViews =
      metrics?.current.views ??
      null;

    const currentInteractions =
      metrics?.current.interactions ??
      null;

    const engagementRate =
      currentReach &&
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

    const values:
      Record<
        string,
        string
      > = {
      "client.name":
        client.name,
      "period.label":
        periodLabel(
          period.currentStart
        ),
      "instagram.followers":
        numberText(
          currentFollowers
        ),
      "instagram.followers_gained":
        signedNumberText(
          followersGained
        ),
      "instagram.reach":
        numberText(
          currentReach
        ),
      "instagram.reach_change":
        percentageText(
          metrics?.change.reach ??
          null
        ),
      "instagram.views":
        numberText(
          currentViews
        ),
      "instagram.views_change":
        percentageText(
          metrics?.change.views ??
          null
        ),
      "instagram.interactions":
        numberText(
          currentInteractions
        ),
      "instagram.engagement_rate":
        percentageText(
          engagementRate,
          false
        ),
    };

    const elements =
      normalizeElements(
        template.elements
      );

    const pages =
      pdfDocument.getPages();

    for (
      const element
      of elements
    ) {
      const page =
        pages[
          element.page -
          1
        ];

      if (
        !page
      ) {
        continue;
      }

      const rawValue =
        values[
          element.metricKey
        ] ??
        "—";

      const text =
        safePdfText(
          rawValue
        ) ||
        "-";

      const {
        width:
          pageWidth,
        height:
          pageHeight,
      } =
        page.getSize();

      const requestedFontSize =
        clamp(
          element.fontSize *
            pageWidth /
            760,
          5,
          120
        );

      const font =
        element.fontWeight >=
          600
          ? boldFont
          : regularFont;

      const x =
        clamp(
          element.x *
            pageWidth,
          0,
          pageWidth -
            1
        );

      const availableWidth =
        Math.max(
          5,
          Math.min(
            element.width *
              pageWidth,
            pageWidth -
              x
          )
        );

      const fontSize =
        fittedFontSize({
          text,
          font,
          requestedSize:
            requestedFontSize,
          maxWidth:
            availableWidth,
        });

      const textWidth =
        font.widthOfTextAtSize(
          text,
          fontSize
        );

      let drawX =
        x;

      if (
        element.textAlign ===
        "center"
      ) {
        drawX =
          x +
          Math.max(
            0,
            (
              availableWidth -
              textWidth
            ) /
              2
          );
      }
      else if (
        element.textAlign ===
        "right"
      ) {
        drawX =
          x +
          Math.max(
            0,
            availableWidth -
              textWidth
          );
      }

      const topY =
        element.y *
        pageHeight;

      const drawY =
        clamp(
          pageHeight -
            topY -
            fontSize,
          0,
          pageHeight -
            fontSize
        );

      page.drawText(
        text,
        {
          x:
            drawX,
          y:
            drawY,
          size:
            fontSize,
          font,
          color:
            hexColor(
              element.color
            ),
          maxWidth:
            availableWidth,
        }
      );
    }

    const output =
      await pdfDocument.save();

    /*
     * pdf-lib devolve Uint8Array.
     * NextResponse no Next.js 16 espera um BodyInit compatível.
     * Criamos um ArrayBuffer real antes de devolver o PDF.
     */
    const responseBody =
      Uint8Array.from(
        output
      ).buffer;

    const filename =
      `relatorio-${safeFilename(
        client.name
      )}-${toDateKey(
        period.currentEnd
      ).slice(
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
          "X-AprovUp-Metrics-Source":
            metricsSource,
          "X-AprovUp-Report-Fields":
            String(
              elements.length
            ),
        },
      }
    );
  }
  catch (
    error
  ) {
    console.error(
      "APROVUP REPORT GENERATION ERROR",
      error
    );

    return NextResponse.json(
      {
        message:
          error instanceof
            Error
            ? `Não foi possível gerar o relatório: ${error.message}`
            : "Não foi possível gerar o relatório.",
      },
      {
        status:
          500,
      }
    );
  }
}

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  PDFDocument,
  PDFImage,
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
  getInstagramTopMedia,
  isMetaConfigured,
  type InstagramDashboardMetrics,
  type InstagramTopMediaItem,
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


const DESIGN_WIDTH =
  1024;

const DESIGN_HEIGHT =
  1536;


const WHITE =
  rgb(
    1,
    1,
    1
  );

const CARD =
  rgb(
    0.965,
    0.98,
    0.99
  );

const CARD_ALT =
  rgb(
    0.94,
    0.965,
    0.99
  );

const TEXT =
  rgb(
    0.035,
    0.055,
    0.10
  );

const MUTED =
  rgb(
    0.28,
    0.36,
    0.48
  );

const BLUE =
  rgb(
    0.02,
    0.36,
    0.95
  );

const GREEN =
  rgb(
    0.02,
    0.57,
    0.30
  );

const RED =
  rgb(
    0.82,
    0.16,
    0.16
  );

const DARK =
  rgb(
    0.035,
    0.065,
    0.10
  );

const DARK_BOX =
  rgb(
    0.06,
    0.10,
    0.15
  );

const GRID =
  rgb(
    0.84,
    0.89,
    0.95
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


function sx(
  page:
    PDFPage,
  value:
    number
) {
  return (
    value /
    DESIGN_WIDTH
  ) *
    page.getWidth();
}


function sy(
  page:
    PDFPage,
  top:
    number
) {
  return (
    page.getHeight() -
    (
      top /
      DESIGN_HEIGHT
    ) *
      page.getHeight()
  );
}


function sw(
  page:
    PDFPage,
  value:
    number
) {
  return (
    value /
    DESIGN_WIDTH
  ) *
    page.getWidth();
}


function sh(
  page:
    PDFPage,
  value:
    number
) {
  return (
    value /
    DESIGN_HEIGHT
  ) *
    page.getHeight();
}


function mask({
  page,
  x,
  y,
  width,
  height,
  color,
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

  color:
    ReturnType<
      typeof rgb
    >;
}) {
  page.drawRectangle({
    x:
      sx(
        page,
        x
      ),

    y:
      sy(
        page,
        y +
        height
      ),

    width:
      sw(
        page,
        width
      ),

    height:
      sh(
        page,
        height
      ),

    color,
  });
}


function cleanText(
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
    )
    .trim();
}


function fitSize({
  text,
  font,
  requested,
  maxWidth,
}: {
  text:
    string;

  font:
    PDFFont;

  requested:
    number;

  maxWidth:
    number;
}) {
  let size =
    requested;


  while (
    size >
      4 &&
    font.widthOfTextAtSize(
      text,
      size
    ) >
      maxWidth
  ) {
    size -=
      0.25;
  }


  return Math.max(
    4,
    size
  );
}


function textAt({
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
    cleanText(
      text
    );


  const pdfSize =
    sw(
      page,
      size
    );


  const widthLimit =
    maxWidth
      ? sw(
          page,
          maxWidth
        )
      : undefined;


  const finalSize =
    widthLimit
      ? fitSize({
          text:
            clean,

          font,

          requested:
            pdfSize,

          maxWidth:
            widthLimit,
        })
      : pdfSize;


  page.drawText(
    clean,
    {
      x:
        sx(
          page,
          x
        ),

      y:
        sy(
          page,
          y
        ) -
        finalSize,

      size:
        finalSize,

      font,

      color,

      maxWidth:
        widthLimit,
    }
  );
}


function multiline({
  page,
  text,
  x,
  y,
  size,
  lineHeight,
  maxWidth,
  maxLines,
  font,
  color =
    TEXT,
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

  lineHeight:
    number;

  maxWidth:
    number;

  maxLines:
    number;

  font:
    PDFFont;

  color?:
    ReturnType<
      typeof rgb
    >;
}) {
  const words =
    cleanText(
      text
    )
      .split(
        /\s+/
      )
      .filter(
        Boolean
      );


  const lines:
    string[] =
    [];


  let current =
    "";


  const pdfSize =
    sw(
      page,
      size
    );


  const pdfMaxWidth =
    sw(
      page,
      maxWidth
    );


  for (
    const word
    of words
  ) {
    const candidate =
      current
        ? `${current} ${word}`
        : word;


    if (
      font.widthOfTextAtSize(
        candidate,
        pdfSize
      ) <=
        pdfMaxWidth
    ) {
      current =
        candidate;
    }
    else {
      if (
        current
      ) {
        lines.push(
          current
        );
      }

      current =
        word;

      if (
        lines.length >=
        maxLines
      ) {
        break;
      }
    }
  }


  if (
    current &&
    lines.length <
      maxLines
  ) {
    lines.push(
      current
    );
  }


  lines
    .slice(
      0,
      maxLines
    )
    .forEach(
      (
        line,
        index
      ) => {
        textAt({
          page,

          text:
            line,

          x,

          y:
            y +
            index *
              lineHeight,

          size,

          font,

          color,

          maxWidth,
        });
      }
    );
}


function numberText(
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


function signedNumber(
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
    return `+${numberText(
      rounded
    )}`;
  }


  return numberText(
    rounded
  );
}


function percentText(
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


function dateLabel(
  value:
    string |
    null |
    undefined
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


  return `${day}/${month}/${year}`;
}


function fileSlug(
  value:
    string
) {
  return value
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
    ) ||
    "cliente";
}


function topMediaTitle(
  item:
    InstagramTopMediaItem
) {
  const caption =
    cleanText(
      item.caption ||
      ""
    )
      .replace(
        /\s+/g,
        " "
      )
      .trim();


  if (
    !caption
  ) {
    return "Conteudo publicado";
  }


  return caption.length >
    38
      ? `${caption.slice(
          0,
          35
        )}...`
      : caption;
}


function mediaFormat(
  item:
    InstagramTopMediaItem
) {
  if (
    item.mediaProductType ===
      "REELS"
  ) {
    return "Reels";
  }


  if (
    item.mediaType ===
      "CAROUSEL_ALBUM"
  ) {
    return "Carrossel";
  }


  if (
    item.mediaType ===
      "VIDEO"
  ) {
    return "Video";
  }


  return "Posts no feed";
}


function mediaScore(
  item:
    InstagramTopMediaItem
) {
  return (
    item.interactions ??
    item.reach ??
    item.views ??
    (
      item.likes +
      item.comments
    )
  );
}


async function remoteImage(
  document:
    PDFDocument,
  url:
    string |
    null
): Promise<
  PDFImage |
  null
> {
  if (
    !url
  ) {
    return null;
  }


  try {
    const response =
      await fetch(
        url,
        {
          cache:
            "no-store",
        }
      );


    if (
      !response.ok
    ) {
      return null;
    }


    const bytes =
      new Uint8Array(
        await response
          .arrayBuffer()
      );


    const type =
      response.headers
        .get(
          "content-type"
        )
        ?.toLowerCase() ||
      "";


    if (
      type.includes(
        "png"
      )
    ) {
      return await document
        .embedPng(
          bytes
        );
    }


    try {
      return await document
        .embedJpg(
          bytes
        );
    }
    catch {
      return await document
        .embedPng(
          bytes
        );
    }
  }
  catch {
    return null;
  }
}


function drawOverviewCard({
  page,
  x,
  value,
  label,
  change,
  helper,
  bold,
  regular,
}: {
  page:
    PDFPage;

  x:
    number;

  value:
    string;

  label:
    string;

  change:
    string;

  helper:
    string;

  bold:
    PDFFont;

  regular:
    PDFFont;
}) {
  mask({
    page,
    x:
      x +
      2,
    y:
      292,
    width:
      125,
    height:
      111,
    color:
      CARD,
  });


  textAt({
    page,
    text:
      value,
    x:
      x +
      11,
    y:
      299,
    size:
      22,
    font:
      bold,
    color:
      TEXT,
    maxWidth:
      108,
  });


  textAt({
    page,
    text:
      label,
    x:
      x +
      11,
    y:
      330,
    size:
      13,
    font:
      regular,
    color:
      TEXT,
    maxWidth:
      108,
  });


  const changeColor =
    change.startsWith(
      "-"
    )
      ? RED
      : GREEN;


  textAt({
    page,
    text:
      change,
    x:
      x +
      11,
    y:
      358,
    size:
      15,
    font:
      bold,
    color:
      changeColor,
    maxWidth:
      108,
  });


  textAt({
    page,
    text:
      helper,
    x:
      x +
      11,
    y:
      385,
    size:
      7,
    font:
      regular,
    color:
      MUTED,
    maxWidth:
      108,
  });
}


function drawGrowthChart({
  page,
  points,
  followersDelta,
  followersPercent,
  bold,
  regular,
}: {
  page:
    PDFPage;

  points:
    Array<{
      dateKey:
        string;

      followersCount:
        number |
        null;
    }>;

  followersDelta:
    number |
    null;

  followersPercent:
    number |
    null;

  bold:
    PDFFont;

  regular:
    PDFFont;
}) {
  mask({
    page,
    x:
      80,
    y:
      510,
    width:
      414,
    height:
      230,
    color:
      WHITE,
  });


  const valid =
    points.filter(
      (
        point
      ) =>
        point.followersCount !==
        null
    );


  const x0 =
    82;

  const y0 =
    532;

  const chartWidth =
    376;

  const chartHeight =
    108;


  for (
    const fraction
    of [
      0,
      0.33,
      0.66,
      1,
    ]
  ) {
    const y =
      y0 +
      chartHeight *
        fraction;


    page.drawLine({
      start: {
        x:
          sx(
            page,
            x0
          ),
        y:
          sy(
            page,
            y
          ),
      },

      end: {
        x:
          sx(
            page,
            x0 +
            chartWidth
          ),
        y:
          sy(
            page,
            y
          ),
      },

      thickness:
        0.45,

      color:
        GRID,
    });
  }


  if (
    valid.length >=
      2
  ) {
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


    const range =
      Math.max(
        maximum -
        minimum,
        10
      );


    const coords =
      valid.map(
        (
          point,
          index
        ) => {
          const normalized =
            (
              (
                point.followersCount ||
                0
              ) -
              minimum
            ) /
            range;


          return {
            x:
              x0 +
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
              y0 +
              chartHeight -
              normalized *
                chartHeight,

            dateKey:
              point.dateKey,

            value:
              point.followersCount ||
              0,
          };
        }
      );


    for (
      let index =
        1;
      index <
        coords.length;
      index++
    ) {
      page.drawLine({
        start: {
          x:
            sx(
              page,
              coords[
                index -
                1
              ].x
            ),
          y:
            sy(
              page,
              coords[
                index -
                1
              ].y
            ),
        },

        end: {
          x:
            sx(
              page,
              coords[
                index
              ].x
            ),
          y:
            sy(
              page,
              coords[
                index
              ].y
            ),
        },

        thickness:
          1.6,

        color:
          BLUE,
      });
    }


    for (
      const point
      of coords
    ) {
      page.drawCircle({
        x:
          sx(
            page,
            point.x
          ),

        y:
          sy(
            page,
            point.y
          ),

        size:
          sw(
            page,
            3.4
          ),

        color:
          BLUE,
      });
    }


    textAt({
      page,
      text:
        dateLabel(
          coords[0]
            .dateKey
        ),
      x:
        82,
      y:
        648,
      size:
        8,
      font:
        regular,
      color:
        MUTED,
    });


    textAt({
      page,
      text:
        dateLabel(
          coords[
            coords.length -
            1
          ].dateKey
        ),
      x:
        405,
      y:
        648,
      size:
        8,
      font:
        regular,
      color:
        MUTED,
      maxWidth:
        76,
    });
  }
  else {
    textAt({
      page,
      text:
        "Historico ainda em coleta",
      x:
        180,
      y:
        576,
      size:
        10,
      font:
        bold,
      color:
        MUTED,
      maxWidth:
        190,
    });
  }


  mask({
    page,
    x:
      34,
    y:
      674,
    width:
      458,
    height:
      67,
    color:
      CARD,
  });


  textAt({
    page,
    text:
      signedNumber(
        followersDelta
      ),
    x:
      102,
    y:
      689,
    size:
      19,
    font:
      bold,
    color:
      TEXT,
    maxWidth:
      90,
  });


  textAt({
    page,
    text:
      "novos seguidores",
    x:
      102,
    y:
      715,
    size:
      10,
    font:
      regular,
    color:
      TEXT,
  });


  multiline({
    page,
    text:
      `Crescimento de ${percentText(
        followersPercent
      )} dentro do historico atualmente disponivel no AprovUp.`,
    x:
      221,
    y:
      688,
    size:
      8,
    lineHeight:
      12,
    maxWidth:
      252,
    maxLines:
      3,
    font:
      regular,
    color:
      MUTED,
  });
}


function drawReachViews({
  page,
  reach,
  views,
  reachChange,
  viewsChange,
  bold,
  regular,
}: {
  page:
    PDFPage;

  reach:
    number |
    null;

  views:
    number |
    null;

  reachChange:
    number |
    null;

  viewsChange:
    number |
    null;

  bold:
    PDFFont;

  regular:
    PDFFont;
}) {
  mask({
    page,
    x:
      528,
    y:
      514,
    width:
      466,
    height:
      226,
    color:
      WHITE,
  });


  const cards = [
    {
      x:
        532,

      value:
        numberText(
          reach
        ),

      label:
        "Contas alcancadas",

      change:
        percentText(
          reachChange
        ),

      helper:
        "Numero de contas unicas alcancadas no periodo disponivel pela Meta.",
    },

    {
      x:
        772,

      value:
        numberText(
          views
        ),

      label:
        "Visualizacoes",

      change:
        percentText(
          viewsChange
        ),

      helper:
        "Numero de visualizacoes registradas pela Meta no periodo atual.",
    },
  ];


  for (
    const card
    of cards
  ) {
    mask({
      page,
      x:
        card.x,
      y:
        514,
      width:
        222,
      height:
        226,
      color:
        CARD,
    });


    textAt({
      page,
      text:
        card.value,
      x:
        card.x +
        26,
      y:
        534,
      size:
        24,
      font:
        bold,
      color:
        TEXT,
      maxWidth:
        170,
    });


    textAt({
      page,
      text:
        card.label,
      x:
        card.x +
        26,
      y:
        573,
      size:
        13,
      font:
        regular,
      color:
        TEXT,
      maxWidth:
        170,
    });


    textAt({
      page,
      text:
        card.change,
      x:
        card.x +
        67,
      y:
        607,
      size:
        18,
      font:
        bold,
      color:
        card.change.startsWith(
          "-"
        )
          ? RED
          : GREEN,
      maxWidth:
        110,
    });


    multiline({
      page,
      text:
        card.helper,
      x:
        card.x +
        20,
      y:
        661,
      size:
        9,
      lineHeight:
        13,
      maxWidth:
        182,
      maxLines:
        4,
      font:
        regular,
      color:
        MUTED,
    });
  }
}


function drawInteractions({
  page,
  interactions,
  reach,
  views,
  engagement,
  followersDelta,
  bold,
  regular,
}: {
  page:
    PDFPage;

  interactions:
    number |
    null;

  reach:
    number |
    null;

  views:
    number |
    null;

  engagement:
    number |
    null;

  followersDelta:
    number |
    null;

  bold:
    PDFFont;

  regular:
    PDFFont;
}) {
  mask({
    page,
    x:
      32,
    y:
      829,
    width:
      361,
    height:
      289,
    color:
      WHITE,
  });


  page.drawCircle({
    x:
      sx(
        page,
        116
      ),

    y:
      sy(
        page,
        917
      ),

    size:
      sw(
        page,
        72
      ),

    color:
      BLUE,
  });


  page.drawCircle({
    x:
      sx(
        page,
        116
      ),

    y:
      sy(
        page,
        917
      ),

    size:
      sw(
        page,
        44
      ),

    color:
      WHITE,
  });


  const interactionValue =
    cleanText(
      numberText(
        interactions
      )
    );


  const interactionValueSize =
    sw(
      page,
      19
    );


  const interactionValueWidth =
    bold.widthOfTextAtSize(
      interactionValue,
      interactionValueSize
    );


  page.drawText(
    interactionValue,
    {
      x:
        sx(
          page,
          116
        ) -
        interactionValueWidth /
          2,

      y:
        sy(
          page,
          897
        ) -
        interactionValueSize,

      size:
        interactionValueSize,

      font:
        bold,

      color:
        TEXT,
    }
  );


  const interactionLabel =
    "interacoes";


  const interactionLabelSize =
    sw(
      page,
      10
    );


  const interactionLabelWidth =
    regular.widthOfTextAtSize(
      interactionLabel,
      interactionLabelSize
    );


  page.drawText(
    interactionLabel,
    {
      x:
        sx(
          page,
          116
        ) -
        interactionLabelWidth /
          2,

      y:
        sy(
          page,
          927
        ) -
        interactionLabelSize,

      size:
        interactionLabelSize,

      font:
        regular,

      color:
        TEXT,
    }
  );


  const lines = [
    [
      "Alcance",
      numberText(
        reach
      ),
    ],

    [
      "Visualizacoes",
      numberText(
        views
      ),
    ],

    [
      "Engajamento",
      percentText(
        engagement,
        false
      ),
    ],

    [
      "Novos seguidores",
      signedNumber(
        followersDelta
      ),
    ],
  ];


  let y =
    850;


  for (
    const [
      label,
      value
    ]
    of lines
  ) {
    textAt({
      page,
      text:
        label,
      x:
        218,
      y,
      size:
        9,
      font:
        regular,
      color:
        MUTED,
      maxWidth:
        100,
    });


    textAt({
      page,
      text:
        value,
      x:
        322,
      y,
      size:
        9,
      font:
        bold,
      color:
        TEXT,
      maxWidth:
        58,
    });


    y +=
      36;
  }


  mask({
    page,
    x:
      32,
    y:
      1029,
    width:
      361,
    height:
      86,
    color:
      CARD,
  });


  multiline({
    page,
    text:
      `No periodo analisado foram registradas ${numberText(
        interactions
      )} interacoes, com taxa de ${percentText(
        engagement,
        false
      )} sobre o alcance.`,
    x:
      86,
    y:
      1049,
    size:
      9,
    lineHeight:
      14,
    maxWidth:
      286,
    maxLines:
      4,
    font:
      regular,
    color:
      MUTED,
  });
}


function formatShares(
  media:
    InstagramTopMediaItem[]
) {
  const totals =
    new Map<
      string,
      number
    >();


  for (
    const item
    of media
  ) {
    const key =
      mediaFormat(
        item
      );


    totals.set(
      key,
      (
        totals.get(
          key
        ) ||
        0
      ) +
      Math.max(
        mediaScore(
          item
        ),
        0
      )
    );
  }


  const total =
    Array.from(
      totals.values()
    ).reduce(
      (
        sum,
        value
      ) =>
        sum +
        value,
      0
    );


  const keys = [
    "Reels",
    "Posts no feed",
    "Carrossel",
    "Video",
  ];


  return keys.map(
    (
      key
    ) => ({
      key,

      value:
        total >
          0
          ? (
              (
                totals.get(
                  key
                ) ||
                0
              ) /
              total
            ) *
            100
          : 0,
    })
  );
}


function drawFormats({
  page,
  media,
  bold,
  regular,
}: {
  page:
    PDFPage;

  media:
    InstagramTopMediaItem[];

  bold:
    PDFFont;

  regular:
    PDFFont;
}) {
  mask({
    page,
    x:
      429,
    y:
      829,
    width:
      279,
    height:
      289,
    color:
      WHITE,
  });


  const shares =
    formatShares(
      media
    );


  let y =
    844;


  for (
    const item
    of shares
  ) {
    textAt({
      page,
      text:
        item.key,
      x:
        475,
      y,
      size:
        10,
      font:
        bold,
      color:
        TEXT,
      maxWidth:
        140,
    });


    mask({
      page,
      x:
        475,
      y:
        y +
        25,
      width:
        185,
      height:
        10,
      color:
        CARD,
    });


    if (
      item.value >
        0
    ) {
      mask({
        page,
        x:
          475,
        y:
          y +
          25,
        width:
          185 *
          clamp(
            item.value /
              100,
            0,
            1
          ),
        height:
          10,
        color:
          BLUE,
      });
    }


    textAt({
      page,
      text:
        `${item.value
          .toFixed(
            1
          )
          .replace(
            ".",
            ","
          )}%`,
      x:
        670,
      y:
        y +
        21,
      size:
        9,
      font:
        bold,
      color:
        TEXT,
      maxWidth:
        34,
    });


    y +=
      67;
  }



}


function drawAudience({
  page,
  bold,
  regular,
}: {
  page:
    PDFPage;

  bold:
    PDFFont;

  regular:
    PDFFont;
}) {
  mask({
    page,
    x:
      742,
    y:
      829,
    width:
      251,
    height:
      289,
    color:
      WHITE,
  });


  page.drawCircle({
    x:
      sx(
        page,
        804
      ),

    y:
      sy(
        page,
        881
      ),

    size:
      sw(
        page,
        36
      ),

    color:
      CARD_ALT,
  });


  page.drawCircle({
    x:
      sx(
        page,
        804
      ),

    y:
      sy(
        page,
        881
      ),

    size:
      sw(
        page,
        21
      ),

    color:
      WHITE,
  });


  textAt({
    page,
    text:
      "DADOS DE PUBLICO",
    x:
      759,
    y:
      943,
    size:
      10,
    font:
      bold,
    color:
      TEXT,
    maxWidth:
      210,
  });


  multiline({
    page,
    text:
      "Genero, faixa etaria e localizacao ainda nao sao coletados pelo AprovUp nesta integracao.",
    x:
      759,
    y:
      971,
    size:
      9,
    lineHeight:
      15,
    maxWidth:
      210,
    maxLines:
      5,
    font:
      regular,
    color:
      MUTED,
  });


  mask({
    page,
    x:
      759,
    y:
      1065,
    width:
      205,
    height:
      31,
    color:
      CARD,
  });


  textAt({
    page,
    text:
      "Sem dados ficticios",
    x:
      775,
    y:
      1075,
    size:
      8,
    font:
      bold,
    color:
      BLUE,
      maxWidth:
        170,
  });
}


async function drawTopFive({
  document,
  page,
  media,
  bold,
  regular,
}: {
  document:
    PDFDocument;

  page:
    PDFPage;

  media:
    InstagramTopMediaItem[];

  bold:
    PDFFont;

  regular:
    PDFFont;
}) {
  mask({
    page,
    x:
      31,
    y:
      1200,
    width:
      428,
    height:
      168,
    color:
      WHITE,
  });


  const items =
    media
      .slice(
        0,
        5
      );


  if (
    items.length ===
      0
  ) {
    textAt({
      page,
      text:
        "Nenhum conteudo recente disponivel para ranking.",
      x:
        50,
      y:
        1240,
      size:
        10,
      font:
        bold,
      color:
        MUTED,
      maxWidth:
        385,
    });

    return;
  }


  const boxWidth =
    76;


  for (
    let index =
      0;
    index <
      5;
    index++
  ) {
    const x =
      33 +
      index *
        84;


    const item =
      items[
        index
      ];


    if (
      !item
    ) {
      mask({
        page,
        x,
        y:
          1202,
        width:
          boxWidth,
        height:
          102,
        color:
          CARD,
      });

      continue;
    }


    const image =
      await remoteImage(
        document,
        item.imageUrl
      );


    if (
      image
    ) {
      page.drawImage(
        image,
        {
          x:
            sx(
              page,
              x
            ),

          y:
            sy(
              page,
              1301
            ),

          width:
            sw(
              page,
              boxWidth
            ),

          height:
            sh(
              page,
              99
            ),
        }
      );
    }
    else {
      mask({
        page,
        x,
        y:
          1202,
        width:
          boxWidth,
        height:
          99,
        color:
          CARD,
      });


      multiline({
        page,
        text:
          topMediaTitle(
            item
          ),
        x:
          x +
          5,
        y:
          1230,
        size:
          7,
        lineHeight:
          10,
        maxWidth:
          boxWidth -
          10,
        maxLines:
          4,
        font:
          regular,
        color:
          TEXT,
      });
    }


    textAt({
      page,
      text:
        `${index + 1}o`,
      x:
        x +
        30,
      y:
        1312,
      size:
        9,
      font:
        bold,
      color:
        TEXT,
      maxWidth:
        22,
    });


    textAt({
      page,
      text:
        numberText(
          item.reach
        ),
      x:
        x +
        8,
      y:
        1333,
      size:
        10,
      font:
        bold,
      color:
        TEXT,
      maxWidth:
        62,
    });


    textAt({
      page,
      text:
        "alcance",
      x:
        x +
        17,
      y:
        1353,
      size:
        7,
      font:
        regular,
      color:
        MUTED,
      maxWidth:
        48,
    });
  }
}


function buildHighlights({
  followersDelta,
  reachChange,
  viewsChange,
  interactionChange,
  topMedia,
}: {
  followersDelta:
    number |
    null;

  reachChange:
    number |
    null;

  viewsChange:
    number |
    null;

  interactionChange:
    number |
    null;

  topMedia:
    InstagramTopMediaItem[];
}) {
  const lines:
    string[] =
    [];


  if (
    reachChange !==
    null
  ) {
    lines.push(
      `${percentText(
        reachChange
      )} no alcance em relacao ao periodo comparavel`
    );
  }


  if (
    viewsChange !==
    null
  ) {
    lines.push(
      `${percentText(
        viewsChange
      )} em visualizacoes`
    );
  }


  if (
    interactionChange !==
    null
  ) {
    lines.push(
      `${percentText(
        interactionChange
      )} em interacoes`
    );
  }


  if (
    followersDelta !==
    null
  ) {
    lines.push(
      `${signedNumber(
        followersDelta
      )} seguidores liquidos no periodo`
    );
  }


  if (
    topMedia[0]
      ?.reach !==
      null &&
    topMedia[0]
      ?.reach !==
      undefined
  ) {
    lines.push(
      `Melhor conteudo alcancou ${numberText(
        topMedia[0]
          .reach
      )} contas`
    );
  }


  while (
    lines.length <
      5
  ) {
    lines.push(
      "Acompanhamento continuo das metricas no AprovUp"
    );
  }


  return lines.slice(
    0,
    5
  );
}


function drawHighlights({
  page,
  lines,
  bold,
  regular,
}: {
  page:
    PDFPage;

  lines:
    string[];

  bold:
    PDFFont;

  regular:
    PDFFont;
}) {
  mask({
    page,
    x:
      692,
    y:
      244,
    width:
      300,
    height:
      168,
    color:
      CARD_ALT,
  });


  let y =
    253;


  for (
    const line
    of lines.slice(
      0,
      5
    )
  ) {
    multiline({
      page,
      text:
        line,
      x:
        695,
      y,
      size:
        9,
      lineHeight:
        12,
      maxWidth:
        288,
      maxLines:
        2,
      font:
        regular,
      color:
        TEXT,
    });


    y +=
      31;
  }
}


function drawInsights({
  page,
  metrics,
  engagement,
  topMedia,
  bold,
  regular,
}: {
  page:
    PDFPage;

  metrics:
    InstagramDashboardMetrics |
    null;

  engagement:
    number |
    null;

  topMedia:
    InstagramTopMediaItem[];

  bold:
    PDFFont;

  regular:
    PDFFont;
}) {
  mask({
    page,
    x:
      495,
    y:
      1200,
    width:
      240,
    height:
      168,
    color:
      WHITE,
  });


  const items = [
    metrics
      ?.change
      .reach !==
      null &&
    metrics
      ?.change
      .reach !==
      undefined
      ? `Alcance variou ${percentText(
          metrics.change.reach
        )}.`
      : "Alcance atual disponivel pela Meta.",

    metrics
      ?.change
      .views !==
      null &&
    metrics
      ?.change
      .views !==
      undefined
      ? `Visualizacoes variaram ${percentText(
          metrics.change.views
        )}.`
      : "Visualizacoes em acompanhamento.",

    `Taxa de interacoes sobre alcance: ${percentText(
      engagement,
      false
    )}.`,

    topMedia[0]
      ? `Destaque: ${topMediaTitle(
          topMedia[0]
        )}.`
      : "Ranking de conteudos em coleta.",

    "Dados historicos ficam mais precisos a cada nova coleta.",
  ];


  let y =
    1211;


  for (
    const item
    of items
  ) {
    page.drawCircle({
      x:
        sx(
          page,
          505
        ),

      y:
        sy(
          page,
          y +
          6
        ),

      size:
        sw(
          page,
          2.8
        ),

      color:
        BLUE,
    });


    multiline({
      page,
      text:
        item,
      x:
        520,
      y,
      size:
        7.4,
      lineHeight:
        10,
      maxWidth:
        204,
      maxLines:
        2,
      font:
        regular,
      color:
        MUTED,
    });


    y +=
      31;
  }
}


function drawNextSteps({
  page,
  topMedia,
  metrics,
  bold,
  regular,
}: {
  page:
    PDFPage;

  topMedia:
    InstagramTopMediaItem[];

  metrics:
    InstagramDashboardMetrics |
    null;

  bold:
    PDFFont;

  regular:
    PDFFont;
}) {
  mask({
    page,
    x:
      773,
    y:
      1200,
    width:
      221,
    height:
      168,
    color:
      DARK_BOX,
  });


  const bestFormat =
    topMedia[0]
      ? mediaFormat(
          topMedia[0]
        )
      : "conteudos de melhor desempenho";


  const steps = [
    "Manter consistencia de publicacao.",
    `Explorar mais ${bestFormat}.`,
    "Repetir temas dos melhores conteudos.",
    metrics
      ?.change
      .reach !==
      null &&
    metrics
      ?.change
      .reach !==
      undefined &&
    metrics.change.reach <
      0
      ? "Testar novas abordagens para recuperar alcance."
      : "Escalar formatos que sustentam o alcance.",
    "Continuar acompanhando o historico no AprovUp.",
  ];


  let y =
    1211;


  for (
    const step
    of steps
  ) {
    textAt({
      page,
      text:
        "-",
      x:
        783,
      y,
      size:
        9,
      font:
        bold,
      color:
        WHITE,
    });


    multiline({
      page,
      text:
        step,
      x:
        800,
      y,
      size:
        7.4,
      lineHeight:
        10,
      maxWidth:
        184,
      maxLines:
        2,
      font:
        regular,
      color:
        WHITE,
    });


    y +=
      31;
  }
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
            "Cliente ou modelo nao informado.",
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


    let topMedia:
      InstagramTopMediaItem[] =
      [];


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
      const accessToken =
        decryptMetaSecret(
          connection
            .userAccessTokenEncrypted
        );


      const [
        metricsResult,
        mediaResult,
      ] =
        await Promise.allSettled([
          getInstagramDashboardMetrics({
            instagramUserId:
              connection
                .instagramUserId,

            accessToken,

            days:
              period,
          }),

          getInstagramTopMedia({
            instagramUserId:
              connection
                .instagramUserId,

            accessToken,

            limit:
              24,

            days:
              period,
          }),
        ]);


      if (
        metricsResult.status ===
        "fulfilled"
      ) {
        dashboardMetrics =
          metricsResult.value;


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


      if (
        mediaResult.status ===
        "fulfilled"
      ) {
        topMedia =
          mediaResult.value;
      }
    }


    const history =
      await getInstagramHistorySummary({
        clientId:
          client.id,

        days:
          period,
      });


    const netFollowers =
      dashboardMetrics
        ?.current
        .netFollowers ??
      history
        .followersDelta ??
      null;


    const reach =
      dashboardMetrics
        ?.current
        .reach ??
      history.latest
        ?.reach ??
      null;


    const views =
      dashboardMetrics
        ?.current
        .views ??
      history.latest
        ?.views ??
      null;


    const interactions =
      dashboardMetrics
        ?.current
        .interactions ??
      history.latest
        ?.interactions ??
      null;


    const engagement =
      reach !==
        null &&
      reach >
        0 &&
      interactions !==
        null
        ? (
            interactions /
            reach
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


    const document =
      await PDFDocument.load(
        sourcePdf
      );


    const page =
      document
        .getPages()[0];


    if (
      !page
    ) {
      return NextResponse.json(
        {
          message:
            "Modelo sem pagina.",
        },
        {
          status:
            422,
        }
      );
    }


    const regular =
      await document
        .embedFont(
          StandardFonts
            .Helvetica
        );


    const bold =
      await document
        .embedFont(
          StandardFonts
            .HelveticaBold
        );


    /*
     * MODO FIEL:
     * O PDF original permanece como fundo.
     * So cobrimos os dados demonstrativos dentro
     * das areas de conteudo e escrevemos os dados reais.
     * A estrutura visual, cabecalho, rodape, blocos,
     * icones e proporcoes permanecem do arquivo exportado.
     */

    /* Periodo do cabecalho */
    mask({
      page,
      x:
        716,
      y:
        108,
      width:
        174,
      height:
        39,
      color:
        DARK_BOX,
    });


    textAt({
      page,
      text:
        "PERIODO ANALISADO",
      x:
        721,
      y:
        111,
      size:
        7,
      font:
        regular,
      color:
        WHITE,
      maxWidth:
        160,
    });


    textAt({
      page,
      text:
        `Ultimos ${period} dias`,
      x:
        721,
      y:
        129,
      size:
        10,
      font:
        bold,
      color:
        WHITE,
      maxWidth:
        160,
    });


    /* Visao geral */
    drawOverviewCard({
      page,
      x:
        35,
      value:
        signedNumber(
          netFollowers
        ),
      label:
        "Seguidores liquidos",
      change:
        percentText(
          dashboardMetrics
            ?.change
            .netFollowers ??
          null
        ),
      helper:
        `Ultimos ${period} dias`,
      bold,
      regular,
    });


    drawOverviewCard({
      page,
      x:
        177,
      value:
        numberText(
          reach
        ),
      label:
        "Contas alcancadas",
      change:
        percentText(
          dashboardMetrics
            ?.change
            .reach ??
          null
        ),
      helper:
        "vs periodo comparavel",
      bold,
      regular,
    });


    drawOverviewCard({
      page,
      x:
        319,
      value:
        numberText(
          views
        ),
      label:
        "Visualizacoes",
      change:
        percentText(
          dashboardMetrics
            ?.change
            .views ??
          null
        ),
      helper:
        "vs periodo comparavel",
      bold,
      regular,
    });


    drawOverviewCard({
      page,
      x:
        461,
      value:
        numberText(
          interactions
        ),
      label:
        "Interacoes",
      change:
        percentText(
          dashboardMetrics
            ?.change
            .interactions ??
          null
        ),
      helper:
        "vs periodo comparavel",
      bold,
      regular,
    });


    /* Destaques */
    drawHighlights({
      page,
      lines:
        buildHighlights({
          followersDelta:
            netFollowers,

          reachChange:
            dashboardMetrics
              ?.change
              .reach ??
            null,

          viewsChange:
            dashboardMetrics
              ?.change
              .views ??
            null,

          interactionChange:
            dashboardMetrics
              ?.change
              .interactions ??
            null,

          topMedia,
        }),
      bold,
      regular,
    });


    /* Crescimento */
    drawGrowthChart({
      page,
      points:
        history.points,
      followersDelta:
        netFollowers,
      followersPercent:
        history.followersPercent,
      bold,
      regular,
    });


    /* Alcance e visualizacoes */
    drawReachViews({
      page,
      reach,
      views,
      reachChange:
        dashboardMetrics
          ?.change
          .reach ??
        null,
      viewsChange:
        dashboardMetrics
          ?.change
          .views ??
        null,
      bold,
      regular,
    });


    /* Interacoes */
    drawInteractions({
      page,
      interactions,
      reach,
      views,
      engagement,
      followersDelta:
        netFollowers,
      bold,
      regular,
    });


    /* Formatos */
    drawFormats({
      page,
      media:
        topMedia,
      bold,
      regular,
    });


    /* Publico sem inventar dados */
    drawAudience({
      page,
      bold,
      regular,
    });


    /* Top 5 */
    await drawTopFive({
      document,
      page,
      media:
        topMedia,
      bold,
      regular,
    });


    /* Insights */
    drawInsights({
      page,
      metrics:
        dashboardMetrics,
      engagement,
      topMedia,
      bold,
      regular,
    });


    /* Proximos passos */
    drawNextSteps({
      page,
      topMedia,
      metrics:
        dashboardMetrics,
      bold,
      regular,
    });


    document.setTitle(
      `Relatorio Instagram - ${cleanText(
        client.name
      )}`
    );


    document.setAuthor(
      "AprovUp"
    );


    const output =
      await document
        .save();


    const responseBody =
      Uint8Array.from(
        output
      ).buffer;


    const now =
      new Date();


    const filename =
      `relatorio-${fileSlug(
        client.name
      )}-${now.getUTCFullYear()}-${String(
        now.getUTCMonth() +
        1
      ).padStart(
        2,
        "0"
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

          "X-AprovUp-Report-Mode":
            "faithful-template",

          "X-AprovUp-Report-Period":
            String(
              period
            ),
        },
      }
    );
  }
  catch (
    error
  ) {
    console.error(
      "APROVUP FAITHFUL REPORT ERROR",
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

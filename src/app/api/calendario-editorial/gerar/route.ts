import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  PDFDocument,
  PDFFont,
  PDFPage,
  StandardFonts,
  rgb,
} from 'pdf-lib';

import {
  getCurrentUser,
} from '@/lib/auth';

import {
  canAccessClient,
} from '@/lib/clientAccess';

import {
  prisma,
} from '@/lib/prisma';


export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';


const WHITE =
  rgb(
    1,
    1,
    1
  );


const PAPER =
  rgb(
    0.992,
    0.996,
    1
  );


const NAVY =
  rgb(
    0.045,
    0.075,
    0.14
  );


const TEXT =
  rgb(
    0.055,
    0.075,
    0.12
  );


const MUTED =
  rgb(
    0.42,
    0.48,
    0.58
  );


const PALE_BLUE =
  rgb(
    0.94,
    0.965,
    1
  );


const COLORS = {
  REELS:
    rgb(
      0.39,
      0.23,
      0.92
    ),

  IMAGEM:
    rgb(
      0.05,
      0.35,
      0.95
    ),

  CARROSSEL:
    rgb(
      0.05,
      0.65,
      0.38
    ),

  STORIES:
    rgb(
      0.98,
      0.45,
      0.12
    ),

  DATA_ESPECIAL:
    rgb(
      0.88,
      0.20,
      0.55
    ),
};


const monthNames = [
  'Janeiro',
  'Fevereiro',
  'Marco',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];


function cleanText(
  value:
    unknown
) {
  return String(
    value ||
    ''
  )
    .normalize(
      'NFKD'
    )
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .replace(
      /[\u2013\u2014]/g,
      '-'
    )
    .replace(
      /[\u2018\u2019]/g,
      "'"
    )
    .replace(
      /[\u201C\u201D]/g,
      '"'
    )
    .replace(
      /[^\x20-\xFF\n]/g,
      ''
    )
    .replace(
      /\r/g,
      ''
    )
    .trim();
}

function fileSlug(
  value:
    string
) {
  return cleanText(
    value
  )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      '-'
    )
    .replace(
      /^-|-$/g,
      ''
    )
    .slice(
      0,
      70
    ) ||
    'cliente';
}


function fitText(
  text:
    string,
  font:
    PDFFont,
  size:
    number,
  maxWidth:
    number
) {
  const clean =
    cleanText(
      text
    );


  if (
    font.widthOfTextAtSize(
      clean,
      size
    ) <=
    maxWidth
  ) {
    return clean;
  }


  let result =
    clean;


  while (
    result.length >
      1 &&
    font.widthOfTextAtSize(
      result +
      '...',
      size
    ) >
      maxWidth
  ) {
    result =
      result.slice(
        0,
        -1
      );
  }


  return (
    result.trim() +
    '...'
  );
}


function wrapLines({
  text,
  font,
  size,
  maxWidth,
  maxLines,
}: {
  text:
    string;

  font:
    PDFFont;

  size:
    number;

  maxWidth:
    number;

  maxLines:
    number;
}) {
  const sourceText =
    cleanText(
      text
    );


  const words =
    sourceText
      .replace(
        /\n+/g,
        ' '
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
    '';


  for (
    const word
    of words
  ) {

    const candidate =
      current
        ? current +
          ' ' +
          word
        : word;


    if (
      font.widthOfTextAtSize(
        candidate,
        size
      ) <=
      maxWidth
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


  if (
    words.length &&
    lines.length ===
      maxLines
  ) {

    const consumed =
      lines.join(
        ' '
      );


    if (
      consumed.length <
      sourceText.length
    ) {

      lines[
        lines.length -
        1
      ] =
        fitText(
          lines[
            lines.length -
            1
          ] +
          '...',
          font,
          size,
          maxWidth
        );
    }
  }


  return lines;
}

function drawLines({
  page,
  lines,
  x,
  y,
  size,
  lineHeight,
  font,
  color,
}: {
  page:
    PDFPage;

  lines:
    string[];

  x:
    number;

  y:
    number;

  size:
    number;

  lineHeight:
    number;

  font:
    PDFFont;

  color:
    ReturnType<
      typeof rgb
    >;
}) {
  lines.forEach(
    (
      line,
      index
    ) => {
      page.drawText(
        line,
        {
          x,
          y:
            y -
            index *
              lineHeight,

          size,
          font,
          color,
        }
      );
    }
  );
}


function formatKind(
  format:
    string |
    null
) {
  const value =
    String(
      format ||
      ''
    )
      .toUpperCase();


  if (
    value.includes(
      'CARROS'
    )
  ) {
    return 'CARROSSEL';
  }


  if (
    value.includes(
      'STOR'
    )
  ) {
    return 'STORIES';
  }


  if (
    value.includes(
      'REEL'
    ) ||
    value.includes(
      'VIDEO'
    )
  ) {
    return 'REELS';
  }


  if (
    value.includes(
      'DATA'
    )
  ) {
    return 'DATA_ESPECIAL';
  }


  return 'IMAGEM';
}


function displayKind(
  value:
    string
) {
  return value ===
    'DATA_ESPECIAL'
      ? 'DATA ESPECIAL'
      : value;
}


function dayInMaceio(
  date:
    Date
) {
  const formatter =
    new Intl.DateTimeFormat(
      'en-US',
      {
        timeZone:
          'America/Maceio',

        day:
          '2-digit',
      }
    );


  return Number(
    formatter.format(
      date
    )
  );
}


function summaryFor(
  content: {
    objective:
      string |
      null;

    briefing:
      string |
      null;

    caption:
      string |
      null;

    artText:
      string |
      null;

    script:
      string |
      null;
  }
) {
  return (
    content.objective ||
    content.briefing ||
    content.caption ||
    content.artText ||
    content.script ||
    'Conteudo planejado para publicacao nesta data.'
  );
}


function monthRange(
  year:
    number,
  month:
    number
) {
  return {
    start:
      new Date(
        Date.UTC(
          year,
          month -
            1,
          1,
          3,
          0,
          0
        )
      ),

    end:
      new Date(
        Date.UTC(
          year,
          month,
          1,
          3,
          0,
          0
        )
      ),
  };
}


function drawHeaderValue({
  page,
  text,
  x,
  y,
  width,
  font,
}: {
  page:
    PDFPage;

  text:
    string;

  x:
    number;

  y:
    number;

  width:
    number;

  font:
    PDFFont;
}) {
  page.drawRectangle({
    x,
    y:
      y -
      3,
    width,
    height:
      17,
    color:
      WHITE,
  });


  page.drawText(
    fitText(
      text,
      font,
      8,
      width -
        4
    ),
    {
      x:
        x +
        2,

      y:
        y +
        2,

      size:
        8,

      font,

      color:
        TEXT,
    }
  );
}


function fillCalendarPage({
  page,
  contents,
  month,
  year,
  clientName,
  regular,
  bold,
}: {
  page:
    PDFPage;

  contents:
    Array<{
      title:
        string;

      format:
        string |
        null;

      plannedDate:
        Date |
        null;
    }>;

  month:
    number;

  year:
    number;

  clientName:
    string;

  regular:
    PDFFont;

  bold:
    PDFFont;
}) {
  const size =
    page.getSize();


  const sx =
    size.width /
    1024;


  const sy =
    size.height /
    768;


  const scale =
    Math.min(
      sx,
      sy
    );


  const X =
    (
      value:
        number
    ) =>
      value *
      sx;


  const Y =
    (
      value:
        number
    ) =>
      value *
      sy;


  const W =
    (
      value:
        number
    ) =>
      value *
      sx;


  const H =
    (
      value:
        number
    ) =>
      value *
      sy;


  const S =
    (
      value:
        number
    ) =>
      value *
      scale;


  /*
   * HEADLINE - NOME DO CLIENTE
   */

  page.drawRectangle({
    x:
      X(
        278
      ),

    y:
      Y(
        697
      ),

    width:
      W(
        410
      ),

    height:
      H(
        40
      ),

    color:
      NAVY,
  });


  page.drawText(
    fitText(
      cleanText(
        clientName
      ).toUpperCase(),
      bold,
      S(
        25
      ),
      W(
        390
      )
    ),
    {
      x:
        X(
          292
        ),

      y:
        Y(
          706
        ),

      size:
        S(
          25
        ),

      font:
        bold,

      color:
        WHITE,
    }
  );


  /*
   * MES / ANO
   */

  page.drawRectangle({
    x:
      X(
        791
      ),

    y:
      Y(
        680
      ),

    width:
      W(
        196
      ),

    height:
      H(
        31
      ),

    color:
      NAVY,
  });


  page.drawText(
    fitText(
      (
        monthNames[
          month -
          1
        ] +
        ' / ' +
        year
      ).toUpperCase(),
      bold,
      S(
        14
      ),
      W(
        180
      )
    ),
    {
      x:
        X(
          796
        ),

      y:
        Y(
          688
        ),

      size:
        S(
          14
        ),

      font:
        bold,

      color:
        WHITE,
    }
  );


  const columns = [
    28,
    166,
    305,
    443,
    582,
    721,
    860,
  ];


  const templateRows = [
    {
      y:
        508,

      height:
        92,
    },
    {
      y:
        407,

      height:
        93,
    },
    {
      y:
        306,

      height:
        93,
    },
    {
      y:
        205,

      height:
        93,
    },
    {
      y:
        102,

      height:
        94,
    },
  ];


  const cellWidth =
    135;


  const firstWeekDay =
    new Date(
      Date.UTC(
        year,
        month -
          1,
        1,
        12,
        0,
        0
      )
    )
      .getUTCDay();


  const daysInMonth =
    new Date(
      Date.UTC(
        year,
        month,
        0,
        12,
        0,
        0
      )
    )
      .getUTCDate();


  const totalSlots =
    firstWeekDay +
    daysInMonth;


  const needsSixRows =
    totalSlots >
    35;


  const activeRows =
    needsSixRows
      ? Array.from(
          {
            length:
              6,
          },
          (
            _,
            index
          ) => {
            const totalHeight =
              498;

            const rowHeight =
              totalHeight /
              6;

            return {
              y:
                102 +
                (
                  5 -
                  index
                ) *
                rowHeight,

              height:
                rowHeight -
                7,
            };
          }
        )
      : templateRows;


  if (
    needsSixRows
  ) {

    page.drawRectangle({
      x:
        X(
          24
        ),

      y:
        Y(
          98
        ),

      width:
        W(
          976
        ),

      height:
        H(
          505
        ),

      color:
        rgb(
          0.975,
          0.985,
          0.998
        ),
    });


    for (
      let row =
        0;
      row <
        6;
      row +=
        1
    ) {

      for (
        let col =
          0;
        col <
          7;
        col +=
          1
      ) {

        page.drawRectangle({
          x:
            X(
              columns[
                col
              ]
            ),

          y:
            Y(
              activeRows[
                row
              ].y
            ),

          width:
            W(
              cellWidth
            ),

          height:
            H(
              activeRows[
                row
              ].height
            ),

          color:
            WHITE,

          borderColor:
            rgb(
              0.88,
              0.91,
              0.95
            ),

          borderWidth:
            S(
              0.8
            ),
        });
      }
    }
  }
  else {

    for (
      const row
      of templateRows
    ) {

      for (
        const x
        of columns
      ) {

        page.drawRectangle({
          x:
            X(
              x +
              4
            ),

          y:
            Y(
              row.y +
              4
            ),

          width:
            W(
              cellWidth -
              8
            ),

          height:
            H(
              row.height -
              8
            ),

          color:
            WHITE,
        });
      }
    }
  }


  const byDay =
    new Map<
      number,
      typeof contents
    >();


  for (
    const content
    of contents
  ) {

    if (
      !content.plannedDate
    ) {
      continue;
    }


    const day =
      dayInMaceio(
        content.plannedDate
      );


    const list =
      byDay.get(
        day
      ) ||
      [];


    list.push(
      content
    );


    byDay.set(
      day,
      list
    );
  }


  for (
    let slot =
      0;
    slot <
      activeRows.length *
      7;
    slot +=
      1
  ) {

    const rowIndex =
      Math.floor(
        slot /
        7
      );


    const colIndex =
      slot %
      7;


    const day =
      slot -
      firstWeekDay +
      1;


    const row =
      activeRows[
        rowIndex
      ];


    const x =
      columns[
        colIndex
      ];


    if (
      day <
        1 ||
      day >
        daysInMonth
    ) {

      page.drawText(
        'Fora do mes',
        {
          x:
            X(
              x +
              40
            ),

          y:
            Y(
              row.y +
              row.height /
              2 -
              2
            ),

          size:
            S(
              5.4
            ),

          font:
            regular,

          color:
            rgb(
              0.62,
              0.67,
              0.75
            ),
        }
      );


      continue;
    }


    page.drawCircle({
      x:
        X(
          x +
          18
        ),

      y:
        Y(
          row.y +
          row.height -
          18
        ),

      size:
        S(
          12
        ),

      color:
        PALE_BLUE,
    });


    const dayText =
      String(
        day
      );


    page.drawText(
      dayText,
      {
        x:
          X(
            x +
            (
              day <
                10
                ? 14.4
                : 10.6
            )
          ),

        y:
          Y(
            row.y +
            row.height -
            21
          ),

        size:
          S(
            9
          ),

        font:
          bold,

        color:
          TEXT,
      }
    );


    const items =
      byDay.get(
        day
      ) ||
      [];


    if (
      items.length ===
      0
    ) {
      continue;
    }


    const first =
      items[
        0
      ];


    const kind =
      formatKind(
        first.format ||
        first.title
      );


    page.drawCircle({
      x:
        X(
          x +
          10
        ),

      y:
        Y(
          row.y +
          row.height -
          43
        ),

      size:
        S(
          3
        ),

      color:
        COLORS[
          kind
        ],
    });


    const titleLines =
      wrapLines({
        text:
          first.title,

        font:
          bold,

        size:
          S(
            6.1
          ),

        maxWidth:
          W(
            111
          ),

        maxLines:
          2,
      });


    drawLines({
      page,

      lines:
        titleLines,

      x:
        X(
          x +
          17
        ),

      y:
        Y(
          row.y +
          row.height -
          45
        ),

      size:
        S(
          6.1
        ),

      lineHeight:
        S(
          7.2
        ),

      font:
        bold,

      color:
        TEXT,
    });


    page.drawText(
      displayKind(
        kind
      ),
      {
        x:
          X(
            x +
            17
          ),

        y:
          Y(
            row.y +
            11
          ),

        size:
          S(
            4.7
          ),

        font:
          bold,

        color:
          COLORS[
            kind
          ],
      }
    );


    if (
      items.length >
      1
    ) {

      page.drawText(
        '+' +
          String(
            items.length -
            1
          ) +
          ' conteudo',
        {
          x:
            X(
              x +
              79
            ),

          y:
            Y(
              row.y +
              11
            ),

          size:
            S(
              4.5
            ),

          font:
            bold,

          color:
            MUTED,
        }
      );
    }
  }
}

function buildBalancedDetailPages<T>(
  items:
    T[],
  maxPerPage:
    number
) {
  if (
    items.length ===
    0
  ) {
    return [
      [] as T[],
    ];
  }


  const pageCount =
    Math.ceil(
      items.length /
      maxPerPage
    );


  const baseSize =
    Math.floor(
      items.length /
      pageCount
    );


  const remainder =
    items.length %
    pageCount;


  const pages:
    T[][] =
    [];


  let cursor =
    0;


  for (
    let pageIndex =
      0;
    pageIndex <
      pageCount;
    pageIndex +=
      1
  ) {

    const pageSize =
      baseSize +
      (
        pageIndex <
        remainder
          ? 1
          : 0
      );


    pages.push(
      items.slice(
        cursor,
        cursor +
        pageSize
      )
    );


    cursor +=
      pageSize;
  }


  return pages;
}


function fillDetailPage({
  page,
  items,
  month,
  year,
  clientName,
  regular,
  bold,
}: {
  page:
    PDFPage;

  items:
    Array<{
      title:
        string;

      format:
        string |
        null;

      plannedDate:
        Date |
        null;

      objective:
        string |
        null;

      briefing:
        string |
        null;

      caption:
        string |
        null;

      artText:
        string |
        null;

      script:
        string |
        null;
    }>;

  month:
    number;

  year:
    number;

  clientName:
    string;

  regular:
    PDFFont;

  bold:
    PDFFont;
}) {
  const size =
    page.getSize();


  const sx =
    size.width /
    1024;


  const sy =
    size.height /
    768;


  const scale =
    Math.min(
      sx,
      sy
    );


  const X =
    (
      value:
        number
    ) =>
      value *
      sx;


  const Y =
    (
      value:
        number
    ) =>
      value *
      sy;


  const W =
    (
      value:
        number
    ) =>
      value *
      sx;


  const H =
    (
      value:
        number
    ) =>
      value *
      sy;


  const S =
    (
      value:
        number
    ) =>
      value *
      scale;


  /*
   * HEADLINE
   */

  page.drawRectangle({
    x:
      X(
        255
      ),

    y:
      Y(
        696
      ),

    width:
      W(
        455
      ),

    height:
      H(
        42
      ),

    color:
      NAVY,
  });


  page.drawText(
    fitText(
      cleanText(
        clientName
      ).toUpperCase(),
      bold,
      S(
        25
      ),
      W(
        430
      )
    ),
    {
      x:
        X(
          265
        ),

      y:
        Y(
          705
        ),

      size:
        S(
          25
        ),

      font:
        bold,

      color:
        WHITE,
    }
  );


  /*
   * MES / ANO
   */

  page.drawRectangle({
    x:
      X(
        781
      ),

    y:
      Y(
        681
      ),

    width:
      W(
        207
      ),

    height:
      H(
        31
      ),

    color:
      NAVY,
  });


  page.drawText(
    fitText(
      (
        monthNames[
          month -
          1
        ] +
        ' / ' +
        year
      ).toUpperCase(),
      bold,
      S(
        14
      ),
      W(
        190
      )
    ),
    {
      x:
        X(
          786
        ),

      y:
        Y(
          689
        ),

      size:
        S(
          14
        ),

      font:
        bold,

      color:
        WHITE,
    }
  );


  const columns = [
    25,
    517,
  ];


  const rows = [
    {
      y:
        542,

      height:
        108,
    },
    {
      y:
        422,

      height:
        108,
    },
    {
      y:
        302,

      height:
        109,
    },
    {
      y:
        182,

      height:
        110,
    },
    {
      y:
        62,

      height:
        109,
    },
  ];


  const cardWidth =
    482;


  /*
   * Limpa todos os 10 placeholders internos.
   */

  for (
    const x
    of columns
  ) {

    for (
      const row
      of rows
    ) {

      page.drawRectangle({
        x:
          X(
            x +
            4
          ),

        y:
          Y(
            row.y +
            4
          ),

        width:
          W(
            cardWidth -
            8
          ),

        height:
          H(
            row.height -
            8
          ),

        color:
          WHITE,
      });
    }
  }


  items
    .slice(
      0,
      10
    )
    .forEach(
      (
        content,
        index
      ) => {

        /*
         * Preenche por coluna:
         * 0-4 esquerda
         * 5-9 direita
         */

        const column =
          index <
          5
            ? 0
            : 1;


        const rowIndex =
          index %
          5;


        const x =
          columns[
            column
          ];


        const row =
          rows[
            rowIndex
          ];


        /*
         * BLOCO DO DIA
         */

        page.drawRectangle({
          x:
            X(
              x +
              7
            ),

          y:
            Y(
              row.y +
              8
            ),

          width:
            W(
              57
            ),

          height:
            H(
              row.height -
              16
            ),

          color:
            rgb(
              0.94,
              0.965,
              1
            ),
        });


        page.drawText(
          'DIA',
          {
            x:
              X(
                x +
                25
              ),

            y:
              Y(
                row.y +
                row.height -
                22
              ),

            size:
              S(
                5.2
              ),

            font:
              bold,

            color:
              rgb(
                0.10,
                0.24,
                0.72
              ),
          }
        );


        const day =
          content.plannedDate
            ? dayInMaceio(
                content.plannedDate
              )
            : 0;


        const dayText =
          String(
            day
          ).padStart(
            2,
            '0'
          );


        page.drawCircle({
          x:
            X(
              x +
              35
            ),

          y:
            Y(
              row.y +
              50
            ),

          size:
            S(
              17
            ),

          color:
            rgb(
              0.90,
              0.93,
              0.98
            ),
        });


        page.drawText(
          dayText,
          {
            x:
              X(
                x +
                26
              ),

            y:
              Y(
                row.y +
                46
              ),

            size:
              S(
                10
              ),

            font:
              bold,

            color:
              TEXT,
          }
        );


        const kind =
          formatKind(
            content.format ||
            content.title
          );


        /*
         * FORMATO
         */

        page.drawRectangle({
          x:
            X(
              x +
              78
            ),

          y:
            Y(
              row.y +
              row.height -
              29
            ),

          width:
            W(
              88
            ),

          height:
            H(
              17
            ),

          color:
            rgb(
              0.95,
              0.965,
              0.985
            ),
        });


        page.drawText(
          displayKind(
            kind
          ),
          {
            x:
              X(
                x +
                89
              ),

            y:
              Y(
                row.y +
                row.height -
                24
              ),

            size:
              S(
                5.3
              ),

            font:
              bold,

            color:
              COLORS[
                kind
              ],
          }
        );


        /*
         * TITULO
         */

        page.drawText(
          'TITULO DO CONTEUDO',
          {
            x:
              X(
                x +
                78
              ),

            y:
              Y(
                row.y +
                row.height -
                43
              ),

            size:
              S(
                4.7
              ),

            font:
              regular,

            color:
              MUTED,
          }
        );


        const title =
          fitText(
            content.title,
            bold,
            S(
              7.5
            ),
            W(
              383
            )
          );


        page.drawText(
          title,
          {
            x:
              X(
                x +
                78
              ),

            y:
              Y(
                row.y +
                row.height -
                57
              ),

            size:
              S(
                7.5
              ),

            font:
              bold,

            color:
              TEXT,
          }
        );


        /*
         * RESUMO
         */

        page.drawText(
          'RESUMO',
          {
            x:
              X(
                x +
                78
              ),

            y:
              Y(
                row.y +
                row.height -
                73
              ),

            size:
              S(
                4.7
              ),

            font:
              regular,

            color:
              MUTED,
          }
        );


        const summary =
          wrapLines({
            text:
              summaryFor(
                content
              ),

            font:
              regular,

            size:
              S(
                5.7
              ),

            maxWidth:
              W(
                382
              ),

            maxLines:
              3,
          });


        drawLines({
          page,

          lines:
            summary,

          x:
            X(
              x +
              78
            ),

          y:
            Y(
              row.y +
              row.height -
              86
            ),

          size:
            S(
              5.7
            ),

          lineHeight:
            S(
              7.1
            ),

          font:
            regular,

          color:
            MUTED,
        });
      }
    );
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
        'APROVADO' ||
      !currentUser.agencyId
    ) {
      return NextResponse.json(
        {
          message:
            'Acesso nao autorizado.',
        },
        {
          status:
            401,
        }
      );
    }


    const clientId =
      String(
        request.nextUrl
          .searchParams
          .get(
            'cliente'
          ) ||
        ''
      )
        .trim();


    const templateId =
      String(
        request.nextUrl
          .searchParams
          .get(
            'modelo'
          ) ||
        ''
      )
        .trim();


    const month =
      Number(
        request.nextUrl
          .searchParams
          .get(
            'mes'
          )
      );


    const year =
      Number(
        request.nextUrl
          .searchParams
          .get(
            'ano'
          )
      );


    if (
      !clientId ||
      !templateId ||
      month <
        1 ||
      month >
        12 ||
      year <
        2020 ||
      year >
        2100
    ) {
      return NextResponse.json(
        {
          message:
            'Cliente, modelo ou periodo invalido.',
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
        prisma.client
          .findFirst({
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
            },
          }),

        prisma
          .editorialCalendarTemplate
          .findFirst({
            where: {
              id:
                templateId,

              agencyId:
                currentUser.agencyId,

              status:
                'ATIVO',
            },
          }),
      ]);


    if (
      !client
    ) {
      return NextResponse.json(
        {
          message:
            'Cliente nao encontrado.',
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
            'Voce nao possui acesso a este cliente.',
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
            'Modelo de calendario nao encontrado.',
        },
        {
          status:
            404,
        }
      );
    }


    const range =
      monthRange(
        year,
        month
      );


    const contents =
      await prisma.content
        .findMany({
          where: {
            clientId:
              client.id,

            plannedDate: {
              gte:
                range.start,

              lt:
                range.end,
            },

            status: {
              not:
                'ARQUIVADO',
            },

            NOT: {
              format:
                'DESIGN_GRAFICO',
            },
          },

          select: {
            id:
              true,

            title:
              true,

            objective:
              true,

            format:
              true,

            plannedDate:
              true,

            briefing:
              true,

            caption:
              true,

            artText:
              true,

            script:
              true,
          },

          orderBy: [
            {
              plannedDate:
                'asc',
            },

            {
              createdAt:
                'asc',
            },
          ],
        });


    const templateResponse =
      await fetch(
        template.sourceFileUrl,
        {
          cache:
            'no-store',
        }
      );


    if (
      !templateResponse.ok
    ) {
      return NextResponse.json(
        {
          message:
            'Nao foi possivel carregar o PDF base.',
        },
        {
          status:
            502,
        }
      );
    }


    const sourceBytes =
      await templateResponse
        .arrayBuffer();


    const source =
      await PDFDocument.load(
        sourceBytes
      );


    if (
      source.getPageCount() <
      2
    ) {
      return NextResponse.json(
        {
          message:
            'O modelo precisa ter pelo menos duas paginas.',
        },
        {
          status:
            422,
        }
      );
    }


    const document =
      await PDFDocument.create();


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


    const [
      calendarPage,
    ] =
      await document
        .copyPages(
          source,
          [
            0,
          ]
        );


    document.addPage(
      calendarPage
    );


    fillCalendarPage({
      page:
        calendarPage,

      contents,

      month,
      year,

      clientName:
        client.name,

      regular,
      bold,
    });


    const detailPages =
      buildBalancedDetailPages(
        contents,
        10
      );


    for (
      const pageItems
      of detailPages
    ) {
      const [
        detailPage,
      ] =
        await document
          .copyPages(
            source,
            [
              1,
            ]
          );


      document.addPage(
        detailPage
      );


      fillDetailPage({
        page:
          detailPage,

        items:
          pageItems,

        month,
        year,

        clientName:
          client.name,

        regular,
        bold,
      });
    }


    document.setTitle(
      'Calendario Editorial - ' +
      cleanText(
        client.name
      )
    );


    document.setAuthor(
      'AprovUp'
    );


    const output =
      await document.save();


    const filename =
      'calendario-editorial-' +
      fileSlug(
        client.name
      ) +
      '-' +
      String(
        year
      ) +
      '-' +
      String(
        month
      ).padStart(
        2,
        '0'
      ) +
      '.pdf';


    return new NextResponse(
      Uint8Array.from(
        output
      ).buffer,
      {
        status:
          200,

        headers: {
          'Content-Type':
            'application/pdf',

          'Content-Disposition':
            'attachment; filename="' +
            filename +
            '"',

          'Cache-Control':
            'private, no-store, max-age=0',

          'X-AprovUp-Calendar-Contents':
            String(
              contents.length
            ),
        },
      }
    );
  }
  catch (
    error
  ) {
    console.error(
      'APROVUP EDITORIAL CALENDAR PDF ERROR',
      error
    );


    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? 'Nao foi possivel gerar o calendario: ' +
              error.message
            : 'Nao foi possivel gerar o calendario.',
      },
      {
        status:
          500,
      }
    );
  }
}

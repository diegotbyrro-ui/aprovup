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
    )
      .replace(
        /\n+/g,
        ' '
      )
      .replace(
        /\s+/g,
        ' '
      )
      .trim();


  if (
    !sourceText
  ) {
    return [];
  }


  /*
   * Margem interna de seguranca:
   * nunca usamos 100% da largura do card.
   */

  const safeWidth =
    Math.max(
      1,
      maxWidth -
      8
    );


  function widthOf(
    value:
      string
  ) {
    return font
      .widthOfTextAtSize(
        value,
        size
      );
  }


  /*
   * Quebra palavras/tokens que sozinhos
   * excedem a largura maxima.
   *
   * Isso resolve principalmente:
   * - URLs
   * - links do Instagram
   * - palavras longas
   * - strings sem espacos
   */

  function splitLongToken(
    token:
      string
  ) {
    if (
      widthOf(
        token
      ) <=
      safeWidth
    ) {
      return [
        token,
      ];
    }


    const chunks:
      string[] =
      [];


    let current =
      '';


    for (
      const char
      of token
    ) {
      const candidate =
        current +
        char;


      if (
        widthOf(
          candidate
        ) <=
        safeWidth
      ) {
        current =
          candidate;
      }
      else {
        if (
          current
        ) {
          chunks.push(
            current
          );
        }


        current =
          char;
      }
    }


    if (
      current
    ) {
      chunks.push(
        current
      );
    }


    return chunks;
  }


  const rawWords =
    sourceText
      .split(
        ' '
      )
      .filter(
        Boolean
      );


  const words =
    rawWords.flatMap(
      (
        word
      ) =>
        splitLongToken(
          word
        )
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
      widthOf(
        candidate
      ) <=
      safeWidth
    ) {
      current =
        candidate;

      continue;
    }


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


  if (
    current &&
    lines.length <
      maxLines
  ) {
    lines.push(
      current
    );
  }


  /*
   * Se houve corte pelo limite de linhas,
   * adicionamos reticencias SEM ultrapassar
   * a largura maxima.
   */

  const reconstructed =
    lines.join(
      ' '
    );


  if (
    reconstructed.length <
      sourceText.length &&
    lines.length >
      0
  ) {
    let lastLine =
      lines[
        lines.length -
        1
      ];


    while (
      lastLine.length >
        1 &&
      widthOf(
        lastLine +
        '...'
      ) >
        safeWidth
    ) {
      lastLine =
        lastLine.slice(
          0,
          -1
        );
    }


    lines[
      lines.length -
      1
    ] =
      lastLine +
      '...';
  }


  /*
   * Validacao defensiva:
   * nenhuma linha final pode ultrapassar safeWidth.
   */

  return lines.map(
    (
      line
    ) => {
      if (
        widthOf(
          line
        ) <=
        safeWidth
      ) {
        return line;
      }


      let adjusted =
        line;


      while (
        adjusted.length >
          1 &&
        widthOf(
          adjusted
        ) >
          safeWidth
      ) {
        adjusted =
          adjusted.slice(
            0,
            -1
          );
      }


      return adjusted;
    }
  );
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


  function fitHeader(
    text:
      string,
    initial:
      number,
    minimum:
      number,
    maxWidth:
      number
  ) {
    let fontSize =
      S(
        initial
      );


    const minimumSize =
      S(
        minimum
      );


    while (
      fontSize >
        minimumSize &&
      bold.widthOfTextAtSize(
        text,
        fontSize
      ) >
        W(
          maxWidth
        )
    ) {
      fontSize -=
        S(
          0.4
        );
    }


    return fontSize;
  }


  /*
   * ==================================================
   * HEADER
   * Cobre SOMENTE os textos placeholder do PDF.
   * ==================================================
   */

  page.drawRectangle({
    x:
      X(
        286
      ),

    y:
      Y(
        696
      ),

    width:
      W(
        470
      ),

    height:
      H(
        34
      ),

    color:
      NAVY,
  });


  page.drawRectangle({
    x:
      X(
        790
      ),

    y:
      Y(
        681
      ),

    width:
      W(
        190
      ),

    height:
      H(
        29
      ),

    color:
      NAVY,
  });


  const headerClient =
    cleanText(
      clientName
    )
      .toUpperCase();


  page.drawText(
    headerClient,
    {
      x:
        X(
          292
        ),

      y:
        Y(
          705
        ),

      size:
        fitHeader(
          headerClient,
          20,
          11.5,
          455
        ),

      font:
        bold,

      color:
        WHITE,
    }
  );


  const monthLabel =
    (
      monthNames[
        month -
        1
      ] +
      ' / ' +
      year
    )
      .toUpperCase();


  page.drawText(
    monthLabel,
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
        fitHeader(
          monthLabel,
          13,
          10,
          178
        ),

      font:
        bold,

      color:
        WHITE,
    }
  );


  /*
   * ==================================================
   * CALENDARIO
   * ==================================================
   */

  const columns = [
    28,
    166,
    305,
    443,
    582,
    721,
    860,
  ];


  const rows = [
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


  /*
   * Primeiro apagamos TODOS os numeros,
   * skeletons e placeholders do modelo.
   */

  for (
    const row
    of rows
  ) {
    for (
      const x
      of columns
    ) {
      page.drawRectangle({
        x:
          X(
            x +
            3
          ),

        y:
          Y(
            row.y +
            3
          ),

        width:
          W(
            cellWidth -
            6
          ),

        height:
          H(
            row.height -
            6
          ),

        color:
          WHITE,
      });
    }
  }


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


    const current =
      byDay.get(
        day
      ) ||
      [];


    current.push(
      content
    );


    byDay.set(
      day,
      current
    );
  }


  /*
   * Outubro/2026 e demais meses de 5 semanas.
   *
   * Caso algum mes exija uma sexta semana,
   * reduzimos dinamicamente a altura.
   */

  const totalSlots =
    firstWeekDay +
    daysInMonth;


  const rowCount =
    Math.ceil(
      totalSlots /
      7
    );


  const effectiveRows =
    rowCount <=
      5
      ? rows
      : Array.from(
          {
            length:
              6,
          },
          (
            _,
            index
          ) => ({
            y:
              102 +
              (
                5 -
                index
              ) *
              83,

            height:
              76,
          })
        );


  /*
   * Se forem 6 semanas, reconstruimos
   * a area inteira para caber corretamente.
   */

  if (
    rowCount >
    5
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
      const row
      of effectiveRows
    ) {
      for (
        const x
        of columns
      ) {
        page.drawRectangle({
          x:
            X(
              x
            ),

          y:
            Y(
              row.y
            ),

          width:
            W(
              cellWidth
            ),

          height:
            H(
              row.height
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


  for (
    let day =
      1;
    day <=
      daysInMonth;
    day +=
      1
  ) {
    const slot =
      firstWeekDay +
      day -
      1;


    const rowIndex =
      Math.floor(
        slot /
        7
      );


    const columnIndex =
      slot %
      7;


    const row =
      effectiveRows[
        rowIndex
      ];


    if (
      !row
    ) {
      continue;
    }


    const x =
      columns[
        columnIndex
      ];


    /*
     * NUMERO DO DIA
     */

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


    page.drawText(
      String(
        day
      ),
      {
        x:
          X(
            x +
            (
              day <
                10
                ? 14.5
                : 10.4
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
            9.4
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


    let cursorY =
      row.y +
      row.height -
      42;


    const visible =
      items.slice(
        0,
        2
      );


    visible.forEach(
      (
        item,
        index
      ) => {
        const kind =
          formatKind(
            item.format ||
            item.title
          );


        page.drawCircle({
          x:
            X(
              x +
              10
            ),

          y:
            Y(
              cursorY +
              3
            ),

          size:
            S(
              3.2
            ),

          color:
            COLORS[
              kind
            ],
        });


        const titleLines =
          wrapLines({
            text:
              item.title,

            font:
              bold,

            size:
              S(
                7.8
              ),

            maxWidth:
              W(
                110
              ),

            maxLines:
              items.length >
                1
                ? 2
                : 3,
          });


        drawLines({
          page,

          lines:
            titleLines,

          x:
            X(
              x +
              18
            ),

          y:
            Y(
              cursorY
            ),

          size:
            S(
              7.8
            ),

          lineHeight:
            S(
              9
            ),

          font:
            bold,

          color:
            TEXT,
        });


        cursorY -=
          Math.max(
            1,
            titleLines.length
          ) *
            9 +
          16;


        if (
          index ===
          visible.length -
            1
        ) {
          page.drawText(
            displayKind(
              kind
            ),
            {
              x:
                X(
                  x +
                  18
                ),

              y:
                Y(
                  row.y +
                  10
                ),

              size:
                S(
                  5.9
                ),

              font:
                bold,

              color:
                COLORS[
                  kind
                ],
            }
          );
        }
      }
    );


    if (
      items.length >
      2
    ) {
      page.drawText(
        '+' +
          String(
            items.length -
            2
          ) +
          ' mais',
        {
          x:
            X(
              x +
              83
            ),

          y:
            Y(
              row.y +
              10
            ),

          size:
            S(
              5.4
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


  function headerFontSize(
    text:
      string,
    initial:
      number,
    minimum:
      number,
    maxWidth:
      number
  ) {
    let fontSize =
      S(
        initial
      );


    const minimumSize =
      S(
        minimum
      );


    while (
      fontSize >
        minimumSize &&
      bold.widthOfTextAtSize(
        text,
        fontSize
      ) >
        W(
          maxWidth
        )
    ) {
      fontSize -=
        S(
          0.5
        );
    }


    return fontSize;
  }


  /*
   * HEADER SEM RETANGULOS EXTRAS
   */

  const headerClient =
    cleanText(
      clientName
    )
      .toUpperCase();


  page.drawRectangle({
    x:
      X(
        258
      ),

    y:
      Y(
        696
      ),

    width:
      W(
        478
      ),

    height:
      H(
        34
      ),

    color:
      NAVY,
  });


  page.drawText(
    headerClient,
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
        headerFontSize(
          headerClient,
          20,
          11.5,
          455
        ),

      font:
        bold,

      color:
        WHITE,
    }
  );


  const monthLabel =
    (
      monthNames[
        month -
        1
      ] +
      ' / ' +
      year
    )
      .toUpperCase();


  page.drawRectangle({
    x:
      X(
        780
      ),

    y:
      Y(
        681
      ),

    width:
      W(
        198
      ),

    height:
      H(
        29
      ),

    color:
      NAVY,
  });


  page.drawText(
    monthLabel,
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
        headerFontSize(
          monthLabel,
          13,
          10,
          188
        ),

      font:
        bold,

      color:
        WHITE,
    }
  );


  /*
   * AREA UTIL COMPLETA.
   */

  const leftX =
    24;


  const rightX =
    517;


  const cardWidth =
    483;


  const top =
    649;


  const bottom =
    55;


  const gap =
    10;


  /*
   * DISTRIBUICAO EQUILIBRADA:
   * 7 itens = 4 esquerda + 3 direita.
   * Cada coluna ocupa toda a altura disponivel.
   */

  const leftCount =
    Math.ceil(
      items.length /
      2
    );


  const leftItems =
    items.slice(
      0,
      leftCount
    );


  const rightItems =
    items.slice(
      leftCount
    );


  /*
   * Apaga todos os placeholders antigos da pagina 2.
   */

  page.drawRectangle({
    x:
      X(
        20
      ),

    y:
      Y(
        48
      ),

    width:
      W(
        984
      ),

    height:
      H(
        610
      ),

    color:
      rgb(
        0.975,
        0.985,
        0.998
      ),
  });


  function drawColumn(
    columnItems:
      typeof items,
    x:
      number
  ) {
    if (
      columnItems.length ===
      0
    ) {
      return;
    }


    const available =
      top -
      bottom;


    const calculatedHeight =
      (
        available -
        (
          columnItems.length -
          1
        ) *
        gap
      ) /
      columnItems.length;


    /*
     * Limita apenas o maximo.
     * Se tiver poucos itens, eles crescem.
     */

    const cardHeight =
      Math.min(
        145,
        calculatedHeight
      );


    const totalCardsHeight =
      cardHeight *
        columnItems.length +
      gap *
        (
          columnItems.length -
          1
        );


    /*
     * Centraliza verticalmente.
     */

    const startTop =
      top -
      (
        available -
        totalCardsHeight
      ) /
      2;


    columnItems.forEach(
      (
        content,
        index
      ) => {
        const y =
          startTop -
          cardHeight *
            (
              index +
              1
            ) -
          gap *
            index;


        /*
         * CARD
         */

        page.drawRectangle({
          x:
            X(
              x
            ),

          y:
            Y(
              y
            ),

          width:
            W(
              cardWidth
            ),

          height:
            H(
              cardHeight
            ),

          color:
            WHITE,

          borderColor:
            rgb(
              0.86,
              0.90,
              0.95
            ),

          borderWidth:
            S(
              0.8
            ),
        });


        /*
         * COLUNA DO DIA
         */

        page.drawRectangle({
          x:
            X(
              x +
              8
            ),

          y:
            Y(
              y +
              8
            ),

          width:
            W(
              58
            ),

          height:
            H(
              cardHeight -
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
                y +
                cardHeight -
                23
              ),

            size:
              S(
                6
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
          )
            .padStart(
              2,
              '0'
            );


        page.drawCircle({
          x:
            X(
              x +
              37
            ),

          y:
            Y(
              y +
              cardHeight /
              2
            ),

          size:
            S(
              18
            ),

          color:
            rgb(
              0.89,
              0.93,
              0.99
            ),
        });


        page.drawText(
          dayText,
          {
            x:
              X(
                x +
                27
              ),

            y:
              Y(
                y +
                cardHeight /
                2 -
                4
              ),

            size:
              S(
                11
              ),

            font:
              bold,

            color:
              TEXT,
          }
        );


        const textX =
          x +
          80;


        const maxTextWidth =
          cardWidth -
          98;


        const kind =
          formatKind(
            content.format ||
            content.title
          );


        /*
         * FORMATO
         */

        page.drawText(
          displayKind(
            kind
          ),
          {
            x:
              X(
                textX
              ),

            y:
              Y(
                y +
                cardHeight -
                21
              ),

            size:
              S(
                6.5
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
                textX
              ),

            y:
              Y(
                y +
                cardHeight -
                38
              ),

            size:
              S(
                5.3
              ),

            font:
              regular,

            color:
              MUTED,
          }
        );


        const titleLines =
          wrapLines({
            text:
              content.title,

            font:
              bold,

            size:
              S(
                8.7
              ),

            maxWidth:
              W(
                maxTextWidth
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
              textX
            ),

          y:
            Y(
              y +
              cardHeight -
              53
            ),

          size:
            S(
              8.7
            ),

          lineHeight:
            S(
              10.2
            ),

          font:
            bold,

          color:
            TEXT,
        });


        /*
         * RESUMO
         */

        const titleHeight =
          Math.max(
            1,
            titleLines.length
          ) *
          10;


        const summaryLabelY =
          y +
          cardHeight -
          63 -
          titleHeight;


        page.drawText(
          'RESUMO',
          {
            x:
              X(
                textX
              ),

            y:
              Y(
                summaryLabelY
              ),

            size:
              S(
                5.3
              ),

            font:
              regular,

            color:
              MUTED,
          }
        );


        const roomBelow =
          summaryLabelY -
          y -
          14;


        const maxSummaryLines =
          Math.max(
            2,
            Math.min(
              5,
              Math.floor(
                roomBelow /
                9
              )
            )
          );


        const summaryLines =
          wrapLines({
            text:
              summaryFor(
                content
              ),

            font:
              regular,

            size:
              S(
                7
              ),

            maxWidth:
              W(
                maxTextWidth
              ),

            maxLines:
              maxSummaryLines,
          });


        drawLines({
          page,

          lines:
            summaryLines,

          x:
            X(
              textX
            ),

          y:
            Y(
              summaryLabelY -
              14
            ),

          size:
            S(
              8.2
            ),

          lineHeight:
            S(
              9.8
            ),

          font:
            regular,

          color:
            MUTED,
        });
      }
    );
  }


  drawColumn(
    leftItems,
    leftX
  );


  drawColumn(
    rightItems,
    rightX
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

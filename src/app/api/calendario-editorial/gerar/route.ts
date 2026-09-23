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
  focus,
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

  focus:
    string;

  regular:
    PDFFont;

  bold:
    PDFFont;
}) {

  /*
   * Cabecalho do mes.
   */
  page.drawRectangle({
    x:
      687,
    y:
      512,
    width:
      135,
    height:
      42,
    color:
      NAVY,
  });


  page.drawText(
    'CALENDARIO MENSAL',
    {
      x:
        698,
      y:
        540,
      size:
        5,
      font:
        regular,
      color:
        WHITE,
    }
  );


  page.drawText(
    (
      monthNames[
        month -
        1
      ] +
      ' / ' +
      year
    )
      .toUpperCase(),
    {
      x:
        698,
      y:
        522,
      size:
        10,
      font:
        bold,
      color:
        WHITE,
    }
  );


  drawHeaderValue({
    page,
    text:
      clientName,
    x:
      31,
    y:
      468,
    width:
      292,
    font:
      bold,
  });


  drawHeaderValue({
    page,
    text:
      focus ||
      'Planejamento editorial do mes',
    x:
      358,
    y:
      468,
    width:
      447,
    font:
      regular,
  });


  const columnX = [
    22,
    135,
    248,
    362,
    474,
    587,
    700,
  ];


  const rowY = [
    352,
    286,
    219,
    152,
    84,
    13,
  ];


  const rowHeight = [
    63,
    62,
    63,
    63,
    64,
    66,
  ];


  const cellWidth =
    109;


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


    const row =
      Math.floor(
        slot /
        7
      );


    const col =
      slot %
      7;


    if (
      row >
      5
    ) {
      continue;
    }


    const x =
      columnX[
        col
      ];


    const y =
      rowY[
        row
      ];


    const height =
      rowHeight[
        row
      ];


    /*
     * Limpa o esqueleto interno do template,
     * mantendo a borda externa.
     */
    page.drawRectangle({
      x:
        x +
        3,

      y:
        y +
        3,

      width:
        cellWidth -
        6,

      height:
        height -
        6,

      color:
        PAPER,
    });


    page.drawCircle({
      x:
        x +
        10,

      y:
        y +
        height -
        11,

      size:
        7,

      color:
        PALE_BLUE,
    });


    page.drawText(
      String(
        day
      ),
      {
        x:
          x +
          (
            day <
            10
              ? 8.3
              : 5.9
          ),

        y:
          y +
          height -
          13,

        size:
          6.5,

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


    let cursorY =
      y +
      height -
      27;


    items
      .slice(
        0,
        2
      )
      .forEach(
        (
          item
        ) => {
          const kind =
            formatKind(
              item.format
            );


          page.drawCircle({
            x:
              x +
              9,

            y:
              cursorY +
              2,

            size:
              2.3,

            color:
              COLORS[
                kind
              ],
          });


          page.drawText(
            fitText(
              item.title,
              bold,
              5.3,
              88
            ),
            {
              x:
                x +
                15,

              y:
                cursorY,

              size:
                5.3,

              font:
                bold,

              color:
                TEXT,
            }
          );


          page.drawText(
            displayKind(
              kind
            ),
            {
              x:
                x +
                15,

              y:
                cursorY -
                8,

              size:
                4.2,

              font:
                regular,

              color:
                COLORS[
                  kind
                ],
            }
          );


          cursorY -=
            22;
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
          ' conteudo(s)',
        {
          x:
            x +
            8,

          y:
            y +
            7,

          size:
            4.4,

          font:
            bold,

          color:
            MUTED,
        }
      );
    }
  }
}


function fillDetailPage({
  page,
  items,
  month,
  year,
  clientName,
  observation,
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

  observation:
    string;

  regular:
    PDFFont;

  bold:
    PDFFont;
}) {

  page.drawRectangle({
    x:
      687,
    y:
      512,
    width:
      135,
    height:
      42,
    color:
      NAVY,
  });


  page.drawText(
    'RESUMO DOS POSTS',
    {
      x:
        698,
      y:
        540,
      size:
        5,
      font:
        regular,
      color:
        WHITE,
    }
  );


  page.drawText(
    (
      monthNames[
        month -
        1
      ] +
      ' / ' +
      year
    )
      .toUpperCase(),
    {
      x:
        698,
      y:
        522,
      size:
        10,
      font:
        bold,
      color:
        WHITE,
    }
  );


  drawHeaderValue({
    page,
    text:
      clientName,
    x:
      31,
    y:
      468,
    width:
      265,
    font:
      bold,
  });


  drawHeaderValue({
    page,
    text:
      monthNames[
        month -
        1
      ] +
      ' / ' +
      year,
    x:
      330,
    y:
      468,
    width:
      190,
    font:
      regular,
  });


  drawHeaderValue({
    page,
    text:
      observation ||
      'Planejamento editorial mensal',
    x:
      554,
    y:
      468,
    width:
      250,
    font:
      regular,
  });


  const columns = [
    22,
    425,
  ];


  const rowY = [
    387,
    315,
    243,
    171,
    98,
    25,
  ];


  const cardWidth =
    395;


  const cardHeight =
    64;


  items.forEach(
    (
      content,
      index
    ) => {
      const column =
        index %
        2;


      const row =
        Math.floor(
          index /
          2
        );


      if (
        row >
        5
      ) {
        return;
      }


      const x =
        columns[
          column
        ];


      const y =
        rowY[
          row
        ];


      page.drawRectangle({
        x:
          x +
          3,

        y:
          y +
          3,

        width:
          cardWidth -
          6,

        height:
          cardHeight -
          6,

        color:
          WHITE,
      });


      page.drawRectangle({
        x:
          x +
          5,

        y:
          y +
          6,

        width:
          32,

        height:
          cardHeight -
          12,

        color:
          PALE_BLUE,
      });


      const day =
        content.plannedDate
          ? dayInMaceio(
              content.plannedDate
            )
          : 0;


      page.drawText(
        'DIA',
        {
          x:
            x +
            12,

          y:
            y +
            cardHeight -
            15,

          size:
            4.2,

          font:
            bold,

          color:
            MUTED,
        }
      );


      page.drawText(
        String(
          day
        ).padStart(
          2,
          '0'
        ),
        {
          x:
            x +
            11,

          y:
            y +
            23,

          size:
            11,

          font:
            bold,

          color:
            TEXT,
        }
      );


      const kind =
        formatKind(
          content.format
        );


      page.drawText(
        displayKind(
          kind
        ),
        {
          x:
            x +
            46,

          y:
            y +
            cardHeight -
            14,

          size:
            4.5,

          font:
            bold,

          color:
            COLORS[
              kind
            ],
        }
      );


      page.drawText(
        fitText(
          content.title,
          bold,
          6.5,
          cardWidth -
            62
        ),
        {
          x:
            x +
            46,

          y:
            y +
            cardHeight -
            29,

          size:
            6.5,

          font:
            bold,

          color:
            TEXT,
        }
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
            5.1,

          maxWidth:
            cardWidth -
            62,

          maxLines:
            2,
        });


      drawLines({
        page,
        lines:
          summaryLines,

        x:
          x +
          46,

        y:
          y +
          cardHeight -
          43,

        size:
          5.1,

        lineHeight:
          7,

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


    const focus =
      String(
        request.nextUrl
          .searchParams
          .get(
            'foco'
          ) ||
        ''
      )
        .trim()
        .slice(
          0,
          180
        );


    const observation =
      String(
        request.nextUrl
          .searchParams
          .get(
            'observacao'
          ) ||
        ''
      )
        .trim()
        .slice(
          0,
          180
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

      focus,

      regular,
      bold,
    });


    const detailPageCount =
      Math.max(
        1,
        Math.ceil(
          contents.length /
          12
        )
      );


    for (
      let pageIndex =
        0;
      pageIndex <
        detailPageCount;
      pageIndex +=
        1
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
          contents.slice(
            pageIndex *
              12,
            pageIndex *
              12 +
              12
          ),

        month,
        year,

        clientName:
          client.name,

        observation,

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

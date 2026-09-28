import {
  NextResponse,
} from 'next/server';

import {
  PDFDocument,
  StandardFonts,
  rgb,
} from 'pdf-lib';

import {
  getCurrentUser,
} from '@/lib/auth';

import {
  hasPermission,
} from '@/lib/userAccess';

import {
  prisma,
} from '@/lib/prisma';


export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';


const PAGE_WIDTH =
  595.28;

const PAGE_HEIGHT =
  841.89;

const MARGIN =
  46;

const CONTENT_WIDTH =
  PAGE_WIDTH -
  MARGIN *
    2;

const BOTTOM_MARGIN =
  46;


const COLOR_NAVY =
  rgb(
    0.025,
    0.055,
    0.12
  );

const COLOR_BLUE =
  rgb(
    0.08,
    0.36,
    0.92
  );

const COLOR_GREEN =
  rgb(
    0.02,
    0.55,
    0.35
  );

const COLOR_AMBER =
  rgb(
    0.82,
    0.42,
    0.05
  );

const COLOR_TEXT =
  rgb(
    0.12,
    0.16,
    0.23
  );

const COLOR_MUTED =
  rgb(
    0.40,
    0.45,
    0.53
  );

const COLOR_LINE =
  rgb(
    0.88,
    0.90,
    0.93
  );


function toStringArray(
  value:
    unknown
) {

  return Array.isArray(
    value
  )
    ? value.filter(
        (
          item
        ): item is string =>
          typeof item ===
          'string'
      )
    : [];
}


function cleanPdfText(
  value:
    unknown
) {

  return String(
    value ??
    ''
  )
    .replace(
      /\r/g,
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
      /\u2026/g,
      '...'
    )
    .replace(
      /[\u2022\u00B7]/g,
      '-'
    )
    .replace(
      /\u00A0/g,
      ' '
    )
    .replace(
      /[^\u0020-\u007E\u00A0-\u00FF\n\t]/g,
      ''
    )
    .trim();
}


function formatDate(
  value:
    Date |
    null
) {

  if (!value) {
    return '-';
  }


  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      timeZone:
        'America/Maceio',

      day:
        '2-digit',

      month:
        '2-digit',

      year:
        'numeric',

      hour:
        '2-digit',

      minute:
        '2-digit',
    }
  ).format(
    value
  );
}


function safeFileName(
  value:
    string
) {

  const normalized =
    value
      .normalize(
        'NFD'
      )
      .replace(
        /[\u0300-\u036f]/g,
        ''
      )
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        '-'
      )
      .replace(
        /^-+|-+$/g,
        ''
      )
      .slice(
        0,
        70
      );


  return (
    normalized ||
    'reuniao'
  );
}


export async function GET(
  _request:
    Request,

  context: {
    params:
      Promise<{
        id:
          string;
      }>;
  }
) {

  const currentUser =
    await getCurrentUser();


  if (
    !currentUser ||
    currentUser.status !==
      'APROVADO' ||
    !currentUser.agencyId ||
    !hasPermission(
      currentUser,
      'settings.manage'
    )
  ) {

    return NextResponse.json(
      {
        message:
          'Acesso não autorizado.',
      },
      {
        status:
          401,
      }
    );
  }


  const {
    id,
  } =
    await context.params;


  const meeting =
    await prisma
      .secretaryMeeting
      .findFirst({
        where: {
          id,

          agencyId:
            currentUser.agencyId,
        },

        include: {
          agency: {
            select: {
              name:
                true,
            },
          },

          client: {
            select: {
              name:
                true,
            },
          },

          transcriptEntries: {
            orderBy: [
              {
                startTime:
                  'asc',
              },

              {
                createdAt:
                  'asc',
              },
            ],
          },

          actions: {
            orderBy: {
              createdAt:
                'asc',
            },
          },
        },
      });


  if (!meeting) {

    return NextResponse.json(
      {
        message:
          'Reunião não encontrada.',
      },
      {
        status:
          404,
      }
    );
  }


  const pdf =
    await PDFDocument.create();


  pdf.setTitle(
    cleanPdfText(
      'Relatório de reunião - ' +
      meeting.title
    )
  );

  pdf.setAuthor(
    'AprovUp / Liv'
  );

  pdf.setSubject(
    'Resumo, plano de ação e transcrição da reunião.'
  );

  pdf.setCreator(
    'AprovUp'
  );

  pdf.setProducer(
    'AprovUp'
  );

  pdf.setCreationDate(
    new Date()
  );


  const regular =
    await pdf.embedFont(
      StandardFonts.Helvetica
    );


  const bold =
    await pdf.embedFont(
      StandardFonts.HelveticaBold
    );


  let page =
    pdf.addPage([
      PAGE_WIDTH,
      PAGE_HEIGHT,
    ]);


  let y =
    PAGE_HEIGHT;


  function newPage() {

    page =
      pdf.addPage([
        PAGE_WIDTH,
        PAGE_HEIGHT,
      ]);


    page.drawRectangle({
      x:
        0,

      y:
        PAGE_HEIGHT -
        52,

      width:
        PAGE_WIDTH,

      height:
        52,

      color:
        COLOR_NAVY,
    });


    page.drawText(
      'AprovUp',
      {
        x:
          MARGIN,

        y:
          PAGE_HEIGHT -
          34,

        size:
          17,

        font:
          bold,

        color:
          rgb(
            1,
            1,
            1
          ),
      }
    );


    page.drawText(
      'Relatorio de reuniao - Liv',
      {
        x:
          PAGE_WIDTH -
          MARGIN -
          143,

        y:
          PAGE_HEIGHT -
          31,

        size:
          8,

        font:
          regular,

        color:
          rgb(
            0.73,
            0.79,
            0.90
          ),
      }
    );


    y =
      PAGE_HEIGHT -
      78;
  }


  function ensureSpace(
    required:
      number
  ) {

    if (
      y -
      required <
      BOTTOM_MARGIN
    ) {

      newPage();
    }
  }


  function wrapText(
    value:
      string,

    font:
      typeof regular,

    size:
      number,

    width:
      number
  ) {

    const text =
      cleanPdfText(
        value
      );


    if (!text) {
      return [
        '',
      ];
    }


    const result:
      string[] =
      [];


    const paragraphs =
      text.split(
        '\n'
      );


    for (
      const paragraph
      of paragraphs
    ) {

      const trimmed =
        paragraph.trim();


      if (!trimmed) {

        result.push(
          ''
        );

        continue;
      }


      const words =
        trimmed.split(
          /\s+/
        );


      let line =
        '';


      for (
        const word
        of words
      ) {

        const candidate =
          line
            ? line +
              ' ' +
              word
            : word;


        if (
          font.widthOfTextAtSize(
            candidate,
            size
          ) <=
          width
        ) {

          line =
            candidate;

          continue;
        }


        if (line) {

          result.push(
            line
          );

          line =
            '';
        }


        if (
          font.widthOfTextAtSize(
            word,
            size
          ) <=
          width
        ) {

          line =
            word;

          continue;
        }


        let piece =
          '';


        for (
          const character
          of word
        ) {

          const candidatePiece =
            piece +
            character;


          if (
            font.widthOfTextAtSize(
              candidatePiece,
              size
            ) >
            width &&
            piece
          ) {

            result.push(
              piece
            );

            piece =
              character;

          }
          else {

            piece =
              candidatePiece;
          }
        }


        line =
          piece;
      }


      if (line) {

        result.push(
          line
        );
      }
    }


    return result;
  }


  function drawParagraph(
    value:
      string,

    options?: {
      size?:
        number;

      font?:
        typeof regular;

      color?:
        ReturnType<
          typeof rgb
        >;

      indent?:
        number;

      lineHeight?:
        number;

      spacingAfter?:
        number;
    }
  ) {

    const size =
      options?.size ??
      10.5;


    const font =
      options?.font ??
      regular;


    const color =
      options?.color ??
      COLOR_TEXT;


    const indent =
      options?.indent ??
      0;


    const lineHeight =
      options?.lineHeight ??
      size *
        1.5;


    const spacingAfter =
      options?.spacingAfter ??
      7;


    const lines =
      wrapText(
        value,
        font,
        size,
        CONTENT_WIDTH -
        indent
      );


    for (
      const line
      of lines
    ) {

      ensureSpace(
        lineHeight +
        3
      );


      if (!line) {

        y -=
          lineHeight *
          0.7;

        continue;
      }


      page.drawText(
        line,
        {
          x:
            MARGIN +
            indent,

          y:
            y -
            size,

          size,

          font,

          color,
        }
      );


      y -=
        lineHeight;
    }


    y -=
      spacingAfter;
  }


  function drawSectionTitle(
    value:
      string,

    color =
      COLOR_BLUE
  ) {

    ensureSpace(
      38
    );


    page.drawText(
      cleanPdfText(
        value.toUpperCase()
      ),
      {
        x:
          MARGIN,

        y:
          y -
          11,

        size:
          10,

        font:
          bold,

        color,
      }
    );


    y -=
      20;


    page.drawLine({
      start: {
        x:
          MARGIN,

        y,
      },

      end: {
        x:
          PAGE_WIDTH -
          MARGIN,

        y,
      },

      thickness:
        0.8,

      color:
        COLOR_LINE,
    });


    y -=
      15;
  }


  function drawList(
    values:
      string[],

    emptyMessage:
      string
  ) {

    if (
      values.length ===
      0
    ) {

      drawParagraph(
        emptyMessage,
        {
          color:
            COLOR_MUTED,
        }
      );

      return;
    }


    for (
      const value
      of values
    ) {

      drawParagraph(
        '- ' +
        value,
        {
          indent:
            8,

          spacingAfter:
            5,
        }
      );
    }
  }


  /*
   * Cabeçalho da primeira página.
   */
  page.drawRectangle({
    x:
      0,

    y:
      PAGE_HEIGHT -
      150,

    width:
      PAGE_WIDTH,

    height:
      150,

    color:
      COLOR_NAVY,
  });


  page.drawText(
    'AprovUp',
    {
      x:
        MARGIN,

      y:
        PAGE_HEIGHT -
        39,

      size:
        19,

      font:
        bold,

      color:
        rgb(
          1,
          1,
          1
        ),
    }
  );


  page.drawText(
    'RELATORIO DE REUNIAO',
    {
      x:
        MARGIN,

      y:
        PAGE_HEIGHT -
        72,

      size:
        9,

      font:
        bold,

      color:
        rgb(
          0.32,
          0.64,
          1
        ),
    }
  );


  const titleLines =
    wrapText(
      meeting.title,
      bold,
      20,
      CONTENT_WIDTH
    );


  let titleY =
    PAGE_HEIGHT -
    99;


  for (
    const line
    of titleLines.slice(
      0,
      2
    )
  ) {

    page.drawText(
      line,
      {
        x:
          MARGIN,

        y:
          titleY,

        size:
          20,

        font:
          bold,

        color:
          rgb(
            1,
            1,
            1
          ),
      }
    );


    titleY -=
      25;
  }


  y =
    PAGE_HEIGHT -
    178;


  drawParagraph(
    'Data: ' +
    formatDate(
      meeting.startedAt ||
      meeting.scheduledStart
    ),
    {
      size:
        9.5,

      font:
        bold,

      spacingAfter:
        2,
    }
  );


  drawParagraph(
    'Agencia: ' +
    meeting.agency.name,
    {
      size:
        9.5,

      spacingAfter:
        2,
    }
  );


  if (
    meeting.client
      ?.name
  ) {

    drawParagraph(
      'Cliente: ' +
      meeting.client.name,
      {
        size:
          9.5,

        spacingAfter:
          2,
      }
    );
  }


  if (
    meeting.createdByName
  ) {

    drawParagraph(
      'Criada por: ' +
      meeting.createdByName,
      {
        size:
          9.5,

        spacingAfter:
          2,
      }
    );
  }


  if (
    meeting.processedAt
  ) {

    drawParagraph(
      'Processada pela Liv em: ' +
      formatDate(
        meeting.processedAt
      ),
      {
        size:
          9.5,

        spacingAfter:
          8,
      }
    );
  }


  /*
   * Resumo
   */
  drawSectionTitle(
    'Resumo da Liv',
    COLOR_BLUE
  );


  drawParagraph(
    meeting.summary ||
    'A Liv ainda não gerou um resumo para esta reunião.',
    {
      size:
        11,

      lineHeight:
        17,
    }
  );


  /*
   * Decisões
   */
  drawSectionTitle(
    'Decisões',
    COLOR_GREEN
  );


  drawList(
    toStringArray(
      meeting.decisions
    ),
    'Nenhuma decisão registrada.'
  );


  /*
   * Pendências
   */
  drawSectionTitle(
    'Pendências',
    COLOR_AMBER
  );


  drawList(
    toStringArray(
      meeting.pendingItems
    ),
    'Nenhuma pendência registrada.'
  );


  /*
   * Ideias
   */
  drawSectionTitle(
    'Ideias levantadas',
    COLOR_BLUE
  );


  drawList(
    toStringArray(
      meeting.ideas
    ),
    'Nenhuma ideia registrada.'
  );


  /*
   * Plano de ação
   */
  drawSectionTitle(
    'Plano de ação',
    COLOR_GREEN
  );


  if (
    meeting.actions.length ===
    0
  ) {

    drawParagraph(
      'Nenhuma ação identificada.',
      {
        color:
          COLOR_MUTED,
      }
    );

  }
  else {

    for (
      let index = 0;
      index <
      meeting.actions.length;
      index += 1
    ) {

      const action =
        meeting.actions[
          index
        ];


      ensureSpace(
        55
      );


      drawParagraph(
        String(
          index +
          1
        ) +
        '. ' +
        action.title,
        {
          size:
            11,

          font:
            bold,

          spacingAfter:
            3,
        }
      );


      if (
        action.description
      ) {

        drawParagraph(
          action.description,
          {
            size:
              9.5,

            spacingAfter:
              3,
          }
        );
      }


      const metadata:
        string[] =
        [];


      metadata.push(
        'Tipo: ' +
        action.type
      );


      metadata.push(
        'Responsavel: ' +
        (
          action.responsible ||
          'Nao definido'
        )
      );


      if (
        action.dueDateText
      ) {

        metadata.push(
          'Prazo: ' +
          action.dueDateText
        );
      }


      drawParagraph(
        metadata.join(
          ' | '
        ),
        {
          size:
            8.5,

          color:
            COLOR_MUTED,

          spacingAfter:
            10,
        }
      );
    }
  }


  /*
   * Transcrição
   */
  drawSectionTitle(
    'Transcrição completa',
    COLOR_BLUE
  );


  if (
    meeting
      .transcriptEntries
      .length >
    0
  ) {

    for (
      const entry
      of meeting
        .transcriptEntries
    ) {

      ensureSpace(
        42
      );


      const speaker =
        entry.speakerName ||
        'Participante';


      const time =
        entry.startTime
          ? formatDate(
              entry.startTime
            )
          : '';


      drawParagraph(
        speaker +
        (
          time
            ? ' - ' +
              time
            : ''
        ),
        {
          size:
            9.5,

          font:
            bold,

          color:
            COLOR_NAVY,

          spacingAfter:
            2,
        }
      );


      drawParagraph(
        entry.text,
        {
          size:
            9.5,

          lineHeight:
            14,

          spacingAfter:
            11,
        }
      );
    }

  }
  else if (
    meeting.rawTranscript
  ) {

    drawParagraph(
      meeting.rawTranscript,
      {
        size:
          9.5,

        lineHeight:
          14,
      }
    );

  }
  else {

    drawParagraph(
      'Nenhuma transcrição disponível.',
      {
        color:
          COLOR_MUTED,
      }
    );
  }


  /*
   * Rodapé e paginação.
   */
  const pages =
    pdf.getPages();


  pages.forEach(
    (
      currentPage,
      index
    ) => {

      currentPage.drawLine({
        start: {
          x:
            MARGIN,

          y:
            31,
        },

        end: {
          x:
            PAGE_WIDTH -
            MARGIN,

          y:
            31,
        },

        thickness:
          0.6,

        color:
          COLOR_LINE,
      });


      currentPage.drawText(
        'AprovUp - Relatorio gerado pela Liv',
        {
          x:
            MARGIN,

          y:
            17,

          size:
            7.5,

          font:
            regular,

          color:
            COLOR_MUTED,
        }
      );


      const pageText =
        'Pagina ' +
        String(
          index +
          1
        ) +
        ' de ' +
        String(
          pages.length
        );


      const pageTextWidth =
        regular.widthOfTextAtSize(
          pageText,
          7.5
        );


      currentPage.drawText(
        pageText,
        {
          x:
            PAGE_WIDTH -
            MARGIN -
            pageTextWidth,

          y:
            17,

          size:
            7.5,

          font:
            regular,

          color:
            COLOR_MUTED,
        }
      );
    }
  );


  const bytes =
    await pdf.save();


  const arrayBuffer =
    bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset +
      bytes.byteLength
    ) as ArrayBuffer;


  const filename =
    'relatorio-reuniao-' +
    safeFileName(
      meeting.title
    ) +
    '.pdf';


  return new NextResponse(
    arrayBuffer,
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
      },
    }
  );
}
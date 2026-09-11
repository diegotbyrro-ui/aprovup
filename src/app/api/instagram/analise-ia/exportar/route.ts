import {
  PDFDocument,
  StandardFonts,
  rgb,
} from 'pdf-lib';

import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  getCurrentUser,
} from '@/lib/auth';

import {
  prisma,
} from '@/lib/prisma';

import {
  hasPermission,
} from '@/lib/userAccess';


export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';

export const maxDuration =
  60;


type Insight = {
  title:
    string;

  evidence:
    string;
};


type Pattern = {
  pattern:
    string;

  evidence:
    string;

  implication:
    string;
};


type Recommendation = {
  priority:
    string;

  action:
    string;

  why:
    string;

  metricToWatch:
    string;
};


type Experiment = {
  test:
    string;

  hypothesis:
    string;

  successMetric:
    string;
};


type Analysis = {
  executiveSummary:
    string;

  dataQuality:
    string;

  wins:
    Insight[];

  risks:
    Insight[];

  patterns:
    Pattern[];

  recommendations:
    Recommendation[];

  experiments:
    Experiment[];

  model:
    string;

  generatedAt:
    string;
};


type SourceInfo = {
  postsAnalyzed?:
    number;

  reelsAnalyzed?:
    number;

  hasAccountMetrics?:
    boolean;
};


function validAnalysis(
  value:
    unknown
): value is Analysis {
  if (
    typeof value !==
      'object' ||
    value ===
      null
  ) {
    return false;
  }

  const analysis =
    value as
      Record<
        string,
        unknown
      >;

  return (
    typeof analysis
      .executiveSummary ===
      'string' &&
    typeof analysis
      .dataQuality ===
      'string' &&
    Array.isArray(
      analysis.wins
    ) &&
    Array.isArray(
      analysis.risks
    ) &&
    Array.isArray(
      analysis.patterns
    ) &&
    Array.isArray(
      analysis.recommendations
    ) &&
    Array.isArray(
      analysis.experiments
    ) &&
    typeof analysis.model ===
      'string' &&
    typeof analysis.generatedAt ===
      'string'
  );
}


function safeFileName(
  value:
    string
) {
  const clean =
    value
      .normalize(
        'NFD'
      )
      .replace(
        /[\u0300-\u036f]/g,
        ''
      )
      .replace(
        /[^a-zA-Z0-9]+/g,
        '-'
      )
      .replace(
        /^-+|-+$/g,
        ''
      )
      .toLowerCase();

  return clean ||
    'cliente';
}


function escapeHtml(
  value:
    string
) {
  return String(
    value ||
    ''
  )
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#39;'
    );
}


function formatGeneratedAt(
  value:
    string
) {
  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date
    .toLocaleString(
      'pt-BR',
      {
        timeZone:
          'America/Maceio',
      }
    );
}


function wordList(
  items:
    string[]
) {
  if (
    items.length ===
    0
  ) {
    return '<p class="muted">Nenhum item retornado.</p>';
  }

  return (
    '<ol>' +
    items
      .map(
        (
          item
        ) =>
          `<li>${item}</li>`
      )
      .join(
        ''
      ) +
    '</ol>'
  );
}


function buildWordHtml({
  clientName,
  username,
  period,
  analysis,
  source,
}: {
  clientName:
    string;

  username:
    string | null;

  period:
    number;

  analysis:
    Analysis;

  source:
    SourceInfo | null;
}) {
  const wins =
    analysis.wins.map(
      (
        item
      ) =>
        `<strong>${escapeHtml(item.title)}</strong><br>${escapeHtml(item.evidence)}`
    );

  const risks =
    analysis.risks.map(
      (
        item
      ) =>
        `<strong>${escapeHtml(item.title)}</strong><br>${escapeHtml(item.evidence)}`
    );

  const patterns =
    analysis.patterns.map(
      (
        item
      ) =>
        `<strong>${escapeHtml(item.pattern)}</strong><br><em>Evidência:</em> ${escapeHtml(item.evidence)}<br><em>Implicação:</em> ${escapeHtml(item.implication)}`
    );

  const recommendations =
    analysis.recommendations.map(
      (
        item
      ) =>
        `<strong>[${escapeHtml(item.priority)}] ${escapeHtml(item.action)}</strong><br>${escapeHtml(item.why)}<br><em>Acompanhar:</em> ${escapeHtml(item.metricToWatch)}`
    );

  const experiments =
    analysis.experiments.map(
      (
        item
      ) =>
        `<strong>${escapeHtml(item.test)}</strong><br>${escapeHtml(item.hypothesis)}<br><em>Métrica de sucesso:</em> ${escapeHtml(item.successMetric)}`
    );

  const sourceText =
    source
      ? `${source.postsAnalyzed ?? 0} posts analisados · ${source.reelsAnalyzed ?? 0} Reels analisados`
      : 'Fonte: métricas disponíveis no AprovUp';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Análise IA - ${escapeHtml(clientName)}</title>
<style>
  @page { margin: 2cm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #172033; line-height: 1.55; font-size: 11pt; }
  h1 { color: #111827; font-size: 24pt; margin-bottom: 4px; }
  h2 { color: #4338ca; font-size: 16pt; margin-top: 28px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
  p { margin: 8px 0; }
  li { margin-bottom: 12px; }
  .meta { color: #64748b; font-size: 9.5pt; }
  .summary { background: #f5f3ff; border: 1px solid #ddd6fe; padding: 16px; margin-top: 20px; }
  .muted { color: #94a3b8; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; color: #94a3b8; font-size: 9pt; }
</style>
</head>
<body>
  <h1>Análise de desempenho do Instagram</h1>
  <p><strong>${escapeHtml(clientName)}</strong>${username ? ` · @${escapeHtml(username)}` : ''}</p>
  <p class="meta">Período: últimos ${period} dias · Gerado em ${escapeHtml(formatGeneratedAt(analysis.generatedAt))} · Modelo ${escapeHtml(analysis.model)}</p>
  <p class="meta">${escapeHtml(sourceText)}</p>

  <div class="summary">
    <strong>Resumo executivo</strong>
    <p>${escapeHtml(analysis.executiveSummary)}</p>
  </div>

  <h2>Qualidade dos dados</h2>
  <p>${escapeHtml(analysis.dataQuality)}</p>

  <h2>O que está funcionando</h2>
  ${wordList(wins)}

  <h2>Pontos de atenção</h2>
  ${wordList(risks)}

  <h2>Padrões encontrados</h2>
  ${wordList(patterns)}

  <h2>Próximos passos</h2>
  ${wordList(recommendations)}

  <h2>Testes sugeridos</h2>
  ${wordList(experiments)}

  <p class="footer">Documento gerado pelo AprovUp a partir da análise IA exibida na plataforma.</p>
</body>
</html>`;
}


function pdfSafe(
  value:
    string
) {
  return String(
    value ||
    ''
  )
    .replace(
      /\u00a0/g,
      ' '
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
      /[\u2013\u2014]/g,
      '-'
    )
    .replace(
      /[\u2022\u25cf\u25aa]/g,
      '-'
    )
    .replace(
      /\u2026/g,
      '...'
    )
    .replace(
      /[^\u0009\u000a\u000d\u0020-\u007e\u00a0-\u00ff\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u20ac\u2122]/g,
      ''
    );
}


async function buildPdf({
  clientName,
  username,
  period,
  analysis,
  source,
}: {
  clientName:
    string;

  username:
    string | null;

  period:
    number;

  analysis:
    Analysis;

  source:
    SourceInfo | null;
}) {
  const pdf =
    await PDFDocument
      .create();

  const regular =
    await pdf.embedFont(
      StandardFonts.Helvetica
    );

  const bold =
    await pdf.embedFont(
      StandardFonts.HelveticaBold
    );

  const pageWidth =
    595.28;

  const pageHeight =
    841.89;

  const margin =
    48;

  const contentWidth =
    pageWidth -
    margin * 2;

  let page =
    pdf.addPage([
      pageWidth,
      pageHeight,
    ]);

  let y =
    pageHeight -
    margin;

  function newPage() {
    page =
      pdf.addPage([
        pageWidth,
        pageHeight,
      ]);

    y =
      pageHeight -
      margin;
  }

  function ensureSpace(
    needed:
      number
  ) {
    if (
      y -
      needed <
      margin
    ) {
      newPage();
    }
  }

  function wrap(
    text:
      string,
    fontSize:
      number,
    useBold:
      boolean = false
  ) {
    const font =
      useBold
        ? bold
        : regular;

    const clean =
      pdfSafe(
        text
      )
        .replace(
          /\s+/g,
          ' '
        )
        .trim();

    if (
      !clean
    ) {
      return [
        '',
      ];
    }

    const words =
      clean.split(
        ' '
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
          ? `${current} ${word}`
          : word;

      if (
        font.widthOfTextAtSize(
          candidate,
          fontSize
        ) <=
        contentWidth
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
      }
    }

    if (
      current
    ) {
      lines.push(
        current
      );
    }

    return lines;
  }

  function drawBlock(
    text:
      string,
    options?: {
      size?:
        number;

      bold?:
        boolean;

      color?:
        ReturnType<
          typeof rgb
        >;

      gapAfter?:
        number;

      lineHeight?:
        number;
    }
  ) {
    const size =
      options?.size ??
      10.5;

    const useBold =
      options?.bold ??
      false;

    const color =
      options?.color ??
      rgb(
        0.12,
        0.16,
        0.24
      );

    const lineHeight =
      options?.lineHeight ??
      size * 1.45;

    const gapAfter =
      options?.gapAfter ??
      8;

    const lines =
      wrap(
        text,
        size,
        useBold
      );

    for (
      const line
      of lines
    ) {
      ensureSpace(
        lineHeight +
        3
      );

      page.drawText(
        line,
        {
          x:
            margin,

          y,

          size,

          font:
            useBold
              ? bold
              : regular,

          color,
        }
      );

      y -=
        lineHeight;
    }

    y -=
      gapAfter;
  }

  function sectionTitle(
    value:
      string
  ) {
    ensureSpace(
      36
    );

    y -=
      5;

    drawBlock(
      value,
      {
        size:
          15,

        bold:
          true,

        color:
          rgb(
            0.26,
            0.22,
            0.79
          ),

        gapAfter:
          8,
      }
    );
  }

  function numberedItems(
    items:
      Array<{
        title:
          string;

        body:
          string;
      }>
  ) {
    if (
      items.length ===
      0
    ) {
      drawBlock(
        'Nenhum item retornado.',
        {
          color:
            rgb(
              0.55,
              0.6,
              0.68
            ),
        }
      );

      return;
    }

    items.forEach(
      (
        item,
        index
      ) => {
        ensureSpace(
          48
        );

        drawBlock(
          `${index + 1}. ${item.title}`,
          {
            size:
              11,

            bold:
              true,

            gapAfter:
              2,
          }
        );

        drawBlock(
          item.body,
          {
            size:
              10,

            color:
              rgb(
                0.28,
                0.32,
                0.4
              ),

            gapAfter:
              10,
          }
        );
      }
    );
  }

  drawBlock(
    'Analise de desempenho do Instagram',
    {
      size:
        23,

      bold:
        true,

      color:
        rgb(
          0.07,
          0.09,
          0.14
        ),

      gapAfter:
        4,
    }
  );

  drawBlock(
    username
      ? `${clientName} - @${username}`
      : clientName,
    {
      size:
        12,

      bold:
        true,

      gapAfter:
        4,
    }
  );

  drawBlock(
    `Periodo: ultimos ${period} dias | Gerado em ${formatGeneratedAt(analysis.generatedAt)} | Modelo ${analysis.model}`,
    {
      size:
        9,

      color:
        rgb(
          0.42,
          0.47,
          0.56
        ),

      gapAfter:
        2,
    }
  );

  if (
    source
  ) {
    drawBlock(
      `${source.postsAnalyzed ?? 0} posts analisados | ${source.reelsAnalyzed ?? 0} Reels analisados`,
      {
        size:
          9,

        color:
          rgb(
            0.42,
            0.47,
            0.56
          ),

        gapAfter:
          14,
      }
    );
  }

  sectionTitle(
    'Resumo executivo'
  );

  drawBlock(
    analysis.executiveSummary
  );

  sectionTitle(
    'Qualidade dos dados'
  );

  drawBlock(
    analysis.dataQuality
  );

  sectionTitle(
    'O que esta funcionando'
  );

  numberedItems(
    analysis.wins.map(
      (
        item
      ) => ({
        title:
          item.title,

        body:
          item.evidence,
      })
    )
  );

  sectionTitle(
    'Pontos de atencao'
  );

  numberedItems(
    analysis.risks.map(
      (
        item
      ) => ({
        title:
          item.title,

        body:
          item.evidence,
      })
    )
  );

  sectionTitle(
    'Padroes encontrados'
  );

  numberedItems(
    analysis.patterns.map(
      (
        item
      ) => ({
        title:
          item.pattern,

        body:
          `Evidencia: ${item.evidence} Implicacao: ${item.implication}`,
      })
    )
  );

  sectionTitle(
    'Proximos passos'
  );

  numberedItems(
    analysis.recommendations.map(
      (
        item
      ) => ({
        title:
          `[${item.priority}] ${item.action}`,

        body:
          `${item.why} Acompanhar: ${item.metricToWatch}`,
      })
    )
  );

  sectionTitle(
    'Testes sugeridos'
  );

  numberedItems(
    analysis.experiments.map(
      (
        item
      ) => ({
        title:
          item.test,

        body:
          `${item.hypothesis} Metrica de sucesso: ${item.successMetric}`,
      })
    )
  );

  ensureSpace(
    30
  );

  drawBlock(
    'Documento gerado pelo AprovUp a partir da analise IA exibida na plataforma.',
    {
      size:
        8.5,

      color:
        rgb(
          0.58,
          0.62,
          0.69
        ),

      gapAfter:
        0,
    }
  );

  return pdf.save();
}


export async function POST(
  request:
    NextRequest
) {
  try {
    const user =
      await getCurrentUser();

    if (
      !user
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            'Sessão expirada.',
        },
        {
          status:
            401,
        }
      );
    }

    if (
      user.status !==
        'APROVADO' ||
      !user.agencyId ||
      !hasPermission(
        user,
        'social.view'
      )
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            'Você não tem permissão para exportar esta análise.',
        },
        {
          status:
            403,
        }
      );
    }

    const body =
      await request
        .json();

    const clientId =
      typeof body
        ?.clientId ===
        'string'
        ? body.clientId
            .trim()
        : '';

    const format =
      body?.format ===
        'word'
        ? 'word'
        : body?.format ===
            'pdf'
          ? 'pdf'
          : '';

    const requestedPeriod =
      Number(
        body?.period ||
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

    const analysis =
      body?.analysis;

    const source =
      typeof body?.source ===
        'object' &&
      body.source !==
        null
        ? body.source as SourceInfo
        : null;

    if (
      !clientId ||
      !format ||
      !validAnalysis(
        analysis
      )
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            'Dados da análise inválidos para exportação.',
        },
        {
          status:
            400,
        }
      );
    }

    const client =
      await prisma.client.findFirst({
        where: {
          id:
            clientId,

          agencyId:
            user.agencyId,
        },

        select: {
          name:
            true,

          instagramConnection: {
            select: {
              username:
                true,
            },
          },
        },
      });

    if (
      !client
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            'Cliente não encontrado.',
        },
        {
          status:
            404,
        }
      );
    }

    const baseName =
      `analise-instagram-${safeFileName(client.name)}-${period}-dias`;

    if (
      format ===
      'word'
    ) {
      const html =
        buildWordHtml({
          clientName:
            client.name,

          username:
            client.instagramConnection
              ?.username ||
            null,

          period,

          analysis,

          source,
        });

      const bytes =
        new TextEncoder()
          .encode(
            '\ufeff' +
            html
          );

      return new Response(
        bytes.buffer as ArrayBuffer,
        {
          status:
            200,

          headers: {
            'Content-Type':
              'application/msword; charset=utf-8',

            'Content-Disposition':
              `attachment; filename="${baseName}.doc"`,

            'Cache-Control':
              'no-store',
          },
        }
      );
    }

    const pdfBytes =
      await buildPdf({
        clientName:
          client.name,

        username:
          client.instagramConnection
            ?.username ||
          null,

        period,

        analysis,

        source,
      });

    const start =
      pdfBytes.byteOffset;

    const end =
      pdfBytes.byteOffset +
      pdfBytes.byteLength;

    const pdfBuffer =
      pdfBytes.buffer
        .slice(
          start,
          end
        ) as ArrayBuffer;

    return new Response(
      pdfBuffer,
      {
        status:
          200,

        headers: {
          'Content-Type':
            'application/pdf',

          'Content-Disposition':
            `attachment; filename="${baseName}.pdf"`,

          'Cache-Control':
            'no-store',
        },
      }
    );
  }
  catch (
    error
  ) {
    console.error(
      'INSTAGRAM AI EXPORT ERROR',
      error
    );

    return NextResponse.json(
      {
        ok:
          false,

        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível exportar a análise.',
      },
      {
        status:
          500,
      }
    );
  }
}

import {
  prisma,
} from '@/lib/prisma';


export const FINAL_READY_STATUSES:
  string[] = [
    'REVISAO_INTERNA',
    'DESIGN_ANALISE',
    'FILMMAKER_ANALISE',
  ];


export const FINAL_PENDING_STATUSES:
  string[] = [
    ...FINAL_READY_STATUSES,
    'ENVIADO_CLIENTE',
  ];


export const FINAL_VISIBLE_STATUSES:
  string[] = [
    ...FINAL_PENDING_STATUSES,
    'ALTERACAO_SOLICITADA',
    'PRONTO_PARA_POSTAR',
  ];


export const finalApprovalMonthNames:
  Record<
    number,
    string
  > = {
    1:
      'Janeiro',

    2:
      'Fevereiro',

    3:
      'Março',

    4:
      'Abril',

    5:
      'Maio',

    6:
      'Junho',

    7:
      'Julho',

    8:
      'Agosto',

    9:
      'Setembro',

    10:
      'Outubro',

    11:
      'Novembro',

    12:
      'Dezembro',
  };


export function getFinalApprovalMonthParts(
  date:
    Date
) {

  const parts =
    new Intl.DateTimeFormat(
      'en-US',
      {
        timeZone:
          'America/Maceio',

        year:
          'numeric',

        month:
          'numeric',
      }
    )
      .formatToParts(
        new Date(
          date
        )
      );


  const year =
    Number(
      parts.find(
        (
          part
        ) =>
          part.type ===
          'year'
      )?.value
    );


  const month =
    Number(
      parts.find(
        (
          part
        ) =>
          part.type ===
          'month'
      )?.value
    );


  return {
    year,
    month,
  };
}


export function getFinalApprovalMonthRange(
  year:
    number,
  month:
    number
) {

  const pad =
    (
      value:
        number
    ) =>
      String(
        value
      ).padStart(
        2,
        '0'
      );


  const nextMonth =
    month ===
      12
      ? 1
      : month +
        1;


  const nextYear =
    month ===
      12
      ? year +
        1
      : year;


  /*
   * Maceió usa UTC-03.
   * O intervalo é [inicio, proximo mes).
   */
  const start =
    new Date(
      String(
        year
      ) +
      '-' +
      pad(
        month
      ) +
      '-01T00:00:00-03:00'
    );


  const end =
    new Date(
      String(
        nextYear
      ) +
      '-' +
      pad(
        nextMonth
      ) +
      '-01T00:00:00-03:00'
    );


  return {
    start,
    end,
  };
}


/** Usa a data editorial normal; para uma demanda emergencial sem publicacao prevista,
 * utiliza seu prazo de producao, preservando seu mes de referencia. */
export function finalApprovalReferenceDate(content: {
  format: string | null; plannedDate: Date | null; productionDeadline: Date | null; createdAt: Date;
}): Date | null {
  if (content.plannedDate) return content.plannedDate;
  if (content.format === 'DEMANDA_EMERGENCIAL') {
    return content.productionDeadline ?? content.createdAt;
  }
  return null;
}

/** Links mensais incluem materias finais e emergenciais com prazo no mes.
 * Um link individual antigo fica limitado a seu unico conteudo. */
export function finalApprovalContentScope(context: {
  source: 'MONTHLY' | 'LEGACY';
  legacyContentId?: string | null;
  start: Date;
  end: Date;
}) {
  if (context.source === 'LEGACY' && context.legacyContentId) {
    return { id: context.legacyContentId };
  }
  return {
    AND: [{ OR: [
      { plannedDate: { gte: context.start, lt: context.end } },
      {
        format: 'DEMANDA_EMERGENCIAL',
        plannedDate: null,
        productionDeadline: { gte: context.start, lt: context.end },
      },
      {
        format: 'DEMANDA_EMERGENCIAL',
        plannedDate: null,
        productionDeadline: null,
        createdAt: { gte: context.start, lt: context.end },
      },
    ] }],
  };
}

export async function resolveFinalApprovalContext(
  token:
    string
) {

  /*
   * Fluxo novo:
   * um token mensal exclusivo da 2ª etapa.
   */
  const monthly =
    await prisma
      .finalMonthlyApproval
      .findUnique({
        where: {
          token,
        },

        include: {
          client:
            true,
        },
      });


  if (
    monthly
  ) {

    const {
      start,
      end,
    } =
      getFinalApprovalMonthRange(
        monthly.year,
        monthly.month
      );


    return {
      client:
        monthly.client,

      month:
        monthly.month,

      year:
        monthly.year,

      start,
      end,

      source:
        'MONTHLY' as const,

      legacyContentId: null,
    };
  }


  /*
   * Compatibilidade com links antigos.
   *
   * Um token antigo de Approval continua funcionando,
   * mas passa a abrir somente o mês daquele conteúdo.
   */
  const legacy =
    await prisma
      .approval
      .findUnique({
        where: {
          token,
        },

        include: {
          content: {
            include: {
              client:
                true,
            },
          },
        },
      });


  if (!legacy) return null;

  const referenceDate = finalApprovalReferenceDate(legacy.content);
  if (!referenceDate) return null;


  const {
    year,
    month,
  } =
    getFinalApprovalMonthParts(
      referenceDate
    );


  const {
    start,
    end,
  } =
    getFinalApprovalMonthRange(
      year,
      month
    );


  return {
    client:
      legacy
        .content
        .client,

    month,
    year,
    start,
    end,

    source:
      'LEGACY' as const,

    legacyContentId: legacy.contentId,
  };
}

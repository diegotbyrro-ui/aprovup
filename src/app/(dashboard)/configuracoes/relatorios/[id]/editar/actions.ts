'use server';

import {
  revalidatePath,
} from 'next/cache';

import {
  prisma,
} from '@/lib/prisma';

import {
  requirePermission,
} from '@/lib/userAccess';


const ALLOWED_METRICS =
  new Set([
    'client.name',
    'period.label',

    'instagram.followers',
    'instagram.followers_gained',

    'instagram.reach',
    'instagram.reach_change',

    'instagram.views',
    'instagram.views_change',

    'instagram.interactions',
    'instagram.engagement_rate',
  ]);


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


export async function saveReportTemplateEditorAction(
  templateId: string,
  rawPayload: string
) {

  const currentUser =
    await requirePermission(
      'settings.manage'
    );


  const template =
    await prisma
      .reportTemplate
      .findFirst({

        where: {

          id:
            templateId,

          agencyId:
            currentUser.agencyId,

          status:
            'ATIVO',
        },

        select: {
          id:
            true,
        },

      });


  if (!template) {

    throw new Error(
      'Modelo não encontrado nesta agência.'
    );
  }


  let payload:
    {
      pageCount?: unknown;
      elements?: unknown;
    };


  try {

    payload =
      JSON.parse(
        rawPayload
      );

  }
  catch {

    throw new Error(
      'Configuração inválida.'
    );
  }


  const rawPageCount =
    Number(
      payload.pageCount ||
      1
    );


  const pageCount =
    clamp(
      Number.isFinite(
        rawPageCount
      )
        ? Math.round(
            rawPageCount
          )
        : 1,
      1,
      100
    );


  const sourceElements =
    Array.isArray(
      payload.elements
    )
      ? payload.elements
      : [];


  const elements =
    sourceElements
      .slice(
        0,
        120
      )
      .map(
        (
          value,
          index
        ) => {

          if (
            !value ||
            typeof value !==
              'object'
          ) {
            return null;
          }


          const item =
            value as
              Record<
                string,
                unknown
              >;


          const metricKey =
            String(
              item.metricKey ||
              ''
            );


          if (
            !ALLOWED_METRICS.has(
              metricKey
            )
          ) {
            return null;
          }


          const page =
            clamp(
              Math.round(
                Number(
                  item.page ||
                  1
                )
              ),
              1,
              pageCount
            );


          const x =
            clamp(
              Number(
                item.x ||
                0
              ),
              0,
              0.98
            );


          const y =
            clamp(
              Number(
                item.y ||
                0
              ),
              0,
              0.98
            );


          const width =
            clamp(
              Number(
                item.width ||
                0.3
              ),
              0.08,
              0.95
            );


          const fontSize =
            clamp(
              Number(
                item.fontSize ||
                28
              ),
              10,
              100
            );


          const requestedWeight =
            Number(
              item.fontWeight ||
              700
            );


          const fontWeight =
            [
              400,
              600,
              700,
              800,
            ].includes(
              requestedWeight
            )
              ? requestedWeight
              : 700;


          const requestedAlign =
            String(
              item.textAlign ||
              'left'
            );


          const textAlign =
            [
              'left',
              'center',
              'right',
            ].includes(
              requestedAlign
            )
              ? requestedAlign
              : 'left';


          const requestedColor =
            String(
              item.color ||
              '#0f172a'
            );


          const color =
            /^#[0-9a-fA-F]{6}$/
              .test(
                requestedColor
              )
              ? requestedColor
              : '#0f172a';


          return {

            id:
              String(
                item.id ||
                `field-${index}`
              )
                .slice(
                  0,
                  80
                ),

            metricKey,

            page,

            x,

            y,

            width,

            fontSize,

            fontWeight,

            textAlign,

            color,
          };
        }
      )
      .filter(
        (
          item
        ) =>
          item !==
          null
      );


  await prisma
    .reportTemplate
    .update({

      where: {
        id:
          template.id,
      },

      data: {

        pageCount,

        elements,
      },

    });


  revalidatePath(
    '/configuracoes/relatorios'
  );

  revalidatePath(
    `/configuracoes/relatorios/${template.id}/editar`
  );


  return {
    ok:
      true,

    savedCount:
      elements.length,
  };
}
import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  getCurrentUser,
} from '@/lib/auth';

import {
  analyzeInstagramPerformance,
} from '@/lib/instagramAiAnalysis';

import {
  decryptMetaSecret,
} from '@/lib/metaCrypto';

import {
  getInstagramDashboardMetrics,
  getInstagramReelRetention,
  getInstagramTopMedia,
} from '@/lib/metaInstagram';

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
  120;


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
            'Você não tem permissão para analisar este cliente.',
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

    if (
      !clientId
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            'Cliente não informado.',
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
          id:
            true,

          name:
            true,

          segment:
            true,

          toneOfVoice:
            true,

          strategicNotes:
            true,

          targetAudience:
            true,

          brandDifferentials:
            true,

          marketingGoals:
            true,

          contentPillars:
            true,

          contentRestrictions:
            true,

          instagramConnection: {
            select: {
              instagramUserId:
                true,

              userAccessTokenEncrypted:
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

    const connection =
      client.instagramConnection;

    if (
      !connection
        ?.userAccessTokenEncrypted
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            'Conecte o Instagram deste cliente antes de gerar a análise.',
        },
        {
          status:
            400,
        }
      );
    }

    const accessToken =
      decryptMetaSecret(
        connection
          .userAccessTokenEncrypted
      );

    const [
      metricsResult,
      mediaResult,
      reelsResult,
    ] =
      await Promise.allSettled([
        getInstagramDashboardMetrics({
          instagramUserId:
            connection.instagramUserId,

          accessToken,

          days:
            period,
        }),

        getInstagramTopMedia({
          instagramUserId:
            connection.instagramUserId,

          accessToken,

          limit:
            24,

          days:
            period,
        }),

        getInstagramReelRetention({
          instagramUserId:
            connection.instagramUserId,

          accessToken,

          days:
            period,

          limit:
            30,
        }),
      ]);

    const metrics =
      metricsResult.status ===
        'fulfilled'
        ? metricsResult.value
        : null;

    const media =
      mediaResult.status ===
        'fulfilled'
        ? mediaResult.value
        : [];

    const reels =
      reelsResult.status ===
        'fulfilled'
        ? reelsResult.value
        : [];

    if (
      !metrics &&
      media.length === 0 &&
      reels.length === 0
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            'A Meta não retornou dados suficientes para gerar a análise.',
        },
        {
          status:
            422,
        }
      );
    }

    const analysis =
      await analyzeInstagramPerformance({
        agencyId:
          user.agencyId,

        client: {
          name:
            client.name,

          segment:
            client.segment,

          toneOfVoice:
            client.toneOfVoice,

          strategicNotes:
            client.strategicNotes,

          targetAudience:
            client.targetAudience,

          brandDifferentials:
            client.brandDifferentials,

          marketingGoals:
            client.marketingGoals,

          contentPillars:
            client.contentPillars,

          contentRestrictions:
            client.contentRestrictions,
        },

        period,

        metrics,

        media,

        reels,
      });

    return NextResponse.json({
      ok:
        true,

      analysis,

      source: {
        period,

        postsAnalyzed:
          media.length,

        reelsAnalyzed:
          reels.length,

        hasAccountMetrics:
          Boolean(
            metrics
          ),
      },
    });
  }
  catch (
    error
  ) {
    console.error(
      'INSTAGRAM AI ANALYSIS ERROR',
      error
    );

    return NextResponse.json(
      {
        ok:
          false,

        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível gerar a análise de IA.',
      },
      {
        status:
          500,
      }
    );
  }
}

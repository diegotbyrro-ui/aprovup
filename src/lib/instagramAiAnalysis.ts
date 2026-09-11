import {
  getOpenAiConfigForAgency,
} from '@/lib/aiProviderCredentials';

import type {
  InstagramDashboardMetrics,
  InstagramReelRetentionItem,
  InstagramTopMediaItem,
} from '@/lib/metaInstagram';


export type InstagramAiInsight = {
  title:
    string;

  evidence:
    string;
};


export type InstagramAiPattern = {
  pattern:
    string;

  evidence:
    string;

  implication:
    string;
};


export type InstagramAiRecommendation = {
  priority:
    string;

  action:
    string;

  why:
    string;

  metricToWatch:
    string;
};


export type InstagramAiExperiment = {
  test:
    string;

  hypothesis:
    string;

  successMetric:
    string;
};


export type InstagramAiAnalysis = {
  executiveSummary:
    string;

  dataQuality:
    string;

  wins:
    InstagramAiInsight[];

  risks:
    InstagramAiInsight[];

  patterns:
    InstagramAiPattern[];

  recommendations:
    InstagramAiRecommendation[];

  experiments:
    InstagramAiExperiment[];

  model:
    string;

  generatedAt:
    string;
};


type ClientStrategyContext = {
  name:
    string;

  segment:
    string | null;

  toneOfVoice:
    string | null;

  strategicNotes:
    string | null;

  targetAudience:
    string | null;

  brandDifferentials:
    string | null;

  marketingGoals:
    string | null;

  contentPillars:
    string | null;

  contentRestrictions:
    string | null;
};


function extractResponseText(
  payload:
    unknown
) {
  if (
    typeof payload ===
      'object' &&
    payload !==
      null &&
    'output_text' in
      payload &&
    typeof payload
      .output_text ===
      'string'
  ) {
    return payload
      .output_text;
  }

  if (
    typeof payload !==
      'object' ||
    payload ===
      null ||
    !(
      'output' in
      payload
    ) ||
    !Array.isArray(
      payload.output
    )
  ) {
    return '';
  }

  for (
    const item
    of payload.output
  ) {
    if (
      typeof item !==
        'object' ||
      item ===
        null ||
      !(
        'content' in
        item
      ) ||
      !Array.isArray(
        item.content
      )
    ) {
      continue;
    }

    for (
      const content
      of item.content
    ) {
      if (
        typeof content ===
          'object' &&
        content !==
          null &&
        'text' in
          content &&
        typeof content.text ===
          'string'
      ) {
        return content.text;
      }
    }
  }

  return '';
}


function cleanText(
  value:
    string | null,
  maxLength:
    number
) {
  const clean =
    String(
      value ||
      ''
    )
      .replace(
        /\s+/g,
        ' '
      )
      .trim();

  if (
    clean.length <=
    maxLength
  ) {
    return clean ||
      null;
  }

  return (
    clean.slice(
      0,
      maxLength
    ) +
    '...'
  );
}


function compactMedia(
  items:
    InstagramTopMediaItem[]
) {
  return items.map(
    (
      item
    ) => ({
      id:
        item.id,

      date:
        item.timestamp,

      type:
        item.mediaProductType ||
        item.mediaType,

      caption:
        cleanText(
          item.caption,
          420
        ),

      views:
        item.views,

      reach:
        item.reach,

      interactions:
        item.interactions,

      saved:
        item.saved,

      shares:
        item.shares,

      likes:
        item.likes,

      comments:
        item.comments,
    })
  );
}


function compactReels(
  items:
    InstagramReelRetentionItem[]
) {
  return items.map(
    (
      item
    ) => ({
      id:
        item.id,

      date:
        item.timestamp,

      caption:
        cleanText(
          item.caption,
          420
        ),

      views:
        item.views,

      reach:
        item.reach,

      interactions:
        item.interactions,

      saved:
        item.saved,

      shares:
        item.shares,

      averageWatchTimeMs:
        item.averageWatchTimeMs,

      totalWatchTimeMs:
        item.totalWatchTimeMs,

      skipRatePercent:
        item.skipRate,

      retainedAfter3sPercent:
        item.retainedAfter3s,

      reposts:
        item.reposts,
    })
  );
}


export async function analyzeInstagramPerformance({
  agencyId,
  client,
  period,
  metrics,
  media,
  reels,
}: {
  agencyId:
    string;

  client:
    ClientStrategyContext;

  period:
    number;

  metrics:
    InstagramDashboardMetrics | null;

  media:
    InstagramTopMediaItem[];

  reels:
    InstagramReelRetentionItem[];
}): Promise<
  InstagramAiAnalysis
> {
  const config =
    await getOpenAiConfigForAgency(
      agencyId
    );

  if (
    !config.apiKey
  ) {
    throw new Error(
      'Configure a chave da OpenAI em Configurações > Integrações.'
    );
  }

  const input = {
    client: {
      name:
        client.name,

      segment:
        client.segment,

      toneOfVoice:
        client.toneOfVoice,

      strategicNotes:
        cleanText(
          client.strategicNotes,
          1800
        ),

      targetAudience:
        cleanText(
          client.targetAudience,
          1200
        ),

      brandDifferentials:
        cleanText(
          client.brandDifferentials,
          1200
        ),

      marketingGoals:
        cleanText(
          client.marketingGoals,
          1200
        ),

      contentPillars:
        cleanText(
          client.contentPillars,
          1200
        ),

      contentRestrictions:
        cleanText(
          client.contentRestrictions,
          900
        ),
    },

    periodDays:
      period,

    accountMetrics:
      metrics
        ? {
            current:
              metrics.current,

            previous:
              metrics.previous,

            changePercent:
              metrics.change,
          }
        : null,

    posts:
      compactMedia(
        media
      ),

    reels:
      compactReels(
        reels
      ),
  };

  const schema = {
    type:
      'object',

    additionalProperties:
      false,

    required: [
      'executiveSummary',
      'dataQuality',
      'wins',
      'risks',
      'patterns',
      'recommendations',
      'experiments',
    ],

    properties: {
      executiveSummary: {
        type:
          'string',
      },

      dataQuality: {
        type:
          'string',
      },

      wins: {
        type:
          'array',

        items: {
          type:
            'object',

          additionalProperties:
            false,

          required: [
            'title',
            'evidence',
          ],

          properties: {
            title: {
              type:
                'string',
            },

            evidence: {
              type:
                'string',
            },
          },
        },
      },

      risks: {
        type:
          'array',

        items: {
          type:
            'object',

          additionalProperties:
            false,

          required: [
            'title',
            'evidence',
          ],

          properties: {
            title: {
              type:
                'string',
            },

            evidence: {
              type:
                'string',
            },
          },
        },
      },

      patterns: {
        type:
          'array',

        items: {
          type:
            'object',

          additionalProperties:
            false,

          required: [
            'pattern',
            'evidence',
            'implication',
          ],

          properties: {
            pattern: {
              type:
                'string',
            },

            evidence: {
              type:
                'string',
            },

            implication: {
              type:
                'string',
            },
          },
        },
      },

      recommendations: {
        type:
          'array',

        items: {
          type:
            'object',

          additionalProperties:
            false,

          required: [
            'priority',
            'action',
            'why',
            'metricToWatch',
          ],

          properties: {
            priority: {
              type:
                'string',
            },

            action: {
              type:
                'string',
            },

            why: {
              type:
                'string',
            },

            metricToWatch: {
              type:
                'string',
            },
          },
        },
      },

      experiments: {
        type:
          'array',

        items: {
          type:
            'object',

          additionalProperties:
            false,

          required: [
            'test',
            'hypothesis',
            'successMetric',
          ],

          properties: {
            test: {
              type:
                'string',
            },

            hypothesis: {
              type:
                'string',
            },

            successMetric: {
              type:
                'string',
            },
          },
        },
      },
    },
  };

  const instructions =
    [
      'Você é um estrategista sênior de conteúdo e performance para Instagram dentro do AprovUp.',
      'Analise SOMENTE os dados fornecidos. Não use conhecimento externo para inventar desempenho, comportamento de audiência ou fatos sobre a marca.',
      'Você não assistiu aos vídeos. Nunca diga que viu cenas, edição, enquadramento, áudio, pessoas, abertura visual ou qualquer elemento não presente nos dados.',
      'Você pode usar o texto das legendas como contexto editorial, mas deixe claro quando uma conclusão vier da legenda e não do vídeo.',
      'Toda conclusão importante deve apontar uma evidência numérica ou uma comparação presente nos dados.',
      'Quando uma métrica estiver ausente, trate como dado indisponível. Não estime valores.',
      'Compare posts entre si e compare o período atual com o período anterior quando houver dados.',
      'Para Reels, dê atenção especial a skip rate, retenção inicial, tempo médio assistido, views, alcance, interações, salvos e compartilhamentos.',
      'Busque padrões que possam orientar próximos conteúdos, mas não confunda correlação com causa.',
      'As recomendações devem ser específicas, executáveis e mensuráveis no próximo período.',
      'Priorize de 3 a 6 recomendações. Evite conselhos genéricos como poste mais ou melhore a qualidade sem explicar o porquê.',
      'Os experimentos devem ser testes A/B ou hipóteses práticas que a equipe possa aplicar em novos conteúdos.',
      'Responda em português do Brasil, com linguagem clara para uma agência de marketing.',
    ].join(
      '\n'
    );

  const body = {
    model:
      config.model,

    reasoning: {
      effort:
        'low',
    },

    instructions,

    input:
      JSON.stringify(
        input
      ),

    text: {
      verbosity:
        'medium',

      format: {
        type:
          'json_schema',

        name:
          'instagram_performance_analysis',

        strict:
          true,

        schema,
      },
    },
  };

  const response =
    await fetch(
      'https://api.openai.com/v1/responses',
      {
        method:
          'POST',

        headers: {
          Authorization:
            'Bearer ' +
            config.apiKey,

          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify(
            body
          ),

        cache:
          'no-store',
      }
    );

  const payload =
    await response
      .json() as
        unknown;

  if (
    !response.ok
  ) {
    let message =
      'A OpenAI não conseguiu gerar a análise.';

    if (
      typeof payload ===
        'object' &&
      payload !==
        null &&
      'error' in
        payload &&
      typeof payload.error ===
        'object' &&
      payload.error !==
        null &&
      'message' in
        payload.error &&
      typeof payload.error
        .message ===
        'string'
    ) {
      message =
        payload.error
          .message;
    }

    throw new Error(
      message
    );
  }

  const text =
    extractResponseText(
      payload
    );

  if (
    !text
  ) {
    throw new Error(
      'A IA não retornou conteúdo para a análise.'
    );
  }

  let parsed:
    Omit<
      InstagramAiAnalysis,
      'model' |
      'generatedAt'
    >;

  try {
    parsed =
      JSON.parse(
        text
      );
  }
  catch {
    throw new Error(
      'A IA retornou uma análise em formato inválido.'
    );
  }

  return {
    ...parsed,

    model:
      config.model,

    generatedAt:
      new Date()
        .toISOString(),
  };
}

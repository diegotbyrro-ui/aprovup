import {
  getOpenAiConfigForAgency,
} from '@/lib/aiProviderCredentials';


export type MeetingAiAction = {
  title:
    string;

  responsible:
    string;

  due_date_text:
    string;

  details:
    string;

  action_type:
    'TASK' |
    'CALENDAR' |
    'FOLLOW_UP';
};


export type MeetingAiResult = {
  summary:
    string;

  decisions:
    string[];

  pending_items:
    string[];

  ideas:
    string[];

  actions:
    MeetingAiAction[];
};


function extractOutputText(
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


export async function analyzeMeetingTranscript({
  agencyId,
  meetingTitle,
  transcript,
}: {
  agencyId:
    string;

  meetingTitle:
    string;

  transcript:
    string;
}):
  Promise<MeetingAiResult> {

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


  const transcriptForAi =
    transcript.length >
      100000
      ? transcript.slice(
          0,
          100000
        )
      : transcript;


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
          JSON.stringify({
            model:
              config.model,

            reasoning: {
              effort:
                'medium',
            },

            instructions:
              'Você é a Liv, secretária operacional do AprovUp. ' +
              'Analise uma transcrição de reunião em português. ' +
              'Não invente fatos. ' +
              'Separe claramente decisões tomadas, pendências, ideias e ações. ' +
              'Para ações, identifique responsável e prazo apenas quando estiverem presentes ou claramente determinados na conversa. ' +
              'Quando não houver responsável ou prazo, use string vazia.',

            input:
              'REUNIÃO: ' +
              meetingTitle +
              '\n\nTRANSCRIÇÃO:\n' +
              transcriptForAi,

            text: {
              verbosity:
                'medium',

              format: {
                type:
                  'json_schema',

                name:
                  'meeting_summary',

                strict:
                  true,

                schema: {
                  type:
                    'object',

                  additionalProperties:
                    false,

                  properties: {
                    summary: {
                      type:
                        'string',
                    },

                    decisions: {
                      type:
                        'array',

                      items: {
                        type:
                          'string',
                      },
                    },

                    pending_items: {
                      type:
                        'array',

                      items: {
                        type:
                          'string',
                      },
                    },

                    ideas: {
                      type:
                        'array',

                      items: {
                        type:
                          'string',
                      },
                    },

                    actions: {
                      type:
                        'array',

                      items: {
                        type:
                          'object',

                        additionalProperties:
                          false,

                        properties: {
                          title: {
                            type:
                              'string',
                          },

                          responsible: {
                            type:
                              'string',
                          },

                          due_date_text: {
                            type:
                              'string',
                          },

                          details: {
                            type:
                              'string',
                          },

                          action_type: {
                            type:
                              'string',

                            enum: [
                              'TASK',
                              'CALENDAR',
                              'FOLLOW_UP',
                            ],
                          },
                        },

                        required: [
                          'title',
                          'responsible',
                          'due_date_text',
                          'details',
                          'action_type',
                        ],
                      },
                    },
                  },

                  required: [
                    'summary',
                    'decisions',
                    'pending_items',
                    'ideas',
                    'actions',
                  ],
                },
              },
            },
          }),
      }
    );


  const payload =
    await response
      .json() as
        unknown;


  if (
    !response.ok
  ) {

    throw new Error(
      'A OpenAI não conseguiu resumir a reunião.'
    );
  }


  const text =
    extractOutputText(
      payload
    );


  if (
    !text
  ) {

    throw new Error(
      'A IA não devolveu o resumo estruturado.'
    );
  }


  const parsed =
    JSON.parse(
      text
    ) as
      MeetingAiResult;


  return parsed;
}

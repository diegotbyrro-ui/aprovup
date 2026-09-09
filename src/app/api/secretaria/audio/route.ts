import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  getSecretaryApiUser,
} from '@/lib/secretaryAccess';

import {
  getOpenAiConfigForAgency,
} from '@/lib/aiProviderCredentials';


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
    const access =
      await getSecretaryApiUser();


    if (!access.ok) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            access.message,
        },
        {
          status:
            access.status,
        }
      );
    }


    const incoming =
      await request
        .formData();


    const audio =
      incoming.get(
        'audio'
      );


    if (
      !(
        audio instanceof
        File
      ) ||
      audio.size ===
        0
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            'Áudio não recebido.',
        },
        {
          status:
            400,
        }
      );
    }


    if (
      audio.size >
      20 *
        1024 *
        1024
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            'O áudio ultrapassa 20 MB.',
        },
        {
          status:
            413,
        }
      );
    }


    const config =
      await getOpenAiConfigForAgency(
        access
          .user
          .agencyId
      );


    if (!config.apiKey) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            'Configure a chave da OpenAI em Configurações > Integrações.',
        },
        {
          status:
            400,
        }
      );
    }


    const formData =
      new FormData();


    formData.append(
      'file',
      audio,
      audio.name ||
        'secretaria.webm'
    );


    formData.append(
      'model',
      String(
        process.env
          .OPENAI_TRANSCRIBE_MODEL ||
        'gpt-4o-mini-transcribe'
      )
    );


    formData.append(
      'language',
      'pt'
    );


    const response =
      await fetch(
        'https://api.openai.com/v1/audio/transcriptions',
        {
          method:
            'POST',

          headers: {
            Authorization:
              'Bearer ' +
              config.apiKey,
          },

          body:
            formData,
        }
      );


    const payload =
      await response
        .json() as {
          text?:
            string;

          error?: {
            message?:
              string;
          };
        };


    if (
      !response.ok ||
      !payload.text
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            payload
              .error
              ?.message ||
            'Não foi possível transcrever o áudio.',
        },
        {
          status:
            response.status ||
            500,
        }
      );
    }


    return NextResponse.json({
      ok:
        true,

      text:
        payload
          .text
          .trim(),
    });
  }
  catch (
    error
  ) {
    console.error(
      'SECRETARY AUDIO ERROR',
      error
    );


    return NextResponse.json(
      {
        ok:
          false,

        message:
          error instanceof Error
            ? error.message
            : 'Erro ao processar o áudio.',
      },
      {
        status:
          500,
      }
    );
  }
}